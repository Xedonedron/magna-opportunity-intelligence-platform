/** Dashboard API client */

import { api } from "../api";
import type { DashboardMetrics } from "@/types/dashboard";

export interface DashboardFilters {
    status?: string;
    engineer_id?: string;
    engineer_name?: string;
    date_from?: string;
    date_to?: string;
}

export async function getDashboardMetrics(
    filters?: DashboardFilters
): Promise<DashboardMetrics> {
    const params = new URLSearchParams();

    if (filters?.status) params.append("status", filters.status);
    if (filters?.engineer_name) {
        params.append("engineer_name", filters.engineer_name);
    } else if (filters?.engineer_id) {
        params.append("engineer_name", filters.engineer_id);
    }
    if (filters?.date_from) params.append("date_from", filters.date_from);
    if (filters?.date_to) params.append("date_to", filters.date_to);

    const queryString = params.toString();
    const url = queryString ? `/api/dashboard/metrics?${queryString}` : "/api/dashboard/metrics";

    const response = await api.get(url);
    return response.data;
}