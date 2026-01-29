from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import BookV2, EnrichmentJob, EnrichmentStatus
from app.services.metadata import fetch_metadata

MetadataDict = dict[str, Any]
CandidateEntry = dict[str, Any]


async def queue_enrichment(
    book: BookV2,
    session: AsyncSession,
    *,
    identifier: str | None = None,
) -> EnrichmentJob:
    job_identifier = identifier or book.isbn
    if not job_identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot queue enrichment without an ISBN or identifier",
        )

    statement = select(EnrichmentJob).where(
        EnrichmentJob.book_id == book.id,
        EnrichmentJob.status.in_(
            [EnrichmentStatus.PENDING, EnrichmentStatus.IN_PROGRESS]
        ),
    )
    existing_job = (await session.exec(statement)).first()
    if existing_job:
        return existing_job

    job = EnrichmentJob(book_id=book.id, identifier=job_identifier)
    session.add(job)
    await session.commit()
    await session.refresh(job)
    return job


def _is_empty(value: Any) -> bool:
    return value in (None, "", [], {}, ())


def _build_candidate(book: BookV2, metadata: MetadataDict) -> dict[str, CandidateEntry]:
    candidate: dict[str, CandidateEntry] = {}
    for field, suggestion in metadata.items():
        if _is_empty(suggestion):
            continue

        if not hasattr(book, field):
            continue

        current = getattr(book, field, None)
        if _is_empty(current):
            setattr(book, field, suggestion)
        elif current != suggestion:
            candidate[field] = {"current": current, "suggested": suggestion}
    return candidate


def _update_metadata_state(book: BookV2, candidate: dict[str, CandidateEntry]) -> None:
    if candidate:
        book.metadata_candidate = candidate
        book.metadata_status = EnrichmentStatus.AWAITING_REVIEW
    else:
        book.metadata_candidate = None
        if book.metadata_status != EnrichmentStatus.FAILED:
            book.metadata_status = EnrichmentStatus.COMPLETE


async def process_enrichment_job(job: EnrichmentJob, session: AsyncSession) -> BookV2:
    book = await session.get(BookV2, job.book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found for enrichment",
        )

    job.status = EnrichmentStatus.IN_PROGRESS
    job.attempts += 1
    job.updated_at = datetime.utcnow()
    session.add(job)
    await session.commit()

    print(f"[ENRICHMENT] Starting metadata fetch for identifier: {job.identifier}")
    metadata = await fetch_metadata(job.identifier)
    print(f"[ENRICHMENT] Metadata result: {metadata}")

    if not metadata:
        print(f"[ENRICHMENT] No metadata found for identifier: {job.identifier}")
        job.status = EnrichmentStatus.FAILED
        job.last_error = "No metadata found"
        job.updated_at = datetime.utcnow()
        book.metadata_status = EnrichmentStatus.FAILED
        book.updated_at = datetime.utcnow()
        session.add(job)
        session.add(book)
        await session.commit()
        await session.refresh(book)
        return book

    print("[ENRICHMENT] Building candidate from metadata")
    candidate = _build_candidate(book, metadata)
    print(f"[ENRICHMENT] Candidate: {candidate}")
    book.updated_at = datetime.utcnow()
    _update_metadata_state(book, candidate)

    job.status = EnrichmentStatus.COMPLETE
    job.updated_at = datetime.utcnow()
    session.add(job)
    session.add(book)
    await session.commit()
    await session.refresh(book)
    return book


async def apply_metadata_candidate(
    book: BookV2,
    session: AsyncSession,
    fields: Iterable[str] | None = None,
    accept_all: bool = False,
) -> BookV2:
    candidate = book.metadata_candidate or {}
    if not candidate:
        return book

    if accept_all:
        fields_to_apply = list(candidate.keys())
    elif fields is None:
        fields_to_apply = []
    else:
        fields_to_apply = list(fields)

    for field in fields_to_apply:
        suggestion = candidate.get(field)
        if not suggestion:
            continue
        suggested_value = suggestion.get("suggested")
        setattr(book, field, suggested_value)

    remaining = {
        key: value for key, value in candidate.items() if key not in fields_to_apply
    }
    book.updated_at = datetime.utcnow()
    _update_metadata_state(book, remaining)
    session.add(book)
    await session.commit()
    await session.refresh(book)
    return book


async def reject_metadata_candidate(book: BookV2, session: AsyncSession) -> BookV2:
    book.metadata_candidate = None
    if book.metadata_status != EnrichmentStatus.FAILED:
        book.metadata_status = EnrichmentStatus.COMPLETE
    book.updated_at = datetime.utcnow()
    session.add(book)
    await session.commit()
    await session.refresh(book)
    return book
