from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, UniqueConstraint


class MemberRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class LibraryMemberBase(SQLModel):
    library_id: UUID = Field(foreign_key="libraries.id", index=True)
    user_id: UUID = Field(foreign_key="users.id", index=True)
    role: MemberRole = Field(default=MemberRole.MEMBER)


class LibraryMember(LibraryMemberBase, table=True):
    __tablename__ = "library_members"
    __table_args__ = (UniqueConstraint("library_id", "user_id"),)

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    joined_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class LibraryMemberCreate(SQLModel):
    user_id: UUID
    role: MemberRole = MemberRole.MEMBER


class LibraryMemberRead(LibraryMemberBase):
    id: UUID
    joined_at: datetime


class LibraryMemberWithUser(LibraryMemberRead):
    """Extended member info with user details."""

    username: str
    email: str
    full_name: str


class LibraryMemberUpdate(SQLModel):
    role: MemberRole
