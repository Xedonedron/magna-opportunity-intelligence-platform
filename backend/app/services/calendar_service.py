"""
Google Calendar Service

Creates calendar events for meetings via Google Calendar API.
For MVP, this logs the event. In production, integrate with
Google Calendar API using service account or OAuth credentials.
"""

import logging
from datetime import datetime
from typing import Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class CalendarService:
    """Service for managing Google Calendar events."""

    def __init__(self):
        self.enabled = settings.GOOGLE_CALENDAR_ENABLED

    def create_meeting_event(
        self,
        title: str,
        description: str,
        start_time: datetime,
        end_time: datetime,
        attendees: list[str],
        location: Optional[str] = None,
    ) -> Optional[str]:
        """
        Create a Google Calendar event for a meeting.

        Returns the event ID if successful, None otherwise.
        For MVP, this logs the event instead of calling the API.
        """
        if not self.enabled:
            logger.info(
                f"[CALENDAR] (disabled) Event: {title} | "
                f"Start: {start_time} | Attendees: {attendees}"
            )
            return None

        # TODO: Implement actual Google Calendar API integration
        # from googleapiclient.discovery import build
        # service = build('calendar', 'v3', credentials=creds)
        # event = {
        #     'summary': title,
        #     'description': description,
        #     'start': {'dateTime': start_time.isoformat(), 'timeZone': 'Asia/Jakarta'},
        #     'end': {'dateTime': end_time.isoformat(), 'timeZone': 'Asia/Jakarta'},
        #     'attendees': [{'email': e} for e in attendees],
        # }
        # result = service.events().insert(calendarId='primary', body=event).execute()
        # return result.get('id')

        logger.info(
            f"[CALENDAR] Event created: {title} | "
            f"Start: {start_time} | Attendees: {attendees}"
        )
        return "mock-event-id"

    def update_meeting_event(
        self,
        event_id: str,
        title: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> bool:
        """Update an existing calendar event."""
        if not self.enabled:
            logger.info(f"[CALENDAR] (disabled) Update event: {event_id}")
            return False

        logger.info(f"[CALENDAR] Event updated: {event_id}")
        return True

    def delete_meeting_event(self, event_id: str) -> bool:
        """Delete a calendar event."""
        if not self.enabled:
            logger.info(f"[CALENDAR] (disabled) Delete event: {event_id}")
            return False

        logger.info(f"[CALENDAR] Event deleted: {event_id}")
        return True


# Singleton instance
calendar_service = CalendarService()