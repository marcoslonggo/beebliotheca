from __future__ import annotations

from datetime import datetime
from typing import List
from uuid import UUID

from pydantic import ConfigDict
from sqlmodel import Field, SQLModel

from app.models import MemberRole


class AdminLibraryMemberInfo(SQLModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: UUID
    username: str
    full_name: str
    role: MemberRole
    is_admin: bool = Field(default=False)


class AdminUserLibrary(SQLModel):
    model_config = ConfigDict(from_attributes=True)

    library_id: UUID
    library_name: str
    role: MemberRole
    member_count: int
    members: List[AdminLibraryMemberInfo]


class AdminUserDetail(SQLModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    email: str
    full_name: str
    is_admin: bool
    created_at: datetime
    updated_at: datetime
    libraries: List[AdminUserLibrary]


class AdminUpdateUserAdminStatus(SQLModel):
    is_admin: bool


class AdminUpdatePassword(SQLModel):
    new_password: str = Field(min_length=8)


class AdminUpdateLibraryRole(SQLModel):
    role: MemberRole
