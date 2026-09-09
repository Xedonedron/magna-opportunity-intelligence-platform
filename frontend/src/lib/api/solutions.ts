import { api } from "@/lib/api";

export interface MasterSolution {
    id: string;
    slug?: string;
    title: string;
    pillar: string;
    tier: number;
    primary_products: string[];
    all_products?: string[];
    target_industries: string[];
    key_subheadings?: string[];
    pain_points?: string[];
    business_impact?: string;
    summary_snippet?: string;
    source_url?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface MasterSolutionPayload {
    title: string;
    slug?: string;
    pillar: string;
    tier: number;
    primary_products: string[];
    target_industries: string[];
    business_impact?: string;
    pain_points?: string[];
    key_subheadings?: string[];
    source_url?: string;
    is_active?: boolean;
}

export interface MasterSolutionListResponse {
    items: MasterSolution[];
    total: number;
    pillars: string[];
}

export const solutionsApi = {
    async list(params?: { pillar?: string; search?: string; tier?: number; is_active?: boolean }): Promise<MasterSolutionListResponse> {
        const res = await api.get("/api/admin/solutions", { params });
        return res.data;
    },

    async create(payload: MasterSolutionPayload): Promise<MasterSolution> {
        const res = await api.post("/api/admin/solutions", payload);
        return res.data;
    },

    async update(id: string, payload: Partial<MasterSolutionPayload>): Promise<MasterSolution> {
        const res = await api.put(`/api/admin/solutions/${id}`, payload);
        return res.data;
    },

    async delete(id: string): Promise<{ status: string; message: string }> {
        const res = await api.delete(`/api/admin/solutions/${id}`);
        return res.data;
    },
};
