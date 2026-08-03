"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UserBrief } from "@/types/opportunity";

export interface UserItem extends UserBrief {
    role: string;
    is_active: boolean;
}

export function useUsers(role?: string) {
    return useQuery({
        queryKey: ["users", role],
        queryFn: async () => {
            const { data } = await api.get<UserItem[]>("/api/users", {
                params: role ? { role } : undefined,
            });
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
