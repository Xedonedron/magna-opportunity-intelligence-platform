export type NotificationType =
    | "opportunity_created"
    | "kyc_completed"
    | "kyc_failed"
    | "status_changed"
    | "deal_value_changed"
    | "opportunity_assigned"
    | "meeting_scheduled"
    | "meeting_reminder"
    | "proposal_reminder"
    | string;

export interface Notification {
    id: string;
    user_id: string;
    opportunity_id: string | null;
    type: NotificationType;
    title: string;
    message: string;
    link_url?: string | null;
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