/**
 * KYC Report hooks using TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { KYCReport, KYCReportListResponse, KYCRegenerateRequest } from '@/types/kyc';

/**
 * Fetch the latest KYC report for an opportunity.
 */
export function useLatestKYCReport(opportunityId: string) {
    return useQuery<KYCReport | null>({
        queryKey: ['kyc', opportunityId, 'latest'],
        queryFn: async () => {
            const response = await api.get(`/api/opportunities/${opportunityId}/kyc`);
            return response.data;
        },
        enabled: !!opportunityId,
        refetchInterval: (query) => {
            // Auto-refresh while KYC is running
            const status = query.state.data?.status;
            return status === 'running' ? 3000 : false;
        },
    });
}

/**
 * Fetch all KYC report versions for an opportunity.
 */
export function useKYCVersions(opportunityId: string) {
    return useQuery<KYCReportListResponse>({
        queryKey: ['kyc', opportunityId, 'versions'],
        queryFn: async () => {
            const response = await api.get(`/api/opportunities/${opportunityId}/kyc/versions`);
            return response.data;
        },
        enabled: !!opportunityId,
    });
}

/**
 * Fetch a specific KYC report by ID.
 */
export function useKYCReport(opportunityId: string, reportId: string) {
    return useQuery<KYCReport>({
        queryKey: ['kyc', opportunityId, reportId],
        queryFn: async () => {
            const response = await api.get(`/api/opportunities/${opportunityId}/kyc/${reportId}`);
            return response.data;
        },
        enabled: !!opportunityId && !!reportId,
    });
}

/**
 * Trigger KYC regeneration.
 */
export function useRegenerateKYC(opportunityId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data?: KYCRegenerateRequest) => {
            const response = await api.post(`/api/opportunities/${opportunityId}/kyc/regenerate`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['kyc', opportunityId] });
            queryClient.invalidateQueries({ queryKey: ['opportunities', opportunityId] });
        },
    });
}

/**
 * Update/edit a KYC report.
 */
export function useUpdateKYCReport(opportunityId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ reportId, data }: { reportId: string; data: Partial<KYCReport> }) => {
            const response = await api.patch(`/api/opportunities/${opportunityId}/kyc/${reportId}`, data);
            return response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['kyc', opportunityId] });
            queryClient.invalidateQueries({ queryKey: ['kyc', opportunityId, variables.reportId] });
        },
    });
}