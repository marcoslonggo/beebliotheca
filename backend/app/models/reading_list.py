from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, Enum as SQLAlchemyEnum
from sqlmodel import Field, SQLModel, UniqueConstraint


class ListVisibility(str, Enum):
    PRIVATE = "private"
    SHARED = "shared"
    PUBLIC = "public"


class ReadingListBase(SQLModel):
    title: str
    description: str | None = None
    visibility: ListVisibility = Field(
        default=ListVisibility.PRIVATE,
        sa_column=Column(
            SQLAlchemyEnum(
                ListVisibility,
                values_callable=lambda x: [e.value for e in x],
                native_enum=False,
                create_constraint=False,
                length=20
            )
        )
    )


class ReadingList(ReadingListBase, table=True):
    __tablename__ = "reading_lists"

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    owner_id: UUID = Field(foreign_key="users.id", index=True, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class ReadingListCreate(ReadingListBase):
    pass


class ReadingListUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[ListVisibility] = None


class ReadingListRead(ReadingListBase):
    id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: datetime


class ReadingListItemType(str, Enum):
    BOOK = "book"
    EXTERNAL = "external"


class ReadingListItemBase(SQLModel):
    title: str
    author: str | None = None
    isbn: str | None = None
    notes: str | None = None
    cover_image_url: str | None = None


class ReadingListItem(ReadingListItemBase, table=True):
    __tablename__ = "reading_list_items"

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    list_id: UUID = Field(foreign_key="reading_lists.id", nullable=False, index=True)
    order_index: int = Field(default=0, nullable=False)
    book_id: UUID | None = Field(default=None, foreign_key="books_v2.id")
    item_type: ReadingListItemType = Field(
        default=ReadingListItemType.BOOK,
        sa_column=Column(
            SQLAlchemyEnum(
                ReadingListItemType,
                values_callable=lambda x: [e.value for e in x],
                native_enum=False,
                create_constraint=False,
                length=20
            )
        )
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class ReadingListItemCreate(ReadingListItemBase):
    book_id: UUID | None = None
    item_type: ReadingListItemType = ReadingListItemType.BOOK
    order_index: int | None = None


class ReadingListItemUpdate(SQLModel):
    title: Optional[str] = None
    author: Optional[str] = None
    isbn: Optional[str] = None
    notes: Optional[str] = None
    cover_image_url: Optional[str] = None
    order_index: Optional[int] = None


class ReadingListItemRead(ReadingListItemBase):
    id: UUID
    list_id: UUID
    order_index: int
    book_id: UUID | None
    item_type: ReadingListItemType
    created_at: datetime
    updated_at: datetime


class ReadingListRole(str, Enum):
    OWNER = "owner"
    COLLABORATOR = "collaborator"
    VIEWER = "viewer"


class ReadingListMemberBase(SQLModel):
    list_id: UUID = Field(foreign_key="reading_lists.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    role: ReadingListRole = Field(
        default=ReadingListRole.VIEWER,
        sa_column=Column(
            SQLAlchemyEnum(
                ReadingListRole,
                values_callable=lambda x: [e.value for e in x],
                native_enum=False,
                create_constraint=False,
                length=20
            )
        )
    )


class ReadingListMember(ReadingListMemberBase, table=True):
    __tablename__ = "reading_list_members"
    __table_args__ = (UniqueConstraint("list_id", "user_id"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    invited_by: UUID | None = Field(default=None, foreign_key="users.id")
    joined_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class ReadingListMemberCreate(SQLModel):
    user_id: UUID
    role: ReadingListRole = ReadingListRole.VIEWER


class ReadingListMemberUpdate(SQLModel):
    role: ReadingListRole


class ReadingListMemberRead(ReadingListMemberBase):
    id: UUID
    invited_by: UUID | None
    joined_at: datetime


class ReadingListProgressStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ReadingListProgressBase(SQLModel):
    status: ReadingListProgressStatus = Field(
        default=ReadingListProgressStatus.NOT_STARTED,
        sa_column=Column(
            SQLAlchemyEnum(
                ReadingListProgressStatus,
                values_callable=lambda x: [e.value for e in x],
                native_enum=False,
                create_constraint=False,
                length=20
            )
        )
    )
    completed_at: datetime | None = None
    notes: str | None = None


class ReadingListProgress(ReadingListProgressBase, table=True):
    __tablename__ = "reading_list_progress"
    __table_args__ = (UniqueConstraint("list_id", "list_item_id", "user_id"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True, nullable=False)
    list_id: UUID = Field(foreign_key="reading_lists.id", index=True, nullable=False)
    list_item_id: UUID = Field(foreign_key="reading_list_items.id", index=True, nullable=False)
    user_id: UUID = Field(foreign_key="users.id", index=True, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class ReadingListProgressUpdate(SQLModel):
    status: ReadingListProgressStatus
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None

