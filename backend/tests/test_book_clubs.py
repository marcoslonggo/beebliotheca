"""Tests for book club feature."""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlmodel import select

from app.models import BookClub, BookClubProgress, BookV2
from tests.conftest import auth_headers


async def _create_book(session, title: str = "Test Book", pages: int = 320) -> BookV2:
    book = BookV2(title=title, page_count=pages)
    session.add(book)
    await session.commit()
    await session.refresh(book)
    return book


@pytest.mark.asyncio
async def test_create_and_list_book_club(
    client: AsyncClient,
    session,
    auth_token: str,
) -> None:
    book = await _create_book(session)

    payload = {
        "name": "Evening Readers",
        "description": "Focus on one book together.",
        "current_book_id": str(book.id),
    }
    create_response = await client.post(
        "/api/book-clubs",
        json=payload,
        headers=auth_headers(auth_token),
    )
    assert create_response.status_code == 201
    club_id = create_response.json()["id"]

    list_response = await client.get("/api/book-clubs", headers=auth_headers(auth_token))
    assert list_response.status_code == 200
    summaries = list_response.json()
    assert any(summary["id"] == club_id for summary in summaries)

    detail_response = await client.get(
        f"/api/book-clubs/{club_id}", headers=auth_headers(auth_token)
    )
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["club"]["name"] == payload["name"]
    assert detail["club"]["current_book_id"] == str(book.id)
    assert detail["progress"] == []
    assert detail["members"][0]["role"] == "owner"


@pytest.mark.asyncio
async def test_progress_and_comment_visibility(
    client: AsyncClient,
    session,
    auth_token: str,
    auth_token2: str,
    test_user2,
) -> None:
    book = await _create_book(session, title="Shared Read", pages=410)

    create_response = await client.post(
        "/api/book-clubs",
        json={
            "name": "Page Turners",
            "current_book_id": str(book.id),
        },
        headers=auth_headers(auth_token),
    )
    club_id = create_response.json()["id"]

    # Owner logs reading progress and sets a page total override
    progress_response = await client.put(
        f"/api/book-clubs/{club_id}/progress",
        json={"current_page": 40, "pages_total": 405},
        headers=auth_headers(auth_token),
    )
    assert progress_response.status_code == 200
    owner_progress = progress_response.json()
    assert owner_progress["current_page"] == 40
    assert owner_progress["pages_total"] == 405

    # Add second member
    add_member_response = await client.post(
        f"/api/book-clubs/{club_id}/members",
        json={"user_id": str(test_user2.id), "role": "member"},
        headers=auth_headers(auth_token),
    )
    assert add_member_response.status_code == 201

    # Member tries to comment past current progress - rejected
    comment_attempt = await client.post(
        f"/api/book-clubs/{club_id}/comments",
        json={"page_number": 12, "body": "What a twist!"},
        headers=auth_headers(auth_token2),
    )
    assert comment_attempt.status_code == 400

    # Member records progress (inherits override)
    member_progress = await client.put(
        f"/api/book-clubs/{club_id}/progress",
        json={"current_page": 20},
        headers=auth_headers(auth_token2),
    )
    assert member_progress.status_code == 200
    member_progress_body = member_progress.json()
    assert member_progress_body["current_page"] == 20
    assert member_progress_body["pages_total"] == 405

    # Now comment within allowed page
    comment_ok = await client.post(
        f"/api/book-clubs/{club_id}/comments",
        json={"page_number": 18, "body": "Big reveal right here."},
        headers=auth_headers(auth_token2),
    )
    assert comment_ok.status_code == 201

    # Owner adds a later-page comment
    later_comment = await client.post(
        f"/api/book-clubs/{club_id}/comments",
        json={"page_number": 35, "body": "Hold onto your seats."},
        headers=auth_headers(auth_token),
    )
    assert later_comment.status_code == 201

    # Member should only see comments up to page 20
    member_comments = await client.get(
        f"/api/book-clubs/{club_id}/comments",
        headers=auth_headers(auth_token2),
    )
    assert member_comments.status_code == 200
    member_comment_pages = [comment["page_number"] for comment in member_comments.json()]
    assert member_comment_pages == [18]

    # Owner sees both comments
    owner_comments = await client.get(
        f"/api/book-clubs/{club_id}/comments",
        headers=auth_headers(auth_token),
    )
    assert owner_comments.status_code == 200
    owner_comment_pages = [comment["page_number"] for comment in owner_comments.json()]
    assert owner_comment_pages == [18, 35]

    # Detail endpoint exposes override and member progress list
    detail_response = await client.get(
        f"/api/book-clubs/{club_id}",
        headers=auth_headers(auth_token),
    )
    detail = detail_response.json()
    assert detail["club"]["pages_total_override"] == 405
    assert len(detail["progress"]) == 2

    # Ensure override persisted at database level
    stmt = select(BookClub).where(BookClub.id == club_id)
    result = await session.exec(stmt)
    club = result.first()
    assert club.pages_total_override == 405

    progress_stmt = select(BookClubProgress).where(BookClubProgress.club_id == club_id)
    progress_rows = (await session.exec(progress_stmt)).all()
    assert all(row.pages_total == 405 for row in progress_rows)
