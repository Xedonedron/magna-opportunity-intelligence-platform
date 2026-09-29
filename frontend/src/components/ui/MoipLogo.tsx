"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MoipLogoProps {
    className?: string;
    variant?: "icon" | "full";
    layout?: "horizontal" | "vertical";
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    showTagline?: boolean;
    showVersion?: boolean;
}

const sizeConfig = {
    xs: { icon: "w-5 h-5", text: "text-sm", tagline: "text-[9px]", gap: "gap-1.5" },
    sm: { icon: "w-6 h-6", text: "text-base", tagline: "text-[10px]", gap: "gap-2" },
    md: { icon: "w-8 h-8", text: "text-xl", tagline: "text-xs", gap: "gap-2.5" },
    lg: { icon: "w-11 h-11", text: "text-2xl", tagline: "text-xs", gap: "gap-3" },
    xl: { icon: "w-16 h-16", text: "text-3xl", tagline: "text-sm", gap: "gap-3.5" },
};

export function MoipLogoIcon({ className = "w-6 h-6" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("shrink-0", className)}
            aria-label="MOIP Logo Mark (M-2 Symmetrical Core)"
        >
            <defs>
                {/* Left Pillar Gradient (Cobalt Foundation) */}
                <linearGradient id="moip-m2-left" x1="45" y1="50" x2="105" y2="150" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#1D4ED8" />
                    <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>

                {/* Right Pillar Gradient (Cyan Flow & Intelligence) */}
                <linearGradient id="moip-m2-right" x1="95" y1="50" x2="155" y2="150" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#0284C7" />
                    <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>

                {/* Warm Coral / Radiant Magenta Opportunity Core */}
                <linearGradient id="moip-m2-dot" x1="90" y1="85" x2="110" y2="105" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FB7185" />
                    <stop offset="60%" stopColor="#F43F5E" />
                    <stop offset="100%" stopColor="#E11D48" />
                </linearGradient>

                {/* Beacon Glow */}
                <filter id="moip-m2-glow" x="78" y="76" width="44" height="44" filterUnits="userSpaceOnUse">
                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F43F5E" floodOpacity="0.35" />
                </filter>
            </defs>

            {/* Left Arch of M */}
            <path
                d="M 50 148 V 72 C 50 56 64 48 78 58 L 100 86"
                stroke="url(#moip-m2-left)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Right Arch of M */}
            <path
                d="M 100 86 L 122 58 C 136 48 150 56 150 72 V 148"
                stroke="url(#moip-m2-right)"
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Opportunity Discovery Core: Warm Magenta Aperture Ring & Dot */}
            <g transform="translate(100, 114)">
                <circle
                    cx="0"
                    cy="0"
                    r="14"
                    stroke="url(#moip-m2-dot)"
                    strokeWidth="4.5"
                    className="fill-white dark:fill-zinc-900 transition-colors"
                />
                <circle
                    cx="0"
                    cy="0"
                    r="6"
                    fill="url(#moip-m2-dot)"
                    filter="url(#moip-m2-glow)"
                />
            </g>
        </svg>
    );
}

export function MoipLogo({
    className,
    variant = "full",
    layout = "horizontal",
    size = "sm",
    showTagline = true,
    showVersion = true,
}: MoipLogoProps) {
    const config = sizeConfig[size];

    if (variant === "icon") {
        return <MoipLogoIcon className={cn(config.icon, className)} />;
    }

    const isVertical = layout === "vertical";

    return (
        <div
            className={cn(
                "inline-flex select-none",
                isVertical ? "flex-col items-center text-center" : "items-center",
                config.gap,
                className
            )}
        >
            <MoipLogoIcon className={config.icon} />
            <div
                className={cn(
                    "flex flex-col leading-none",
                    isVertical ? "items-center text-center mt-1" : "justify-center"
                )}
            >
                <div className="flex items-center gap-1.5">
                    <span
                        className={cn(
                            "font-bold tracking-tight text-zinc-900 dark:text-white font-sans",
                            config.text
                        )}
                    >
                        MOIP
                    </span>
                    {showVersion && (
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                            v1.7.0
                        </span>
                    )}
                </div>
                {showTagline && (
                    <span
                        className={cn(
                            "text-zinc-500 dark:text-zinc-400 font-medium tracking-tight mt-1 font-sans",
                            config.tagline
                        )}
                    >
                        Magna Opportunity Intelligence Platform
                    </span>
                )}
            </div>
        </div>
    );
}

export default MoipLogo;
