export interface Meeting {
    id: string;
    opportunity_id: string;
    title: string;
    date: string;
    location: string | null;
    participants: string[] | null;
    agenda: string[] | null;
    notes: string | null;
    action_items: string[] | null;
    attachments: Record<string, unknown>[] | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface MeetingListResponse {
    items: Meeting[];
    total: number;
}

export interface MeetingCreatePayload {
    opportunity_id: string;
    title: string;
    date: string;
    location?: string;
    participants?: string[];
    agenda?: string[];
    notes?: string;
    action_items?: string[];
}

export interface MeetingUpdatePayload {
    title?: string;
    date?: string;
    location?: string;
    participants?: string[];
    agenda?: string[];
    notes?: string;
    action_items?: string[];
}