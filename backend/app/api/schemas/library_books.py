from sqlmodel import SQLModel

from app.models import BookV2Read, LibraryBookRead, SeriesRead, UserBookDataRead


class LibraryBookDetail(SQLModel):
    book: BookV2Read
    library_book: LibraryBookRead
    personal_data: UserBookDataRead | None = None
    series: SeriesRead | None = None

    class Config:
        # Ensure None values are included in JSON output
        exclude_none = False


class LibraryBookListResponse(SQLModel):
    items: list[LibraryBookDetail]
    total: int
