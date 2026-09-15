"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, X, CheckCircle2, AlertCircle, Sparkles, Activity, DollarSign, UserCheck, Calendar } from "lucide-react";
import {
    useUnreadCount,
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
} from "@/hooks/use-notifications";
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

export function NotificationDropdown() {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const { data: unreadData } = useUnreadCount();
    const { data: notificationsData } = useNotifications(1, 5, false);
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();

    const unreadCount = unreadData?.unread_count ?? 0;
    const notifications = notificationsData?.items ?? [];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
        setOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setOpen(!open)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-zinc-900 animate-pulse" />
                )}
            </button>

            {open && (
                <div className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-full mt-1 w-[calc(100vw-1rem)] sm:w-96 max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="text-[11px] font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                    {unreadCount} baru
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllRead.mutate()}
                                    className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/80">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((notification) => {
                                const visuals = getNotificationVisuals(notification.type);
                                return (
                                    <button
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                                            !notification.is_read ? visuals.unreadBg : ""
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-1.5 rounded-lg ${visuals.iconBg} shrink-0 mt-0.5`}>
                                                {visuals.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                                        {notification.title}
                                                    </p>
                                                    {!notification.is_read && (
                                                        <span className={`w-1.5 h-1.5 rounded-full ${visuals.dotColor} shrink-0`} />
                                                    )}
                                                </div>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                                                    {formatTime(notification.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                            onClick={() => {
                                router.push("/notifications");
                                setOpen(false);
                            }}
                            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium transition-colors w-full text-center"
                        >
                            View all notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}