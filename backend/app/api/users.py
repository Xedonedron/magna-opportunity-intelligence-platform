from __future__ import annotations

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def list_active_users(
    role: Optional[str] = Query(None, description="Optional role filter (e.g. engineer, presales)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List active users for assignment dropdowns and team views."""
    query = db.query(User).filter(User.is_active == True)
    if role:
        query = query.filter(User.role == role)
    
    users = query.order_by(User.full_name.asc()).all()
    return users
