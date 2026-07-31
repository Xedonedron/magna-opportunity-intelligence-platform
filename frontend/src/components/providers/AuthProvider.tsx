"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("moip_token");
        if (!token) {
            router.push("/login");
        } else {
            setIsAuthenticated(true);
        }
    }, [pathname, router]);

    if (!isAuthenticated) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-zinc-50">
                <div className="w-8 h-8 border-4 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
            </div>
        );
    }

    return <>{children}</>;
}
