from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_current_user, get_session
from app.api.schemas.library_books import LibraryBookDetail
from app.api.utils.library_access import (
    get_library_book,
    get_user_book_data,
    require_library_member,
    require_library_permission,
)
from app.models import (
    BookV2Read,
    EnrichmentJob,
    EnrichmentStatus,
    LibraryBook,
    LibraryBookRead,
    MemberRole,
    User,
    UserBookDataRead,
)
from app.services.enrichment import (
    apply_metadata_candidate,
    process_enrichment_job,
    queue_enrichment,
    reject_metadata_candidate,
)
from app.services.metadata import fetch_metadata, search_books as search_external_metadata

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/libraries/{library_id}/enrichment", tags=["enrichment"])


class CandidateResponse(BaseModel):
    book_id: UUID
    metadata_candidate: dict[str, dict[str, object]] | None
    metadata_status: str


class CandidateApplyRequest(BaseModel):
    fields: list[str] = Field(
        default_factory=list,
        description="Fields to apply from the candidate data. Empty list applies all.",
    )


@router.post("/books/{library_book_id}", response_model=LibraryBookDetail)
async def enrich_book(
    library_id: UUID,
    library_book_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> LibraryBookDetail:
    await require_library_permission(
        library_id,
        current_user.id,
        session,
        (MemberRole.OWNER, MemberRole.ADMIN),
    )

    library_book, book = await get_library_book(library_id, library_book_id, session)

    job = await queue_enrichment(book, session)
    if job.status == EnrichmentStatus.IN_PROGRESS:
        await session.refresh(book)
    else:
        book = await process_enrichment_job(job, session)

    user_data = await get_user_book_data(library_book, current_user.id, session)
    return LibraryBookDetail(
        book=BookV2Read.model_validate(book),
        library_book=LibraryBookRead.model_validate(library_book),
        personal_data=UserBookDataRead.model_validate(user_data) if user_data else None,
    )


@router.post("/jobs/{job_id}", response_model=LibraryBookDetail)
async def process_job(
    library_id: UUID,
    job_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> LibraryBookDetail:
    await require_library_permission(
        library_id,
        current_user.id,
        session,
        (MemberRole.OWNER, MemberRole.ADMIN),
    )

    job = await session.get(EnrichmentJob, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    library_book_stmt = select(LibraryBook).where(
        LibraryBook.book_id == job.book_id,
        LibraryBook.library_id == library_id,
    )
    library_book = (await session.exec(library_book_stmt)).one_or_none()
    if not library_book:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Enrichment job not associated with this library",
        )

    book = await process_enrichment_job(job, session)
    user_data = await get_user_book_data(library_book, current_user.id, session)
    return LibraryBookDetail(
        book=BookV2Read.model_validate(book),
        library_book=LibraryBookRead.model_validate(library_book),
        personal_data=UserBookDataRead.model_validate(user_data) if user_data else None,
    )


@router.get("/books/{library_book_id}/candidate", response_model=CandidateResponse)
async def get_candidate(
    library_id: UUID,
    library_book_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> CandidateResponse:
    await require_library_member(library_id, current_user.id, session)
    _, book = await get_library_book(library_id, library_book_id, session)
    await session.refresh(book)
    return CandidateResponse(
        book_id=book.id,
        metadata_candidate=book.metadata_candidate,
        metadata_status=book.metadata_status,
    )


@router.post("/books/{library_book_id}/candidate/apply", response_model=LibraryBookDetail)
async def apply_candidate(
    library_id: UUID,
    library_book_id: UUID,
    payload: CandidateApplyRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> LibraryBookDetail:
    await require_library_permission(
        library_id,
        current_user.id,
        session,
        (MemberRole.OWNER, MemberRole.ADMIN),
    )

    library_book, book = await get_library_book(library_id, library_book_id, session)
    book = await apply_metadata_candidate(
        book,
        session,
        fields=payload.fields,
        accept_all=not payload.fields,
    )

    user_data = await get_user_book_data(library_book, current_user.id, session)
    return LibraryBookDetail(
        book=BookV2Read.model_validate(book),
        library_book=LibraryBookRead.model_validate(library_book),
        personal_data=UserBookDataRead.model_validate(user_data) if user_data else None,
    )


@router.post("/books/{library_book_id}/candidate/reject", response_model=LibraryBookDetail)
async def reject_candidate(
    library_id: UUID,
    library_book_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> LibraryBookDetail:
    await require_library_permission(
        library_id,
        current_user.id,
        session,
        (MemberRole.OWNER, MemberRole.ADMIN),
    )

    library_book, book = await get_library_book(library_id, library_book_id, session)
    book = await reject_metadata_candidate(book, session)

    user_data = await get_user_book_data(library_book, current_user.id, session)
    return LibraryBookDetail(
        book=BookV2Read.model_validate(book),
        library_book=LibraryBookRead.model_validate(library_book),
        personal_data=UserBookDataRead.model_validate(user_data) if user_data else None,
    )


@router.get("/search")
async def search_books_endpoint(
    library_id: UUID,
    query: str | None = None,
    search_type: str = "auto",
    max_results: int = 10,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, object]]:
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query parameter is required",
        )

    await require_library_member(library_id, current_user.id, session)

    try:
        return await search_external_metadata(
            query, search_type=search_type, max_results=max_results
        )
    except Exception as exc:
        logger.error(
            "Error searching books for query '%s': %s",
            query,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search books: {exc}",
        )


@router.get("/preview/{identifier}")
async def get_metadata_preview(
    library_id: UUID,
    identifier: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    await require_library_member(library_id, current_user.id, session)

    from app.services.metadata import fetch_metadata

    logger.info(f"Metadata preview requested for identifier: {identifier}")

    metadata = await fetch_metadata(identifier)
    logger.info("Metadata preview response for %s: %s", identifier, metadata)
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No metadata found for this identifier",
        )
    return metadata

