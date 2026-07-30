"use client";

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { StatusCount } from "@/types/dashboard";

interface StatusChartProps {
    data: StatusCount[];
}

const STATUS_COLORS: Record<string, string> = {
    New: "#3b82f6",
    "KYC Running": "#f97316",
    "Ready Meeting": "#8b5cf6",
    "Meeting Scheduled": "#06b6d4",
    "Meeting Done": "#64748b",
    "Need Proposal": "#eab308",
    Negotiation: "#ec4899",
    PO: "#22c55e",
    Won: "#10b981",
    Lost: "#ef4444",
    "On Hold": "#6b7280",
};

export function StatusChart({ data }: StatusChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-zinc-900 mb-4">
                    Status Distribution
                </h3>
                <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">
                    No data available
                </div>
            </Card>
        );
    }

    const chartData = data.map((item) => ({
        name: item.status,
        value: item.count,
        color: STATUS_COLORS[item.status] || "#94a3b8",
    }));

    return (
        <Card className="p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4">
                Status Distribution
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                            labelLine={false}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "white",
                                border: "1px solid #e4e4e7",
                                borderRadius: "6px",
                                fontSize: "12px",
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
                {chartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-zinc-600">{item.name}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}