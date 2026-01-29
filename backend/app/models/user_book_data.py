"""
UserBookData model - Personal reading data for a user's relationship with a book.
Each user can have their own reading status, progress, notes, and rating
for the same physical book in a library.
"""
from __future__ import annotations

from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel, UniqueConstraint


class UserBookDataBase(SQLModel):
    """Personal reading tracking data - unique to each user per book."""

    # Reading progress
    reading_status: str | None = Field(
        default=None,
        description="to-read, reading, completed, abandoned",
    )
    progress_pages: int | None = Field(
        default=None, description="Current page number"
    )
    progress_percent: float | None = Field(
        default=None, description="Reading progress as percentage (0-100)"
    )
    started_at: date | None = Field(
        default=None, description="Date user started reading this book"
    )
    completed_at: date | None = Field(
        default=None, description="Most recent date user completed reading this book"
    )
    completion_history: list[str] | None = Field(
        default=None,
        sa_column=Column(JSON),
        description="Array of ISO date strings for all times user finished reading",
    )

    # Personal metadata
    grade: int | None = Field(
        default=None, description="User's grade (1-10 scale)", ge=1, le=10
    )
    personal_notes: str | None = Field(
        default=None, description="User's private notes about this book (visible only to user)"
    )
    is_favorite: bool = Field(
        default=False, description="Whether user marked this as favorite"
    )


class UserBookData(UserBookDataBase, table=True):
    """
    Personal reading data for a user's interaction with a book in a library.
    One UserBookData record per user per book per library.
    """

    __tablename__ = "user_book_data"
    __table_args__ = (UniqueConstraint("book_id", "user_id", "library_id"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    book_id: UUID = Field(foreign_key="books_v2.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    library_id: UUID = Field(foreign_key="libraries.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class UserBookDataCreate(UserBookDataBase):
    """Schema for creating user book data."""

    book_id: UUID
    user_id: UUID
    library_id: UUID


class UserBookDataRead(UserBookDataBase):
    """Schema for reading user book data."""

    id: UUID
    book_id: UUID
    user_id: UUID
    library_id: UUID
    created_at: datetime
    updated_at: datetime


class UserBookDataUpdate(SQLModel):
    """Schema for updating user book data - all fields optional."""

    reading_status: str | None = None
    progress_pages: int | None = None
    progress_percent: float | None = None
    started_at: date | None = None
    completed_at: date | None = None
    completion_history: list[str] | None = None
    grade: int | None = Field(default=None, ge=1, le=10)
    personal_notes: str | None = None
    is_favorite: bool | None = None
