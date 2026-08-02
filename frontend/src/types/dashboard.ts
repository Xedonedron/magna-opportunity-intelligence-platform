/** Dashboard types */

export interface StatusCount {
    status: string;
    count: number;
}

export interface EngineerCount {
    engineer_id: string;
    engineer_name: string;
    count: number;
}

export interface TrendData {
    date: string;
    new: number;
    won: number;
    lost: number;
}

export interface RecentOpportunity {
    id: string;
    company_name: string;
    status: string;
    engineer_name?: string;
    created_at: string;
}

export interface UpcomingMeeting {
    opportunity_id: string;
    company_name: string;
    meeting_schedule: string;
    meeting_type?: string;
}

export interface ProductCount {
    product: string;
    count: number;
}

export interface IndustryCount {
    industry: string;
    count: number;
}

export interface DashboardMetrics {
    total_opportunities: number;
    total_potential_revenue?: number;
    by_status: StatusCount[];
    by_engineer: EngineerCount[];
    meetings_today: number;
    kyc_running: number;
    need_follow_up: number;
    recent_opportunities: RecentOpportunity[];
    upcoming_meetings: UpcomingMeeting[];
    trend_data: TrendData[];
    won_rate: number;
    active_count: number;
    by_product: ProductCount[];
    by_industry: IndustryCount[];
    user_role: string;
    filtered_by_user: boolean;
}