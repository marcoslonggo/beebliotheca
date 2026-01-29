"""Tests for library-scoped book endpoints."""
from __future__ import annotations

import io
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import BookV2, Library, LibraryBook, Series, User, UserBookData
from tests.conftest import auth_headers


@pytest_asyncio.fixture
async def test_book(session: AsyncSession) -> BookV2:
    """Create a test book."""
    book = BookV2(
        title="Test Book",
        authors=["Test Author"],
        isbn="9781234567890",
        publisher="Test Publisher",
        description="A test book description",
        publish_date="2024-01-01",
        subjects=["Fiction", "Testing"],
        language=["en"],
        metadata_status="complete",
    )
    session.add(book)
    await session.commit()
    await session.refresh(book)
    return book


@pytest_asyncio.fixture
async def test_library_book(
    session: AsyncSession, test_library: Library, test_book: BookV2
) -> LibraryBook:
    """Create a test library book."""
    library_book = LibraryBook(
        library_id=test_library.id,
        book_id=test_book.id,
        series="Test Series",
        series_number=1.0,
        physical_location="Shelf A1",
        loan_status="available",
    )
    session.add(library_book)
    await session.commit()
    await session.refresh(library_book)
    return library_book


@pytest.mark.asyncio
async def test_list_library_books_empty(
    client: AsyncClient, auth_token: str, test_library: Library
):
    """Test listing books in an empty library."""
    response = await client.get(
        f"/api/libraries/{test_library.id}/books",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_library_books(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_library_book: LibraryBook,
):
    """Test listing books in a library."""
    response = await client.get(
        f"/api/libraries/{test_library.id}/books",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total"] == 1
    assert data["items"][0]["book"]["title"] == "Test Book"
    assert data["items"][0]["library_book"]["series"] == "Test Series"


@pytest.mark.asyncio
async def test_list_library_books_includes_series_metadata(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_library_book: LibraryBook,
    session: AsyncSession,
):
    """Ensure the API response includes the Series object when available."""
    response = await client.get(
        f"/api/libraries/{test_library.id}/books",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["series"]["name"] == "Test Series"

    stmt = select(Series).where(
        Series.library_id == test_library.id,
        Series.name == "Test Series",
    )
    created_series = (await session.exec(stmt)).first()
    assert created_series is not None


@pytest.mark.asyncio
async def test_list_library_books_search(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_library_book: LibraryBook,
):
    """Test searching books in a library."""
    response = await client.get(
        f"/api/libraries/{test_library.id}/books?q=Test Book",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["book"]["title"] == "Test Book"

    # Test no results
    response = await client.get(
        f"/api/libraries/{test_library.id}/books?q=Nonexistent",
        headers=auth_headers(auth_token),
    )
    assert response.status_code == 200
    assert response.json()["total"] == 0


@pytest.mark.asyncio
async def test_list_library_books_pagination(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_library_book: LibraryBook,
):
    """Test pagination when listing books."""
    response = await client.get(
        f"/api/libraries/{test_library.id}/books?skip=0&limit=10",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) <= 10


@pytest.mark.asyncio
async def test_list_library_books_unauthorized(
    client: AsyncClient, auth_token2: str, test_library: Library
):
    """Test listing books fails for non-members."""
    response = await client.get(
        f"/api/libraries/{test_library.id}/books",
        headers=auth_headers(auth_token2),
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_library_book(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_library_book: LibraryBook,
):
    """Test getting a specific library book."""
    response = await client.get(
        f"/api/libraries/{test_library.id}/books/{test_library_book.id}",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["book"]["title"] == "Test Book"
    assert data["library_book"]["series"] == "Test Series"


@pytest.mark.asyncio
async def test_get_library_book_not_found(
    client: AsyncClient, auth_token: str, test_library: Library
):
    """Test getting nonexistent book fails."""
    fake_id = uuid4()
    response = await client.get(
        f"/api/libraries/{test_library.id}/books/{fake_id}",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_library_book_with_new_book(
    client: AsyncClient, auth_token: str, test_library: Library
):
    """Test creating a library book with a new book."""
    response = await client.post(
        f"/api/libraries/{test_library.id}/books",
        json={
            "book": {
                "title": "New Test Book",
                "authors": ["New Author"],
                "isbn": "9780987654321",
                "publisher": "New Publisher",
                "metadata_status": "incomplete",
            },
            "library_book": {
                "series": "New Series",
                "series_number": 1.0,
                "physical_location": "Shelf B2",
                "book_type": "paperback",
                "loan_status": "available",
            },
        },
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["book"]["title"] == "New Test Book"
    assert data["library_book"]["series"] == "New Series"
    assert data["library_book"]["book_type"] == "paperback"


@pytest.mark.asyncio
async def test_create_library_book_reuse_existing(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_book: BookV2,
):
    """Test creating a library book by reusing an existing book."""
    response = await client.post(
        f"/api/libraries/{test_library.id}/books",
        json={
            "book_id": str(test_book.id),
            "library_book": {
                "physical_location": "Shelf C3",
                "loan_status": "available",
            },
        },
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["book"]["id"] == str(test_book.id)
    assert data["library_book"]["physical_location"] == "Shelf C3"


@pytest.mark.asyncio
async def test_create_library_book_duplicate(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_library_book: LibraryBook,
    test_book: BookV2,
):
    """Test creating duplicate library book fails."""
    response = await client.post(
        f"/api/libraries/{test_library.id}/books",
        json={"book_id": str(test_book.id)},
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 409


@pytest.mark.asyncio
async def test_create_library_book_invalid_payload(
    client: AsyncClient, auth_token: str, test_library: Library
):
    """Test creating book without book_id or book data fails."""
    response = await client.post(
        f"/api/libraries/{test_library.id}/books",
        json={},
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_create_library_book_unauthorized(
    client: AsyncClient, auth_token2: str, test_library: Library
):
    """Test creating book as non-member fails."""
    response = await client.post(
        f"/api/libraries/{test_library.id}/books",
        json={
            "book": {
                "title": "Unauthorized Book",
                "metadata_status": "incomplete",
            }
        },
        headers=auth_headers(auth_token2),
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_library_book_intrinsic_data(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_library_book: LibraryBook,
):
    """Test updating intrinsic book data."""
    response = await client.patch(
        f"/api/libraries/{test_library.id}/books/{test_library_book.id}",
        json={
            "book": {
                "title": "Updated Test Book",
                "description": "Updated description",
            }
        },
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["book"]["title"] == "Updated Test Book"
    assert data["book"]["description"] == "Updated description"


@pytest.mark.asyncio
async def test_update_library_book_library_data(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_library_book: LibraryBook,
):
    """Test updating library-specific book data."""
    response = await client.patch(
        f"/api/libraries/{test_library.id}/books/{test_library_book.id}",
        json={
            "library_book": {
                "series": "Updated Series",
                "physical_location": "New Shelf",
            }
        },
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["library_book"]["series"] == "Updated Series"
    assert data["library_book"]["physical_location"] == "New Shelf"


@pytest.mark.asyncio
async def test_update_library_book_personal_data(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_library_book: LibraryBook,
):
    """Test updating personal reading data."""
    response = await client.patch(
        f"/api/libraries/{test_library.id}/books/{test_library_book.id}",
        json={
            "personal_data": {
                "reading_status": "reading",
                "personal_rating": 5,
                "progress_pages": 150,
                "personal_notes": "Great book!",
            }
        },
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["personal_data"]["reading_status"] == "reading"
    assert data["personal_data"]["personal_rating"] == 5
    assert data["personal_data"]["progress_pages"] == 150
    assert data["personal_data"]["personal_notes"] == "Great book!"


@pytest.mark.asyncio
async def test_update_library_book_all_data(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_library_book: LibraryBook,
):
    """Test updating all data types at once."""
    response = await client.patch(
        f"/api/libraries/{test_library.id}/books/{test_library_book.id}",
        json={
            "book": {"title": "Complete Update"},
            "library_book": {"series": "Complete Series"},
            "personal_data": {"reading_status": "completed", "personal_rating": 4},
        },
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["book"]["title"] == "Complete Update"
    assert data["library_book"]["series"] == "Complete Series"
    assert data["personal_data"]["reading_status"] == "completed"


@pytest.mark.asyncio
async def test_delete_library_book(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_library_book: LibraryBook,
):
    """Test deleting a library book."""
    response = await client.delete(
        f"/api/libraries/{test_library.id}/books/{test_library_book.id}",
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 204

    # Verify it's deleted
    get_response = await client.get(
        f"/api/libraries/{test_library.id}/books/{test_library_book.id}",
        headers=auth_headers(auth_token),
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_delete_library_book_unauthorized(
    client: AsyncClient,
    auth_token2: str,
    test_library: Library,
    test_library_book: LibraryBook,
):
    """Test deleting book as non-member fails."""
    response = await client.delete(
        f"/api/libraries/{test_library.id}/books/{test_library_book.id}",
        headers=auth_headers(auth_token2),
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_upload_cover(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_library_book: LibraryBook,
):
    """Test uploading a cover image."""
    # Create a fake image file
    fake_image = io.BytesIO(b"fake image data")
    fake_image.name = "test_cover.jpg"

    response = await client.post(
        f"/api/libraries/{test_library.id}/books/{test_library_book.id}/cover",
        files={"file": ("test_cover.jpg", fake_image, "image/jpeg")},
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["library_book"]["cover_image_path"] is not None


@pytest.mark.asyncio
async def test_upload_cover_invalid_file(
    client: AsyncClient,
    auth_token: str,
    test_library: Library,
    test_library_book: LibraryBook,
):
    """Test uploading non-image file fails."""
    fake_file = io.BytesIO(b"not an image")
    fake_file.name = "test.txt"

    response = await client.post(
        f"/api/libraries/{test_library.id}/books/{test_library_book.id}/cover",
        files={"file": ("test.txt", fake_file, "text/plain")},
        headers=auth_headers(auth_token),
    )

    assert response.status_code == 400
