import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Notification,
    NotificationListResponse,
    UnreadCountResponse,
} from "@/types/notification";

export function useNotifications(page = 1, pageSize = 20, unreadOnly = false) {
    return useQuery<NotificationListResponse>({
        queryKey: ["notifications", page, pageSize, unreadOnly],
        queryFn: () =>
            api.get("/api/notifications", {
                params: { page, page_size: pageSize, unread_only: unreadOnly },
            }),
    });
}

export function useUnreadCount() {
    return useQuery<UnreadCountResponse>({
        queryKey: ["notifications", "unread-count"],
        queryFn: () => api.get("/api/notifications/unread-count"),
        refetchInterval: 30000, // Poll every 30 seconds
    });
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (notificationId: string) =>
            api.patch(`/api/notifications/${notificationId}`, { is_read: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.post("/api/notifications/mark-all-read"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}