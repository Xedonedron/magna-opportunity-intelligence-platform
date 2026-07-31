"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/Card";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { SolutionDistributionChart } from "@/components/dashboard/SolutionDistributionChart";
import { IndustryDistributionChart } from "@/components/dashboard/IndustryDistributionChart";
import { getDashboardMetrics, type DashboardFilters as Filters } from "@/lib/api/dashboard";
import type { DashboardMetrics as Metrics } from "@/types/dashboard";

const statusStyles: Record<string, string> = {
    New: "bg-blue-50 text-blue-700 ring-blue-600/20",
    "KYC Running": "bg-orange-50 text-orange-700 ring-orange-600/20",
    "Ready Meeting": "bg-purple-50 text-purple-700 ring-purple-600/20",
    "Meeting Scheduled": "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
    "Meeting Done": "bg-slate-50 text-slate-700 ring-slate-600/20",
    "Need Proposal": "bg-yellow-50 text-yellow-800 ring-yellow-600/20",
    Negotiation: "bg-pink-50 text-pink-700 ring-pink-600/20",
    PO: "bg-green-50 text-green-700 ring-green-600/20",
    Won: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Lost: "bg-red-50 text-red-700 ring-red-600/20",
    "On Hold": "bg-gray-50 text-gray-700 ring-gray-600/20",
};

export default function DashboardPage() {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [filters, setFilters] = useState<Filters>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchMetrics() {
            setLoading(true);
            setError(null);
            try {
                const data = await getDashboardMetrics(filters);
                setMetrics(data);
            } catch (err) {
                setError("Failed to load dashboard data");
                console.error(err);
            } finally {
                setLoading(false);
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

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
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
            <div className="p-8 max-w-7xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                    {error || "Unable to load dashboard"}
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-zinc-900">
                    {getGreeting()}
                </h1>
                <p className="text-zinc-500 text-sm mt-1">
                    {metrics.filtered_by_user
                        ? `Showing data for your role: ${getRoleLabel(metrics.user_role)}`
                        : "Here is what's happening with your pipeline today."}
                </p>
            </div>

            <DashboardMetrics
                totalOpportunities={metrics.total_opportunities}
                meetingsToday={metrics.meetings_today}
                needFollowUp={metrics.need_follow_up}
                activeCount={metrics.active_count}
                userRole={metrics.user_role}
            />

            <DashboardFilters
                onFilterChange={setFilters}
                userRole={metrics.user_role}
                currentFilters={filters}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StatusChart data={metrics.by_status} />
                <TrendChart data={metrics.trend_data} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SolutionDistributionChart data={metrics.by_product} />
                <IndustryDistributionChart data={metrics.by_industry} />
            </div>

            {/* Engineer Performance (admin/manager only) */}
            {metrics.by_engineer.length > 0 && (
                <Card className="p-0">
                    <div className="px-5 py-4 border-b border-zinc-100">
                        <h2 className="text-sm font-semibold text-zinc-900">
                            Presales Performance
                        </h2>
                    </div>
                    <div className="divide-y divide-zinc-100">
                        {metrics.by_engineer.map((eng) => (
                            <div
                                key={eng.engineer_id}
                                className="p-4 flex items-center justify-between hover:bg-zinc-50/50"
                            >
                                <div>
                                    <p className="text-sm font-medium text-zinc-900">
                                        {eng.engineer_name}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-zinc-500">
                                        {eng.count} opportunities
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-0">
                        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-zinc-900">
                                Recent Opportunities
                            </h2>
                            <a
                                href="/opportunities"
                                className="text-sm text-zinc-500 hover:text-zinc-900"
                            >
                                View All
                            </a>
                        </div>
                        <div className="divide-y divide-zinc-100">
                            {metrics.recent_opportunities.length === 0 ? (
                                <div className="p-8 text-center text-zinc-400 text-sm">
                                    No opportunities found
                                </div>
                            ) : (
                                metrics.recent_opportunities.map((opp) => (
                                    <a
                                        key={opp.id}
                                        href={`/opportunities/${opp.id}`}
                                        className="p-4 flex items-center justify-between hover:bg-zinc-50/50 cursor-pointer transition-colors block"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900">
                                                {opp.company_name}
                                            </p>
                                            <p className="text-xs text-zinc-500 mt-0.5">
                                                {opp.id.slice(0, 8)}... • {opp.engineer_name || "Unassigned"}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${statusStyles[opp.status] || statusStyles.New}`}
                                            >
                                                {opp.status}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-zinc-400" />
                                        </div>
                                    </a>
                                ))
                            )}
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-0">
                        <div className="px-5 py-4 border-b border-zinc-100">
                            <h2 className="text-sm font-semibold text-zinc-900">
                                Upcoming Meetings
                            </h2>
                        </div>
                        <div className="p-5 space-y-4">
                            {metrics.upcoming_meetings.length === 0 ? (
                                <p className="text-sm text-zinc-400 text-center">
                                    No upcoming meetings
                                </p>
                            ) : (
                                metrics.upcoming_meetings.map((meeting) => {
                                    const meetingDate = parseISO(meeting.meeting_schedule);
                                    return (
                                        <a
                                            key={meeting.opportunity_id}
                                            href={`/opportunities/${meeting.opportunity_id}`}
                                            className="flex gap-4 hover:bg-zinc-50 -mx-2 px-2 py-1 rounded transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex flex-col items-center justify-center shrink-0">
                                                <span className="text-[10px] font-semibold text-zinc-500 uppercase">
                                                    {format(meetingDate, "MMM")}
                                                </span>
                                                <span className="text-sm font-bold text-zinc-900 leading-none">
                                                    {format(meetingDate, "d")}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-zinc-900">
                                                    {meeting.company_name}
                                                </p>
                                                <p className="text-xs text-zinc-500 mt-0.5">
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
    );
}