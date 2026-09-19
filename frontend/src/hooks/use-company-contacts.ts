"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
    CompanyContact,
    CompanyContactListResponse,
    CompanyContactCreateInput,
    CompanyContactUpdateInput,
} from "@/types/company-contact";

export function useCompanyContacts(companyId?: string | null) {
    return useQuery({
        queryKey: ["company-contacts", companyId],
        queryFn: async () => {
            if (!companyId) return { items: [], total: 0 };
            const { data } = await api.get<CompanyContactListResponse>(
                `/api/v1/companies/${companyId}/contacts`
            );
            return data;
        },
        enabled: !!companyId,
    });
}

export function useCreateCompanyContact() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            companyId,
            input,
        }: {
            companyId: string;
            input: CompanyContactCreateInput;
        }) => {
            const { data } = await api.post<CompanyContact>(
                `/api/v1/companies/${companyId}/contacts`,
                input
            );
            return data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["company-contacts", variables.companyId],
            });
            queryClient.invalidateQueries({
                queryKey: ["company", variables.companyId],
            });
        },
    });
}

export function useUpdateCompanyContact() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            companyId,
            contactId,
            input,
        }: {
            companyId: string;
            contactId: string;
            input: CompanyContactUpdateInput;
        }) => {
            const { data } = await api.patch<CompanyContact>(
                `/api/v1/companies/${companyId}/contacts/${contactId}`,
                input
            );
            return data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["company-contacts", variables.companyId],
            });
            queryClient.invalidateQueries({
                queryKey: ["company", variables.companyId],
            });
        },
    });
}

export function useDeleteCompanyContact() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            companyId,
            contactId,
        }: {
            companyId: string;
            contactId: string;
        }) => {
            await api.delete(
                `/api/v1/companies/${companyId}/contacts/${contactId}`
            );
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["company-contacts", variables.companyId],
            });
            queryClient.invalidateQueries({
                queryKey: ["company", variables.companyId],
            });
        },
    });
}
