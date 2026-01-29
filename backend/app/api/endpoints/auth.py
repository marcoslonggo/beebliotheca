from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_current_user, get_session
from app.models import Token, User, UserCreate, UserLogin, UserRead
from app.services.auth import create_access_token, get_password_hash, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_session),
) -> User:
    """Register a new user."""
    # Check if email already exists
    stmt = select(User).where(User.email == user_data.email)
    result = await session.exec(stmt)
    existing_user = result.first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check if username already exists
    stmt = select(User).where(User.username == user_data.username)
    result = await session.exec(stmt)
    existing_user = result.first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    # Determine if this is the first registered user
    existing_user_stmt = select(User.id)
    has_any_user = (await session.exec(existing_user_stmt)).first() is not None

    # Create new user with hashed password
    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=get_password_hash(user_data.password),
        is_admin=not has_any_user,
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    return user


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    session: AsyncSession = Depends(get_session),
) -> Token:
    """Login and receive JWT token. Accepts username or email."""
    # Try to find user by email first, then by username
    stmt = select(User).where(
        (User.email == credentials.email) | (User.username == credentials.email)
    )
    result = await session.exec(stmt)
    user = result.first()

    # Verify user exists and password is correct
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}
    )

    return Token(access_token=access_token)


@router.get("/me", response_model=UserRead)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current authenticated user information."""
    return current_user


@router.get("/users/search", response_model=list[UserRead])
async def search_users(
    username: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[User]:
    """Search users by username (for invitations)."""
    if len(username) < 2:
        return []

    # Search for users with matching username (case-insensitive)
    stmt = select(User).where(User.username.ilike(f"%{username}%")).limit(10)
    result = await session.exec(stmt)
    users = result.all()

    return list(users)



