from __future__ import annotations

from datetime import datetime
from pathlib import Path
from uuid import UUID
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_current_user, get_session
from app.api.utils.library_access import (
    require_library_member,
    require_library_permission,
)
from app.models import (
    BookV2,
    LibraryBook,
    MemberRole,
    Series,
    SeriesCreate,
    SeriesRead,
    SeriesUpdate,
    User,
    UserBookData,
)

router = APIRouter(prefix="/libraries/{library_id}/series", tags=["series"])

SERIES_COVERS_DIR = Path("data/covers/series")
SERIES_COVERS_DIR.mkdir(parents=True, exist_ok=True)


def _resolve_cover_path(value: str | None) -> Path | None:
    if not value:
        return None
    path = Path(value)
    if not path.is_absolute():
        path = SERIES_COVERS_DIR / path
    return path


def _remove_custom_cover(path_value: str | None) -> None:
    path = _resolve_cover_path(path_value)
    if not path:
        return
    try:
        path.unlink(missing_ok=True)
    except OSError:
        pass


@router.get("", response_model=list[SeriesRead])
async def list_series(
    library_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[SeriesRead]:
    await require_library_member(library_id, current_user.id, session)

    # Query series - explicitly fetch as dict to avoid metadata cache issues
    result = await session.execute(
        select(Series).where(Series.library_id == library_id)
    )
    series_list = result.scalars().all()
    series_records = {s.name: s for s in series_list}

    book_statement = (
        select(LibraryBook.series)
        .where(
            LibraryBook.library_id == library_id,
            LibraryBook.series.isnot(None),
        )
        .distinct()
    )
    book_result = await session.exec(book_statement)
    book_series_names = {
        name.strip()
        for name in book_result.scalars().all()
        if isinstance(name, str) and name.strip()
    }

    created = False
    for series_name in book_series_names:
        if series_name not in series_records:
            new_series = Series(name=series_name, library_id=library_id)
            session.add(new_series)
            series_records[series_name] = new_series
            created = True

    if created:
        await session.commit()
        for series in series_records.values():
            await session.refresh(series)

    return [SeriesRead.model_validate(s) for s in series_records.values()]


@router.get("/{series_id}", response_model=SeriesRead)
async def get_series(
    library_id: UUID,
    series_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> SeriesRead:
    await require_library_member(library_id, current_user.id, session)
    series = await session.get(Series, series_id)
    if not series or series.library_id != library_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")
    return SeriesRead.model_validate(series)


@router.get("/{series_id}/books", response_model=list[dict])
async def get_series_books(
    library_id: UUID,
    series_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    await require_library_member(library_id, current_user.id, session)
    series = await session.get(Series, series_id)
    if not series or series.library_id != library_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")

    stmt = (
        select(LibraryBook, BookV2)
        .join(BookV2, LibraryBook.book_id == BookV2.id)
        .where(
            LibraryBook.library_id == library_id,
            LibraryBook.series == series.name,
        )
    )
    records = (await session.exec(stmt)).all()

    return [
        {
            "library_book_id": str(library_book.id),
            "book_id": str(book.id),
            "title": book.title,
            "cover_image_url": book.cover_url,
            "cover_image_path": library_book.cover_image_path,
            "is_series_cover": bool(series.cover_book_id and series.cover_book_id == book.id),
        }
        for library_book, book in records
    ]


@router.get("/{series_id}/reading-status")
async def get_series_reading_status(
    library_id: UUID,
    series_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """
    Calculate the aggregate reading status for a series based on user's reading status.
    Returns:
    - "completed" if all books in series are read
    - "not_started" if no books are read
    - "reading" if some but not all books are read
    """
    await require_library_member(library_id, current_user.id, session)

    series = await session.get(Series, series_id)
    if not series or series.library_id != library_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")

    # Get all library books in this series
    stmt = select(LibraryBook).where(
        LibraryBook.library_id == library_id,
        LibraryBook.series == series.name,
    )
    library_books = (await session.exec(stmt)).scalars().all()

    if not library_books:
        return {
            "series_id": series_id,
            "reading_status": "not_started",
            "total_books": 0,
            "read_books": 0,
        }

    # Get user's reading status for each book
    read_count = 0
    for library_book in library_books:
        user_data_stmt = select(UserBookData).where(
            UserBookData.user_id == current_user.id,
            UserBookData.library_id == library_id,
            UserBookData.book_id == library_book.book_id,
        )
        user_data = (await session.exec(user_data_stmt)).scalars().first()

        if user_data and user_data.reading_status == "Read":
            read_count += 1

    total_books = len(library_books)

    # Calculate aggregate status
    if read_count == 0:
        status_value = "not_started"
    elif read_count == total_books:
        status_value = "completed"
    else:
        status_value = "reading"

    return {
        "series_id": series_id,
        "reading_status": status_value,
        "total_books": total_books,
        "read_books": read_count,
    }


@router.post("", response_model=SeriesRead, status_code=status.HTTP_201_CREATED)
async def create_series(
    library_id: UUID,
    series_in: SeriesCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> SeriesRead:
    await require_library_permission(
        library_id,
        current_user.id,
        session,
        (MemberRole.OWNER, MemberRole.ADMIN),
    )

    statement = select(Series).where(
        Series.name == series_in.name,
        Series.library_id == library_id,
    )
    result = await session.exec(statement)
    existing = result.first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Series name already exists in this library",
        )

    series = Series(**series_in.model_dump())
    session.add(series)
    await session.commit()
    await session.refresh(series)
    return SeriesRead.model_validate(series)


@router.patch("/{series_id}", response_model=SeriesRead)
async def update_series(
    library_id: UUID,
    series_id: int,
    series_in: SeriesUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> SeriesRead:
    await require_library_permission(
        library_id,
        current_user.id,
        session,
        (MemberRole.OWNER, MemberRole.ADMIN),
    )

    series = await session.get(Series, series_id)
    if not series or series.library_id != library_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")

    if series_in.cover_book_id is not None:
        book_check_stmt = select(LibraryBook).where(
            LibraryBook.library_id == library_id,
            LibraryBook.book_id == series_in.cover_book_id,
        )
        if (await session.exec(book_check_stmt)).one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cover book must belong to this library",
            )

    update_data = series_in.model_dump(exclude_unset=True)
    previous_custom_cover = series.custom_cover_path
    for field, value in update_data.items():
        setattr(series, field, value)

    if "custom_cover_path" in update_data and update_data.get("custom_cover_path") is None:
        _remove_custom_cover(previous_custom_cover)

    series.updated_at = datetime.utcnow()
    session.add(series)
    await session.commit()
    await session.refresh(series)
    return SeriesRead.model_validate(series)


@router.post("/{series_id}/cover", response_model=SeriesRead)
async def upload_series_cover(
    library_id: UUID,
    series_id: int,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> SeriesRead:
    await require_library_permission(
        library_id,
        current_user.id,
        session,
        (MemberRole.OWNER, MemberRole.ADMIN),
    )

    series = await session.get(Series, series_id)
    if not series or series.library_id != library_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image",
        )

    _remove_custom_cover(series.custom_cover_path)

    file_extension = Path(file.filename or "image.jpg").suffix or ".jpg"
    unique_filename = f"series-{series_id}-{uuid.uuid4()}{file_extension}"
    relative_path = Path(unique_filename)
    file_path = SERIES_COVERS_DIR / relative_path
    file_path.parent.mkdir(parents=True, exist_ok=True)

    contents = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    series.custom_cover_path = str(relative_path).replace("\\", "/")
    series.cover_book_id = None
    series.updated_at = datetime.utcnow()
    session.add(series)
    await session.commit()
    await session.refresh(series)

    return SeriesRead.model_validate(series)


@router.delete("/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_series(
    library_id: UUID,
    series_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> None:
    await require_library_permission(
        library_id,
        current_user.id,
        session,
        (MemberRole.OWNER, MemberRole.ADMIN),
    )

    series = await session.get(Series, series_id)
    if not series or series.library_id != library_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Series not found")

    _remove_custom_cover(series.custom_cover_path)

    stmt = select(LibraryBook).where(
        LibraryBook.library_id == library_id,
        LibraryBook.series == series.name,
    )
    records = (await session.exec(stmt)).all()

    for library_book in records:
        library_book.series = None
        session.add(library_book)

    await session.delete(series)
    await session.commit()
    return None
