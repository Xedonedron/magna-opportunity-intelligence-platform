"use client";

import { useState } from "react";
import { Sidebar, MobileSidebarDrawer } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { AuthProvider } from "@/components/providers/AuthProvider";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    return (
        <AuthProvider>
            <div className="flex h-screen w-full bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-200 dark:selection:bg-zinc-800 overflow-hidden transition-colors">
                <Sidebar />
                <MobileSidebarDrawer
                    isOpen={isMobileOpen}
                    onClose={() => setIsMobileOpen(false)}
                />
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-white dark:bg-zinc-900 transition-colors">
                    <TopNav onOpenMobileMenu={() => setIsMobileOpen(true)} />
                    <main className="flex-1 overflow-y-auto relative bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
                        {children}
                    </main>
                </div>
            </div>
        </AuthProvider>
    );
}