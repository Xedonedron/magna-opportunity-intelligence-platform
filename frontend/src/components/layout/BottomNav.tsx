"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, Calendar, Menu } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface BottomNavProps {
    onOpenMenu: () => void;
}

export function BottomNav({ onOpenMenu }: BottomNavProps) {
    const pathname = usePathname();
    const { t } = useLanguage();

    const navItems = [
        {
            key: "dashboard" as const,
            href: "/dashboard",
            label: t.nav.dashboard,
            icon: LayoutDashboard,
        },
        {
            key: "opportunities" as const,
            href: "/opportunities",
            label: t.nav.opportunities,
            icon: FolderOpen,
        },
        {
            key: "meetings" as const,
            href: "/meetings",
            label: t.nav.meetings,
            icon: Calendar,
        },
    ];

    return (
        <nav
            aria-label="Mobile Navigation"
            className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 safe-area-pb"
        >
            <div className="grid grid-cols-4 h-16 max-w-lg mx-auto px-2">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        pathname.startsWith(item.href + "/");
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-lg transition-colors select-none",
                                isActive
                                    ? "text-zinc-900 dark:text-white font-semibold"
                                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            )}
                        >
                            <div className="relative">
                                <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-[1.75]")} />
                                {isActive && (
                                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-zinc-900 dark:bg-white" />
                                )}
                            </div>
                            <span className="text-[10px] mt-1 truncate max-w-full leading-tight">
                                {item.label}
                            </span>
                        </Link>
                    );
                })}

                {/* Profile / Full Menu trigger */}
                <button
                    type="button"
                    onClick={onOpenMenu}
                    aria-label="Buka Menu"
                    className="flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 px-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors select-none"
                >
                    <Menu className="w-5 h-5 stroke-[1.75]" />
                    <span className="text-[10px] mt-1 truncate max-w-full leading-tight">
                        Menu
                    </span>
                </button>
            </div>
        </nav>
    );
}
