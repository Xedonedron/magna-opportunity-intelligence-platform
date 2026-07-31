"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("moip_token");
        if (token) {
            router.push("/dashboard");
        } else {
            router.push("/login");
        }
    }, [router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-zinc-50">
            <div className="w-8 h-8 border-4 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
        </div>
    );
}