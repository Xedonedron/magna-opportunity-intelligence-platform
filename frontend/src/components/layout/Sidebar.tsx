"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    FolderOpen,
    Calendar,
    Settings,
    User,
    LogOut,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface NavItem {
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
}

const navItems: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Opportunities", href: "/opportunities", icon: FolderOpen },
    { name: "Meetings", href: "/meetings", icon: Calendar },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<{ full_name: string; email: string } | null>(null);

    const handleLogout = () => {
        localStorage.removeItem("moip_token");
        localStorage.removeItem("moip_user");
        router.push("/login");
    };

    useEffect(() => {
        const storedUser = localStorage.getItem("moip_user");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse moip_user", e);
            }
        }

        // Sync with backend on mount
        async function syncProfile() {
            const token = localStorage.getItem("moip_token");
            if (!token) return;
            try {
                const { data } = await api.get("/api/auth/me");
                if (data) {
                    localStorage.setItem("moip_user", JSON.stringify(data));
                    setUser(data);
                }
            } catch (err) {
                console.error("Failed to sync profile", err);
            }
        }
        syncProfile();
    }, []);

    return (
        <div className="hidden md:flex w-64 border-r border-zinc-200 bg-zinc-50 flex-col h-screen shrink-0 sticky top-0">
            <div className="h-14 flex items-center px-6 border-b border-zinc-200">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-zinc-900">
                    <div className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center text-xs">
                        M
                    </div>
                    MOIP
                </Link>
            </div>
            <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                isActive
                                    ? "bg-zinc-200/50 text-zinc-900"
                                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon
                                    className={cn(
                                        "w-4 h-4",
                                        isActive ? "text-zinc-900" : "text-zinc-500"
                                    )}
                                />
                                {item.name}
                            </div>
                            {item.badge && (
                                <span className="bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </div>
            <div className="p-4 border-t border-zinc-200">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">
                        <User className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">
                            {user?.full_name || "User"}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">
                            {user?.email || ""}
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export function MobileSidebarDrawer({
    isOpen,
    onClose,
}: {
    isOpen: boolean;
    onClose: () => void;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<{ full_name: string; email: string } | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("moip_user");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error(e);
            }
        }
    }, [isOpen]);

    const handleLogout = () => {
        localStorage.removeItem("moip_token");
        localStorage.removeItem("moip_user");
        onClose();
        router.push("/login");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Slide-over Content */}
            <div className="relative w-4/5 max-w-xs bg-zinc-50 h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
                <div className="h-14 flex items-center justify-between px-5 border-b border-zinc-200 bg-white">
                    <Link
                        href="/dashboard"
                        onClick={onClose}
                        className="flex items-center gap-2 font-semibold text-zinc-900"
                    >
                        <div className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center text-xs">
                            M
                        </div>
                        MOIP
                    </Link>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-md text-zinc-500 hover:bg-zinc-100 text-zinc-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    "w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors",
                                    isActive
                                        ? "bg-zinc-900 text-white shadow-sm"
                                        : "text-zinc-700 hover:bg-zinc-200/60"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon
                                        className={cn(
                                            "w-4 h-4",
                                            isActive ? "text-white" : "text-zinc-500"
                                        )}
                                    />
                                    {item.name}
                                </div>
                            </Link>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-zinc-200 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                            <User className="w-4 h-4 text-zinc-600" />
                        </div>
                        <div className="text-left flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate">
                                {user?.full_name || "User"}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">
                                {user?.email || ""}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}