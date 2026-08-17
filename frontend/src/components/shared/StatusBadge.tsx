"use client";

import { cn } from "@/lib/utils";
import { STATUS_STYLES } from "@/types/opportunity";
import type { OpportunityStatus } from "@/types/opportunity";
import { useLanguage } from "@/context/LanguageContext";

interface StatusBadgeProps {
    status: OpportunityStatus;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const { t } = useLanguage();
    const label = t.status[status] || status;

    return (
        <span
            className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset whitespace-nowrap",
                STATUS_STYLES[status] || "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
                className
            )}
        >
            {label}
        </span>
    );
}
