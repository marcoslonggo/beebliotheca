"""Tests for admin management endpoints."""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlmodel import select

from app.models import LibraryMember, MemberRole, User
from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_list_users_requires_admin(
    client: AsyncClient,
    auth_token: str,
) -> None:
    """Non-admin users should receive 403 when accessing admin endpoints."""

    response = await client.get("/api/admin/users", headers=auth_headers(auth_token))

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_users_includes_memberships(
    client: AsyncClient,
    session,
    admin_auth_token: str,
    admin_user: User,
    test_user: User,
    test_user2: User,
    test_library,
) -> None:
    """Admin should receive user detail with library memberships."""

    # Add second user to the test library
    member = LibraryMember(
        library_id=test_library.id,
        user_id=test_user2.id,
        role=MemberRole.MEMBER,
    )
    session.add(member)
    await session.commit()

    response = await client.get("/api/admin/users", headers=auth_headers(admin_auth_token))

    assert response.status_code == 200
    data = response.json()
    usernames = {user["username"] for user in data}
    assert {"adminuser", "testuser", "testuser2"}.issubset(usernames)

    test_user_entry = next(item for item in data if item["username"] == "testuser")
    assert test_user_entry["is_admin"] is False
    assert len(test_user_entry["libraries"]) == 1

    library_info = test_user_entry["libraries"][0]
    assert library_info["library_name"] == test_library.name
    assert library_info["role"] == MemberRole.OWNER.value
    member_usernames = {member_data["username"] for member_data in library_info["members"]}
    assert {"testuser", "testuser2"}.issubset(member_usernames)


@pytest.mark.asyncio
async def test_update_admin_status(
    client: AsyncClient,
    session,
    admin_auth_token: str,
    test_user: User,
) -> None:
    """Admin can promote other users to admin."""

    response = await client.patch(
        f"/api/admin/users/{test_user.id}/admin",
        json={"is_admin": True},
        headers=auth_headers(admin_auth_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_admin"] is True

    # Demoting the newly promoted admin should succeed because another admin exists
    response = await client.patch(
        f"/api/admin/users/{test_user.id}/admin",
        json={"is_admin": False},
        headers=auth_headers(admin_auth_token),
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_admin"] is False


@pytest.mark.asyncio
async def test_cannot_remove_last_admin(
    client: AsyncClient,
    admin_auth_token: str,
    admin_user: User,
) -> None:
    """The last admin cannot be demoted."""

    response = await client.patch(
        f"/api/admin/users/{admin_user.id}/admin",
        json={"is_admin": False},
        headers=auth_headers(admin_auth_token),
    )

    assert response.status_code == 400
    assert "admin" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_update_user_password(
    client: AsyncClient,
    admin_auth_token: str,
    test_user: User,
) -> None:
    """Admin can reset a user's password."""

    response = await client.patch(
        f"/api/admin/users/{test_user.id}/password",
        json={"new_password": "newsecurepass!"},
        headers=auth_headers(admin_auth_token),
    )

    assert response.status_code == 204

    # Old password should fail
    old_login = await client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "testpass123"},
    )
    assert old_login.status_code == 401

    # New password should succeed
    new_login = await client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "newsecurepass!"},
    )
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_update_membership_role(
    client: AsyncClient,
    session,
    admin_auth_token: str,
    test_user2: User,
    test_library,
) -> None:
    """Admin can change a user's library role."""

    membership = LibraryMember(
        library_id=test_library.id,
        user_id=test_user2.id,
        role=MemberRole.MEMBER,
    )
    session.add(membership)
    await session.commit()

    response = await client.patch(
        f"/api/admin/users/{test_user2.id}/libraries/{test_library.id}",
        json={"role": MemberRole.ADMIN.value},
        headers=auth_headers(admin_auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["role"] == MemberRole.ADMIN.value

    updated_membership = await session.exec(
        select(LibraryMember).where(
            LibraryMember.user_id == test_user2.id,
            LibraryMember.library_id == test_library.id,
        )
    )
    membership_row = updated_membership.first()
    assert membership_row is not None
    assert membership_row.role == MemberRole.ADMIN


@pytest.mark.asyncio
async def test_remove_user_from_library(
    client: AsyncClient,
    session,
    admin_auth_token: str,
    test_user2: User,
    test_library,
) -> None:
    """Admin can remove a non-owner from a library."""

    membership = LibraryMember(
        library_id=test_library.id,
        user_id=test_user2.id,
        role=MemberRole.MEMBER,
    )
    session.add(membership)
    await session.commit()

    response = await client.delete(
        f"/api/admin/users/{test_user2.id}/libraries/{test_library.id}",
        headers=auth_headers(admin_auth_token),
    )

    assert response.status_code == 204

    deleted = await session.exec(
        select(LibraryMember).where(
            LibraryMember.user_id == test_user2.id,
            LibraryMember.library_id == test_library.id,
        )
    )
    assert deleted.first() is None
