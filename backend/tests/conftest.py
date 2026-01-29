"""Test configuration and fixtures."""
from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator, Generator
from typing import Any

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_session
from app.main import app
from app.models import Library, LibraryMember, MemberRole, User
from app.services.auth import get_password_hash
# Import all model modules to ensure they're registered with SQLModel
from app.models import reading_list, series, book_club  # noqa: F401


# Test database URL (in-memory SQLite for tests)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
    )

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async with AsyncSession(test_engine, expire_on_commit=False) as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create a test client with test database session."""

    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        yield session

    app.dependency_overrides[get_session] = override_get_session

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield client

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        username="testuser",
        email="test@example.com",
        full_name="Test User",
        password_hash=get_password_hash("testpass123"),
        is_admin=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user2(session: AsyncSession) -> User:
    """Create a second test user."""
    user = User(
        username="testuser2",
        email="test2@example.com",
        full_name="Test User 2",
        password_hash=get_password_hash("testpass456"),
        is_admin=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def admin_user(session: AsyncSession) -> User:
    """Create an admin user."""
    user = User(
        username="adminuser",
        email="admin@example.com",
        full_name="Admin User",
        password_hash=get_password_hash("adminpass123"),
        is_admin=True,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_token(client: AsyncClient, test_user: User) -> str:
    """Get authentication token for test user."""
    response = await client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "testpass123"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def auth_token2(client: AsyncClient, test_user2: User) -> str:
    """Get authentication token for second test user."""
    response = await client.post(
        "/api/auth/login",
        json={"email": test_user2.email, "password": "testpass456"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def admin_auth_token(client: AsyncClient, admin_user: User) -> str:
    """Get authentication token for admin user."""
    response = await client.post(
        "/api/auth/login",
        json={"email": admin_user.email, "password": "adminpass123"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


@pytest_asyncio.fixture
async def test_library(session: AsyncSession, test_user: User) -> Library:
    """Create a test library owned by test_user."""
    library = Library(
        name="Test Library",
        description="A test library",
        owner_id=test_user.id,
    )
    session.add(library)
    await session.commit()
    await session.refresh(library)

    # Add owner as owner member
    member = LibraryMember(
        library_id=library.id,
        user_id=test_user.id,
        role=MemberRole.OWNER,
    )
    session.add(member)
    await session.commit()

    return library


@pytest_asyncio.fixture
async def test_library2(session: AsyncSession, test_user2: User) -> Library:
    """Create a second test library owned by test_user2."""
    library = Library(
        name="Test Library 2",
        description="A second test library",
        owner_id=test_user2.id,
    )
    session.add(library)
    await session.commit()
    await session.refresh(library)

    # Add owner as owner member
    member = LibraryMember(
        library_id=library.id,
        user_id=test_user2.id,
        role=MemberRole.OWNER,
    )
    session.add(member)
    await session.commit()

    return library


def auth_headers(token: str) -> dict[str, str]:
    """Create authorization headers with Bearer token."""
    return {"Authorization": f"Bearer {token}"}
