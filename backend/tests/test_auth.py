"""Tests for authentication endpoints."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.models import User
from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    """Test successful user registration."""
    response = await client.post(
        "/api/auth/register",
        json={
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "securepass123",
            "full_name": "New User",
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert data["is_admin"] is True
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_user: User):
    """Test registration with duplicate email fails."""
    response = await client.post(
        "/api/auth/register",
        json={
            "username": "anotheruser",
            "email": test_user.email,
            "password": "anotherpass",
            "full_name": "Another User",
        },
    )

    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: User):
    """Test successful login."""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "testpass123",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user: User):
    """Test login with wrong password fails."""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": test_user.email,
            "password": "wrongpassword",
        },
    )

    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Test login with nonexistent user fails."""
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "somepassword",
        },
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient, test_user: User, auth_token: str):
    """Test getting current user info."""
    response = await client.get(
        "/api/auth/me",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["full_name"] == test_user.full_name
    assert data["id"] == str(test_user.id)


@pytest.mark.asyncio
async def test_get_current_user_no_token(client: AsyncClient):
    """Test getting current user without token fails."""
    response = await client.get("/api/auth/me")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(client: AsyncClient):
    """Test getting current user with invalid token fails."""
    response = await client.get(
        "/api/auth/me",
        headers=auth_headers("invalid.token.here"),
    )

    assert response.status_code == 401
