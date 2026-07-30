/**
 * KYC Report type definitions.
 */

export interface KYCUseCase {
    title: string;
    description: string;
    problem_solved: string;
    how_it_works: string;
    business_impact: string;
    google_products: string[];
    smartnet_solutions: string[];
    impact_level: 'High' | 'Medium' | 'Low';
}

export interface KYCReference {
    title: string;
    url: string;
    type: 'website' | 'news' | 'linkedin' | string;
}

export interface KYCCompanyOverview {
    name: string;
    description: string;
    founded?: string;
    size?: string;
    headquarters?: string;
    key_products?: string[];
}

export interface KYCReport {
    id: string;
    opportunity_id: string;
    version: number;
    status: 'running' | 'completed' | 'failed';
    source_type: 'automatic' | 'manual_regenerate' | 'engineer_edited';
    executive_summary?: string;
    company_overview?: KYCCompanyOverview;
    industry_analysis?: string;
    business_model?: string;
    company_location?: string;
    customer_need_summary?: string;
    potential_pain_points?: string[];
    use_cases?: KYCUseCase[];
    meeting_objectives?: string[];
    recommended_questions?: string[];
    preparation_checklist?: string[];
    references?: KYCReference[];
    error_message?: string;
    created_at: string;
    completed_at?: string;
}

export interface KYCReportListResponse {
    items: KYCReport[];
    total: number;
}

export interface KYCRegenerateRequest {
    source_type?: string;
}