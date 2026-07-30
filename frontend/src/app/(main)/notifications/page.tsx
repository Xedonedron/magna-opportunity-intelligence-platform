"use client";

import { useState } from "react";
import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import {
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
} from "@/hooks/use-notifications";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const router = useRouter();

    const { data, isLoading } = useNotifications(page, 20, filter === "unread");
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();

    const notifications = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / 20));

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    };

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900">Notifications</h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        Stay updated on your opportunities and KYC reports.
                    </p>
                </div>
                <button
                    onClick={() => markAllRead.mutate()}
                    className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 px-4 py-2 rounded-md shadow-sm hover:bg-zinc-50 transition-colors"
                >
                    <CheckCheck className="w-4 h-4" />
                    Mark all read
                </button>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => { setFilter("all"); setPage(1); }}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === "all"
                        ? "bg-zinc-900 text-white"
                        : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                        }`}
                >
                    All
                </button>
                <button
                    onClick={() => { setFilter("unread"); setPage(1); }}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === "unread"
                        ? "bg-zinc-900 text-white"
                        : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
                        }`}
                >
                    Unread
                </button>
            </div>

            <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-zinc-400 text-sm">Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <Bell className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500">No notifications found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100">
                        {notifications.map((notification) => (
                            <button
                                key={notification.id}
                                onClick={() => {
                                    if (!notification.is_read) {
                                        markRead.mutate(notification.id);
                                    }
                                    if (notification.opportunity_id) {
                                        router.push(`/opportunities/${notification.opportunity_id}`);
                                    }
                                }}
                                className={`w-full text-left px-5 py-4 hover:bg-zinc-50 transition-colors flex items-start gap-4 ${!notification.is_read ? "bg-blue-50/30" : ""
                                    }`}
                            >
                                {!notification.is_read && (
                                    <span className="mt-2 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                )}
                                <div className={`flex-1 min-w-0 ${notification.is_read ? "ml-6" : ""}`}>
                                    <p className="text-sm font-medium text-zinc-900">
                                        {notification.title}
                                    </p>
                                    <p className="text-sm text-zinc-500 mt-0.5">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-zinc-400 mt-1.5">
                                        {formatTime(notification.created_at)}
                                    </p>
                                </div>
                                {notification.opportunity_id && (
                                    <ChevronRight className="w-4 h-4 text-zinc-300 mt-1 shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-zinc-500">
                    <span>Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}