import uuid
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.user import User
from app.schemas.user import UserCreate

settings = get_settings()


def verify_google_token(token: str) -> dict | None:
    """Verify Google OAuth ID token and return user info."""
    try:
        idinfo = id_token.verify_oauth2_token(
            token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
        # Verify the domain is our Google Workspace domain
        if idinfo.get("hd") != settings.GOOGLE_WORKSPACE_DOMAIN:
            return None
        return idinfo
    except (ValueError, JWTError):
        return None


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    """Decode and validate JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def get_or_create_user(db: Session, google_info: dict) -> User:
    """Get existing user or create new one from Google info."""
    email = google_info.get("email")
    user = db.query(User).filter(User.email == email).first()

    is_super = email in ["nixon.hutahaean@magnaglobal.id", "robi.firmansyah@magnaglobal.id"]

    if user:
        # Update last login and avatar
        user.last_login = datetime.now(timezone.utc)
        user.avatar_url = google_info.get("picture", user.avatar_url)
        # Auto-promote superadmin if they exist but role/capabilities are not set
        if is_super and user.role != "superadmin":
            user.role = "superadmin"
            user.capabilities = "view,create_edit,delete,generate_kyc,user_management"
        db.commit()
        db.refresh(user)
        return user

    # Create new user
    role = "superadmin" if is_super else "viewer"
    capabilities = (
        "view,create_edit,delete,generate_kyc,user_management"
        if is_super
        else "view"
    )

    new_user = User(
        id=uuid.uuid4(),
        email=email,
        full_name=google_info.get("name", email.split("@")[0]),
        avatar_url=google_info.get("picture"),
        google_id=google_info.get("sub"),
        role=role,
        capabilities=capabilities,
        is_active=True,
        last_login=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user