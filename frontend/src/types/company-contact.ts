export interface CompanyContact {
    id: string;
    company_id: string;
    name: string;
    job_title: string | null;
    department: string | null;
    email: string | null;
    phone: string | null;
    linkedin_url: string | null;
    is_primary: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface CompanyContactListResponse {
    items: CompanyContact[];
    total: number;
}

export interface CompanyContactCreateInput {
    name: string;
    job_title?: string | null;
    department?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedin_url?: string | null;
    is_primary?: boolean;
    notes?: string | null;
}

export interface CompanyContactUpdateInput {
    name?: string;
    job_title?: string | null;
    department?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedin_url?: string | null;
    is_primary?: boolean;
    notes?: string | null;
}
