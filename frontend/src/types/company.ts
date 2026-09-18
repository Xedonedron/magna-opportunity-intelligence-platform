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
