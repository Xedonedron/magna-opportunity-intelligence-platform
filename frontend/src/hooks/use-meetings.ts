"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingApi } from "@/lib/api";
import type { MeetingCreatePayload, MeetingUpdatePayload } from "@/types/meeting";

export function useMeetings(opportunityId?: string) {
    return useQuery({
        queryKey: ["meetings", opportunityId],
        queryFn: () => meetingApi.list(opportunityId),
        enabled: !!opportunityId,
    });
}

export function useMeeting(id: string) {
    return useQuery({
        queryKey: ["meetings", id],
        queryFn: () => meetingApi.get(id),
        enabled: !!id,
    });
}

export function useCreateMeeting() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: MeetingCreatePayload) =>
            meetingApi.create(payload),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["meetings", variables.opportunity_id],
            });
            queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        },
    });
}

export function useUpdateMeeting() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            payload,
        }: {
            id: string;
            payload: MeetingUpdatePayload;
        }) => meetingApi.update(id, payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: ["meetings", data.opportunity_id],
            });
        },
    });
}

export function useDeleteMeeting() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => meetingApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["meetings"] });
        },
    });
}