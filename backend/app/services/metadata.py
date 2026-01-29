from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _normalize_list(value: Any) -> list[str] | None:
    if value is None:
        return None
    if isinstance(value, list):
        result = []
        for item in value:
            if not item:
                continue
            # Handle OpenLibrary dict format: {'key': '/authors/OL2873756A'}
            if isinstance(item, dict) and 'key' in item:
                # Extract just the last part of the key (e.g., 'OL2873756A' from '/authors/OL2873756A')
                # Skip these - we don't want to show internal IDs to users
                continue
            else:
                result.append(str(item))
        return result if result else None
    return [str(value)]


def _normalize_description(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, dict) and "value" in value:
        description_value = value.get("value")
        return str(description_value) if description_value else None
    return str(value)


def _extract_series(value: Any) -> str | None:
    if not value:
        return None
    series_list: list[str] = []
    if isinstance(value, list):
        for item in value:
            if not item:
                continue
            series_list.append(str(item))
    elif isinstance(value, str):
        series_list.append(value)
    else:
        return None

    return series_list[0] if series_list else None


def _extract_series_from_subjects(subjects: Any) -> str | None:
    if not subjects:
        return None
    for subject in _normalize_list(subjects) or []:
        if not subject:
            continue
        lowered = subject.strip().lower()
        if lowered.startswith("series:"):
            name = subject.split(":", 1)[1].strip()
            if name:
                return name
    return None


def _extract_google_series(volume: dict[str, Any]) -> str | None:
    series_info = volume.get("seriesInfo")
    if isinstance(series_info, dict):
        series = series_info.get("series")
        if isinstance(series, str) and series.strip():
            return series.strip()

    # Fallback: some volumes put series name in subtitle
    subtitle = volume.get("subtitle")
    if isinstance(subtitle, str) and "series" in subtitle.lower():
        return subtitle.strip()

    return None


def _merge_metadata(*records: dict[str, Any]) -> dict[str, Any]:
    merged: dict[str, Any] = {}
    for record in records:
        for key, value in record.items():
            if value in (None, "", [], {}):
                continue
            existing = merged.get(key)
            if existing and isinstance(existing, list) and isinstance(value, list):
                merged[key] = list(dict.fromkeys(existing + value))
            else:
                merged[key] = value
    return merged


async def fetch_openlibrary(identifier: str) -> dict[str, Any] | None:
    url = f"{settings.openlibrary_base_url}/isbn/{identifier}.json"
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url)
            if response.status_code != 200:
                logger.warning(f"OpenLibrary returned status {response.status_code} for ISBN {identifier}")
                return None
            payload = response.json()
            work_data: dict[str, Any] | None = None
            work_key = None
            works = payload.get("works")
            if isinstance(works, list) and works:
                first_work = works[0]
                if isinstance(first_work, dict):
                    work_key = first_work.get("key")

            if work_key:
                work_url = f"{settings.openlibrary_base_url}{work_key}.json"
                work_response = await client.get(work_url)
                if work_response.status_code == 200:
                    work_data = work_response.json()

            # OpenLibrary provides cover images via their Cover API
            cover_url = f"https://covers.openlibrary.org/b/isbn/{identifier}-L.jpg"

            description = _normalize_description(payload.get("description"))
            if not description and work_data:
                description = _normalize_description(work_data.get("description"))

            series = _extract_series(payload.get("series"))
            if not series and work_data:
                series = _extract_series(work_data.get("series"))
            if not series and work_data:
                series = _extract_series_from_subjects(work_data.get("subjects"))

            metadata: dict[str, Any] = {
                "title": payload.get("title"),
                "authors": _normalize_list(payload.get("authors")),
                "publisher": payload.get("publishers", [None])[0] if payload.get("publishers") else None,
                "publish_date": payload.get("publish_date"),
                "isbn": identifier,
                "language": _normalize_list(payload.get("languages")),
                "description": description,
                "series": series,
                "cover_url": cover_url,
            }
            if cover_url:
                logger.info("OpenLibrary cover URL for ISBN %s: %s", identifier, cover_url)
            else:
                logger.info("OpenLibrary cover URL missing for ISBN %s", identifier)
            logger.info(f"Successfully fetched metadata from OpenLibrary for ISBN {identifier}")
            return metadata
    except httpx.TimeoutException:
        logger.error(f"OpenLibrary request timed out for ISBN {identifier}")
        return None
    except httpx.HTTPError as e:
        logger.error(f"OpenLibrary HTTP error for ISBN {identifier}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching from OpenLibrary for ISBN {identifier}: {e}")
        return None


async def fetch_google_books(identifier: str) -> dict[str, Any] | None:
    params = {"q": f"isbn:{identifier}", "projection": "full"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(settings.google_books_base_url, params=params)
            if response.status_code != 200:
                logger.warning(f"Google Books returned status {response.status_code} for ISBN {identifier}")
                return None
            data = response.json()
            items = data.get("items")
            if not items:
                logger.info(f"Google Books returned no results for ISBN {identifier}")
                return None
            item = items[0]
            volume = item.get("volumeInfo", {}) if isinstance(item, dict) else {}

            self_link = item.get("selfLink") if isinstance(item, dict) else None
            if isinstance(self_link, str) and self_link:
                full_response = await client.get(self_link, params={"projection": "full"})
                if full_response.status_code == 200:
                    full_item = full_response.json()
                    if isinstance(full_item, dict) and "volumeInfo" in full_item:
                        volume = full_item.get("volumeInfo", volume)

            description = volume.get("description")
            if not description and isinstance(item, dict):
                search_info = item.get("searchInfo")
                if isinstance(search_info, dict):
                    description = search_info.get("textSnippet")

            metadata: dict[str, Any] = {
                "title": volume.get("title"),
                "authors": _normalize_list(volume.get("authors")),
                "subjects": _normalize_list(volume.get("categories")),
                "description": _normalize_description(description),
                "publisher": volume.get("publisher"),
                "publish_date": volume.get("publishedDate"),
                "isbn": identifier,
                "language": _normalize_list(volume.get("language")),
                "cover_url": volume.get("imageLinks", {}).get("thumbnail"),
                "series": _extract_google_series(volume),
            }
            if metadata.get("cover_url"):
                logger.info("Google Books cover URL for ISBN %s: %s", identifier, metadata.get("cover_url"))
            else:
                logger.info("Google Books cover URL missing for ISBN %s", identifier)
            logger.info(f"Successfully fetched metadata from Google Books for ISBN {identifier}")
            return metadata
    except httpx.TimeoutException:
        logger.error(f"Google Books request timed out for ISBN {identifier}")
        return None
    except httpx.HTTPError as e:
        logger.error(f"Google Books HTTP error for ISBN {identifier}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error fetching from Google Books for ISBN {identifier}: {e}")
        return None


async def fetch_metadata(identifier: str) -> dict[str, Any] | None:
    logger.info(f"Fetching metadata for ISBN {identifier}")
    openlibrary_data = await fetch_openlibrary(identifier)
    google_data = await fetch_google_books(identifier)

    if not openlibrary_data and not google_data:
        logger.warning(f"No metadata found from any source for ISBN {identifier}")
        return None

    merged = _merge_metadata(*(record for record in [openlibrary_data, google_data] if record))
    if merged.get("cover_url"):
        logger.info("Merged cover URL for ISBN %s: %s", identifier, merged.get("cover_url"))
    else:
        logger.info("Merged cover URL missing for ISBN %s", identifier)
    logger.info(f"Successfully merged metadata for ISBN {identifier}")
    return merged


async def search_books(query: str, search_type: str = "auto", max_results: int = 10) -> list[dict[str, Any]]:
    """
    Search for books by title or ISBN and return multiple results.

    Args:
        query: The search query (title or ISBN)
        search_type: "title", "isbn", or "auto" (default - auto-detect)
        max_results: Maximum number of results to return
    """
    logger.info(f"Searching for books with query: {query}, type: {search_type}")
    results: list[dict[str, Any]] = []

    # Auto-detect search type if not specified
    if search_type == "auto":
        # Simple heuristic: if it's all digits and dashes, treat as ISBN
        clean_query = query.replace("-", "").replace(" ", "")
        if clean_query.isdigit() and len(clean_query) in [10, 13]:
            search_type = "isbn"
        else:
            search_type = "title"

    logger.info(f"Using search type: {search_type}")

    # Search Google Books
    try:
        # Build query based on search type
        if search_type == "isbn":
            search_query = f"isbn:{query}"
        else:
            search_query = f"intitle:{query}"

        params: dict[str, str | int] = {"q": search_query, "maxResults": max_results}
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(settings.google_books_base_url, params=params)  # type: ignore[arg-type]
            if response.status_code == 200:
                data = response.json()
                items = data.get("items", [])
                for item in items:
                    volume = item.get("volumeInfo", {})
                    # Get ISBN if available
                    isbn = None
                    for identifier in volume.get("industryIdentifiers", []):
                        if identifier.get("type") in ["ISBN_13", "ISBN_10"]:
                            isbn = identifier.get("identifier")
                            break

                    result = {
                        "title": volume.get("title"),
                        "creator": _normalize_list(volume.get("authors")),
                        "subject": _normalize_list(volume.get("categories")),
                        "description": volume.get("description"),
                        "publisher": volume.get("publisher"),
                        "date": volume.get("publishedDate"),
                        "identifier": isbn or f"google:{item.get('id')}",
                        "language": _normalize_list(volume.get("language")),
                        "cover_image_url": volume.get("imageLinks", {}).get("thumbnail"),
                        "source": "Google Books"
                    }
                    results.append(result)
                logger.info(f"Found {len(results)} results from Google Books")
    except Exception as e:
        logger.error(f"Error searching Google Books: {e}")

    return results
