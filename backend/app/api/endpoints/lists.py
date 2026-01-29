from __future__ import annotations

from datetime import datetime
from typing import Iterable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_current_user, get_session
from app.api.schemas.reading_lists import ReadingListDetail, ReadingListSummary
from app.models import (
    ListVisibility,
    ReadingList,
    ReadingListCreate,
    ReadingListItem,
    ReadingListItemCreate,
    ReadingListItemRead,
    ReadingListItemUpdate,
    ReadingListMember,
    ReadingListMemberCreate,
    ReadingListMemberRead,
    ReadingListMemberUpdate,
    ReadingListProgress,
    ReadingListProgressStatus,
    ReadingListProgressUpdate,
    ReadingListRead,
    ReadingListRole,
    ReadingListUpdate,
    User,
)

router = APIRouter(prefix="/lists", tags=["lists"])


async def _get_reading_list(session: AsyncSession, list_id: UUID) -> ReadingList:
    result = await session.exec(select(ReadingList).where(ReadingList.id == list_id))
    reading_list = result.first()
    if reading_list is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List not found")
    return reading_list


async def _get_member(
    session: AsyncSession,
    list_id: UUID,
    user_id: UUID,
) -> ReadingListMember | None:
    stmt = select(ReadingListMember).where(
        ReadingListMember.list_id == list_id,
        ReadingListMember.user_id == user_id,
    )
    result = await session.exec(stmt)
    return result.first()


def _ensure_permission(member: ReadingListMember | None, roles: Iterable[ReadingListRole]) -> None:
    if member is None or member.role not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )


@router.post("", response_model=ReadingListRead, status_code=status.HTTP_201_CREATED)
async def create_reading_list(
    payload: ReadingListCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReadingListRead:
    reading_list = ReadingList(
        owner_id=current_user.id,
        title=payload.title,
        description=payload.description,
        visibility=payload.visibility,
    )
    session.add(reading_list)
    await session.flush()

    owner_member = ReadingListMember(
        list_id=reading_list.id,
        user_id=current_user.id,
        role=ReadingListRole.OWNER,
        invited_by=current_user.id,
    )
    session.add(owner_member)
    await session.commit()
    await session.refresh(reading_list)
    return ReadingListRead.model_validate(reading_list)


@router.get("", response_model=list[ReadingListSummary])
async def list_reading_lists(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    visibility: ListVisibility | None = Query(default=None),
) -> list[ReadingListSummary]:
    stmt = (
        select(ReadingList, ReadingListMember.role)
        .join(ReadingListMember, ReadingListMember.list_id == ReadingList.id, isouter=True)
        .where(
            (ReadingList.owner_id == current_user.id)
            | (ReadingListMember.user_id == current_user.id)
            | (ReadingList.visibility == ListVisibility.PUBLIC)
        )
    )
    if visibility:
        stmt = stmt.where(ReadingList.visibility == visibility)

    result = await session.exec(stmt)
    rows = result.all()

    if not rows:
        return []

    list_ids = [row[0].id for row in rows]

    item_counts_stmt = (
        select(ReadingListItem.list_id, func.count(ReadingListItem.id))
        .where(ReadingListItem.list_id.in_(list_ids))
        .group_by(ReadingListItem.list_id)
    )
    item_counts_result = await session.exec(item_counts_stmt)
    item_counts = {list_id: count for list_id, count in item_counts_result.all()}

    member_counts_stmt = (
        select(ReadingListMember.list_id, func.count(ReadingListMember.id))
        .where(ReadingListMember.list_id.in_(list_ids))
        .group_by(ReadingListMember.list_id)
    )
    member_counts_result = await session.exec(member_counts_stmt)
    member_counts = {list_id: count for list_id, count in member_counts_result.all()}

    summaries: list[ReadingListSummary] = []
    seen: set[UUID] = set()
    for reading_list, role in rows:
        if reading_list.id in seen:
            continue
        seen.add(reading_list.id)
        # visibility can be a string or enum depending on how it was loaded
        visibility_str = reading_list.visibility.value if isinstance(reading_list.visibility, ListVisibility) else str(reading_list.visibility)
        summaries.append(
            ReadingListSummary(
                id=reading_list.id,
                title=reading_list.title,
                description=reading_list.description,
                visibility=visibility_str,
                owner_id=reading_list.owner_id,
                item_count=item_counts.get(reading_list.id, 0),
                member_count=member_counts.get(reading_list.id, 0),
                role=role,
            )
        )
    return sorted(summaries, key=lambda summary: summary.title.lower())


@router.get("/{list_id}", response_model=ReadingListDetail)
async def get_reading_list_detail(
    list_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReadingListDetail:
    reading_list = await _get_reading_list(session, list_id)
    member = await _get_member(session, list_id, current_user.id)

    if reading_list.visibility == ListVisibility.PRIVATE and member is None and reading_list.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="List is private.")

    items_stmt = (
        select(ReadingListItem)
        .where(ReadingListItem.list_id == list_id)
        .order_by(ReadingListItem.order_index.asc(), ReadingListItem.created_at.asc())
    )
    items_result = await session.exec(items_stmt)
    items = items_result.all()

    members_stmt = select(ReadingListMember).where(ReadingListMember.list_id == list_id)
    members_result = await session.exec(members_stmt)
    members = members_result.all()

    progress_stmt = select(ReadingListProgress).where(
        ReadingListProgress.list_id == list_id,
        ReadingListProgress.user_id == current_user.id,
    )
    progress_result = await session.exec(progress_stmt)
    progress = progress_result.all()

    detail = ReadingListDetail(
        list=ReadingListRead.model_validate(reading_list),
        items=[ReadingListItemRead.model_validate(item) for item in items],
        members=[ReadingListMemberRead.model_validate(member_obj) for member_obj in members],
        progress=progress,
    )
    return detail


@router.patch("/{list_id}", response_model=ReadingListRead)
async def update_reading_list(
    list_id: UUID,
    payload: ReadingListUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReadingListRead:
    reading_list = await _get_reading_list(session, list_id)
    member = await _get_member(session, list_id, current_user.id)

    if reading_list.owner_id != current_user.id:
        _ensure_permission(member, [ReadingListRole.OWNER, ReadingListRole.COLLABORATOR])

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(reading_list, key, value)

    reading_list.updated_at = datetime.utcnow()
    session.add(reading_list)
    await session.commit()
    await session.refresh(reading_list)
    return ReadingListRead.model_validate(reading_list)


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reading_list(
    list_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    reading_list = await _get_reading_list(session, list_id)
    if reading_list.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner can delete the list.")

    await session.delete(reading_list)
    await session.commit()


@router.post(
    "/{list_id}/items",
    response_model=ReadingListItemRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_list_item(
    list_id: UUID,
    payload: ReadingListItemCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReadingListItemRead:
    reading_list = await _get_reading_list(session, list_id)
    member = await _get_member(session, list_id, current_user.id)

    if reading_list.owner_id != current_user.id:
        _ensure_permission(member, [ReadingListRole.OWNER, ReadingListRole.COLLABORATOR])

    order_index = payload.order_index
    if order_index is None:
        stmt = select(func.max(ReadingListItem.order_index)).where(ReadingListItem.list_id == list_id)
        result = await session.exec(stmt)
        max_index = result.scalar_one_or_none() or 0
        order_index = max_index + 1

    list_item = ReadingListItem(
        list_id=list_id,
        order_index=order_index,
        book_id=payload.book_id,
        title=payload.title,
        author=payload.author,
        isbn=payload.isbn,
        notes=payload.notes,
        cover_image_url=payload.cover_image_url,
        item_type=payload.item_type,
    )
    session.add(list_item)
    await session.commit()
    await session.refresh(list_item)
    return ReadingListItemRead.model_validate(list_item)


@router.patch(
    "/{list_id}/items/{item_id}",
    response_model=ReadingListItemRead,
)
async def update_list_item(
    list_id: UUID,
    item_id: UUID,
    payload: ReadingListItemUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReadingListItemRead:
    await _get_reading_list(session, list_id)
    member = await _get_member(session, list_id, current_user.id)

    if member is None or member.role not in (ReadingListRole.OWNER, ReadingListRole.COLLABORATOR):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")

    stmt = select(ReadingListItem).where(
        ReadingListItem.id == item_id,
        ReadingListItem.list_id == list_id,
    )
    result = await session.exec(stmt)
    list_item = result.first()
    if list_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List item not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(list_item, key, value)

    list_item.updated_at = datetime.utcnow()
    session.add(list_item)
    await session.commit()
    await session.refresh(list_item)
    return ReadingListItemRead.model_validate(list_item)


@router.delete(
    "/{list_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_list_item(
    list_id: UUID,
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    await _get_reading_list(session, list_id)
    member = await _get_member(session, list_id, current_user.id)

    if member is None or member.role not in (ReadingListRole.OWNER, ReadingListRole.COLLABORATOR):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")

    stmt = select(ReadingListItem).where(
        ReadingListItem.id == item_id,
        ReadingListItem.list_id == list_id,
    )
    result = await session.exec(stmt)
    list_item = result.first()
    if list_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="List item not found.")

    await session.delete(list_item)
    await session.commit()


@router.get("/{list_id}/members", response_model=list[ReadingListMemberRead])
async def list_members(
    list_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ReadingListMemberRead]:
    reading_list = await _get_reading_list(session, list_id)
    member = await _get_member(session, list_id, current_user.id)

    if reading_list.visibility == ListVisibility.PRIVATE and member is None and reading_list.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="List is private.")

    stmt = select(ReadingListMember).where(ReadingListMember.list_id == list_id)
    result = await session.exec(stmt)
    members = result.all()
    return [ReadingListMemberRead.model_validate(member_obj) for member_obj in members]


@router.post(
    "/{list_id}/members",
    response_model=ReadingListMemberRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_member(
    list_id: UUID,
    payload: ReadingListMemberCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReadingListMemberRead:
    reading_list = await _get_reading_list(session, list_id)
    if reading_list.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owners can manage members.")

    existing_member = await _get_member(session, list_id, payload.user_id)
    if existing_member:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already a member.")

    member = ReadingListMember(
        list_id=list_id,
        user_id=payload.user_id,
        role=payload.role,
        invited_by=current_user.id,
    )
    session.add(member)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid member data.") from exc

    await session.refresh(member)
    return ReadingListMemberRead.model_validate(member)


@router.patch(
    "/{list_id}/members/{user_id}",
    response_model=ReadingListMemberRead,
)
async def update_member(
    list_id: UUID,
    user_id: UUID,
    payload: ReadingListMemberUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReadingListMemberRead:
    reading_list = await _get_reading_list(session, list_id)
    if reading_list.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owners can manage members.")

    member = await _get_member(session, list_id, user_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")
    if member.role == ReadingListRole.OWNER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change owner role.")

    member.role = payload.role
    session.add(member)
    await session.commit()
    await session.refresh(member)
    return ReadingListMemberRead.model_validate(member)


@router.delete(
    "/{list_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member(
    list_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    reading_list = await _get_reading_list(session, list_id)
    if reading_list.owner_id != current_user.id and user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")

    member = await _get_member(session, list_id, user_id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found.")
    if member.role == ReadingListRole.OWNER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot remove the owner.")

    await session.delete(member)
    await session.commit()


@router.get(
    "/{list_id}/progress",
    response_model=list[ReadingListProgress],
)
async def get_progress(
    list_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ReadingListProgress]:
    await _get_reading_list(session, list_id)
    member = await _get_member(session, list_id, current_user.id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Join the list to track progress.")

    stmt = select(ReadingListProgress).where(
        ReadingListProgress.list_id == list_id,
        ReadingListProgress.user_id == current_user.id,
    )
    result = await session.exec(stmt)
    return result.all()


@router.put(
    "/{list_id}/items/{item_id}/progress",
    response_model=ReadingListProgress,
)
async def update_progress(
    list_id: UUID,
    item_id: UUID,
    payload: ReadingListProgressUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ReadingListProgress:
    await _get_reading_list(session, list_id)
    member = await _get_member(session, list_id, current_user.id)
    if member is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Join the list to track progress.")

    stmt = select(ReadingListProgress).where(
        ReadingListProgress.list_id == list_id,
        ReadingListProgress.list_item_id == item_id,
        ReadingListProgress.user_id == current_user.id,
    )
    result = await session.exec(stmt)
    progress = result.first()

    now = datetime.utcnow()
    if progress is None:
        progress = ReadingListProgress(
            list_id=list_id,
            list_item_id=item_id,
            user_id=current_user.id,
            status=payload.status,
            completed_at=payload.completed_at,
            notes=payload.notes,
            updated_at=now,
        )
        if payload.status == ReadingListProgressStatus.COMPLETED and progress.completed_at is None:
            progress.completed_at = now
        session.add(progress)
    else:
        progress.status = payload.status
        progress.notes = payload.notes
        if payload.completed_at is not None:
            progress.completed_at = payload.completed_at
        elif payload.status == ReadingListProgressStatus.COMPLETED:
            progress.completed_at = progress.completed_at or now
        elif payload.status != ReadingListProgressStatus.COMPLETED:
            progress.completed_at = None
        progress.updated_at = now
        session.add(progress)

    await session.commit()
    await session.refresh(progress)
    return progress
