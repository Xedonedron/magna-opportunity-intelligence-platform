"use client";

import { TrendingUp, Calendar, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface DashboardMetricsProps {
    totalOpportunities: number;
    meetingsToday: number;
    kycRunning: number;
    needFollowUp: number;
    userRole: string;
}

export function DashboardMetrics({
    totalOpportunities,
    meetingsToday,
    kycRunning,
    needFollowUp,
    userRole,
}: DashboardMetricsProps) {
    const metrics = [
        {
            label: "Total Opportunities",
            value: totalOpportunities,
            icon: TrendingUp,
            description: userRole === "lgo"
                ? "Opportunities you created"
                : userRole === "engineer"
                    ? "Assigned to you"
                    : "All opportunities",
        },
        {
            label: "Meetings Today",
            value: meetingsToday,
            icon: Calendar,
            description: "Scheduled for today",
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, i) => (
                <Card key={i} className="p-5">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-zinc-500">{metric.label}</p>
                        <metric.icon className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-semibold tracking-tight text-zinc-900">
                            {metric.value}
                        </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">{metric.description}</p>
                </Card>
            ))}
        </div>
    );
}