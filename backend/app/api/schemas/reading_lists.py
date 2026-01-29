from __future__ import annotations

from typing import List
from uuid import UUID

from sqlmodel import SQLModel

from app.models import (
    ReadingListItemRead,
    ReadingListMemberRead,
    ReadingListProgress,
    ReadingListRead,
    ReadingListRole,
)


class ReadingListSummary(SQLModel):
    id: UUID
    title: str
    description: str | None
    visibility: str
    owner_id: UUID
    item_count: int
    member_count: int
    role: ReadingListRole | None


class ReadingListDetail(SQLModel):
    list: ReadingListRead
    items: List[ReadingListItemRead]
    members: List[ReadingListMemberRead]
    progress: List[ReadingListProgress]
