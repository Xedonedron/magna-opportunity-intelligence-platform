export type NotificationType =
    | "opportunity_created"
    | "kyc_completed"
    | "status_changed"
    | "meeting_reminder"
    | "proposal_reminder";

export interface Notification {
    id: string;
    user_id: string;
    opportunity_id: string | null;
    type: NotificationType;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

export interface NotificationListResponse {
    items: Notification[];
    total: number;
    unread_count: number;
}

export interface UnreadCountResponse {
    unread_count: number;
}