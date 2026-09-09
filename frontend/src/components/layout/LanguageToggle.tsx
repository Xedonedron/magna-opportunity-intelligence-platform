"use client";

import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
    const { locale, setLocale } = useLanguage();

    return (
        <div
            className={cn(
                "flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80 text-xs font-medium transition-colors",
                className
            )}
        >
            <button
                type="button"
                onClick={() => setLocale("en")}
                className={cn(
                    "px-2 py-1 rounded transition-all flex items-center gap-1",
                    locale === "en"
                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-bold"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
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
                        ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xs font-bold"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                )}
                title="Beralih ke Bahasa Indonesia"
            >
                ID
            </button>
        </div>
    );
}
