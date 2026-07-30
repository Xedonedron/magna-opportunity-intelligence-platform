import { TrendingUp, Calendar, Loader2, AlertCircle, Award, Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface DashboardMetricsProps {
    totalOpportunities: number;
    meetingsToday: number;
    kycRunning: number;
    needFollowUp: number;
    wonRate: number;
    activeCount: number;
    userRole: string;
}

export function DashboardMetrics({
    totalOpportunities,
    meetingsToday,
    kycRunning,
    needFollowUp,
    wonRate,
    activeCount,
    userRole,
}: DashboardMetricsProps) {
    const metrics = [
        {
            label: "Total Opportunities",
            value: totalOpportunities,
            icon: TrendingUp,
            description: userRole === "lgo"
                ? "Created by you"
                : userRole === "engineer"
                    ? "Assigned to you"
                    : "All opportunities",
        },
        {
            label: "Active Pipelines",
            value: activeCount,
            icon: Activity,
            description: "Excludes won/lost",
        },
        {
            label: "Won Rate",
            value: `${(wonRate || 0).toFixed(1)}%`,
            icon: Award,
            description: "Won / (Won + Lost)",
        },
        {
            label: "Meetings Today",
            value: meetingsToday,
            icon: Calendar,
            description: "Scheduled today",
        },
        {
            label: "KYC Running",
            value: kycRunning,
            icon: Loader2,
            description: "In progress",
        },
        {
            label: "Need Follow Up",
            value: needFollowUp,
            icon: AlertCircle,
            description: "Requires attention",
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {metrics.map((metric, i) => (
                <Card key={i} className="p-4 shadow-sm hover:shadow transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{metric.label}</p>
                        <metric.icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-xl font-bold tracking-tight text-zinc-900">
                            {metric.value}
                        </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 font-medium leading-none truncate">{metric.description}</p>
                </Card>
            ))}
        </div>
    );
}