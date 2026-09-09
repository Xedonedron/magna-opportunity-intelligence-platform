"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/Card";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { PipelineFunnelChart } from "@/components/dashboard/PipelineFunnelChart";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { SolutionDistributionChart } from "@/components/dashboard/SolutionDistributionChart";
import { IndustryDistributionChart } from "@/components/dashboard/IndustryDistributionChart";
import { getDashboardMetrics, type DashboardFilters as Filters } from "@/lib/api/dashboard";
import type { DashboardMetrics as Metrics } from "@/types/dashboard";

const statusStyles: Record<string, string> = {
    New: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-blue-600/20 dark:ring-blue-500/30",
    "KYC Running": "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 ring-orange-600/20 dark:ring-orange-500/30",
    "Ready Meeting": "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 ring-purple-600/20 dark:ring-purple-500/30",
    "Meeting Scheduled": "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 ring-cyan-600/20 dark:ring-cyan-500/30",
    "Meeting Done": "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 ring-slate-600/20 dark:ring-slate-500/30",
    "Need Proposal": "bg-yellow-50 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 ring-yellow-600/20 dark:ring-yellow-500/30",
    POC: "bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 ring-violet-600/20 dark:ring-violet-500/30",
    Negotiation: "bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 ring-pink-600/20 dark:ring-pink-500/30",
    PO: "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 ring-green-600/20 dark:ring-green-500/30",
    Won: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-emerald-600/20 dark:ring-emerald-500/30",
    Lost: "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 ring-red-600/20 dark:ring-red-500/30",
    "On Hold": "bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 ring-gray-600/20 dark:ring-gray-500/30",
};

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [filters, setFilters] = useState<Filters>({});
    const [initialLoading, setInitialLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchMetrics() {
            if (!metrics) {
                setInitialLoading(true);
            } else {
                setIsUpdating(true);
            }
            setError(null);
            try {
                const data = await getDashboardMetrics(filters);
                setMetrics(data);
            } catch (err) {
                setError("Failed to load dashboard data");
                console.error(err);
            } finally {
                setInitialLoading(false);
                setIsUpdating(false);
            }
        }
        fetchMetrics();
    }, [filters]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case "admin":
                return "Administrator";
            case "manager":
                return "Manager";
            case "lgo":
                return "LGO";
            case "engineer":
                return "Engineer";
            default:
                return role;
        }
    };

    if (initialLoading && !metrics) {
        return (
            <div className="p-4 sm:p-8 max-w-7xl mx-auto">
                <div className="animate-pulse space-y-8">
                    <div className="h-8 bg-zinc-200 rounded w-1/3" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-28 bg-zinc-200 rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !metrics) {
        return (
            <div className="p-4 sm:p-8 max-w-7xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {error || "Unable to load dashboard"}
                </div>
            </div>
        );
    }

    const activeEngineer = filters.engineer_name || filters.engineer_id;

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {getGreeting()}
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                    Here is what&apos;s happening with your pipeline today.
                </p>
            </div>

            {/* Always-visible Pre-Sales & Pipeline Filter Controls */}
            <DashboardFilters
                onFilterChange={setFilters}
                userRole={metrics.user_role}
                currentFilters={filters}
            />

            <div className={`space-y-6 sm:space-y-8 transition-opacity duration-150 ${isUpdating ? "opacity-75" : "opacity-100"}`}>
                {activeEngineer && (
                <div className="flex items-center justify-between bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg px-4 py-2 text-sm text-blue-900 dark:text-blue-200 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-zinc-600 dark:text-zinc-400">Menampilkan analitik khusus Pre-Sales:</span>
                        <span className="font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-blue-900/60 px-2.5 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                            {activeEngineer}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFilters({ ...filters, engineer_name: undefined, engineer_id: undefined })}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 font-medium underline transition-colors"
                    >
                        Tampilkan Semua Pre-Sales
                    </button>
                </div>
            )}

            <DashboardMetrics
                totalOpportunities={metrics.total_opportunities}
                totalPotentialRevenue={metrics.total_potential_revenue}
                meetingsToday={metrics.meetings_today}
                needFollowUp={metrics.need_follow_up}
                activeCount={metrics.active_count}
                userRole={metrics.user_role}
            />

            <PipelineFunnelChart data={metrics.by_status} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StatusChart data={metrics.by_status} />
                <TrendChart data={metrics.trend_data} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SolutionDistributionChart data={metrics.by_product} />
                <IndustryDistributionChart data={metrics.by_industry} />
            </div>

            {/* Presales Performance (Interactive) */}
            {metrics.by_engineer.length > 0 && (
                <Card className="p-0">
                    <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                Presales Performance
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Click a pre-sales engineer to focus dashboard data
                            </p>
                        </div>
                        {activeEngineer && (
                            <button
                                type="button"
                                onClick={() => setFilters({ ...filters, engineer_name: undefined, engineer_id: undefined })}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:underline font-medium"
                            >
                                Reset Filter
                            </button>
                        )}
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {metrics.by_engineer.map((eng) => {
                            const isSelected = activeEngineer === eng.engineer_name;
                            return (
                                <button
                                    key={eng.engineer_id}
                                    type="button"
                                    onClick={() => {
                                        setFilters({
                                            ...filters,
                                            engineer_name: isSelected ? undefined : eng.engineer_name,
                                            engineer_id: undefined,
                                        });
                                    }}
                                    className={`w-full p-4 flex items-center justify-between text-left transition-colors ${
                                        isSelected
                                            ? "bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600 dark:border-blue-400"
                                            : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`w-2 h-2 rounded-full ${
                                                isSelected
                                                    ? "bg-blue-600 dark:bg-blue-400 ring-2 ring-blue-400/30"
                                                    : "bg-zinc-300 dark:bg-zinc-700"
                                            }`}
                                        />
                                        <div>
                                            <p
                                                className={`text-sm ${
                                                    isSelected
                                                        ? "font-semibold text-blue-900 dark:text-blue-100"
                                                        : "font-medium text-zinc-900 dark:text-zinc-100"
                                                }`}
                                            >
                                                {eng.engineer_name}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 ml-1">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span
                                            className={`text-sm ${
                                                isSelected
                                                    ? "font-semibold text-blue-700 dark:text-blue-300"
                                                    : "text-zinc-500 dark:text-zinc-400"
                                            }`}
                                        >
                                            {eng.count} opportunities
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-0">
                        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                Recent Opportunities
                            </h2>
                            <a
                                href={activeEngineer ? `/opportunities?assigned_engineer=${encodeURIComponent(activeEngineer)}` : "/opportunities"}
                                className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            >
                                View All
                            </a>
                        </div>
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {metrics.recent_opportunities.slice(0, 5).length === 0 ? (
                                <div className="p-8 text-center text-zinc-400 dark:text-zinc-500 text-sm">
                                    No opportunities found
                                </div>
                            ) : (
                                metrics.recent_opportunities.slice(0, 5).map((opp) => (
                                    <a
                                        key={opp.id}
                                        href={`/opportunities/${opp.id}`}
                                        className="p-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors block"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                {opp.company_name}
                                            </p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                {opp.id.slice(0, 8)}... • {opp.engineer_name || "Unassigned"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${statusStyles[opp.status] || statusStyles.New}`}
                                            >
                                                {opp.status}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                                        </div>
                                    </a>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-0">
                        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                Upcoming Meetings
                            </h2>
                        </div>
                        <div className="p-5 space-y-4">
                            {metrics.upcoming_meetings.length === 0 ? (
                                <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center">
                                    No upcoming meetings
                                </p>
                            ) : (
                                metrics.upcoming_meetings.map((meeting) => {
                                    const meetingDate = parseISO(meeting.meeting_schedule);
                                    return (
                                        <a
                                            key={meeting.opportunity_id}
                                            href={`/opportunities/${meeting.opportunity_id}`}
                                            className="flex gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 -mx-2 px-2 py-1 rounded transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center shrink-0">
                                                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                                                    {format(meetingDate, "MMM")}
                                                </span>
                                                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-none">
                                                    {format(meetingDate, "d")}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                    {meeting.company_name}
                                                </p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                    {format(meetingDate, "h:mm a")}
                                                </p>
                                            </div>
                                        </a>
                                    );
                                })
                            )}
                        </div>
                    </Card>
                </div>
            </div>
            </div>
        </div>
    );
}