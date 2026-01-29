"""
LibraryBook model - Physical copy data for a book in a specific library.
Each library has its own physical copy of a book with unique attributes
(condition, location, loan status, local cover, series assignment).
"""
from __future__ import annotations

from datetime import date, datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, UniqueConstraint


class LibraryBookBase(SQLModel):
    """Physical copy data - unique to each book in each library."""

    # Ownership and physical attributes
    ownership_status: str = Field(
        default="To Check",
        description="Ownership status: Wanted, Owned, To Check",
    )
    condition: str | None = Field(
        default=None,
        description="Physical condition: New, Good, Fair, Poor",
    )
    physical_location: str | None = Field(
        default=None, description="Shelf, box, or storage location identifier"
    )
    book_type: str | None = Field(
        default=None,
        description="Format type: paperback, hardcover, ebook, pdf, audiobook",
    )
    series: str | None = Field(
        default=None, description="Series name this physical copy belongs to"
    )
    acquisition_date: date | None = Field(
        default=None, description="Date this copy was acquired by the library"
    )
    library_notes: str | None = Field(
        default=None,
        description="Notes about this copy visible to all library members",
    )

    # Loan tracking (library-level)
    loan_status: str = Field(
        default="available", description="available|checked_out"
    )
    checked_out_to: UUID | None = Field(
        default=None,
        foreign_key="users.id",
        description="User ID of borrower if checked out",
    )
    checked_out_at: datetime | None = Field(
        default=None, description="When the book was checked out"
    )
    due_date: datetime | None = Field(
        default=None, description="Due date for the current loan, if any"
    )

    # Local cover override
    cover_image_path: str | None = Field(
        default=None, description="Local file path for uploaded cover image"
    )


class LibraryBook(LibraryBookBase, table=True):
    """
    Physical copy of a book in a specific library.
    One LibraryBook record per book per library.
    """

    __tablename__ = "library_books"
    __table_args__ = (UniqueConstraint("book_id", "library_id"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    book_id: UUID = Field(foreign_key="books_v2.id", index=True)
    library_id: UUID = Field(foreign_key="libraries.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class LibraryBookCreate(LibraryBookBase):
    """Schema for creating a library book."""

    book_id: UUID
    library_id: UUID


class LibraryBookRead(LibraryBookBase):
    """Schema for reading library book data."""

    id: UUID
    book_id: UUID
    library_id: UUID
    created_at: datetime
    updated_at: datetime


class LibraryBookUpdate(SQLModel):
    """Schema for updating library book data - all fields optional."""

    ownership_status: str | None = None
    condition: str | None = None
    physical_location: str | None = None
    book_type: str | None = None
    series: str | None = None
    acquisition_date: date | None = None
    library_notes: str | None = None
    loan_status: str | None = None
    checked_out_to: UUID | None = None
    checked_out_at: datetime | None = None
    due_date: datetime | None = None
    cover_image_path: str | None = None
