"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { StatusCount } from "@/types/dashboard";
import { TrendingUp, Layers, ChevronRight } from "lucide-react";

interface PipelineFunnelChartProps {
    data: StatusCount[];
}

interface FunnelStageConfig {
    id: string;
    name: string;
    shortName: string;
    statuses: string[];
    color: string;
    gradientStart: string;
    gradientEnd: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
}

const FUNNEL_STAGES: FunnelStageConfig[] = [
    {
        id: "ready_meeting",
        name: "Ready Meeting / Meeting Scheduled",
        shortName: "Ready / Scheduled",
        statuses: ["Ready Meeting", "Meeting Scheduled"],
        color: "#8b5cf6",
        gradientStart: "#9333ea",
        gradientEnd: "#7c3aed",
        badgeBg: "bg-purple-50 dark:bg-purple-950/60",
        badgeText: "text-purple-700 dark:text-purple-300",
        badgeBorder: "border-purple-200 dark:border-purple-800",
    },
    {
        id: "meeting_done",
        name: "Meeting Done",
        shortName: "Meeting Done",
        statuses: ["Meeting Done"],
        color: "#3b82f6",
        gradientStart: "#3b82f6",
        gradientEnd: "#2563eb",
        badgeBg: "bg-blue-50 dark:bg-blue-950/60",
        badgeText: "text-blue-700 dark:text-blue-300",
        badgeBorder: "border-blue-200 dark:border-blue-800",
    },
    {
        id: "need_proposal",
        name: "Need Proposal",
        shortName: "Need Proposal",
        statuses: ["Need Proposal"],
        color: "#eab308",
        gradientStart: "#eab308",
        gradientEnd: "#ca8a04",
        badgeBg: "bg-yellow-50 dark:bg-yellow-950/60",
        badgeText: "text-yellow-800 dark:text-yellow-300",
        badgeBorder: "border-yellow-200 dark:border-yellow-800",
    },
    {
        id: "poc",
        name: "POC",
        shortName: "POC",
        statuses: ["POC"],
        color: "#6366f1",
        gradientStart: "#6366f1",
        gradientEnd: "#4f46e5",
        badgeBg: "bg-indigo-50 dark:bg-indigo-950/60",
        badgeText: "text-indigo-700 dark:text-indigo-300",
        badgeBorder: "border-indigo-200 dark:border-indigo-800",
    },
    {
        id: "negotiation",
        name: "Negotiation",
        shortName: "Negotiation",
        statuses: ["Negotiation"],
        color: "#ec4899",
        gradientStart: "#ec4899",
        gradientEnd: "#db2777",
        badgeBg: "bg-pink-50 dark:bg-pink-950/60",
        badgeText: "text-pink-700 dark:text-pink-300",
        badgeBorder: "border-pink-200 dark:border-pink-800",
    },
    {
        id: "po",
        name: "PO",
        shortName: "PO",
        statuses: ["PO"],
        color: "#22c55e",
        gradientStart: "#22c55e",
        gradientEnd: "#16a34a",
        badgeBg: "bg-green-50 dark:bg-green-950/60",
        badgeText: "text-green-700 dark:text-green-300",
        badgeBorder: "border-green-200 dark:border-green-800",
    },
    {
        id: "won",
        name: "WON",
        shortName: "WON",
        statuses: ["Won", "WON"],
        color: "#10b981",
        gradientStart: "#10b981",
        gradientEnd: "#059669",
        badgeBg: "bg-emerald-50 dark:bg-emerald-950/60",
        badgeText: "text-emerald-700 dark:text-emerald-300",
        badgeBorder: "border-emerald-200 dark:border-emerald-800",
    },
];

type FunnelStageWithConversions = FunnelStageConfig & {
    stepNumber: number;
    value: number;
    stageConversion: string;
    totalConversion: string;
};

export function PipelineFunnelChart({ data }: PipelineFunnelChartProps) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

    const { stages, totalFunnelDeals, topOfFunnelCount, wonCount } = useMemo(() => {
        const countMap = new Map<string, number>();
        (data || []).forEach((item) => {
            countMap.set(item.status.trim().toLowerCase(), item.count);
        });

        let total = 0;
        const computed = FUNNEL_STAGES.map((stage, idx) => {
            const count = stage.statuses.reduce(
                (sum, s) => sum + (countMap.get(s.trim().toLowerCase()) || 0),
                0
            );
            total += count;
            return {
                ...stage,
                stepNumber: idx + 1,
                value: count,
            };
        });

        const topCount = computed[0]?.value || 0;
        const won = computed[computed.length - 1]?.value || 0;

        const withConversions: FunnelStageWithConversions[] = computed.map((stage, idx) => {
            const prevValue = idx === 0 ? stage.value : computed[idx - 1].value;
            const stageConversion =
                idx === 0
                    ? "100%"
                    : prevValue > 0
                    ? `${((stage.value / prevValue) * 100).toFixed(0)}%`
                    : "0%";
            const totalConversion =
                total > 0 ? `${((stage.value / total) * 100).toFixed(1)}%` : "0%";

            return {
                ...stage,
                stageConversion,
                totalConversion,
            };
        });

        return {
            stages: withConversions,
            totalFunnelDeals: total,
            topOfFunnelCount: topCount,
            wonCount: won,
        };
    }, [data]);

    const winRate =
        topOfFunnelCount > 0
            ? ((wonCount / topOfFunnelCount) * 100).toFixed(1)
            : "0.0";

    const hasData = totalFunnelDeals > 0;

    // SVG geometry calculations for horizontal tapering funnel
    const SVG_WIDTH = 1000;
    const SVG_HEIGHT = 160;
    const CENTER_Y = 80;
    const GAP = 6;
    const CHEVRON = 14;
    const PADDING_X = 16;
    const availableWidth = SVG_WIDTH - PADDING_X * 2 - (FUNNEL_STAGES.length - 1) * GAP;
    const stageWidth = availableWidth / FUNNEL_STAGES.length;

    // Continuous tapering heights from stage 1 to stage 7
    const heights = [130, 114, 98, 84, 72, 60, 48];

    return (
        <Card className="p-5 sm:p-6 shadow-sm border border-zinc-200 dark:border-zinc-800 transition-colors">
            {/* Header with Title and KPI Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                Pipeline Conversion Funnel
                            </h2>
                            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                Horizontal Flow <ChevronRight className="w-3 h-3" />
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Alur konversi peluang dari tahap Meeting hingga WON (arahkan kursor untuk detail)
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="px-3.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400 mr-1.5 font-medium">Total Deal di Funnel:</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{totalFunnelDeals}</span>
                    </div>
                    <div className="px-3.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">Win Rate:</span>
                        <span className="font-bold text-sm">{winRate}%</span>
                    </div>
                </div>
            </div>

            {!hasData ? (
                <div className="h-48 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm">
                    <Layers className="w-8 h-8 mb-2 stroke-[1.5] text-zinc-300 dark:text-zinc-600" />
                    Belum ada peluang pada tahapan funnel ini.
                </div>
            ) : (
                <div className="pt-6 pb-2">
                    {/* Responsive Horizontal Container */}
                    <div
                        className="relative overflow-x-auto select-none"
                        onMouseLeave={() => {
                            setHoveredIdx(null);
                            setTooltipPos(null);
                        }}
                    >
                        <div className="min-w-[760px] pb-1">
                            {/* Stage Column Labels (Header) */}
                            <div className="grid grid-cols-7 gap-1.5 mb-2.5 px-3">
                                {stages.map((stage, idx) => {
                                    const isHovered = hoveredIdx === idx;
                                    return (
                                        <div
                                            key={stage.id}
                                            className={`flex flex-col items-center text-center cursor-pointer transition-all duration-150 p-1.5 rounded-lg ${
                                                isHovered
                                                    ? "bg-zinc-100 dark:bg-zinc-800 scale-[1.02]"
                                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                            }`}
                                            onMouseEnter={() => setHoveredIdx(idx)}
                                        >
                                            <span
                                                className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                                                style={{ color: stage.color }}
                                            >
                                                #{stage.stepNumber}
                                            </span>
                                            <span
                                                className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-tight min-h-[28px] flex items-center justify-center"
                                                title={stage.name}
                                            >
                                                {stage.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* SVG Horizontal Funnel Flow */}
                            <div
                                className="relative w-full cursor-pointer"
                                onMouseMove={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setTooltipPos({
                                        x: e.clientX - rect.left,
                                        y: e.clientY - rect.top,
                                    });
                                }}
                            >
                                <svg
                                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                                    className="w-full h-auto overflow-visible"
                                >
                                    <defs>
                                        {stages.map((stage) => (
                                            <linearGradient
                                                key={`grad-${stage.id}`}
                                                id={`grad-${stage.id}`}
                                                x1="0%"
                                                y1="0%"
                                                x2="100%"
                                                y2="0%"
                                            >
                                                <stop offset="0%" stopColor={stage.gradientStart} />
                                                <stop offset="100%" stopColor={stage.gradientEnd} />
                                            </linearGradient>
                                        ))}
                                        <filter id="funnel-glow" x="-20%" y="-20%" width="140%" height="140%">
                                            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="rgba(0,0,0,0.3)" />
                                        </filter>
                                    </defs>

                                    {/* Render the 7 horizontal interlocking chevron stages */}
                                    {stages.map((stage, idx) => {
                                        const xStart = PADDING_X + idx * (stageWidth + GAP);
                                        const xEnd = xStart + stageWidth;
                                        const hL = heights[idx];
                                        const hR = idx < stages.length - 1 ? heights[idx + 1] : heights[idx] - 8;
                                        const yTL = CENTER_Y - hL / 2;
                                        const yBL = CENTER_Y + hL / 2;
                                        const yTR = CENTER_Y - hR / 2;
                                        const yBR = CENTER_Y + hR / 2;

                                        const isLast = idx === stages.length - 1;
                                        const isFirst = idx === 0;
                                        const isHovered = hoveredIdx === idx;

                                        // Clockwise chevron polygon
                                        const pathData = isFirst
                                            ? `M ${xStart} ${yTL} L ${xEnd} ${yTR} L ${xEnd + CHEVRON} ${CENTER_Y} L ${xEnd} ${yBR} L ${xStart} ${yBL} Z`
                                            : `M ${xStart} ${yTL} L ${xEnd} ${yTR} L ${xEnd + (isLast ? CHEVRON * 1.3 : CHEVRON)} ${CENTER_Y} L ${xEnd} ${yBR} L ${xStart} ${yBL} L ${xStart + CHEVRON} ${CENTER_Y} Z`;

                                        const centerTextX = (xStart + xEnd) / 2 + (isFirst ? CHEVRON / 3 : CHEVRON / 2);

                                        return (
                                            <g
                                                key={stage.id}
                                                className="transition-all duration-200"
                                                onMouseEnter={() => setHoveredIdx(idx)}
                                            >
                                                <path
                                                    d={pathData}
                                                    fill={`url(#grad-${stage.id})`}
                                                    opacity={isHovered ? 1 : hoveredIdx !== null ? 0.7 : stage.value === 0 ? 0.82 : 0.95}
                                                    filter={isHovered ? "url(#funnel-glow)" : undefined}
                                                    stroke={isHovered ? "#ffffff" : "rgba(255,255,255,0.25)"}
                                                    strokeWidth={isHovered ? 2.5 : 1}
                                                    className="transition-all duration-200 cursor-pointer"
                                                />

                                                {/* Deal Count Text */}
                                                <text
                                                    x={centerTextX}
                                                    y={CENTER_Y - 4}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill="#ffffff"
                                                    className={`font-extrabold ${hL > 75 ? "text-xl" : "text-base"} pointer-events-none select-none`}
                                                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.45)" }}
                                                >
                                                    {stage.value}
                                                </text>

                                                {/* Total Conversion % subtext inside segment */}
                                                <text
                                                    x={centerTextX}
                                                    y={CENTER_Y + 16}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill="rgba(255,255,255,0.9)"
                                                    className="text-[11px] font-semibold pointer-events-none select-none"
                                                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
                                                >
                                                    {stage.totalConversion}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </svg>

                                {/* Floating Tooltip Card */}
                                {hoveredIdx !== null && tooltipPos && (
                                    <div
                                        className="absolute pointer-events-none z-30 transition-all duration-75"
                                        style={{
                                            left: `${Math.min(Math.max(tooltipPos.x - 110, 10), availableWidth - 100)}px`,
                                            top: `${Math.max(tooltipPos.y - 120, -10)}px`,
                                        }}
                                    >
                                        <div className="bg-zinc-900/95 dark:bg-zinc-950/95 text-white border border-zinc-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5 w-[220px]">
                                            <div className="flex items-center gap-2 font-bold pb-1 border-b border-zinc-800">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                                    style={{ backgroundColor: stages[hoveredIdx].color }}
                                                />
                                                <span className="truncate">{stages[hoveredIdx].name}</span>
                                            </div>
                                            <div className="flex justify-between text-zinc-300">
                                                <span>Jumlah Peluang:</span>
                                                <span className="font-bold text-white text-sm">
                                                    {stages[hoveredIdx].value} Deals
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-zinc-300">
                                                <span>Konversi Tahap:</span>
                                                <span className="font-semibold text-blue-400">
                                                    {stages[hoveredIdx].stageConversion}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-zinc-300">
                                                <span>Porsi dari Pipeline:</span>
                                                <span className="font-semibold text-emerald-400">
                                                    {stages[hoveredIdx].totalConversion}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Conversion Badges (Footer) */}
                            <div className="grid grid-cols-7 gap-1.5 mt-3 px-3">
                                {stages.map((stage, idx) => {
                                    const isHovered = hoveredIdx === idx;
                                    return (
                                        <div
                                            key={stage.id}
                                            className="flex flex-col items-center cursor-pointer"
                                            onMouseEnter={() => setHoveredIdx(idx)}
                                        >
                                            <span
                                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border transition-all ${stage.badgeBg} ${stage.badgeText} ${stage.badgeBorder} ${
                                                    isHovered ? "ring-2 ring-blue-500/30 scale-105" : ""
                                                }`}
                                            >
                                                {idx === 0 ? "100%" : `Conv: ${stage.stageConversion}`}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
