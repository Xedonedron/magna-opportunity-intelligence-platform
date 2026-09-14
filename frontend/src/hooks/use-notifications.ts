import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
        refetchInterval: 15000, // Poll every 15 seconds
    });
}

export function useUnreadCount() {
    return useQuery<UnreadCountResponse>({
        queryKey: ["notifications", "unread-count"],
        queryFn: () => api.get("/api/notifications/unread-count"),
        refetchInterval: 15000, // Poll every 15 seconds
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

/**
 * Global background hook that detects new unread notifications and
 * triggers an interactive Sonner toast popup with a direct deep-link action button.
 */
export function useNotificationToaster() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const seenIdsRef = useRef<Set<string>>(new Set());
    const isInitialMount = useRef(true);

    const { data } = useQuery<NotificationListResponse>({
        queryKey: ["notifications", "latest-unread"],
        queryFn: () =>
            api.get("/api/notifications", {
                params: { page: 1, page_size: 5, unread_only: true },
            }),
        refetchInterval: 15000,
        refetchOnWindowFocus: true,
    });

    useEffect(() => {
        if (!data?.items) return;

        const currentItems = data.items;

        if (isInitialMount.current) {
            // Populate seen IDs on first load to prevent toaster barrage for existing unread items
            currentItems.forEach((item) => seenIdsRef.current.add(item.id));
            isInitialMount.current = false;
            return;
        }

        // Detect items that haven't been seen yet
        currentItems.forEach((notif) => {
            if (!seenIdsRef.current.has(notif.id)) {
                seenIdsRef.current.add(notif.id);

                const targetUrl =
                    notif.link_url ||
                    (notif.opportunity_id
                        ? `/opportunities/${notif.opportunity_id}`
                        : "/notifications");

                const actionConfig = {
                    label: "Lihat",
                    onClick: () => {
                        api.patch(`/api/notifications/${notif.id}`, { is_read: true }).catch(() => { });
                        queryClient.invalidateQueries({ queryKey: ["notifications"] });
                        router.push(targetUrl);
                    },
                };

                if (notif.type === "kyc_completed") {
                    toast.success(notif.title, {
                        description: notif.message,
                        action: actionConfig,
                        duration: 8000,
                    });
                } else if (notif.type === "kyc_failed") {
                    toast.error(notif.title, {
                        description: notif.message,
                        action: actionConfig,
                        duration: 10000,
                    });
                } else {
                    toast.info(notif.title, {
                        description: notif.message,
                        action: actionConfig,
                        duration: 6000,
                    });
                }
            }
        });
    }, [data, router, queryClient]);
}