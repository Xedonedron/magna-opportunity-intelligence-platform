import os
import hmac
import hashlib
import secrets
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.core.config import get_settings
from app.models.user import User
from app.services.auth import decode_access_token

settings = get_settings()
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with random salt."""
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"pbkdf2_sha256$100000${salt.hex()}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password string."""
    try:
        algorithm, iterations, salt_hex, key_hex = hashed_password.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        computed_key = hashlib.pbkdf2_hmac(
            "sha256", plain_password.encode("utf-8"), salt, int(iterations)
        )
        return hmac.compare_digest(computed_key, expected_key)
    except Exception:
        return False


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


def require_capability(capability: str):
    """Dependency helper to require a specific capability string on current user."""
    def dependency(current_user: User = Depends(get_current_user)):
        caps = [c.strip() for c in (current_user.capabilities or "").split(",")]
        if capability not in caps and current_user.role != "superadmin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Anda tidak memiliki izin '{capability}' untuk melakukan aksi ini.",
            )
        return current_user
    return dependency


def require_superadmin(current_user: User = Depends(get_current_user)):
    """Dependency helper to require superadmin role."""
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Hanya superadmin yang memiliki akses ke halaman operasional ini.",
        )
    return current_user
