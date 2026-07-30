"use client";

import { Search } from "lucide-react";
import { NotificationDropdown } from "@/components/domains/notifications/NotificationDropdown";

export function TopNav() {
    return (
        <header className="h-14 border-b border-zinc-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center flex-1">
                <div className="relative w-96 hidden md:block">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search opportunities, companies, or KYC reports... (Cmd+K)"
                        className="h-9 w-full rounded-md border border-zinc-200 bg-zinc-50 pl-9 pr-4 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300 focus:bg-white transition-colors"
                    />
                </div>
            </div>
            <div className="flex items-center gap-4">
                <NotificationDropdown />
            </div>
        </header>
    );
}