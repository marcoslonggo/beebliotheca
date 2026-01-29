from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class UserBase(SQLModel):
    username: str = Field(unique=True, index=True, min_length=3, max_length=30)
    email: str = Field(unique=True, index=True)
    full_name: str


class User(UserBase, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    password_hash: str  # bcrypt hashed password
    is_admin: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)


class UserCreate(SQLModel):
    username: str
    email: str
    full_name: str
    password: str  # Plain password, will be hashed


class UserRead(UserBase):
    id: UUID
    is_admin: bool
    created_at: datetime
    updated_at: datetime


class UserLogin(SQLModel):
    email: str
    password: str


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"
