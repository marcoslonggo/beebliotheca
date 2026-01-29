from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", env_prefix="APP_")

    app_name: str = "Book Inventory API"
    database_url: str = "sqlite+aiosqlite:///./data/books.db"
    secret_key: str = "change-me"  # Override in production via APP_SECRET_KEY
    jwt_algorithm: str = "HS256"
    access_token_expire_hours: int = 24
    metadata_retry_interval_seconds: int = 3600
    openlibrary_base_url: str = "https://openlibrary.org"
    google_books_base_url: str = "https://www.googleapis.com/books/v1/volumes"


def get_settings() -> Settings:
    return Settings()
