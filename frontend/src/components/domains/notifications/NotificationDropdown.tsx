"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import {
    useUnreadCount,
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
} from "@/hooks/use-notifications";
import { useRouter } from "next/navigation";

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

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setOpen(!open)}
                className="text-zinc-500 hover:text-zinc-900 relative p-2 rounded-md hover:bg-zinc-100 transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-96 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-zinc-900">Notifications</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllRead.mutate()}
                                    className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors"
                                >
                                    <CheckCheck className="w-3.5 h-3.5" />
                                    Mark all read
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-zinc-50">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-zinc-400">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => {
                                        if (!notification.is_read) {
                                            markRead.mutate(notification.id);
                                        }
                                        if (notification.opportunity_id) {
                                            router.push(`/opportunities/${notification.opportunity_id}`);
                                            setOpen(false);
                                        }
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors ${!notification.is_read ? "bg-blue-50/50" : ""
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {!notification.is_read && (
                                            <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                        )}
                                        <div className={`flex-1 min-w-0 ${notification.is_read ? "ml-5" : ""}`}>
                                            <p className="text-sm font-medium text-zinc-900 truncate">
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-zinc-400 mt-1">
                                                {formatTime(notification.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="px-4 py-2.5 border-t border-zinc-100">
                        <button
                            onClick={() => {
                                router.push("/notifications");
                                setOpen(false);
                            }}
                            className="text-xs text-zinc-500 hover:text-zinc-900 font-medium transition-colors w-full text-center"
                        >
                            View all notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}