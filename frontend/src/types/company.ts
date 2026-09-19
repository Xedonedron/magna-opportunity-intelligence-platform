import { Opportunity } from "./opportunity";

export interface Company {
    id: string;
    name: string;
    normalized_name: string;
    website: string | null;
    industry: string | null;
    business_process: string | null;
    employee_count: string | null;
    tech_stack: string[] | Record<string, any> | null;
    cached_kyc_data?: Record<string, any> | null;
    opportunities_count: number;
    created_at: string;
    updated_at: string;
}

export interface CompanyDetail extends Company {
    opportunities: Opportunity[];
}

export interface CompanyListResponse {
    items: Company[];
    total: number;
    page: number;
    page_size: number;
}

export interface CompanyCreateInput {
    name: string;
    website?: string | null;
    industry?: string | null;
    business_process?: string | null;
    employee_count?: string | null;
    tech_stack?: string[] | Record<string, any> | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
}

export interface CompanyOpportunityCreateInput {
    deal_title?: string;
    product?: string;
    customer_needs: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    additional_notes?: string;
    potential_revenue?: number;
    estimated_agenda_date?: string;
    assigned_engineer?: string;
    status?: string;
}

export interface CompanySimilarityMatch {
    company: Company;
    similarity_score: number;
    match_type: "domain_match" | "exact_normalized";
}

export interface CompanySimilarityCheckResponse {
    query: string;
    normalized_query: string;
    exact_match: Company | null;
    has_similar: boolean;
    matches: CompanySimilarityMatch[];
}

export interface CompanyKYCSummary {
    company_id: string;
    company_name: string;
    has_kyc: boolean;
    source_opportunity_id?: string | null;
    source_opportunity_title?: string | null;
    kyc_version?: number | null;
    completed_at?: string | null;
    executive_summary?: string | null;
    company_overview?: {
        name?: string;
        description?: string;
        founded?: string;
        size?: string;
        headquarters?: string;
        key_products?: string[];
    } | null;
    industry_analysis?: string | null;
    business_model?: string | null;
    company_location?: string | null;
    competitor_analysis?: Array<{
        name: string;
        market_position?: string;
        strengths?: string[];
        weaknesses?: string[];
    }> | null;
    potential_pain_points?: string[] | null;
}

