"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import type { StatusCount } from "@/types/dashboard";
import { TrendingUp, Layers, CheckCircle2 } from "lucide-react";

interface PipelineFunnelChartProps {
    data: StatusCount[];
    wonRate?: number;
}

interface FunnelStageConfig {
    id: string;
    name: string;
    shortName: string;
    statuses: string[];
    color: string;
    gradientFrom: string;
    gradientTo: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
}

const FUNNEL_STAGES: FunnelStageConfig[] = [
    {
        id: "ready_meeting",
        name: "Ready Meeting / Scheduled",
        shortName: "Meeting Ready/Sched",
        statuses: ["Ready Meeting", "Meeting Scheduled"],
        color: "#8b5cf6",
        gradientFrom: "#a855f7",
        gradientTo: "#7c3aed",
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
        gradientFrom: "#60a5fa",
        gradientTo: "#2563eb",
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
        gradientFrom: "#facc15",
        gradientTo: "#ca8a04",
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
        gradientFrom: "#818cf8",
        gradientTo: "#4f46e5",
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
        gradientFrom: "#f472b6",
        gradientTo: "#db2777",
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
        gradientFrom: "#4ade80",
        gradientTo: "#16a34a",
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
        gradientFrom: "#34d399",
        gradientTo: "#059669",
        badgeBg: "bg-emerald-50 dark:bg-emerald-950/60",
        badgeText: "text-emerald-700 dark:text-emerald-300",
        badgeBorder: "border-emerald-200 dark:border-emerald-800",
    },
];

type FunnelStageComputed = FunnelStageConfig & {
    stepNumber: number;
    value: number;
    sharePercentage: string;
    height: number;
};

export function PipelineFunnelChart({ data, wonRate }: PipelineFunnelChartProps) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    // Geometry constants for smooth S-curve stream funnel
    const SVG_WIDTH = 1050;
    const SVG_HEIGHT = 160;
    const BASELINE_Y = 150;
    const MAX_CURVE_HEIGHT = 125;
    const MIN_HEIGHT = 16;
    const colWidth = SVG_WIDTH / FUNNEL_STAGES.length;

    const { stages, totalFunnelDeals, wonCount } = useMemo(() => {
        const countMap = new Map<string, number>();
        (data || []).forEach((item) => {
            countMap.set(item.status.trim().toLowerCase(), item.count);
        });

        // 1. Raw counts (active snapshot deal di masing-masing tahap)
        const initial = FUNNEL_STAGES.map((stage, idx) => {
            const count = stage.statuses.reduce(
                (sum, s) => sum + (countMap.get(s.trim().toLowerCase()) || 0),
                0
            );
            return {
                ...stage,
                stepNumber: idx + 1,
                value: count,
            };
        });

        const totalDeals = initial.reduce((sum, s) => sum + s.value, 0);
        const won = initial[initial.length - 1]?.value || 0;
        const maxVal = Math.max(...initial.map((s) => s.value), 1);

        const computed: FunnelStageComputed[] = initial.map((stage) => {
            // Proporsi persentase deal di tahap ini terhadap seluruh deal aktif
            const sharePercentage =
                totalDeals > 0
                    ? `${((stage.value / totalDeals) * 100).toFixed(1)}%`
                    : "0.0%";

            // Formula skala ketinggian dinamis & proporsional:
            // Menyelesaikan clamping bug: nilai 2 dan 3 kini terbukti lebih tinggi dari nilai 1!
            const height =
                stage.value > 0
                    ? Math.round(
                          MIN_HEIGHT +
                              (stage.value / maxVal) *
                                  (MAX_CURVE_HEIGHT - MIN_HEIGHT)
                      )
                    : 0;

            return {
                ...stage,
                sharePercentage,
                height,
            };
        });

        return {
            stages: computed,
            totalFunnelDeals: totalDeals,
            wonCount: won,
        };
    }, [data]);

    // Menggunakan wonRate resmi dari backend jika ada, atau hitung proporsi WON dari total pipeline
    const resolvedWinRate =
        wonRate !== undefined
            ? wonRate.toFixed(1)
            : totalFunnelDeals > 0
            ? ((wonCount / totalFunnelDeals) * 100).toFixed(1)
            : "0.0";

    const hasData = totalFunnelDeals > 0;

    return (
        <Card className="p-5 sm:p-7 shadow-xs border border-zinc-200/90 dark:border-zinc-800 transition-colors bg-white dark:bg-zinc-900">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                            Pipeline Funnel
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Visualisasi distribusi peluang aktif di setiap tahapan dari Meeting hingga WON
                        </p>
                    </div>
                </div>

                {/* Right-aligned Floating Stat Cards */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/70 rounded-xl px-4 py-2 shadow-2xs">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            Total Deal di Funnel
                        </div>
                        <div className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5">
                            {totalFunnelDeals}
                        </div>
                    </div>

                    <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl px-4 py-2 shadow-2xs flex items-center gap-3">
                        <div>
                            <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5" />
                                Win Rate
                            </div>
                            <div className="text-xl font-black text-emerald-700 dark:text-emerald-200 mt-0.5">
                                {resolvedWinRate}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {!hasData ? (
                <div className="h-56 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm">
                    <Layers className="w-9 h-9 mb-2 stroke-[1.5] text-zinc-300 dark:text-zinc-600" />
                    Belum ada peluang pada tahapan pipeline ini.
                </div>
            ) : (
                <div className="pt-6 pb-2">
                    {/* Horizontal Stream Container */}
                    <div
                        className="relative overflow-x-auto select-none"
                        onMouseLeave={() => setHoveredIdx(null)}
                    >
                        <div className="min-w-[840px]">
                            {/* SVG Continuous S-Curve Stream Area */}
                            <div className="relative w-full h-[160px]">
                                <svg
                                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                                    className="w-full h-full overflow-visible"
                                    preserveAspectRatio="none"
                                >
                                    <defs>
                                        {stages.map((stage) => (
                                            <linearGradient
                                                key={`wave-grad-${stage.id}`}
                                                id={`wave-grad-${stage.id}`}
                                                x1="0%"
                                                y1="0%"
                                                x2="0%"
                                                y2="100%"
                                            >
                                                <stop offset="0%" stopColor={stage.gradientFrom} stopOpacity={0.88} />
                                                <stop offset="70%" stopColor={stage.gradientTo} stopOpacity={0.45} />
                                                <stop offset="100%" stopColor={stage.gradientTo} stopOpacity={0.08} />
                                            </linearGradient>
                                        ))}
                                        <linearGradient id="baseline-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                                        </linearGradient>
                                    </defs>

                                    {/* Subtle baseline rule */}
                                    <line
                                        x1={0}
                                        y1={BASELINE_Y}
                                        x2={SVG_WIDTH}
                                        y2={BASELINE_Y}
                                        stroke="url(#baseline-grad)"
                                        strokeWidth={1.5}
                                        strokeDasharray="4 4"
                                    />

                                    {/* Render each column's S-curve wave segment */}
                                    {stages.map((stage, idx) => {
                                        const x0 = idx * colWidth;
                                        const x1 = (idx + 1) * colWidth;
                                        const hStart = stage.height;
                                        const hNext =
                                            idx < stages.length - 1
                                                ? stages[idx + 1].height
                                                : Math.round(stage.height * 0.35);

                                        const y0 = BASELINE_Y - hStart;
                                        const y1 = BASELINE_Y - hNext;

                                        const isHovered = hoveredIdx === idx;
                                        const hasVolume = hStart > 0 || hNext > 0;

                                        // Smooth Cubic Bezier S-curve from (x0, y0) to (x1, y1)
                                        const cp1x = x0 + colWidth * 0.45;
                                        const cp1y = y0;
                                        const cp2x = x0 + colWidth * 0.55;
                                        const cp2y = y1;

                                        const pathData = `
                                            M ${x0} ${BASELINE_Y}
                                            L ${x0} ${y0}
                                            C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x1} ${y1}
                                            L ${x1} ${BASELINE_Y}
                                            Z
                                        `;

                                        const curveStroke = `
                                            M ${x0} ${y0}
                                            C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x1} ${y1}
                                        `;

                                        // Peak coordinate for circular glowing indicator
                                        const beadX = x0 + colWidth * 0.35;
                                        const beadY = y0;

                                        return (
                                            <g
                                                key={stage.id}
                                                className="cursor-pointer transition-all duration-200"
                                                onMouseEnter={() => setHoveredIdx(idx)}
                                            >
                                                {/* Filled Wave Area */}
                                                {hasVolume && (
                                                    <path
                                                        d={pathData}
                                                        fill={`url(#wave-grad-${stage.id})`}
                                                        opacity={isHovered ? 1 : hoveredIdx !== null ? 0.45 : 0.8}
                                                        className="transition-all duration-200"
                                                    />
                                                )}

                                                {/* Top Contour Crest Line */}
                                                {hasVolume && (
                                                    <path
                                                        d={curveStroke}
                                                        fill="none"
                                                        stroke={stage.color}
                                                        strokeWidth={isHovered ? 3.5 : 2}
                                                        opacity={isHovered ? 1 : 0.75}
                                                        className="transition-all duration-200"
                                                    />
                                                )}

                                                {/* Translucent Glass Bubble Indicator on Hover */}
                                                {isHovered && hStart > 0 && (
                                                    <g className="animate-in fade-in zoom-in duration-150">
                                                        <circle
                                                            cx={beadX}
                                                            cy={beadY}
                                                            r={12}
                                                            fill={stage.color}
                                                            fillOpacity={0.25}
                                                            stroke={stage.color}
                                                            strokeWidth={1.5}
                                                        />
                                                        <circle
                                                            cx={beadX}
                                                            cy={beadY}
                                                            r={5}
                                                            fill="#ffffff"
                                                            stroke={stage.color}
                                                            strokeWidth={2}
                                                        />
                                                    </g>
                                                )}

                                                {/* Vertical Divider Line between columns */}
                                                {idx > 0 && (
                                                    <line
                                                        x1={x0}
                                                        y1={20}
                                                        x2={x0}
                                                        y2={BASELINE_Y}
                                                        stroke="currentColor"
                                                        className="text-zinc-200 dark:text-zinc-800"
                                                        strokeWidth={1}
                                                    />
                                                )}
                                            </g>
                                        );
                                    })}
                                </svg>
                            </div>

                            {/* Column Labels & Interactive Hover Columns */}
                            <div className="grid grid-cols-7 gap-1.5 pt-2">
                                {stages.map((stage, idx) => {
                                    const isHovered = hoveredIdx === idx;
                                    const isZero = stage.value === 0;

                                    return (
                                        <div
                                            key={stage.id}
                                            className={`relative p-3 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                                                isHovered
                                                    ? "bg-white dark:bg-zinc-800 shadow-xl border border-zinc-200 dark:border-zinc-700 -translate-y-2 z-20 ring-1 ring-black/5"
                                                    : "hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                                            }`}
                                            onMouseEnter={() => setHoveredIdx(idx)}
                                        >
                                            {/* Top Step Label */}
                                            <div className="flex items-center justify-between gap-1 mb-1.5">
                                                <span
                                                    className="text-[10px] font-bold uppercase tracking-wider"
                                                    style={{ color: isZero ? "#94a3b8" : stage.color }}
                                                >
                                                    Step {stage.stepNumber}
                                                </span>
                                                {stage.value > 0 && idx === 6 && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                )}
                                            </div>

                                            {/* Big Bold Quantity & Stage Name */}
                                            <div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span
                                                        className={`text-2xl sm:text-3xl font-black tracking-tight ${
                                                            isZero
                                                                ? "text-zinc-300 dark:text-zinc-600"
                                                                : "text-zinc-900 dark:text-zinc-100"
                                                        }`}
                                                        style={{
                                                            color: isHovered && !isZero ? stage.color : undefined,
                                                        }}
                                                    >
                                                        {stage.value}
                                                    </span>
                                                </div>

                                                <p
                                                    className={`text-xs font-semibold mt-1.5 leading-tight line-clamp-2 min-h-[30px] ${
                                                        isZero
                                                            ? "text-zinc-400 dark:text-zinc-500 font-normal"
                                                            : "text-zinc-800 dark:text-zinc-200"
                                                    }`}
                                                    title={stage.name}
                                                >
                                                    {stage.name}
                                                </p>
                                            </div>

                                            {/* Sub-label Metrics: Porsi Pipeline & Jumlah Deal */}
                                            <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                                                <span
                                                    className={`font-semibold ${
                                                        isZero
                                                            ? "text-zinc-400 dark:text-zinc-600"
                                                            : "text-zinc-600 dark:text-zinc-300"
                                                    }`}
                                                    title="Persentase deal di tahap ini terhadap total seluruh deal di pipeline"
                                                >
                                                    Porsi: {stage.sharePercentage}
                                                </span>
                                                <span
                                                    className="text-[10px] text-zinc-400 dark:text-zinc-500"
                                                >
                                                    {stage.value} Deal
                                                </span>
                                            </div>
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


