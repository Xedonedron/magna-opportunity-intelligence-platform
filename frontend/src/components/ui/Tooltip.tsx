"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    position?: "top" | "bottom" | "left" | "right";
    className?: string;
    contentClassName?: string;
    arrow?: boolean;
    disabled?: boolean;
}

export function Tooltip({
    content,
    children,
    position = "top",
    className,
    contentClassName,
    arrow = true,
    disabled = false,
}: TooltipProps) {
    if (disabled || !content) {
        return <>{children}</>;
    }

    const positionClasses = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
    };

    const arrowClasses = {
        top: "top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900 dark:border-t-zinc-800",
        bottom: "bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-zinc-900 dark:border-b-zinc-800",
        left: "left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-zinc-900 dark:border-l-zinc-800",
        right: "right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-zinc-900 dark:border-r-zinc-800",
    };

    return (
        <div className={cn("relative inline-flex items-center group", className)}>
            {children}
            <div
                role="tooltip"
                className={cn(
                    "absolute z-30 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 ease-out",
                    "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-100 bg-zinc-900 dark:bg-zinc-800 dark:text-zinc-200 rounded-md shadow-lg border border-zinc-700/60 whitespace-nowrap",
                    positionClasses[position],
                    contentClassName
                )}
            >
                {content}
                {arrow && <div className={cn("absolute", arrowClasses[position])} />}
            </div>
        </div>
    );
}
