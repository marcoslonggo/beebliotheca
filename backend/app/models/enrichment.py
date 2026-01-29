from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlmodel import Field, SQLModel


class EnrichmentStatus:
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETE = "complete"
    FAILED = "failed"
    AWAITING_REVIEW = "awaiting_review"


class EnrichmentJob(SQLModel, table=True):
    __tablename__ = "enrichment_jobs"

    id: int | None = Field(default=None, primary_key=True)
    book_id: UUID = Field(foreign_key="books_v2.id", index=True)
    identifier: str
    provider: str = Field(default="openlibrary")
    status: str = Field(default=EnrichmentStatus.PENDING)
    attempts: int = Field(default=0)
    last_error: str | None = None
    scheduled_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
