"""
Book model (v2) - Intrinsic metadata only.
This represents the abstract concept of a book with publisher-provided metadata.
Physical copies are tracked in LibraryBook, personal data in UserBookData.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlalchemy.dialects.sqlite import JSON
from sqlmodel import Field, SQLModel


class BookV2Base(SQLModel):
    """Intrinsic book metadata - data that's true for all copies of this book."""

    title: str = Field(index=True)
    authors: list[str] | None = Field(default=None, sa_column=Column(JSON))
    isbn: str | None = Field(default=None, index=True)
    publisher: str | None = None
    description: str | None = None
    publish_date: str | None = None
    subjects: list[str] | None = Field(default=None, sa_column=Column(JSON))
    language: list[str] | None = Field(default=None, sa_column=Column(JSON))
    page_count: int | None = None
    cover_url: str | None = Field(
        default=None, description="External cover URL from metadata provider"
    )

    # Enrichment workflow fields
    metadata_status: str = Field(
        default="pending", description="pending|awaiting_review|complete|failed"
    )
    metadata_candidate: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(JSON),
        description="Suggested metadata values awaiting review",
    )


class BookV2(BookV2Base, table=True):
    """Book table - stores intrinsic metadata shared across all copies."""

    __tablename__ = "books_v2"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class BookV2Create(BookV2Base):
    """Schema for creating a new book."""
    pass


class BookV2Read(BookV2Base):
    """Schema for reading book data."""

    id: UUID
    created_at: datetime
    updated_at: datetime


class BookV2Update(SQLModel):
    """Schema for updating book data - all fields optional."""

    title: str | None = None
    authors: list[str] | None = None
    isbn: str | None = None
    publisher: str | None = None
    description: str | None = None
    publish_date: str | None = None
    subjects: list[str] | None = None
    language: list[str] | None = None
    page_count: int | None = None
    cover_url: str | None = None
    metadata_status: str | None = None
    metadata_candidate: dict[str, Any] | None = None
