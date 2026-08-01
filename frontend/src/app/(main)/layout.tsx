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
            <div className="flex h-screen w-full bg-zinc-100 text-zinc-900 font-sans selection:bg-zinc-200 overflow-hidden">
                <Sidebar />
                <MobileSidebarDrawer
                    isOpen={isMobileOpen}
                    onClose={() => setIsMobileOpen(false)}
                />
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-white">
                    <TopNav onOpenMobileMenu={() => setIsMobileOpen(true)} />
                    <main className="flex-1 overflow-y-auto relative bg-zinc-50">
                        {children}
                    </main>
                </div>
            </div>
        </AuthProvider>
    );
}