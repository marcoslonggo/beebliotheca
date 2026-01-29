from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Column
from sqlalchemy.dialects.sqlite import JSON
from sqlmodel import Field, SQLModel


class BookBase(SQLModel):
    title: str = Field(index=True)
    creator: list[str] | None = Field(default=None, sa_column=Column(JSON))
    subject: list[str] | None = Field(default=None, sa_column=Column(JSON))
    description: str | None = None
    publisher: str | None = None
    contributor: list[str] | None = Field(default=None, sa_column=Column(JSON))
    date: str | None = None
    type: str | None = None
    format: str | None = None
    identifier: str = Field(index=True)
    source: str | None = None
    language: list[str] | None = Field(default=None, sa_column=Column(JSON))
    relation: list[str] | None = Field(default=None, sa_column=Column(JSON))
    coverage: str | None = None
    rights: str | None = None
    auxiliary_fields: dict[str, Any] | None = Field(
        default=None, sa_column=Column(JSON)
    )

    # Auxiliary operational fields
    condition: str | None = Field(
        default=None,
        description="Physical condition description or rating (e.g., New, Good, Fair).",
    )
    shelf_location: str | None = Field(
        default=None, description="Shelf, box, or storage location identifier."
    )
    loan_status: str = Field(
        default="available", description="available|loaned"
    )
    loaned_to: str | None = Field(
        default=None, description="Name or identifier of the borrower if loaned."
    )
    loan_due_date: datetime | None = Field(
        default=None, description="Due date for the current loan, if any."
    )

    cover_image_url: str | None = None
    cover_image_path: str | None = Field(
        default=None, description="Local file path for uploaded cover image"
    )
    metadata_status: str = Field(
        default="pending", description="pending|awaiting_review|complete|failed"
    )
    metadata_candidate: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(JSON),
        description="Suggested metadata values awaiting review",
    )
    series: str | None = Field(
        default=None, description="Series name this book belongs to"
    )


class Book(BookBase, table=True):
    __tablename__ = "books"

    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class BookCreate(BookBase):
    pass


class BookRead(BookBase):
    id: int
    created_at: datetime
    updated_at: datetime


class BookUpdate(SQLModel):
    title: str | None = None
    creator: list[str] | None = None
    subject: list[str] | None = None
    description: str | None = None
    publisher: str | None = None
    contributor: list[str] | None = None
    date: str | None = None
    type: str | None = None
    format: str | None = None
    identifier: str | None = None
    source: str | None = None
    language: list[str] | None = None
    relation: list[str] | None = None
    coverage: str | None = None
    rights: str | None = None
    auxiliary_fields: dict[str, Any] | None = None
    condition: str | None = None
    shelf_location: str | None = None
    loan_status: str | None = None
    loaned_to: str | None = None
    loan_due_date: datetime | None = None
    cover_image_url: str | None = None
    cover_image_path: str | None = None
    metadata_status: str | None = None
    metadata_candidate: dict[str, Any] | None = None
    series: str | None = None

