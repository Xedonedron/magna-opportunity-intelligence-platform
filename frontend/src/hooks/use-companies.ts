"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
    Company,
    CompanyDetail,
    CompanyListResponse,
    CompanyCreateInput,
    CompanyOpportunityCreateInput,
    CompanySimilarityCheckResponse,
    CompanyKYCSummary,
} from "@/types/company";
import type { Opportunity } from "@/types/opportunity";

export async function checkCompanySimilarity(
    name: string,
    website?: string | null,
    threshold: number = 0.70
): Promise<CompanySimilarityCheckResponse> {
    const { data } = await api.get<CompanySimilarityCheckResponse>("/api/v1/companies/check-similarity", {
        params: {
            name,
            website: website && website.trim() ? website.trim() : undefined,
            threshold,
        },
    });
    return data;
}

export function useCompanySimilarity(
    name: string,
    website?: string | null,
    threshold: number = 0.70,
    enabled: boolean = true
) {
    return useQuery({
        queryKey: ["company-similarity", name, website, threshold],
        queryFn: () => checkCompanySimilarity(name, website, threshold),
        enabled: enabled && (!!name.trim() || !!website?.trim()),
        staleTime: 30000,
    });
}

export function useCompanies(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    industry?: string;
}) {
    return useQuery({
        queryKey: ["companies", params],
        queryFn: async () => {
            const { data } = await api.get<CompanyListResponse>("/api/v1/companies", {
                params,
            });
            return data;
        },
        placeholderData: keepPreviousData,
    });
}

export function useCompany(id: string) {
    return useQuery({
        queryKey: ["company", id],
        queryFn: async () => {
            const { data } = await api.get<CompanyDetail>(`/api/v1/companies/${id}`);
            return data;
        },
        enabled: !!id,
    });
}

export function useCompanyKYCSummary(id: string | null | undefined) {
    return useQuery({
        queryKey: ["company", id, "kyc-summary"],
        queryFn: async () => {
            if (!id) return null;
            const { data } = await api.get<CompanyKYCSummary>(`/api/v1/companies/${id}/kyc-summary`);
            return data;
        },
        enabled: !!id,
    });
}

export function useCreateCompany() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: CompanyCreateInput) => {
            const { data } = await api.post<Company>("/api/v1/companies", input);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companies"] });
        },
    });
}

export function useCreateCompanyOpportunity() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            companyId,
            input,
        }: {
            companyId: string;
            input: CompanyOpportunityCreateInput;
        }) => {
            const { data } = await api.post<Opportunity>(
                `/api/v1/companies/${companyId}/opportunities`,
                input
            );
            return data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["companies"] });
            queryClient.invalidateQueries({ queryKey: ["company", variables.companyId] });
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        },
    });
}

export function useDeleteCompany() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (companyId: string) => {
            await api.delete(`/api/v1/companies/${companyId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["companies"] });
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        },
    });
}

