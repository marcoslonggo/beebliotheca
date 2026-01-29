"""Tests for reading list management endpoints."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers


@pytest.mark.asyncio
async def test_create_and_retrieve_list(client: AsyncClient, auth_token: str):
    payload = {
        "title": "Top 10 Mysteries",
        "description": "Curated detective novels.",
        "visibility": "private",
    }
    create_response = await client.post("/api/lists", json=payload, headers=auth_headers(auth_token))
    assert create_response.status_code == 201
    list_id = create_response.json()["id"]

    index_response = await client.get("/api/lists", headers=auth_headers(auth_token))
    assert index_response.status_code == 200
    summaries = index_response.json()
    assert any(summary["id"] == list_id for summary in summaries)

    detail_response = await client.get(f"/api/lists/{list_id}", headers=auth_headers(auth_token))
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["list"]["title"] == payload["title"]
    assert detail["items"] == []
    assert detail["members"][0]["role"] == "owner"


@pytest.mark.asyncio
async def test_add_items_and_progress(
    client: AsyncClient,
    auth_token: str,
):
    payload = {"title": "Weekend reads"}
    create_response = await client.post("/api/lists", json=payload, headers=auth_headers(auth_token))
    list_id = create_response.json()["id"]

    add_item_payload = {
        "title": "The Hobbit",
        "author": "J.R.R. Tolkien",
        "isbn": "9780547928227",
        "item_type": "external",
    }
    add_item_response = await client.post(
        f"/api/lists/{list_id}/items",
        json=add_item_payload,
        headers=auth_headers(auth_token),
    )
    assert add_item_response.status_code == 201
    item_id = add_item_response.json()["id"]

    progress_payload = {"status": "completed"}
    progress_response = await client.put(
        f"/api/lists/{list_id}/items/{item_id}/progress",
        json=progress_payload,
        headers=auth_headers(auth_token),
    )
    assert progress_response.status_code == 200
    assert progress_response.json()["status"] == "completed"

    progress_list_response = await client.get(
        f"/api/lists/{list_id}/progress",
        headers=auth_headers(auth_token),
    )
    assert progress_list_response.status_code == 200
    progress_entries = progress_list_response.json()
    assert len(progress_entries) == 1
    assert progress_entries[0]["list_item_id"] == item_id


@pytest.mark.asyncio
async def test_share_list_with_member(
    client: AsyncClient,
    auth_token: str,
    auth_token2: str,
    test_user2,
):
    create_response = await client.post(
        "/api/lists",
        json={"title": "Shared Sci-Fi Picks"},
        headers=auth_headers(auth_token),
    )
    list_id = create_response.json()["id"]

    add_member_response = await client.post(
        f"/api/lists/{list_id}/members",
        json={"user_id": str(test_user2.id), "role": "viewer"},
        headers=auth_headers(auth_token),
    )
    assert add_member_response.status_code == 201

    shared_response = await client.get(
        f"/api/lists/{list_id}",
        headers=auth_headers(auth_token2),
    )
    assert shared_response.status_code == 200
    detail = shared_response.json()
    assert detail["list"]["title"] == "Shared Sci-Fi Picks"
    assert any(member["user_id"] == str(test_user2.id) for member in detail["members"])
