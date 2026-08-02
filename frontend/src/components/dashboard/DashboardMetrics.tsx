import { TrendingUp, Calendar, AlertCircle, Activity, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";

interface DashboardMetricsProps {
    totalOpportunities: number;
    totalPotentialRevenue?: number;
    meetingsToday: number;
    kycRunning: number;
    needFollowUp: number;
    wonRate: number;
    activeCount: number;
    userRole: string;
}

export function DashboardMetrics({
    totalOpportunities,
    totalPotentialRevenue = 0,
    meetingsToday,
    needFollowUp,
    activeCount,
    userRole,
}: Omit<DashboardMetricsProps, "wonRate" | "kycRunning">) {
    const isEngineer = userRole === "engineer";

    const metrics = [
        {
            label: "Total Opportunities",
            value: totalOpportunities,
            icon: TrendingUp,
            description: "All opportunities",
        },
        {
            label: "Potential Pipeline Value",
            value: isEngineer ? "••••••••" : formatCurrency(totalPotentialRevenue),
            icon: DollarSign,
            description: isEngineer ? "Hidden for engineer" : "Total potential revenue",
        },
        {
            label: "Active Pipelines",
            value: activeCount,
            icon: Activity,
            description: "Excludes won/lost",
        },
        {
            label: "Meetings Today",
            value: meetingsToday,
            icon: Calendar,
            description: "Scheduled today",
        },
        {
            label: "Need Follow Up",
            value: needFollowUp,
            icon: AlertCircle,
            description: "Requires attention",
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {metrics.map((metric, i) => (
                <Card key={i} className="p-4 shadow-sm hover:shadow transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{metric.label}</p>
                        <metric.icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-lg font-bold tracking-tight text-zinc-900 truncate">
                            {metric.value}
                        </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 font-medium leading-none truncate">{metric.description}</p>
                </Card>
            ))}
        </div>
    );
}