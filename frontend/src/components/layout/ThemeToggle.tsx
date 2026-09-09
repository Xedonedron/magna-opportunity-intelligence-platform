"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { t } = useLanguage();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div
                className={cn(
                    "w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50",
                    className
                )}
                aria-hidden="true"
            />
        );
    }

    const isDark = resolvedTheme === "dark";

    const handleToggle = () => {
        setTheme(isDark ? "light" : "dark");
    };

    return (
        <button
            type="button"
            onClick={handleToggle}
            className={cn(
                "relative inline-flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700/70 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 shadow-2xs",
                className
            )}
            title={isDark ? (t.theme?.switchToLight || "Switch to light mode") : (t.theme?.switchToDark || "Switch to dark mode")}
            aria-label={t.theme?.toggleTheme || "Toggle theme"}
        >
            {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
            ) : (
                <Moon className="w-4 h-4 text-zinc-600 transition-transform duration-300 rotate-0 hover:-rotate-12" />
            )}
        </button>
    );
}
