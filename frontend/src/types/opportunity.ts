export type OpportunityStatus =
    | "New"
    | "KYC Running"
    | "Ready Meeting"
    | "Meeting Scheduled"
    | "Meeting Done"
    | "Need Proposal"
    | "Negotiation"
    | "PO"
    | "Won"
    | "Lost"
    | "On Hold";

export interface UserBrief {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
}

export interface TimelineEvent {
    id: string;
    opportunity_id: string;
    actor_id: string | null;
    actor_name: string;
    action: string;
    description: string | null;
    event_type: "create" | "update" | "meeting" | "system" | "status_change";
    created_at: string;
}

export interface Opportunity {
    id: string;
    company_name: string;
    website: string | null;
    email: string | null;
    phone: string | null;
    industry: string | null;
    product: string | null;
    customer_needs: string;
    additional_notes: string | null;
    potential_revenue: number | null;
    estimated_agenda_date: string | null;
    status: OpportunityStatus;
    meeting_schedule: string | null;
    assigned_engineer_id: string | null;
    assigned_engineer: UserBrief | null;
    created_by: string;
    creator: UserBrief;
    created_at: string;
    updated_at: string;
}

export interface OpportunityDetail extends Opportunity {
    timeline_events: TimelineEvent[];
}

export interface OpportunityListResponse {
    items: Opportunity[];
    total: number;
    page: number;
    page_size: number;
}

export interface OpportunityCreateInput {
    company_name: string;
    website?: string | null;
    email?: string | null;
    phone?: string | null;
    industry?: string | null;
    product?: string | null;
    customer_needs: string;
    additional_notes?: string | null;
    potential_revenue?: number | null;
    estimated_agenda_date?: string | null;
    meeting_schedule?: string | null;
    assigned_engineer_id?: string | null;
}

export interface OpportunityUpdateInput {
    company_name?: string;
    website?: string | null;
    email?: string | null;
    phone?: string | null;
    industry?: string | null;
    product?: string | null;
    customer_needs?: string;
    additional_notes?: string | null;
    potential_revenue?: number | null;
    estimated_agenda_date?: string | null;
    status?: OpportunityStatus;
    meeting_schedule?: string | null;
    assigned_engineer_id?: string | null;
}

export const STATUS_STYLES: Record<OpportunityStatus, string> = {
    New: "bg-blue-50 text-blue-700 ring-blue-600/20",
    "KYC Running": "bg-orange-50 text-orange-700 ring-orange-600/20",
    "Ready Meeting": "bg-green-50 text-green-700 ring-green-600/20",
    "Meeting Scheduled": "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
    "Meeting Done": "bg-teal-50 text-teal-700 ring-teal-600/20",
    "Need Proposal": "bg-purple-50 text-purple-700 ring-purple-600/20",
    Negotiation: "bg-amber-50 text-amber-700 ring-amber-600/20",
    PO: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
    Won: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Lost: "bg-red-50 text-red-700 ring-red-600/20",
    "On Hold": "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
};

export const ALL_STATUSES: OpportunityStatus[] = [
    "New",
    "KYC Running",
    "Ready Meeting",
    "Meeting Scheduled",
    "Meeting Done",
    "Need Proposal",
    "Negotiation",
    "PO",
    "Won",
    "Lost",
    "On Hold",
];