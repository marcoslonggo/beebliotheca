from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID, uuid4

from sqlmodel import Column, Field, JSON, SQLModel


class NotificationType(str, Enum):
    LIBRARY_INVITATION = "library_invitation"
    LOAN_REQUEST = "loan_request"
    LOAN_APPROVED = "loan_approved"
    LOAN_DENIED = "loan_denied"
    LOAN_OVERDUE = "loan_overdue"


class NotificationBase(SQLModel):
    user_id: UUID = Field(foreign_key="users.id", index=True)
    type: NotificationType
    title: str
    message: str
    data: dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    read: bool = Field(default=False)


class Notification(NotificationBase, table=True):
    __tablename__ = "notifications"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class NotificationCreate(SQLModel):
    user_id: UUID
    type: NotificationType
    title: str
    message: str
    data: dict[str, Any] = {}


class NotificationRead(NotificationBase):
    id: UUID
    created_at: datetime


class NotificationUpdate(SQLModel):
    read: bool
