import { TrendingUp, Calendar, AlertCircle, Activity, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
            key: "revenue",
            label: "Potential Pipeline Value",
            value: isEngineer ? "••••••••" : formatCurrency(totalPotentialRevenue),
            icon: DollarSign,
            description: isEngineer ? "Hidden for engineer" : "Total potential revenue",
            isPrimary: true,
        },
        {
            key: "total",
            label: "Total Opportunities",
            value: totalOpportunities,
            icon: TrendingUp,
            description: "All opportunities",
            isPrimary: false,
        },
        {
            key: "active",
            label: "Active Pipelines",
            value: activeCount,
            icon: Activity,
            description: "Excludes won/lost",
            isPrimary: false,
        },
        {
            key: "meetings",
            label: "Meetings Today",
            value: meetingsToday,
            icon: Calendar,
            description: "Scheduled today",
            isPrimary: false,
        },
        {
            key: "followup",
            label: "Need Follow Up",
            value: needFollowUp,
            icon: AlertCircle,
            description: "Requires attention",
            isPrimary: false,
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
            {metrics.map((metric) => (
                <Card
                    key={metric.key}
                    className={cn(
                        "p-3.5 sm:p-4 shadow-sm hover:shadow transition-all active:scale-[0.99]",
                        metric.isPrimary && "col-span-2 md:col-span-1 bg-gradient-to-br from-zinc-100/70 via-white to-white dark:from-zinc-800/50 dark:via-zinc-900 dark:to-zinc-900 border-zinc-300 dark:border-zinc-700"
                    )}
                >
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            {metric.label}
                        </p>
                        <metric.icon className={cn(
                            "w-4 h-4 shrink-0",
                            metric.isPrimary ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
                        )} />
                    </div>
                    <div className="mt-1.5 sm:mt-2 flex items-baseline gap-2">
                        <span className={cn(
                            "font-bold tracking-tight text-zinc-900 dark:text-zinc-100 truncate",
                            metric.isPrimary ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"
                        )}>
                            {metric.value}
                        </span>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium leading-none truncate">
                        {metric.description}
                    </p>
                </Card>
            ))}
        </div>
    );
}
