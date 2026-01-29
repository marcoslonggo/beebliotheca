from __future__ import annotations

from typing import List
from uuid import UUID

from sqlmodel import SQLModel

from app.models import (
    BookClubBookRead,
    BookClubCommentRead,
    BookClubMemberRead,
    BookClubProgressRead,
    BookClubRead,
    BookClubRole,
)


class BookClubSummary(SQLModel):
    id: UUID
    name: str
    description: str | None
    owner_id: UUID
    current_book_id: UUID | None
    pages_total_override: int | None
    member_count: int
    membership_role: BookClubRole | None
    slug: str | None


class BookClubDetail(SQLModel):
    club: BookClubRead
    members: List[BookClubMemberRead]
    progress: List[BookClubProgressRead]
    comments: List[BookClubCommentRead]
    history: List[BookClubBookRead]
