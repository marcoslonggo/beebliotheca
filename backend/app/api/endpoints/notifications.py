from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_current_user, get_session
from app.models import Notification, NotificationRead, NotificationUpdate, User

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationRead])
async def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Notification]:
    """List notifications for the current user."""
    stmt = select(Notification).where(Notification.user_id == current_user.id)

    if unread_only:
        stmt = stmt.where(Notification.read == False)

    stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)

    result = await session.execute(stmt)
    notifications = result.scalars().all()

    return list(notifications)


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get count of unread notifications."""
    stmt = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.read == False,
    )

    result = await session.execute(stmt)
    notifications = result.scalars().all()

    return {"count": len(notifications)}


@router.patch("/{notification_id}", response_model=NotificationRead)
async def update_notification(
    notification_id: UUID,
    notification_data: NotificationUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Notification:
    """Update a notification (mark as read/unread)."""
    # Fetch notification
    stmt = select(Notification).where(Notification.id == notification_id)
    result = await session.execute(stmt)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    # Verify notification belongs to current user
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own notifications",
        )

    # Update read status
    notification.read = notification_data.read

    session.add(notification)
    await session.commit()
    await session.refresh(notification)

    return notification


@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Mark all notifications as read for the current user."""
    stmt = select(Notification).where(
        Notification.user_id == current_user.id,
        Notification.read == False,
    )

    result = await session.execute(stmt)
    notifications = result.scalars().all()

    for notification in notifications:
        notification.read = True
        session.add(notification)

    await session.commit()

    return {"message": f"Marked {len(notifications)} notifications as read"}


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a notification."""
    # Fetch notification
    stmt = select(Notification).where(Notification.id == notification_id)
    result = await session.execute(stmt)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    # Verify notification belongs to current user
    if notification.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own notifications",
        )

    await session.delete(notification)
    await session.commit()
