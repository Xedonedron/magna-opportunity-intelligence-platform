from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func

from app.core.database import get_db
from app.models.user import User
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationResponse,
    NotificationListResponse,
    NotificationUpdate,
)
from app.core.security import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notifications for the current user."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    total = query.count()
    unread_count = (
        db.query(sa_func.count(Notification.id))
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .scalar()
    )

    items = (
        query.order_by(Notification.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return NotificationListResponse(
        items=[NotificationResponse.model_validate(i) for i in items],
        total=total,
        unread_count=unread_count,
    )


@router.get("/unread-count")
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the count of unread notifications."""
    count = (
        db.query(sa_func.count(Notification.id))
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)
        .scalar()
    )
    return {"unread_count": count}


@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: uuid.UUID,
    data: NotificationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read/unread."""
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")

    if data.is_read is not None:
        notification.is_read = data.is_read

    db.commit()
    db.refresh(notification)
    return notification


@router.post("/mark-all-read", status_code=status.HTTP_200_OK)
async def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}