export type OpportunityStatus =
    | "New"
    | "KYC Running"
    | "Ready Meeting"
    | "Meeting Scheduled"
    | "Meeting Done"
    | "Need Proposal"
    | "POC"
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
    company_id?: string | null;
    company_name: string;
    deal_title?: string | null;
    contact_name: string | null;
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
    assigned_engineer: string | null;
    created_by: string;
    creator: UserBrief;
    created_at: string;
    updated_at: string;
}

export interface OpportunityDetail extends Opportunity {
    timeline_events: TimelineEvent[];
}


// --- Opportunity Document ---
export interface OpportunityDocument {
    id: string;
    opportunity_id: string;
    title: string;
    url: string;
    description: string | null;
    labels: string[] | null;
    uploaded_by: string;
    uploader: UserBrief;
    created_at: string;
    updated_at: string;
}

export interface OpportunityDocumentListResponse {
    items: OpportunityDocument[];
    total: number;
}

export interface OpportunityDocumentCreateInput {
    title: string;
    url: string;
    description?: string | null;
    labels?: string[] | null;
}

export interface OpportunityDocumentUpdateInput {
    title?: string;
    url?: string;
    description?: string | null;
    labels?: string[] | null;
}

export interface OpportunityListResponse {
    items: Opportunity[];
    total: number;
    page: number;
    page_size: number;
}

export interface OpportunityCreateInput {
    company_name: string;
    contact_name?: string | null;
    website: string;
    email?: string | null;
    phone?: string | null;
    industry: string;
    product?: string | null;
    customer_needs: string;
    additional_notes?: string | null;
    potential_revenue?: number | null;
    estimated_agenda_date?: string | null;
    meeting_schedule?: string | null;
    assigned_engineer?: string | null;
}

export interface OpportunityUpdateInput {
    company_id?: string | null;
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
    assigned_engineer?: string | null;
}

export const STATUS_STYLES: Record<OpportunityStatus, string> = {
    New: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 ring-1 ring-blue-600/20 dark:ring-blue-500/20",
    "KYC Running": "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/60 ring-1 ring-orange-600/20 dark:ring-orange-500/20",
    "Ready Meeting": "bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border border-green-200/60 dark:border-green-800/60 ring-1 ring-green-600/20 dark:ring-green-500/20",
    "Meeting Scheduled": "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 ring-1 ring-indigo-600/20 dark:ring-indigo-500/20",
    "Meeting Done": "bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 ring-1 ring-teal-600/20 dark:ring-teal-500/20",
    "Need Proposal": "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 ring-1 ring-purple-600/20 dark:ring-purple-500/20",
    POC: "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60 ring-1 ring-violet-600/20 dark:ring-violet-500/20",
    Negotiation: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 ring-1 ring-amber-600/20 dark:ring-amber-500/20",
    PO: "bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/60 ring-1 ring-cyan-600/20 dark:ring-cyan-500/20",
    Won: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 ring-1 ring-emerald-600/20 dark:ring-emerald-500/20",
    Lost: "bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-800/60 ring-1 ring-red-600/20 dark:ring-red-500/20",
    "On Hold": "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 ring-1 ring-zinc-500/20 dark:ring-zinc-600/30",
};

export const ALL_STATUSES: OpportunityStatus[] = [
    "New",
    "KYC Running",
    "Ready Meeting",
    "Meeting Scheduled",
    "Meeting Done",
    "Need Proposal",
    "POC",
    "Negotiation",
    "PO",
    "Won",
    "Lost",
    "On Hold",
];