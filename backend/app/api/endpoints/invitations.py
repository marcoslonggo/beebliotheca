from __future__ import annotations

from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_current_user, get_session
from app.models import (
    InvitationStatus,
    Library,
    LibraryInvitation,
    LibraryInvitationCreate,
    LibraryInvitationRead,
    LibraryInvitationWithDetails,
    LibraryMember,
    MemberRole,
    Notification,
    NotificationCreate,
    NotificationType,
    User,
)

router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.post(
    "/libraries/{library_id}/invite",
    response_model=LibraryInvitationRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_invitation(
    library_id: UUID,
    invitation_data: LibraryInvitationCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> LibraryInvitation:
    """Create a library invitation. Requires owner or admin role."""
    # Verify user has permission (owner or admin)
    stmt = select(LibraryMember).where(
        LibraryMember.library_id == library_id,
        LibraryMember.user_id == current_user.id,
    )
    result = await session.execute(stmt)
    member = result.scalar_one_or_none()

    if not member or member.role not in [MemberRole.OWNER, MemberRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only library owner or co-owners can send invitations",
        )

    # Verify library exists
    library_stmt = select(Library).where(Library.id == library_id)
    library_result = await session.execute(library_stmt)
    library = library_result.scalar_one_or_none()

    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Library not found",
        )

    # Find invitee by username
    user_stmt = select(User).where(User.username == invitation_data.invitee_username)
    user_result = await session.execute(user_stmt)
    invitee = user_result.scalar_one_or_none()

    if not invitee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{invitation_data.invitee_username}' not found",
        )

    # Check if user is already a member
    existing_member_stmt = select(LibraryMember).where(
        LibraryMember.library_id == library_id,
        LibraryMember.user_id == invitee.id,
    )
    existing_member_result = await session.execute(existing_member_stmt)
    if existing_member_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this library",
        )

    # Check for pending invitation
    pending_stmt = select(LibraryInvitation).where(
        LibraryInvitation.library_id == library_id,
        LibraryInvitation.invitee_id == invitee.id,
        LibraryInvitation.status == InvitationStatus.PENDING,
    )
    pending_result = await session.execute(pending_stmt)
    if pending_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A pending invitation already exists for this user",
        )

    # Validate role
    if invitation_data.role not in [MemberRole.ADMIN.value, MemberRole.VIEWER.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'admin' (co-owner) or 'viewer' (read-only)",
        )

    # Create invitation
    invitation = LibraryInvitation(
        library_id=library_id,
        inviter_id=current_user.id,
        invitee_username=invitation_data.invitee_username,
        invitee_id=invitee.id,
        role=invitation_data.role,
        status=InvitationStatus.PENDING,
        created_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(days=7),
    )

    session.add(invitation)
    await session.flush()

    # Create notification for invitee
    role_label = "Co-owner" if invitation_data.role == MemberRole.ADMIN.value else "Read-only"
    notification = Notification(
        user_id=invitee.id,
        type=NotificationType.LIBRARY_INVITATION,
        title="Library Invitation",
        message=f"{current_user.username} invited you to join '{library.name}' as {role_label}",
        data={
            "invitation_id": str(invitation.id),
            "library_id": str(library_id),
            "library_name": library.name,
            "inviter_username": current_user.username,
            "role": invitation_data.role,
        },
        created_at=datetime.utcnow(),
    )

    session.add(notification)
    await session.commit()
    await session.refresh(invitation)

    return invitation


@router.get("/pending", response_model=list[LibraryInvitationWithDetails])
async def list_pending_invitations(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[LibraryInvitationWithDetails]:
    """List all pending invitations for the current user."""
    stmt = (
        select(LibraryInvitation, Library, User)
        .join(Library, LibraryInvitation.library_id == Library.id)
        .join(User, LibraryInvitation.inviter_id == User.id)
        .where(
            LibraryInvitation.invitee_id == current_user.id,
            LibraryInvitation.status == InvitationStatus.PENDING,
            LibraryInvitation.expires_at > datetime.utcnow(),
        )
    )

    result = await session.execute(stmt)
    rows = result.all()

    invitations = []
    for invitation, library, inviter in rows:
        invitations.append(
            LibraryInvitationWithDetails(
                id=invitation.id,
                library_id=invitation.library_id,
                inviter_id=invitation.inviter_id,
                invitee_username=invitation.invitee_username,
                invitee_id=invitation.invitee_id,
                role=invitation.role,
                status=invitation.status,
                created_at=invitation.created_at,
                expires_at=invitation.expires_at,
                responded_at=invitation.responded_at,
                library_name=library.name,
                inviter_username=inviter.username,
                inviter_full_name=inviter.full_name,
            )
        )

    return invitations


@router.post("/{invitation_id}/accept", status_code=status.HTTP_200_OK)
async def accept_invitation(
    invitation_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Accept a library invitation."""
    # Fetch invitation
    stmt = select(LibraryInvitation).where(LibraryInvitation.id == invitation_id)
    result = await session.execute(stmt)
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    # Verify invitation is for current user
    if invitation.invitee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation is not for you",
        )

    # Check if already accepted or expired
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation is {invitation.status}",
        )

    if invitation.expires_at < datetime.utcnow():
        invitation.status = InvitationStatus.EXPIRED
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitation has expired",
        )

    # Check if user is already a member
    existing_member_stmt = select(LibraryMember).where(
        LibraryMember.library_id == invitation.library_id,
        LibraryMember.user_id == current_user.id,
    )
    existing_member_result = await session.execute(existing_member_stmt)
    if existing_member_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this library",
        )

    # Add user as library member
    member = LibraryMember(
        library_id=invitation.library_id,
        user_id=current_user.id,
        role=MemberRole(invitation.role),
        joined_at=datetime.utcnow(),
    )

    session.add(member)

    # Update invitation status
    invitation.status = InvitationStatus.ACCEPTED
    invitation.responded_at = datetime.utcnow()

    await session.commit()

    return {"message": "Invitation accepted successfully"}


@router.post("/{invitation_id}/decline", status_code=status.HTTP_200_OK)
async def decline_invitation(
    invitation_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Decline a library invitation."""
    # Fetch invitation
    stmt = select(LibraryInvitation).where(LibraryInvitation.id == invitation_id)
    result = await session.execute(stmt)
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    # Verify invitation is for current user
    if invitation.invitee_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation is not for you",
        )

    # Check if already responded
    if invitation.status != InvitationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invitation is already {invitation.status}",
        )

    # Update invitation status
    invitation.status = InvitationStatus.DECLINED
    invitation.responded_at = datetime.utcnow()

    await session.commit()

    return {"message": "Invitation declined"}


@router.get("/libraries/{library_id}/invitations", response_model=list[LibraryInvitationRead])
async def list_library_invitations(
    library_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[LibraryInvitation]:
    """List all invitations for a library. Requires owner or admin role."""
    # Verify user has permission
    stmt = select(LibraryMember).where(
        LibraryMember.library_id == library_id,
        LibraryMember.user_id == current_user.id,
    )
    result = await session.execute(stmt)
    member = result.scalar_one_or_none()

    if not member or member.role not in [MemberRole.OWNER, MemberRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only library owner or co-owners can view invitations",
        )

    # Fetch invitations
    invitations_stmt = select(LibraryInvitation).where(
        LibraryInvitation.library_id == library_id
    )
    invitations_result = await session.execute(invitations_stmt)
    invitations = invitations_result.scalars().all()

    return list(invitations)


@router.delete("/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_invitation(
    invitation_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Cancel a pending invitation. Requires owner role."""
    # Fetch invitation
    stmt = select(LibraryInvitation).where(LibraryInvitation.id == invitation_id)
    result = await session.execute(stmt)
    invitation = result.scalar_one_or_none()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found",
        )

    # Verify user has permission (owner only)
    member_stmt = select(LibraryMember).where(
        LibraryMember.library_id == invitation.library_id,
        LibraryMember.user_id == current_user.id,
    )
    member_result = await session.execute(member_stmt)
    member = member_result.scalar_one_or_none()

    if not member or member.role != MemberRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only library owner can cancel invitations",
        )

    # Update invitation status
    invitation.status = InvitationStatus.CANCELLED
    invitation.responded_at = datetime.utcnow()

    await session.commit()
