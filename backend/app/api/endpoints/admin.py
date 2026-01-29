from __future__ import annotations

from collections import defaultdict
from typing import Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_session, require_admin
from app.api.schemas.admin import (
    AdminLibraryMemberInfo,
    AdminUpdateLibraryRole,
    AdminUpdatePassword,
    AdminUpdateUserAdminStatus,
    AdminUserDetail,
    AdminUserLibrary,
)
from app.models import Library, LibraryMember, MemberRole, User
from app.services.auth import get_password_hash

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[AdminUserDetail])
async def list_users(
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> list[AdminUserDetail]:
    """List all users with their library memberships."""
    users_result = await session.exec(select(User))
    users: Sequence[User] = users_result.all()
    user_map = {user.id: user for user in users}

    if not users:
        return []

    membership_stmt = (
        select(LibraryMember, Library, User)
        .join(Library, LibraryMember.library_id == Library.id)
        .join(User, LibraryMember.user_id == User.id)
        .where(LibraryMember.user_id.in_(user_map.keys()))
    )
    membership_rows = await session.exec(membership_stmt)
    memberships = membership_rows.all()

    library_members: dict[UUID, list[AdminLibraryMemberInfo]] = defaultdict(list)
    user_memberships: dict[UUID, list[tuple[LibraryMember, Library]]] = defaultdict(list)

    for membership, library, member_user in memberships:
        member_info = AdminLibraryMemberInfo(
            user_id=member_user.id,
            username=member_user.username or (member_user.email or "unknown"),
            full_name=member_user.full_name or (member_user.email or "Unknown User"),
            role=membership.role,
            is_admin=member_user.is_admin,
        )
        library_members[library.id].append(member_info)
        user_memberships[member_user.id].append((membership, library))

    response: list[AdminUserDetail] = []
    for user in users:
        libraries: list[AdminUserLibrary] = []
        for membership, library in user_memberships.get(user.id, []):
            members = library_members.get(library.id, [])
            libraries.append(
                AdminUserLibrary(
                    library_id=library.id,
                library_name=library.name or "(Unnamed Library)",
                    role=membership.role,
                    member_count=len(members),
                    members=members,
                )
            )

        response.append(
            AdminUserDetail(
                id=user.id,
                username=user.username or (user.email or "unknown"),
                email=user.email or "unknown@example.com",
                full_name=user.full_name or (user.email or "Unknown User"),
                is_admin=user.is_admin,
                created_at=user.created_at,
                updated_at=user.updated_at,
                libraries=libraries,
            )
        )

    # Sort by created date for stable ordering
    response.sort(key=lambda u: u.created_at)
    return response


@router.patch("/users/{user_id}/admin", response_model=AdminUserDetail)
async def update_admin_status(
    user_id: UUID,
    payload: AdminUpdateUserAdminStatus,
    current_admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> AdminUserDetail:
    """Grant or revoke admin access for a user."""
    result = await session.exec(select(User).where(User.id == user_id))
    user = result.first()

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == current_admin.id and not payload.is_admin:
        # Prevent an admin from demoting themselves directly
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admins cannot remove their own admin access",
        )

    if user.is_admin == payload.is_admin:
        return await _serialize_admin_user(session, user)

    if not payload.is_admin:
        # Ensure at least one admin remains
        other_admin_stmt = select(User).where(User.is_admin == True, User.id != user.id)  # noqa: E712
        other_admin = (await session.exec(other_admin_stmt)).first()
        if other_admin is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one admin user is required",
            )

    user.is_admin = payload.is_admin
    session.add(user)
    await session.commit()
    await session.refresh(user)

    return await _serialize_admin_user(session, user)


@router.patch("/users/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
async def update_user_password(
    user_id: UUID,
    payload: AdminUpdatePassword,
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Set a new password for a user."""
    result = await session.exec(select(User).where(User.id == user_id))
    user = result.first()

    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.password_hash = get_password_hash(payload.new_password)
    session.add(user)
    await session.commit()


@router.patch(
    "/users/{user_id}/libraries/{library_id}",
    response_model=AdminUserLibrary,
)
async def update_membership_role(
    user_id: UUID,
    library_id: UUID,
    payload: AdminUpdateLibraryRole,
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> AdminUserLibrary:
    """Update a user's role within a library."""
    membership_stmt = (
        select(LibraryMember, Library)
        .join(Library, LibraryMember.library_id == Library.id)
        .where(
            LibraryMember.user_id == user_id,
            LibraryMember.library_id == library_id,
        )
    )
    result = await session.exec(membership_stmt)
    row = result.first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found",
        )

    membership, library = row

    if membership.role == payload.role:
        return await _serialize_user_library(session, membership, library)

    if membership.role == MemberRole.OWNER and payload.role != MemberRole.OWNER:
        other_owner_stmt = select(LibraryMember).where(
            LibraryMember.library_id == library_id,
            LibraryMember.role == MemberRole.OWNER,
            LibraryMember.user_id != user_id,
        )
        other_owner = (await session.exec(other_owner_stmt)).first()
        if other_owner is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Library must have at least one owner",
            )

        if library.owner_id == user_id:
            # Reassign primary owner to another owner
            library.owner_id = other_owner.user_id
            session.add(library)

    membership.role = payload.role
    session.add(membership)
    await session.commit()
    await session.refresh(membership)

    return await _serialize_user_library(session, membership, library)


@router.delete(
    "/users/{user_id}/libraries/{library_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_user_from_library(
    user_id: UUID,
    library_id: UUID,
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Remove a user from a library."""
    membership_stmt = (
        select(LibraryMember, Library)
        .join(Library, LibraryMember.library_id == Library.id)
        .where(
            LibraryMember.user_id == user_id,
            LibraryMember.library_id == library_id,
        )
    )
    result = await session.exec(membership_stmt)
    row = result.first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found",
        )

    membership, library = row

    if membership.role == MemberRole.OWNER:
        other_owner_stmt = select(LibraryMember).where(
            LibraryMember.library_id == library_id,
            LibraryMember.role == MemberRole.OWNER,
            LibraryMember.user_id != user_id,
        )
        other_owner = (await session.exec(other_owner_stmt)).first()
        if other_owner is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the only owner from a library",
            )
        if library.owner_id == user_id:
            library.owner_id = other_owner.user_id
            session.add(library)

    await session.delete(membership)
    await session.commit()


async def _serialize_admin_user(session: AsyncSession, user: User) -> AdminUserDetail:
    library_ids_result = await session.exec(
        select(LibraryMember.library_id).where(LibraryMember.user_id == user.id)
    )
    library_ids = [row for row in library_ids_result.all()]

    if not library_ids:
        return AdminUserDetail(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            is_admin=user.is_admin,
            created_at=user.created_at,
            updated_at=user.updated_at,
            libraries=[],
        )

    memberships_stmt = (
        select(LibraryMember, Library, User)
        .join(Library, LibraryMember.library_id == Library.id)
        .join(User, LibraryMember.user_id == User.id)
        .where(LibraryMember.library_id.in_(library_ids))
    )

    memberships_result = await session.exec(memberships_stmt)
    rows = memberships_result.all()

    library_members: dict[UUID, list[AdminLibraryMemberInfo]] = defaultdict(list)
    membership_map: dict[UUID, LibraryMember] = {}
    library_map: dict[UUID, Library] = {}

    for membership, library, member_user in rows:
        library_map[library.id] = library
        if membership.user_id == user.id:
            membership_map[library.id] = membership

        library_members[library.id].append(
            AdminLibraryMemberInfo(
                user_id=member_user.id,
                username=member_user.username or (member_user.email or "unknown"),
                full_name=member_user.full_name or (member_user.email or "Unknown User"),
                role=membership.role,
                is_admin=member_user.is_admin,
            )
        )

    libraries: list[AdminUserLibrary] = []
    for library_id, membership in membership_map.items():
        library = library_map[library_id]
        members = library_members[library_id]
        libraries.append(
            AdminUserLibrary(
                library_id=library.id,
            library_name=library.name or "(Unnamed Library)",
                role=membership.role,
                member_count=len(members),
                members=members,
            )
        )

    libraries.sort(key=lambda lib: lib.library_name.lower())

    return AdminUserDetail(
        id=user.id,
        username=user.username or (user.email or "unknown"),
        email=user.email or "unknown@example.com",
        full_name=user.full_name or (user.email or "Unknown User"),
        is_admin=user.is_admin,
        created_at=user.created_at,
        updated_at=user.updated_at,
        libraries=libraries,
    )


async def _serialize_user_library(
    session: AsyncSession,
    membership: LibraryMember,
    library: Library,
) -> AdminUserLibrary:
    members_stmt = (
        select(LibraryMember, User)
        .join(User, LibraryMember.user_id == User.id)
        .where(LibraryMember.library_id == library.id)
    )
    members_result = await session.exec(members_stmt)
    rows = members_result.all()

    members = [
        AdminLibraryMemberInfo(
            user_id=member_user.id,
            username=member_user.username or (member_user.email or "unknown"),
            full_name=member_user.full_name or (member_user.email or "Unknown User"),
            role=member.role,
            is_admin=member_user.is_admin,
        )
        for member, member_user in rows
    ]

    return AdminUserLibrary(
        library_id=library.id,
        library_name=library.name,
        role=membership.role,
        member_count=len(members),
        members=members,
    )
