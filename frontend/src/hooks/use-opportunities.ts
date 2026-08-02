"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
    Opportunity,
    OpportunityDetail,
    OpportunityListResponse,
    OpportunityCreateInput,
    OpportunityUpdateInput,
} from "@/types/opportunity";

export function useOpportunities(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
}) {
    return useQuery({
        queryKey: ["opportunities", params],
        queryFn: async () => {
            const { data } = await api.get<OpportunityListResponse>("/api/opportunities", {
                params,
            });
            return data;
        },
    });
}

export function useOpportunity(id: string) {
    return useQuery({
        queryKey: ["opportunity", id],
        queryFn: async () => {
            const { data } = await api.get<OpportunityDetail>(`/api/opportunities/${id}`);
            return data;
        },
        enabled: !!id,
    });
}

export function useCreateOpportunity() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: OpportunityCreateInput) => {
            const { data } = await api.post<Opportunity>("/api/opportunities", input);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        },
    });
}

export function useUpdateOpportunity() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, input }: { id: string; input: OpportunityUpdateInput }) => {
            const { data } = await api.patch<Opportunity>(`/api/opportunities/${id}`, input);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            queryClient.invalidateQueries({ queryKey: ["opportunity", data.id] });
        },
    });
}

export function useDeleteOpportunity() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/opportunities/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        },
    });
}

export interface ImportResult {
    imported_count: number;
    failed_count: number;
    errors: string[];
    imported: { id: string; company_name: string; contact_name?: string; status: string }[];
}

export function useImportOpportunities() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            const { data } = await api.post<ImportResult>("/api/opportunities/import", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        },
    });
}