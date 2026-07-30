"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    FolderOpen,
    Calendar,
    Settings,
    User,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    const [user, setUser] = useState<{ full_name: string; email: string } | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("moip_user");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse moip_user", e);
            }
        }
    }, []);

    return (
        <div className="w-64 border-r border-zinc-200 bg-zinc-50 flex flex-col h-screen shrink-0 sticky top-0">
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
                </div>
            </div>
        </div>
    );
}