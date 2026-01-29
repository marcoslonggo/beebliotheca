from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, UniqueConstraint


class BookClubBase(SQLModel):
    name: str
    description: str | None = None
    slug: str | None = Field(default=None, index=True)


class BookClub(BookClubBase, table=True):
    __tablename__ = "book_clubs"

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    owner_id: UUID = Field(foreign_key="users.id", nullable=False, index=True)
    current_book_id: UUID | None = Field(default=None, foreign_key="books_v2.id")
    pages_total_override: int | None = Field(default=None, ge=1)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class BookClubCreate(BookClubBase):
    current_book_id: UUID | None = None
    pages_total_override: int | None = Field(default=None, ge=1)


class BookClubUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    current_book_id: UUID | None = None
    slug: str | None = None
    pages_total_override: int | None = Field(default=None, ge=1)


class BookClubRead(BookClubBase):
    id: UUID
    owner_id: UUID
    current_book_id: UUID | None
    pages_total_override: int | None
    created_at: datetime
    updated_at: datetime


class BookClubRole(str, Enum):
    OWNER = "owner"
    MODERATOR = "moderator"
    MEMBER = "member"


class BookClubMemberBase(SQLModel):
    club_id: UUID = Field(foreign_key="book_clubs.id", nullable=False, index=True)
    user_id: UUID = Field(foreign_key="users.id", nullable=False, index=True)
    role: BookClubRole = Field(default=BookClubRole.MEMBER)


class BookClubMember(BookClubMemberBase, table=True):
    __tablename__ = "book_club_members"
    __table_args__ = (UniqueConstraint("club_id", "user_id"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    joined_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    last_active_at: datetime | None = None
    left_at: datetime | None = None
    removed_by: UUID | None = Field(default=None, foreign_key="users.id")


class BookClubMemberCreate(SQLModel):
    user_id: UUID
    role: BookClubRole = BookClubRole.MEMBER


class BookClubMemberUpdate(SQLModel):
    role: BookClubRole
    left_at: datetime | None = None


class BookClubMemberRead(BookClubMemberBase):
    id: UUID
    joined_at: datetime
    last_active_at: datetime | None
    left_at: datetime | None
    removed_by: UUID | None


class BookClubProgress(SQLModel, table=True):
    __tablename__ = "book_club_progress"
    __table_args__ = (UniqueConstraint("club_id", "user_id"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    club_id: UUID = Field(foreign_key="book_clubs.id", nullable=False, index=True)
    user_id: UUID = Field(foreign_key="users.id", nullable=False, index=True)
    current_page: int = Field(default=0, ge=0)
    pages_total: int | None = Field(default=None, ge=1)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class BookClubProgressUpdate(SQLModel):
    current_page: int = Field(ge=0)
    pages_total: int | None = Field(default=None, ge=1)


class BookClubProgressRead(SQLModel):
    id: UUID
    club_id: UUID
    user_id: UUID
    current_page: int
    pages_total: int | None
    updated_at: datetime


class BookClubCommentBase(SQLModel):
    page_number: int = Field(ge=0)
    body: str


class BookClubComment(BookClubCommentBase, table=True):
    __tablename__ = "book_club_comments"

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    club_id: UUID = Field(foreign_key="book_clubs.id", nullable=False, index=True)
    user_id: UUID = Field(foreign_key="users.id", nullable=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class BookClubCommentCreate(BookClubCommentBase):
    pass


class BookClubCommentUpdate(SQLModel):
    body: str | None = None


class BookClubCommentRead(BookClubCommentBase):
    id: UUID
    club_id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


class BookClubBook(SQLModel, table=True):
    __tablename__ = "book_club_books"

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    club_id: UUID = Field(foreign_key="book_clubs.id", nullable=False, index=True)
    book_id: UUID = Field(foreign_key="books_v2.id", nullable=False, index=True)
    started_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    completed_at: datetime | None = None


class BookClubBookRead(SQLModel):
    id: UUID
    club_id: UUID
    book_id: UUID
    started_at: datetime
    completed_at: datetime | None
