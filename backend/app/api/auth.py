from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid

from app.core.database import get_db
from app.core.config import get_settings
from app.models.user import User
from app.schemas.user import UserResponse
from app.services.auth import (
    verify_google_token,
    create_access_token,
    decode_access_token,
    get_or_create_user,
)

settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# Static dummy users for development
STATIC_USERS = {
    "superadmin": {"password": "P@ssw0rd", "role": "superadmin"},
    "admin": {"password": "P@ssw0rd", "role": "admin"},
    "lead_gen": {"password": "123456", "role": "lead_gen"},
    "managerial": {"password": "123456", "role": "managerial"},
    "engineer": {"password": "123456", "role": "engineer"},
}


class GoogleLoginRequest(BaseModel):
    credential: str  # Google ID token


class UsernameLoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Dependency to get current authenticated user."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    try:
        uuid_user_id = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token",
        )

    user = db.query(User).filter(User.id == uuid_user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


@router.post("/google", response_model=TokenResponse)
async def google_login(request: GoogleLoginRequest, db: Session = Depends(get_db)):
    """Login with Google Workspace account."""
    google_info = verify_google_token(request.credential)
    if google_info is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token or unauthorized domain",
        )

    user = get_or_create_user(db, google_info)
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def username_login(request: UsernameLoginRequest, db: Session = Depends(get_db)):
    """Login with username and password (dummy auth for development)."""
    # Check if username exists in static users
    if request.username not in STATIC_USERS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    static_user = STATIC_USERS[request.username]

    # Check password
    if request.password != static_user["password"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Get or create user in database
    email = f"{request.username}@magnaglobal.id"
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Determine capabilities based on role
        role_name = static_user["role"]
        if role_name in ("admin", "superadmin"):
            caps = "view,create_edit,delete,generate_kyc,user_management"
        elif role_name in ("manager", "lgo", "sales", "presales"):
            caps = "view,create_edit,delete,generate_kyc"
        elif role_name == "engineer":
            caps = "view,generate_kyc"
        else:
            caps = "view"

        # Create new user
        user = User(
            id=uuid.uuid4(),
            email=email,
            full_name=request.username.replace("_", " ").title(),
            role=role_name,
            capabilities=caps,
            is_active=True,
            last_login=datetime.now(timezone.utc),
        )
        db.add(user)
    else:
        # Update last login
        user.last_login = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user)

    # Create access token
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


def require_capability(capability: str):
    """Dependency helper to require a specific capability string on the current user."""
    def dependency(current_user: User = Depends(get_current_user)):
        caps = [c.strip() for c in (current_user.capabilities or "").split(",")]
        if capability not in caps:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Anda tidak memiliki izin '{capability}' untuk melakukan aksi ini."
            )
        return current_user
    return dependency
