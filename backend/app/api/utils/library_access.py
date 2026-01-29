from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import BookV2, LibraryBook, LibraryMember, MemberRole, UserBookData


async def require_library_member(
    library_id: UUID,
    user_id: UUID,
    session: AsyncSession,
) -> LibraryMember:
    stmt = select(LibraryMember).where(
        LibraryMember.library_id == library_id,
        LibraryMember.user_id == user_id,
    )
    member = (await session.exec(stmt)).one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this library",
        )
    return member


async def require_library_permission(
    library_id: UUID,
    user_id: UUID,
    session: AsyncSession,
    roles: tuple[MemberRole, ...],
) -> LibraryMember:
    member = await require_library_member(library_id, user_id, session)
    if member.role not in roles:
        allowed = ", ".join(role.value for role in roles)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires one of the following roles: {allowed}",
        )
    return member


async def get_library_book(
    library_id: UUID,
    library_book_id: UUID,
    session: AsyncSession,
) -> tuple[LibraryBook, BookV2]:
    stmt = (
        select(LibraryBook, BookV2)
        .join(BookV2, LibraryBook.book_id == BookV2.id)
        .where(
            LibraryBook.id == library_book_id,
            LibraryBook.library_id == library_id,
        )
    )
    result = await session.exec(stmt)
    record = result.first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found in this library",
        )
    return record


async def get_user_book_data(
    library_book: LibraryBook,
    user_id: UUID,
    session: AsyncSession,
) -> UserBookData | None:
    stmt = select(UserBookData).where(
        UserBookData.book_id == library_book.book_id,
        UserBookData.library_id == library_book.library_id,
        UserBookData.user_id == user_id,
    )
    return (await session.exec(stmt)).one_or_none()

