"use client";

import { useState } from "react";
import {
    Bell,
    CheckCheck,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Activity,
    DollarSign,
    UserCheck,
    Calendar,
} from "lucide-react";
import {
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
} from "@/hooks/use-notifications";
import { usePageTitle } from "@/hooks/use-page-title";
import { useRouter } from "next/navigation";
import { Notification } from "@/types/notification";

function getNotificationVisuals(type: string) {
    if (type === "kyc_completed") {
        return {
            dotColor: "bg-emerald-500",
            unreadBg: "bg-emerald-50/50 dark:bg-emerald-950/20",
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
            iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
        };
    }
    if (type === "kyc_failed") {
        return {
            dotColor: "bg-rose-500",
            unreadBg: "bg-rose-50/50 dark:bg-rose-950/20",
            icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
            iconBg: "bg-rose-100 dark:bg-rose-900/40",
        };
    }
    // Sisanya biru sesuai preferensi
    let icon = <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
    if (type === "deal_value_changed") {
        icon = <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
    } else if (type === "opportunity_assigned") {
        icon = <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
    } else if (type === "meeting_scheduled" || type === "meeting_reminder") {
        icon = <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />;
    }

    return {
        dotColor: "bg-blue-500",
        unreadBg: "bg-blue-50/50 dark:bg-blue-950/25",
        icon,
        iconBg: "bg-blue-100 dark:bg-blue-900/40",
    };
}

export default function NotificationsPage() {
    usePageTitle("Notifications");
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

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markRead.mutate(notification.id);
        }
        const targetUrl =
            notification.link_url ||
            (notification.opportunity_id
                ? `/opportunities/${notification.opportunity_id}`
                : "/notifications");
        router.push(targetUrl);
    };

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                        Stay updated on your opportunities and KYC reports.
                    </p>
                </div>
                <button
                    onClick={() => markAllRead.mutate()}
                    className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-2 rounded-md shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                >
                    <CheckCheck className="w-4 h-4" />
                    Mark all read
                </button>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => {
                        setFilter("all");
                        setPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        filter === "all"
                            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                            : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    }`}
                >
                    All
                </button>
                <button
                    onClick={() => {
                        setFilter("unread");
                        setPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        filter === "unread"
                            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                            : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    }`}
                >
                    Unread
                </button>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-zinc-400 dark:text-zinc-500 text-sm">Loading...</div>
                ) : notifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <Bell className="w-10 h-10 text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">No notifications found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {notifications.map((notification) => {
                            const visuals = getNotificationVisuals(notification.type);
                            return (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`w-full text-left px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex items-start gap-4 ${
                                        !notification.is_read ? visuals.unreadBg : ""
                                    }`}
                                >
                                    <div className={`p-2 rounded-lg ${visuals.iconBg} shrink-0 mt-0.5`}>
                                        {visuals.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                {notification.title}
                                            </p>
                                            {!notification.is_read && (
                                                <span className={`w-2 h-2 rounded-full ${visuals.dotColor} shrink-0`} />
                                            )}
                                        </div>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1.5">
                                            {formatTime(notification.created_at)}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 mt-1 shrink-0" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                    <span>
                        Page {page} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}