"use client";

import { useLanguage } from "@/context/LanguageContext";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
    const { locale, setLocale } = useLanguage();

    return (
        <div
            className={cn(
                "flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-xs font-medium",
                className
            )}
        >
            <button
                type="button"
                onClick={() => setLocale("en")}
                className={cn(
                    "px-2 py-1 rounded transition-all flex items-center gap-1",
                    locale === "en"
                        ? "bg-white text-zinc-900 shadow-2xs font-bold"
                        : "text-zinc-500 hover:text-zinc-800"
                )}
                title="Switch to English"
            >
                EN
            </button>
            <button
                type="button"
                onClick={() => setLocale("id")}
                className={cn(
                    "px-2 py-1 rounded transition-all flex items-center gap-1",
                    locale === "id"
                        ? "bg-white text-zinc-900 shadow-2xs font-bold"
                        : "text-zinc-500 hover:text-zinc-800"
                )}
                title="Beralih ke Bahasa Indonesia"
            >
                ID
            </button>
        </div>
    );
}
