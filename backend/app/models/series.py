from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlmodel import Field, SQLModel, UniqueConstraint


class SeriesBase(SQLModel):
    name: str = Field(index=True, description="Series name")
    library_id: UUID = Field(foreign_key="libraries.id", index=True)
    description: str | None = Field(default=None, description="Series description")
    publication_status: str = Field(
        default="in_progress",
        description="Publication status: in_progress, finished",
    )
    cover_book_id: UUID | None = Field(
        default=None,
        foreign_key="books_v2.id",
        description="ID of the BookV2 record whose cover represents this series",
    )
    custom_cover_path: str | None = Field(
        default=None,
        description="Custom cover image path for user-uploaded cover",
    )


class Series(SeriesBase, table=True):
    __tablename__ = "series"
    __table_args__ = (UniqueConstraint("name", "library_id"),)

    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class SeriesCreate(SeriesBase):
    pass


class SeriesRead(SeriesBase):
    id: int
    created_at: datetime
    updated_at: datetime


class SeriesUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    publication_status: str | None = None
    cover_book_id: UUID | None = None
    custom_cover_path: str | None = None
