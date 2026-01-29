"""Tests for library endpoints."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.models import Library, User
from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_create_library(client: AsyncClient, auth_token: str):
    """Test creating a new library."""
    response = await client.post(
        "/api/libraries",
        json={
            "name": "My New Library",
            "description": "A personal library",
            "is_public": False,
        },
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My New Library"
    assert data["description"] == "A personal library"
    assert "id" in data
    assert "owner_id" in data


@pytest.mark.asyncio
async def test_create_library_no_auth(client: AsyncClient):
    """Test creating library without authentication fails."""
    response = await client.post(
        "/api/libraries",
        json={"name": "Unauthorized Library"},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_libraries(
    client: AsyncClient, auth_token: str, test_library: Library
):
    """Test listing user's libraries."""
    response = await client.get(
        "/api/libraries",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert any(lib["id"] == str(test_library.id) for lib in data)


@pytest.mark.asyncio
async def test_get_library(
    client: AsyncClient, auth_token: str, test_library: Library
):
    """Test getting a specific library."""
    response = await client.get(
        f"/api/libraries/{test_library.id}",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_library.id)
    assert data["name"] == test_library.name


@pytest.mark.asyncio
async def test_get_library_unauthorized(
    client: AsyncClient, auth_token2: str, test_library: Library
):
    """Test getting library user is not a member of fails."""
    response = await client.get(
        f"/api/libraries/{test_library.id}",
        headers=auth_headers(auth_token2),
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_library(
    client: AsyncClient, auth_token: str, test_library: Library
):
    """Test updating a library."""
    response = await client.patch(
        f"/api/libraries/{test_library.id}",
        json={
            "name": "Updated Library Name",
            "description": "Updated description",
        },
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Library Name"
    assert data["description"] == "Updated description"


@pytest.mark.asyncio
async def test_update_library_unauthorized(
    client: AsyncClient, auth_token2: str, test_library: Library
):
    """Test updating library user doesn't have permission for fails."""
    response = await client.patch(
        f"/api/libraries/{test_library.id}",
        json={"name": "Hacked Name"},
        headers=auth_headers(auth_token2),
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_library(
    client: AsyncClient, auth_token: str, test_library: Library
):
    """Test deleting a library."""
    response = await client.delete(
        f"/api/libraries/{test_library.id}",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 204

    # Verify library is deleted (returns 403 because membership is also deleted)
    get_response = await client.get(
        f"/api/libraries/{test_library.id}",
        headers=auth_headers(auth_token),
    )
    assert get_response.status_code == 403


@pytest.mark.asyncio
async def test_add_library_member(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_user2: User,
):
    """Test adding a member to a library."""
    response = await client.post(
        f"/api/libraries/{test_library.id}/members",
        json={
            "user_id": str(test_user2.id),
            "role": "viewer",
        },
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["user_id"] == str(test_user2.id)
    assert data["role"] == "viewer"


@pytest.mark.asyncio
async def test_list_library_members(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_user: User,
):
    """Test listing library members."""
    response = await client.get(
        f"/api/libraries/{test_library.id}/members",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Owner should be an owner member
    assert any(
        member["user_id"] == str(test_user.id) and member["role"] == "owner"
        for member in data
    )


@pytest.mark.asyncio
async def test_remove_library_member(
    client: AsyncClient,
    auth_token: str,
    auth_token2: str,
    test_library: Library,
    test_user2: User,
):
    """Test removing a member from a library."""
    # First add the member
    await client.post(
        f"/api/libraries/{test_library.id}/members",
        json={"user_id": str(test_user2.id), "role": "viewer"},
        headers=auth_headers(auth_token),
    )

    # Now remove them
    response = await client.delete(
        f"/api/libraries/{test_library.id}/members/{test_user2.id}",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 204

    # Verify user can no longer access library
    get_response = await client.get(
        f"/api/libraries/{test_library.id}",
        headers=auth_headers(auth_token2),
    )
    assert get_response.status_code == 403
