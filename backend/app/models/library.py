from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class LibraryBase(SQLModel):
    name: str = Field(index=True)
    description: str | None = None


class Library(LibraryBase, table=True):
    __tablename__ = "libraries"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class LibraryCreate(LibraryBase):
    pass


class LibraryRead(LibraryBase):
    id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: datetime


class LibraryWithRole(LibraryRead):
    """Library with current user's role."""

    user_role: str | None = None  # owner, admin, member, viewer


class LibraryUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
