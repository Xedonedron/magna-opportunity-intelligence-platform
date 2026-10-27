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
import { STATUS_STYLES, type OpportunityStatus } from "@/types/opportunity";
import { usePageTitle } from "@/hooks/use-page-title";

export default function DashboardPage() {
    usePageTitle("Dashboard");
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
                    <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !metrics) {
        return (
            <div className="p-4 sm:p-8 max-w-7xl mx-auto">
                <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg p-4 text-red-700 dark:text-red-300">
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 sm:px-4 sm:py-2 text-sm text-zinc-900 dark:text-zinc-100 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-zinc-600 dark:text-zinc-400">Menampilkan analitik khusus Pre-Sales:</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 px-2.5 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-700">
                            {activeEngineer}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFilters({ ...filters, engineer_name: undefined, engineer_id: undefined })}
                        className="text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium underline transition-colors"
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

            <PipelineFunnelChart 
                data={metrics.by_status} 
                wonRate={metrics.won_rate} 
            />

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
                                className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline font-medium"
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
                                            ? "bg-zinc-100/80 dark:bg-zinc-800/60 border-l-4 border-zinc-900 dark:border-zinc-100"
                                            : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40"
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className={`w-2 h-2 rounded-full ${
                                                isSelected
                                                    ? "bg-zinc-900 dark:bg-zinc-100 ring-2 ring-zinc-400/30"
                                                    : "bg-zinc-300 dark:bg-zinc-700"
                                            }`}
                                        />
                                        <div>
                                            <p
                                                className={`text-sm ${
                                                    isSelected
                                                        ? "font-semibold text-zinc-900 dark:text-zinc-100"
                                                        : "font-medium text-zinc-900 dark:text-zinc-100"
                                                }`}
                                            >
                                                {eng.engineer_name}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 ml-1">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span
                                            className={`text-sm ${
                                                isSelected
                                                    ? "font-semibold text-zinc-900 dark:text-zinc-100"
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
                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${STATUS_STYLES[opp.status as OpportunityStatus] || STATUS_STYLES.New}`}
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