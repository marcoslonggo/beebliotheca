from __future__ import annotations

from datetime import datetime, timedelta
from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class LibraryInvitationBase(SQLModel):
    library_id: UUID = Field(foreign_key="libraries.id", index=True)
    inviter_id: UUID = Field(foreign_key="users.id", index=True)
    invitee_username: str
    invitee_id: UUID | None = Field(default=None, foreign_key="users.id", index=True)
    role: str  # MemberRole enum value (admin or viewer)
    status: InvitationStatus = Field(default=InvitationStatus.PENDING)


class LibraryInvitation(LibraryInvitationBase, table=True):
    __tablename__ = "library_invitations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    expires_at: datetime = Field(
        default_factory=lambda: datetime.utcnow() + timedelta(days=7), nullable=False
    )
    responded_at: datetime | None = None


class LibraryInvitationCreate(SQLModel):
    invitee_username: str
    role: str  # MemberRole enum value


class LibraryInvitationRead(LibraryInvitationBase):
    id: UUID
    created_at: datetime
    expires_at: datetime
    responded_at: datetime | None


class LibraryInvitationWithDetails(LibraryInvitationRead):
    """Extended invitation with library and inviter details."""

    library_name: str
    inviter_username: str
    inviter_full_name: str
