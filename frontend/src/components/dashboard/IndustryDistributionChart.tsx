"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { IndustryCount } from "@/types/dashboard";

interface IndustryDistributionChartProps {
    data: IndustryCount[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"];

export function IndustryDistributionChart({ data }: IndustryDistributionChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-zinc-900 mb-4">
                    Industry Distribution
                </h3>
                <div className="h-64 flex items-center justify-center text-zinc-400 text-sm">
                    No industry data available
                </div>
            </Card>
        );
    }

    const chartData = data.map((item, index) => ({
        name: item.industry === "None" ? "Belum Ditentukan" : item.industry,
        Opportunity: item.count,
        color: COLORS[index % COLORS.length],
    }));

    return (
        <Card className="p-5 shadow-sm border border-zinc-200">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4">
                Industry Distribution
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: "#71717a", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: "#71717a", fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip
                            cursor={{ fill: "#f4f4f5" }}
                            contentStyle={{
                                backgroundColor: "white",
                                border: "1px solid #e4e4e7",
                                borderRadius: "6px",
                                fontSize: "12px",
                            }}
                        />
                        <Bar dataKey="Opportunity" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}
