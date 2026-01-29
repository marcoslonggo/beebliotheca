from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_current_user, get_session
from app.models import (
    Library,
    LibraryCreate,
    LibraryMember,
    LibraryMemberCreate,
    LibraryMemberRead,
    LibraryMemberUpdate,
    LibraryMemberWithUser,
    LibraryRead,
    LibraryUpdate,
    LibraryWithRole,
    MemberRole,
    User,
)

router = APIRouter(prefix="/libraries", tags=["libraries"])


@router.post("", response_model=LibraryRead, status_code=status.HTTP_201_CREATED)
async def create_library(
    library_data: LibraryCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Library:
    """Create a new library. The creator becomes the owner."""
    # Create library
    library = Library(
        name=library_data.name,
        description=library_data.description,
        owner_id=current_user.id,
    )

    session.add(library)
    await session.commit()
    await session.refresh(library)

    # Add creator as owner member
    member = LibraryMember(
        library_id=library.id,
        user_id=current_user.id,
        role=MemberRole.OWNER,
    )

    session.add(member)
    await session.commit()

    return library


@router.get("", response_model=list[LibraryWithRole])
async def list_libraries(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[LibraryWithRole]:
    """List all libraries the current user is a member of, with their role."""
    stmt = (
        select(Library, LibraryMember)
        .join(LibraryMember, Library.id == LibraryMember.library_id)
        .where(LibraryMember.user_id == current_user.id)
    )

    result = await session.execute(stmt)
    rows = result.all()

    libraries_with_role = []
    for library, member in rows:
        libraries_with_role.append(
            LibraryWithRole(
                id=library.id,
                name=library.name,
                description=library.description,
                owner_id=library.owner_id,
                created_at=library.created_at,
                updated_at=library.updated_at,
                user_role=member.role.value,
            )
        )

    return libraries_with_role


@router.get("/{library_id}", response_model=LibraryRead)
async def get_library(
    library_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Library:
    """Get a single library by ID."""
    # Verify user is a member
    await _verify_library_member(library_id, current_user.id, session)

    # Fetch library
    stmt = select(Library).where(Library.id == library_id)
    result = await session.execute(stmt)
    library = result.scalars().first()

    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Library not found",
        )

    return library


@router.patch("/{library_id}", response_model=LibraryRead)
async def update_library(
    library_id: UUID,
    library_data: LibraryUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Library:
    """Update a library. Requires owner or admin role."""
    # Verify user has permission
    await _verify_library_permission(
        library_id, current_user.id, [MemberRole.OWNER, MemberRole.ADMIN], session
    )

    # Fetch library
    stmt = select(Library).where(Library.id == library_id)
    result = await session.execute(stmt)
    library = result.scalars().first()

    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Library not found",
        )

    # Update fields
    if library_data.name is not None:
        library.name = library_data.name
    if library_data.description is not None:
        library.description = library_data.description

    session.add(library)
    await session.commit()
    await session.refresh(library)

    return library


@router.delete("/{library_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_library(
    library_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a library. Requires owner role."""
    # Verify user is owner
    await _verify_library_permission(
        library_id, current_user.id, [MemberRole.OWNER], session
    )

    # Fetch library
    stmt = select(Library).where(Library.id == library_id)
    result = await session.execute(stmt)
    library = result.scalars().first()

    if not library:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Library not found",
        )

    # Delete all memberships first
    members_stmt = select(LibraryMember).where(LibraryMember.library_id == library_id)
    members_result = await session.execute(members_stmt)
    members = members_result.scalars().all()

    for member in members:
        await session.delete(member)

    # Delete library
    await session.delete(library)
    await session.commit()


# Library Member Management


@router.get("/{library_id}/members", response_model=list[LibraryMemberWithUser])
async def list_library_members(
    library_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[LibraryMemberWithUser]:
    """List all members of a library with user details."""
    # Verify user is a member
    await _verify_library_member(library_id, current_user.id, session)

    # Fetch members with user details
    stmt = (
        select(LibraryMember, User)
        .join(User, LibraryMember.user_id == User.id)
        .where(LibraryMember.library_id == library_id)
    )
    result = await session.execute(stmt)
    rows = result.all()

    members_with_users = []
    for member, user in rows:
        members_with_users.append(
            LibraryMemberWithUser(
                id=member.id,
                library_id=member.library_id,
                user_id=member.user_id,
                role=member.role,
                joined_at=member.joined_at,
                username=user.username,
                email=user.email,
                full_name=user.full_name,
            )
        )

    return members_with_users


@router.post(
    "/{library_id}/members",
    response_model=LibraryMemberRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_library_member(
    library_id: UUID,
    member_data: LibraryMemberCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> LibraryMember:
    """Add a new member to a library. Requires admin or owner role."""
    # Verify user has permission
    await _verify_library_permission(
        library_id, current_user.id, [MemberRole.OWNER, MemberRole.ADMIN], session
    )

    # Verify user to be added exists
    user_stmt = select(User).where(User.id == member_data.user_id)
    user_result = await session.execute(user_stmt)
    user = user_result.one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check if user is already a member
    existing_stmt = select(LibraryMember).where(
        LibraryMember.library_id == library_id,
        LibraryMember.user_id == member_data.user_id,
    )
    existing_result = await session.execute(existing_stmt)
    existing_member = existing_result.one_or_none()

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this library",
        )

    # Add member
    member = LibraryMember(
        library_id=library_id,
        user_id=member_data.user_id,
        role=member_data.role,
    )

    session.add(member)
    await session.commit()
    await session.refresh(member)

    return member


@router.patch("/{library_id}/members/{user_id}", response_model=LibraryMemberRead)
async def update_library_member(
    library_id: UUID,
    user_id: UUID,
    member_data: LibraryMemberUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> LibraryMember:
    """Update a library member's role. Requires owner role."""
    # Verify user has permission
    await _verify_library_permission(
        library_id, current_user.id, [MemberRole.OWNER], session
    )

    # Fetch member
    stmt = select(LibraryMember).where(
        LibraryMember.library_id == library_id,
        LibraryMember.user_id == user_id,
    )
    result = await session.execute(stmt)
    member = result.scalars().first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    # Can't change owner's role
    if member.role == MemberRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change owner's role",
        )

    # Update role
    member.role = member_data.role

    session.add(member)
    await session.commit()
    await session.refresh(member)

    return member


@router.delete("/{library_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_library_member(
    library_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Remove a member from a library. Requires owner or admin role."""
    # Verify user has permission
    await _verify_library_permission(
        library_id, current_user.id, [MemberRole.OWNER, MemberRole.ADMIN], session
    )

    # Fetch member
    stmt = select(LibraryMember).where(
        LibraryMember.library_id == library_id,
        LibraryMember.user_id == user_id,
    )
    result = await session.execute(stmt)
    member = result.scalars().first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    # Can't remove owner
    if member.role == MemberRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove library owner",
        )

    await session.delete(member)
    await session.commit()


# Helper Functions


async def _verify_library_member(
    library_id: UUID,
    user_id: UUID,
    session: AsyncSession,
) -> LibraryMember:
    """Verify user is a member of the library."""
    stmt = select(LibraryMember).where(
        LibraryMember.library_id == library_id,
        LibraryMember.user_id == user_id,
    )
    result = await session.execute(stmt)
    member = result.scalars().first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this library",
        )

    return member


async def _verify_library_permission(
    library_id: UUID,
    user_id: UUID,
    required_roles: list[MemberRole],
    session: AsyncSession,
) -> LibraryMember:
    """Verify user has required role in the library."""
    member = await _verify_library_member(library_id, user_id, session)

    if member.role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Requires one of the following roles: {', '.join(r.value for r in required_roles)}",
        )

    return member

