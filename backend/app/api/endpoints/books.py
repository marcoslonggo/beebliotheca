from __future__ import annotations

import uuid
from datetime import date, datetime
from pathlib import Path
from uuid import UUID

import sqlalchemy
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import String, cast, delete, func
from sqlalchemy.orm import attributes
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_current_user, get_session
from app.api.utils.library_access import (
    get_library_book as fetch_library_book,
    get_user_book_data,
    require_library_member,
    require_library_permission,
)
from app.api.schemas.library_books import LibraryBookDetail, LibraryBookListResponse
from app.models import (
    BookV2,
    BookV2Create,
    BookV2Read,
    BookV2Update,
    LibraryBook,
    LibraryBookRead,
    LibraryBookUpdate,
    MemberRole,
    Series,
    SeriesRead,
    User,
    UserBookData,
    UserBookDataRead,
    UserBookDataUpdate,
)
from app.services.metadata import fetch_metadata

router = APIRouter(prefix="/libraries/{library_id}/books", tags=["books"])

# Store local cover uploads in shared directory
COVERS_DIR = Path("data/covers")
COVERS_DIR.mkdir(parents=True, exist_ok=True)


class LibraryBookCreatePayload(SQLModel):
    book_id: UUID | None = None
    book: BookV2Create | None = None
    library_book: LibraryBookUpdate | None = None


class LibraryBookUpdatePayload(SQLModel):
    book: BookV2Update | None = None
    library_book: LibraryBookUpdate | None = None
    personal_data: UserBookDataUpdate | None = None




@router.get("")
async def list_library_books(
    library_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    q: str | None = Query(
        None,
        description="Free text search across intrinsic and library fields",
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    metadata_status: str | None = Query(
        None, description="Filter books by metadata status"
    ),
) -> LibraryBookListResponse:
    print("=" * 80)
    print("LIST_LIBRARY_BOOKS ENDPOINT CALLED - NEW CODE IS RUNNING!")
    print("=" * 80)
    await require_library_member(library_id, current_user.id, session)

    conditions: list = [LibraryBook.library_id == library_id]
    if metadata_status:
        conditions.append(BookV2.metadata_status == metadata_status)

    if q:
        like = f"%{q}%"
        search_conditions = [
            BookV2.title.ilike(like),  # type: ignore[attr-defined]
            BookV2.isbn.ilike(like),  # type: ignore[attr-defined]
            BookV2.publisher.ilike(like),  # type: ignore[union-attr]
            BookV2.description.ilike(like),  # type: ignore[union-attr]
            LibraryBook.series.ilike(like),  # type: ignore[union-attr]
            LibraryBook.physical_location.ilike(like),  # type: ignore[union-attr]
        ]
        search_conditions.extend(
            [
                cast(BookV2.authors, String).ilike(like),  # type: ignore[arg-type]
                cast(BookV2.subjects, String).ilike(like),  # type: ignore[arg-type]
                cast(BookV2.language, String).ilike(like),  # type: ignore[arg-type]
            ]
        )
        conditions.append(sqlalchemy.or_(*search_conditions))

    stmt = (
        select(LibraryBook, BookV2, UserBookData)
        .join(BookV2, LibraryBook.book_id == BookV2.id)
        .outerjoin(
            UserBookData,
            (UserBookData.book_id == LibraryBook.book_id)
            & (UserBookData.library_id == library_id)
            & (UserBookData.user_id == current_user.id),
        )
        .where(*conditions)
        .offset(skip)
        .limit(limit)
    )
    rows = (await session.exec(stmt)).all()

    # Build lookup of Series metadata for all referenced series names
    series_lookup: dict[str, SeriesRead] = {}
    series_names = {
        library_book.series
        for library_book, *_ in rows
        if library_book.series
    }
    if series_names:
        print(f"DEBUG series names requested: {series_names}")
        series_stmt = select(Series).where(
            Series.library_id == library_id,
            Series.name.in_(tuple(series_names)),
        )
        existing_series = (await session.exec(series_stmt)).all()
        series_lookup = {
            series.name: SeriesRead.model_validate(series)
            for series in existing_series
        }
        print(f"DEBUG found existing series: {list(series_lookup.keys())}")

        missing_series_names = series_names - set(series_lookup.keys())
        if missing_series_names:
            print(f"DEBUG creating missing series entries: {missing_series_names}")
            for missing_name in missing_series_names:
                new_series = Series(name=missing_name, library_id=library_id)
                session.add(new_series)
            await session.commit()
            refill_stmt = select(Series).where(
                Series.library_id == library_id,
                Series.name.in_(tuple(missing_series_names)),
            )
            created_series = (await session.exec(refill_stmt)).all()
            for series in created_series:
                series_lookup[series.name] = SeriesRead.model_validate(series)
        print(f"DEBUG final series lookup keys: {list(series_lookup.keys())}")

    items = []
    for library_book, book, user_data in rows:
        series_obj = (
            series_lookup.get(library_book.series)
            if library_book.series
            else None
        )
        if library_book.series:
            print(f"DEBUG assigning series for book {library_book.id}: {library_book.series} -> {series_obj}")
        item = LibraryBookDetail(
            book=BookV2Read.model_validate(book),
            library_book=LibraryBookRead.model_validate(library_book),
            personal_data=UserBookDataRead.model_validate(user_data) if user_data else None,
            series=series_obj,
        )
        items.append(item)

    count_stmt = (
        select(func.count())
        .select_from(LibraryBook)
        .join(BookV2, LibraryBook.book_id == BookV2.id)
        .where(*conditions)
    )
    total = (await session.exec(count_stmt)).one()

    result = LibraryBookListResponse(items=items, total=total)

    # Debug: Check if series is in the response
    if items and items[0].series:
        print(f"DEBUG: First item series field: {items[0].series}")
        print(f"DEBUG: Response dict keys: {result.model_dump().get('items', [{}])[0].keys() if result.model_dump().get('items') else 'No items'}")

    # Manual serialization to ensure series field is included
    return result.model_dump(mode='json', exclude_none=False)


@router.get("/{library_book_id}", response_model=LibraryBookDetail)
async def get_library_book(
    library_id: UUID,
    library_book_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> LibraryBookDetail:
    await require_library_member(library_id, current_user.id, session)
    library_book, book = await fetch_library_book(library_id, library_book_id, session)
    user_data = await get_user_book_data(library_book, current_user.id, session)

    # Fetch series if book has one
    series = None
    if library_book.series:
        stmt = select(Series).where(
            (Series.name == library_book.series)
            & (Series.library_id == library_id)
        )
        series = (await session.exec(stmt)).first()
        if not series:
            series = Series(name=library_book.series, library_id=library_id)
            session.add(series)
            await session.commit()
            await session.refresh(series)

    return LibraryBookDetail(
        book=BookV2Read.model_validate(book),
        library_book=LibraryBookRead.model_validate(library_book),
        personal_data=
        UserBookDataRead.model_validate(user_data) if user_data else None,
        series=
        SeriesRead.model_validate(series) if series else None,
    )


@router.post("", response_model=LibraryBookDetail, status_code=status.HTTP_201_CREATED)
async def create_library_book(
    library_id: UUID,
    payload: LibraryBookCreatePayload,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> LibraryBookDetail:
    await require_library_permission(
        library_id,
        current_user.id,
        session,
        (MemberRole.OWNER, MemberRole.ADMIN),
    )

    if payload.book_id and payload.book:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either book_id to reuse or book payload to create, not both",
        )
    if not payload.book_id and not payload.book:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either book_id or book payload is required",
        )

    if payload.book_id:
        book = await session.get(BookV2, payload.book_id)
        if not book:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    else:
        book = BookV2(**payload.book.model_dump())  # type: ignore[arg-type]
        session.add(book)
        await session.commit()
        await session.refresh(book)

    duplicate_stmt = select(LibraryBook).where(
        LibraryBook.library_id == library_id,
        LibraryBook.book_id == book.id,
    )
    if (await session.exec(duplicate_stmt)).one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Library already has a copy of this book",
        )

    library_fields = (
        payload.library_book.model_dump(exclude_unset=True)
        if payload.library_book
        else {}
    )
    library_book = LibraryBook(
        book_id=book.id,
        library_id=library_id,
        **library_fields,
    )
    session.add(library_book)
    await session.commit()
    await session.refresh(library_book)
    await session.refresh(book)

    return LibraryBookDetail(
        book=BookV2Read.model_validate(book),
        library_book=LibraryBookRead.model_validate(library_book),
        personal_data=None,
    )


@router.patch("/{library_book_id}", response_model=LibraryBookDetail)
async def update_library_book(
    library_id: UUID,
    library_book_id: UUID,
    payload: LibraryBookUpdatePayload,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> LibraryBookDetail:
    member = await require_library_member(library_id, current_user.id, session)

    if payload.book or payload.library_book:
        if member.role not in (MemberRole.OWNER, MemberRole.ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requires owner or admin role to modify library data",
            )

    library_book, book = await fetch_library_book(library_id, library_book_id, session)

    if payload.book:
        update_data = payload.book.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(book, field, value)
        book.updated_at = datetime.utcnow()
        session.add(book)

    if payload.library_book:
        update_data = payload.library_book.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(library_book, field, value)
        library_book.updated_at = datetime.utcnow()
        session.add(library_book)

    personal_record: UserBookData | None = None
    if payload.personal_data:
        personal_record = await get_user_book_data(library_book, current_user.id, session)
        if not personal_record:
            personal_record = UserBookData(
                book_id=library_book.book_id,
                library_id=library_book.library_id,
                user_id=current_user.id,
            )
        personal_update = payload.personal_data.model_dump(exclude_unset=True)
        for field, value in personal_update.items():
            setattr(personal_record, field, value)
        personal_record.updated_at = datetime.utcnow()
        session.add(personal_record)

    await session.commit()
    await session.refresh(book)
    await session.refresh(library_book)
    if personal_record:
        await session.refresh(personal_record)
    else:
        personal_record = await get_user_book_data(library_book, current_user.id, session)

    return LibraryBookDetail(
        book=BookV2Read.model_validate(book),
        library_book=LibraryBookRead.model_validate(library_book),
        personal_data=
        UserBookDataRead.model_validate(personal_record)
        if personal_record
        else None,
    )


@router.delete("/{library_book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_library_book(
    library_id: UUID,
    library_book_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> None:
    library_book, book = await fetch_library_book(library_id, library_book_id, session)
    await require_library_permission(
        library_id,
        current_user.id,
        session,
        (MemberRole.OWNER, MemberRole.ADMIN),
    )

    if library_book.cover_image_path and Path(library_book.cover_image_path).exists():
        try:
            Path(library_book.cover_image_path).unlink()
        except OSError:
            pass

    await session.exec(
        delete(UserBookData).where(
            UserBookData.book_id == library_book.book_id,
            UserBookData.library_id == library_book.library_id,
        )
    )
    await session.delete(library_book)
    await session.commit()

    remaining_stmt = select(func.count()).select_from(LibraryBook).where(
        LibraryBook.book_id == book.id
    )
    remaining = (await session.exec(remaining_stmt)).one()
    if remaining == 0:
        await session.delete(book)
        await session.commit()

    return None


@router.post("/{library_book_id}/cover", response_model=LibraryBookDetail)
async def upload_cover(
    library_id: UUID,
    library_book_id: UUID,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> LibraryBookDetail:
    library_book, book = await fetch_library_book(library_id, library_book_id, session)
    await require_library_permission(
        library_id,
        current_user.id,
        session,
        (MemberRole.OWNER, MemberRole.ADMIN),
    )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image",
        )

    if library_book.cover_image_path and Path(library_book.cover_image_path).exists():
        try:
            Path(library_book.cover_image_path).unlink()
        except OSError:
            pass

    file_extension = Path(file.filename or "image.jpg").suffix
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = COVERS_DIR / unique_filename

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    library_book.cover_image_path = str(file_path)
    library_book.updated_at = datetime.utcnow()
    session.add(library_book)
    await session.commit()
    await session.refresh(library_book)
    await session.refresh(book)

    user_data = await get_user_book_data(library_book, current_user.id, session)

    return LibraryBookDetail(
        book=BookV2Read.model_validate(book),
        library_book=LibraryBookRead.model_validate(library_book),
        personal_data=
        UserBookDataRead.model_validate(user_data) if user_data else None,
    )


SAMPLE_ISBNS = [
    "9780143127741",
    "9780735219090",
    "9780062316110",
    "9781501110368",
    "9780316769174",
    "9780451524935",
    "9780061120084",
    "9780062315007",
    "9780544003415",
    "9780307887436",
]


@router.post("/seed", response_model=list[LibraryBookDetail])
async def seed_sample_books(
    library_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[LibraryBookDetail]:
    await require_library_permission(
        library_id,
        current_user.id,
        session,
        (MemberRole.OWNER, MemberRole.ADMIN),
    )

    created: list[LibraryBookDetail] = []

    for isbn in SAMPLE_ISBNS:
        existing_book_stmt = select(BookV2).where(BookV2.isbn == isbn)
        book = (await session.exec(existing_book_stmt)).one_or_none()

        if not book:
            metadata = await fetch_metadata(isbn)
            if not metadata:
                continue
            book = BookV2(
                title=metadata.get("title", "Unknown Title"),
                authors=metadata.get("creator"),
                isbn=isbn,
                publisher=metadata.get("publisher"),
                description=metadata.get("description"),
                publish_date=metadata.get("date"),
                subjects=metadata.get("subject"),
                language=metadata.get("language"),
                cover_url=metadata.get("cover_image_url"),
                metadata_status="complete",
            )
            session.add(book)
            await session.commit()
            await session.refresh(book)

        dup_stmt = select(LibraryBook).where(
            LibraryBook.library_id == library_id,
            LibraryBook.book_id == book.id,
        )
        existing_library_book = (await session.exec(dup_stmt)).one_or_none()
        if existing_library_book:
            continue

        library_book = LibraryBook(
            book_id=book.id,
            library_id=library_id,
            loan_status="available",
        )
        session.add(library_book)
        await session.commit()
        await session.refresh(library_book)

        created.append(
            LibraryBookDetail(
                book=BookV2Read.model_validate(book),
                library_book=LibraryBookRead.model_validate(library_book),
            )
        )

    return created


class FinishReadingPayload(SQLModel):
    """Payload for marking a book as finished."""
    completion_date: str  # ISO date string


@router.post("/{library_book_id}/finish", response_model=LibraryBookDetail)
async def finish_reading_book(
    library_id: UUID,
    library_book_id: UUID,
    payload: FinishReadingPayload,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> LibraryBookDetail:
    """Mark a book as finished reading, adding to completion history."""
    await require_library_member(library_id, current_user.id, session)

    # Get the library book and book (note: fetch_library_book returns tuple)
    library_book, book = await fetch_library_book(library_id, library_book_id, session)

    # Get or create user book data
    personal_record = await get_user_book_data(library_book, current_user.id, session)
    if not personal_record:
        personal_record = UserBookData(
            book_id=book.id,
            library_id=library_id,
            user_id=current_user.id,
        )
        session.add(personal_record)

    # Parse the date string to date object
    completion_date = date.fromisoformat(payload.completion_date)

    # Update completion history
    completion_history = personal_record.completion_history or []
    completion_history.append(payload.completion_date)

    # Update personal data
    personal_record.reading_status = "Read"
    personal_record.completed_at = completion_date
    personal_record.completion_history = completion_history
    personal_record.updated_at = datetime.utcnow()

    # Flag the JSON field as modified so SQLAlchemy detects the change
    attributes.flag_modified(personal_record, "completion_history")

    await session.commit()
    await session.refresh(personal_record)
    await session.refresh(library_book)

    return LibraryBookDetail(
        book=BookV2Read.model_validate(book),
        library_book=LibraryBookRead.model_validate(library_book),
        personal_data=UserBookDataRead.model_validate(personal_record),
    )
