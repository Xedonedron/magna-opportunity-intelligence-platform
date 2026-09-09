"use client";

import { useMemo } from "react";
import {
    FunnelChart,
    Funnel,
    Cell,
    Tooltip,
    ResponsiveContainer,
    LabelList,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { StatusCount } from "@/types/dashboard";
import { TrendingUp, Layers } from "lucide-react";

interface PipelineFunnelChartProps {
    data: StatusCount[];
}

interface FunnelStageConfig {
    id: string;
    name: string;
    shortName: string;
    statuses: string[];
    color: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
}

const FUNNEL_STAGES: FunnelStageConfig[] = [
    {
        id: "ready_meeting",
        name: "Ready Meeting / Meeting Scheduled",
        shortName: "Meeting Ready/Sched",
        statuses: ["Ready Meeting", "Meeting Scheduled"],
        color: "#8b5cf6",
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
        badgeBg: "bg-emerald-50 dark:bg-emerald-950/60",
        badgeText: "text-emerald-700 dark:text-emerald-300",
        badgeBorder: "border-emerald-200 dark:border-emerald-800",
    },
];

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        payload: {
            name: string;
            value: number;
            color: string;
            stageConversion: string;
            totalConversion: string;
        };
    }>;
}

function CustomFunnelTooltip({ active, payload }: CustomTooltipProps) {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 shadow-lg text-xs space-y-1 z-50">
            <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: data.color }}
                />
                <span>{data.name}</span>
            </div>
            <div className="text-zinc-600 dark:text-zinc-400">
                Jumlah Peluang: <span className="font-bold text-zinc-900 dark:text-zinc-100">{data.value}</span>
            </div>
            <div className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                Konversi dari tahap sebelumnya: <span className="font-medium text-blue-600 dark:text-blue-400">{data.stageConversion}</span>
            </div>
            <div className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                Porsi dari total pipeline: <span className="font-medium text-emerald-600 dark:text-emerald-400">{data.totalConversion}</span>
            </div>
        </div>
    );
}

export function PipelineFunnelChart({ data }: PipelineFunnelChartProps) {
    const { stages, totalFunnelDeals, topOfFunnelCount, wonCount, maxCount } = useMemo(() => {
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
        const max = Math.max(...computed.map((s) => s.value), 1);

        const withConversions = computed.map((stage, idx) => {
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
            maxCount: max,
        };
    }, [data]);

    const winRate =
        topOfFunnelCount > 0
            ? ((wonCount / topOfFunnelCount) * 100).toFixed(1)
            : "0.0";

    const hasData = totalFunnelDeals > 0;

    return (
        <Card className="p-5 shadow-sm border border-zinc-200 dark:border-zinc-800">
            {/* Header with Title and KPI Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Layers className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            Pipeline Conversion Funnel
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Konversi peluang dari tahap Meeting hingga WON
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="px-3 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs">
                        <span className="text-zinc-500 dark:text-zinc-400 mr-1.5">Total Deal di Funnel:</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalFunnelDeals}</span>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-300">Win Rate:</span>
                        <span className="font-bold">{winRate}%</span>
                    </div>
                </div>
            </div>

            {!hasData ? (
                <div className="h-48 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm">
                    <Layers className="w-8 h-8 mb-2 stroke-[1.5] text-zinc-300 dark:text-zinc-600" />
                    Belum ada peluang pada tahapan funnel ini.
                </div>
            ) : (
                <div className="space-y-6 pt-5">
                    {/* Visual Recharts Funnel representation */}
                    <div className="h-64 sm:h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <FunnelChart>
                                <Tooltip content={<CustomFunnelTooltip />} />
                                <Funnel
                                    dataKey="value"
                                    data={stages}
                                    isAnimationActive
                                >
                                    <LabelList
                                        position="right"
                                        fill="currentColor"
                                        className="text-xs font-semibold fill-zinc-700 dark:fill-zinc-300"
                                        dataKey="shortName"
                                        stroke="none"
                                    />
                                    {stages.map((entry) => (
                                        <Cell
                                            key={`cell-${entry.id}`}
                                            fill={entry.color}
                                            className="transition-opacity hover:opacity-85"
                                        />
                                    ))}
                                </Funnel>
                            </FunnelChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stage Breakdown Cards Flow */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                            Rincian Tahapan & Konversi
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                            {stages.map((stage) => {
                                const barWidth = maxCount > 0 ? Math.max((stage.value / maxCount) * 100, 6) : 6;
                                return (
                                    <div
                                        key={stage.id}
                                        className="relative bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 rounded-xl p-3 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-2xs"
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-1 mb-1.5">
                                                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
                                                    #{stage.stepNumber}
                                                </span>
                                                <span
                                                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${stage.badgeBg} ${stage.badgeText} ${stage.badgeBorder}`}
                                                >
                                                    {stage.stageConversion}
                                                </span>
                                            </div>
                                            <p
                                                className="text-xs font-medium text-zinc-800 dark:text-zinc-200 line-clamp-2 min-h-[32px]"
                                                title={stage.name}
                                            >
                                                {stage.name}
                                            </p>
                                        </div>

                                        <div className="mt-3">
                                            <div className="flex items-baseline justify-between mb-1.5">
                                                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                                    {stage.value}
                                                </span>
                                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                                    {stage.totalConversion}
                                                </span>
                                            </div>

                                            {/* Mini Proportional Bar */}
                                            <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${barWidth}%`,
                                                        backgroundColor: stage.color,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
