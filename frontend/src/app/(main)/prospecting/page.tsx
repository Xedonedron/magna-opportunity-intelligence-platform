"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProspectingPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/dashboard");
    }, [router]);

    return (
        <div className="flex h-[50vh] items-center justify-center">
            <p className="text-zinc-500 text-sm">Fitur Prospecting dinonaktifkan. Mengalihkan...</p>
        </div>
    );
}
