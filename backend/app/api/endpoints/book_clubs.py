from __future__ import annotations

from datetime import datetime
from typing import Iterable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_current_user, get_session
from app.api.schemas.book_clubs import BookClubDetail, BookClubSummary
from app.models import (
    BookClub,
    BookClubBook,
    BookClubBookRead,
    BookClubComment,
    BookClubCommentCreate,
    BookClubCommentRead,
    BookClubCreate,
    BookClubMember,
    BookClubMemberCreate,
    BookClubMemberRead,
    BookClubMemberUpdate,
    BookClubProgress,
    BookClubProgressRead,
    BookClubProgressUpdate,
    BookClubRead,
    BookClubRole,
    BookClubUpdate,
    BookV2,
    User,
)

router = APIRouter(prefix="/book-clubs", tags=["book-clubs"])


async def _get_club(session: AsyncSession, club_id: UUID) -> BookClub:
    club = await session.get(BookClub, club_id)
    if club is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book club not found.")
    return club


async def _count_members(session: AsyncSession, club_id: UUID) -> int:
    stmt = select(func.count(BookClubMember.id)).where(BookClubMember.club_id == club_id)
    result = await session.exec(stmt)
    return int(result.scalar_one() or 0)


async def _get_owner_id_by_club_id(session: AsyncSession, club_id: UUID) -> UUID:
    club = await _get_club(session, club_id)
    return club.owner_id


async def _get_member(
    session: AsyncSession,
    club_id: UUID,
    user_id: UUID,
) -> BookClubMember | None:
    stmt = select(BookClubMember).where(
        BookClubMember.club_id == club_id,
        BookClubMember.user_id == user_id,
    )
    result = await session.exec(stmt)
    return result.scalar_one_or_none()


def _ensure_permission(
    member: BookClubMember | None,
    allowed_roles: Iterable[BookClubRole],
    *,
    owner_id: UUID,
    current_user_id: UUID,
) -> None:
    if current_user_id == owner_id:
        return
    if member is None or member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )


async def _resolve_pages_total(
    session: AsyncSession,
    club: BookClub,
    requested_pages_total: int | None,
    *,
    current_user: User,
) -> int | None:
    if requested_pages_total is not None:
        owner_id = await _get_owner_id(session, club)
        if current_user.id != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the club owner can set the page total override.",
            )
        club.pages_total_override = requested_pages_total
        club.updated_at = datetime.utcnow()
        session.add(club)
        stmt = (
            update(BookClubProgress)
            .where(BookClubProgress.club_id == club.id)
            .values(pages_total=requested_pages_total)
        )
        await session.exec(stmt)
        return requested_pages_total

    override = _get_pages_total_override(club)
    if override is not None:
        return override

    if club.current_book_id is None:
        return None

    result = await session.exec(
        select(BookV2.page_count).where(BookV2.id == club.current_book_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return None
    return row


async def _upsert_history_entry(
    session: AsyncSession,
    club: BookClub,
    *,
    previous_book_id: UUID | None,
    new_book_id: UUID | None,
) -> None:
    if previous_book_id is None and new_book_id is None:
        return

    now = datetime.utcnow()

    if previous_book_id:
        stmt = (
            select(BookClubBook)
            .where(
                BookClubBook.club_id == club.id,
                BookClubBook.book_id == previous_book_id,
                BookClubBook.completed_at.is_(None),
            )
            .order_by(BookClubBook.started_at.desc())
        )
        result = await session.exec(stmt)
        active_record = result.scalar_one_or_none()
        if active_record:
            active_record.completed_at = now
            session.add(active_record)

    if new_book_id:
        new_entry = BookClubBook(club_id=club.id, book_id=new_book_id, started_at=now)
        session.add(new_entry)


@router.post("", response_model=BookClubRead, status_code=status.HTTP_201_CREATED)
async def create_book_club(
    payload: BookClubCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BookClubRead:
    now = datetime.utcnow()
    club = BookClub(
        owner_id=current_user.id,
        name=payload.name,
        description=payload.description,
        slug=payload.slug,
        current_book_id=payload.current_book_id,
        pages_total_override=payload.pages_total_override,
        created_at=now,
        updated_at=now,
    )
    session.add(club)
    await session.flush()

    owner_member = BookClubMember(
        club_id=club.id,
        user_id=current_user.id,
        role=BookClubRole.OWNER,
        joined_at=now,
        last_active_at=now,
    )
    session.add(owner_member)

    if club.current_book_id is not None:
        await _upsert_history_entry(
            session,
            club,
            previous_book_id=None,
            new_book_id=club.current_book_id,
        )

    await session.commit()
    await session.refresh(club)
    _get_pages_total_override(club)
    return BookClubRead.model_validate(club)


@router.get("", response_model=list[BookClubSummary])
async def list_book_clubs(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[BookClubSummary]:
    summary_list: list[BookClubSummary] = []

    owner_stmt = select(BookClub).where(BookClub.owner_id == current_user.id)
    owner_result = await session.exec(owner_stmt)
    owner_clubs = owner_result.scalars().all()
    owner_ids: set[UUID] = set()
    for club in owner_clubs:
        owner_ids.add(club.id)
        _get_pages_total_override(club)
        summary_list.append(
            BookClubSummary(
                id=club.id,
                name=club.name,
                description=club.description,
                owner_id=club.owner_id,
                current_book_id=club.current_book_id,
                pages_total_override=club.pages_total_override,
                member_count=await _count_members(session, club.id),
                membership_role=BookClubRole.OWNER,
                slug=club.slug,
            )
        )

    member_stmt = select(BookClubMember).where(BookClubMember.user_id == current_user.id)
    member_result = await session.exec(member_stmt)
    member_rows = member_result.scalars().all()
    for membership in member_rows:
        club_id = membership.club_id
        if club_id in owner_ids:
            continue
        club = await session.get(BookClub, club_id)
        if club is None:
            continue
        membership_role = membership.role
        if membership_role is not None and not isinstance(membership_role, BookClubRole):
            try:
                membership_role = BookClubRole(membership_role)
            except ValueError:
                membership_role = BookClubRole.MEMBER
        _get_pages_total_override(club)
        summary_list.append(
            BookClubSummary(
                id=club.id,
                name=club.name,
                description=club.description,
                owner_id=await _get_owner_id(session, club),
                current_book_id=club.current_book_id,
                pages_total_override=club.pages_total_override,
                member_count=await _count_members(session, club.id),
                membership_role=membership_role,
                slug=club.slug,
            )
        )

    return sorted(summary_list, key=lambda summary: summary.name.lower())


@router.get("/{club_id}", response_model=BookClubDetail)
async def get_book_club_detail(
    club_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BookClubDetail:
    club = await _get_club(session, club_id)
    owner_id = await _get_owner_id(session, club)
    member = await _get_member(session, club_id, current_user.id)

    if current_user.id != owner_id and member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Join the club to view its details.",
        )

    members_result = await session.exec(
        select(BookClubMember).where(BookClubMember.club_id == club_id)
    )
    members = members_result.scalars().all()

    progress_result = await session.exec(
        select(BookClubProgress).where(BookClubProgress.club_id == club_id)
    )
    progress_records = progress_result.scalars().all()
    viewer_progress = next(
        (record for record in progress_records if record.user_id == current_user.id),
        None,
    )
    viewer_page = viewer_progress.current_page if viewer_progress else 0

    comments_result = await session.exec(
        select(BookClubComment)
        .where(BookClubComment.club_id == club_id)
        .order_by(BookClubComment.page_number.asc(), BookClubComment.created_at.asc())
    )
    comments = [
        comment
        for comment in comments_result.scalars().all()
        if comment.page_number <= viewer_page
    ]

    history_result = await session.exec(
        select(BookClubBook)
        .where(BookClubBook.club_id == club_id)
        .order_by(BookClubBook.started_at.desc())
    )
    history = history_result.scalars().all()

    _get_pages_total_override(club)

    detail = BookClubDetail(
        club=BookClubRead.model_validate(club),
        members=[BookClubMemberRead.model_validate(item) for item in members],
        progress=[BookClubProgressRead.model_validate(item) for item in progress_records],
        comments=[BookClubCommentRead.model_validate(item) for item in comments],
        history=[BookClubBookRead.model_validate(item) for item in history],
    )
    return detail


@router.patch("/{club_id}", response_model=BookClubRead)
async def update_book_club(
    club_id: UUID,
    payload: BookClubUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BookClubRead:
    club = await _get_club(session, club_id)
    owner_id = await _get_owner_id(session, club)
    if owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can update the club settings.",
        )

    previous_book_id = club.current_book_id

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        club.name = updates["name"]
    if "description" in updates:
        club.description = updates["description"]
    if "slug" in updates:
        club.slug = updates["slug"]
    if "current_book_id" in updates:
        club.current_book_id = updates["current_book_id"]
    if "pages_total_override" in updates:
        club.pages_total_override = updates["pages_total_override"]

    club.updated_at = datetime.utcnow()

    session.add(club)
    await session.flush()

    if "pages_total_override" in updates:
        await session.exec(
            update(BookClubProgress)
            .where(BookClubProgress.club_id == club.id)
            .values(pages_total=updates["pages_total_override"])
        )

    if "current_book_id" in updates and updates["current_book_id"] != previous_book_id:
        await _upsert_history_entry(
            session,
            club,
            previous_book_id=previous_book_id,
            new_book_id=updates["current_book_id"],
        )
        await session.exec(
            update(BookClubProgress)
            .where(BookClubProgress.club_id == club.id)
            .values(current_page=0, updated_at=datetime.utcnow())
        )

    await session.commit()
    await session.refresh(club)
    _get_pages_total_override(club)
    return BookClubRead.model_validate(club)


@router.post(
    "/{club_id}/members",
    response_model=BookClubMemberRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_member(
    club_id: UUID,
    payload: BookClubMemberCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BookClubMemberRead:
    club = await _get_club(session, club_id)
    actor_member = await _get_member(session, club_id, current_user.id)
    owner_id = await _get_owner_id(session, club)
    _ensure_permission(
        actor_member,
        allowed_roles=(BookClubRole.OWNER, BookClubRole.MODERATOR),
        owner_id=owner_id,
        current_user_id=current_user.id,
    )

    existing_member = await _get_member(session, club_id, payload.user_id)
    now = datetime.utcnow()
    if existing_member:
        existing_member.role = payload.role
        existing_member.left_at = None
        existing_member.removed_by = None
        existing_member.joined_at = existing_member.joined_at or now
        session.add(existing_member)
        await session.commit()
        await session.refresh(existing_member)
        return BookClubMemberRead.model_validate(existing_member)

    new_member = BookClubMember(
        club_id=club_id,
        user_id=payload.user_id,
        role=payload.role,
        joined_at=now,
    )
    session.add(new_member)
    try:
        await session.commit()
    except IntegrityError as exc:  # noqa: BLE001
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member already exists.",
        ) from exc
    await session.refresh(new_member)
    return BookClubMemberRead.model_validate(new_member)


@router.patch(
    "/{club_id}/members/{user_id}",
    response_model=BookClubMemberRead,
)
async def update_member(
    club_id: UUID,
    user_id: UUID,
    payload: BookClubMemberUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BookClubMemberRead:
    club = await _get_club(session, club_id)
    owner_id = await _get_owner_id(session, club)
    if current_user.id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can update member roles.",
        )

    member = await _get_member(session, club_id, user_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")
    if member.role == BookClubRole.OWNER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify the owner role.")

    member.role = payload.role
    if payload.left_at is not None:
        member.left_at = payload.left_at
    session.add(member)
    await session.commit()
    await session.refresh(member)
    return BookClubMemberRead.model_validate(member)


@router.delete(
    "/{club_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member(
    club_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    club = await _get_club(session, club_id)
    owner_id = await _get_owner_id(session, club)
    if owner_id != current_user.id and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to remove this member.",
        )

    member = await _get_member(session, club_id, user_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")
    if member.role == BookClubRole.OWNER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the owner.")

    member.left_at = datetime.utcnow()
    member.removed_by = current_user.id if current_user.id != user_id else None
    session.add(member)
    await session.commit()


@router.get(
    "/{club_id}/progress",
    response_model=list[BookClubProgressRead],
)
async def list_progress(
    club_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[BookClubProgressRead]:
    club = await _get_club(session, club_id)
    owner_id = await _get_owner_id(session, club)
    member = await _get_member(session, club_id, current_user.id)
    if member is None and current_user.id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Join the club to view progress.",
        )

    result = await session.exec(
        select(BookClubProgress)
        .where(BookClubProgress.club_id == club_id)
        .order_by(BookClubProgress.updated_at.desc())
    )
    progress = result.scalars().all()
    return [BookClubProgressRead.model_validate(item) for item in progress]


@router.put(
    "/{club_id}/progress",
    response_model=BookClubProgressRead,
)
async def update_progress(
    club_id: UUID,
    payload: BookClubProgressUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BookClubProgressRead:
    club = await _get_club(session, club_id)
    owner_id = await _get_owner_id(session, club)
    member = await _get_member(session, club_id, current_user.id)
    if member is None and current_user.id != owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Join the club to track progress.",
        )

    stmt = select(BookClubProgress).where(
        BookClubProgress.club_id == club_id,
        BookClubProgress.user_id == current_user.id,
    )
    result = await session.exec(stmt)
    progress = result.scalar_one_or_none()

    now = datetime.utcnow()
    pages_total = await _resolve_pages_total(
        session,
        club,
        payload.pages_total,
        current_user=current_user,
    )

    if progress is None:
        progress = BookClubProgress(
            club_id=club_id,
            user_id=current_user.id,
            current_page=payload.current_page,
            pages_total=pages_total,
            updated_at=now,
        )
        session.add(progress)
    else:
        if payload.current_page < progress.current_page:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Progress cannot move backwards.",
            )
        progress.current_page = payload.current_page
        if pages_total is not None:
            progress.pages_total = pages_total
        elif progress.pages_total is None:
            progress.pages_total = pages_total
        progress.updated_at = now
        session.add(progress)

    if member:
        member.last_active_at = now
        session.add(member)

    await session.commit()
    await session.refresh(progress)
    return BookClubProgressRead.model_validate(progress)


@router.get(
    "/{club_id}/comments",
    response_model=list[BookClubCommentRead],
)
async def list_comments(
    club_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[BookClubCommentRead]:
    await _get_club(session, club_id)
    member = await _get_member(session, club_id, current_user.id)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Join the club to view comments.",
        )

    progress_stmt = select(BookClubProgress).where(
        BookClubProgress.club_id == club_id,
        BookClubProgress.user_id == current_user.id,
    )
    progress_result = await session.exec(progress_stmt)
    progress = progress_result.scalar_one_or_none()
    viewer_page = progress.current_page if progress else 0

    comments_result = await session.exec(
        select(BookClubComment)
        .where(BookClubComment.club_id == club_id)
        .order_by(BookClubComment.page_number.asc(), BookClubComment.created_at.asc())
    )
    comments = [
        comment for comment in comments_result.all() if comment.page_number <= viewer_page
    ]
    return [BookClubCommentRead.model_validate(comment) for comment in comments]


@router.post(
    "/{club_id}/comments",
    response_model=BookClubCommentRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    club_id: UUID,
    payload: BookClubCommentCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BookClubCommentRead:
    club = await _get_club(session, club_id)
    member = await _get_member(session, club_id, current_user.id)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Join the club to add comments.",
        )

    progress_stmt = select(BookClubProgress).where(
        BookClubProgress.club_id == club_id,
        BookClubProgress.user_id == current_user.id,
    )
    progress_result = await session.exec(progress_stmt)
    progress = progress_result.scalar_one_or_none()
    current_page = progress.current_page if progress else 0

    if payload.page_number > current_page:
        now = datetime.utcnow()
        pages_total = await _resolve_pages_total(
            session,
            club,
            None,
            current_user=current_user,
        )
        if progress is None:
            progress = BookClubProgress(
                club_id=club_id,
                user_id=current_user.id,
                current_page=payload.page_number,
                pages_total=pages_total,
                updated_at=now,
            )
            session.add(progress)
        else:
            progress.current_page = payload.page_number
            if pages_total is not None:
                progress.pages_total = pages_total
            progress.updated_at = now
            session.add(progress)
        current_page = payload.page_number

    now = datetime.utcnow()
    comment = BookClubComment(
        club_id=club_id,
        user_id=current_user.id,
        page_number=payload.page_number,
        body=payload.body,
        created_at=now,
        updated_at=now,
    )
    session.add(comment)
    member.last_active_at = now
    session.add(member)
    await session.commit()
    await session.refresh(comment)
    return BookClubCommentRead.model_validate(comment)


async def _get_owner_id(session: AsyncSession, club: BookClub) -> UUID:
    if club.owner_id is None:
        club.owner_id = await _get_owner_id_by_club_id(session, club.id)
    return club.owner_id


def _get_pages_total_override(club: BookClub) -> int | None:
    return club.pages_total_override
