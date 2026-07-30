"use client";

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { TrendData } from "@/types/dashboard";
import { format, parseISO } from "date-fns";

interface TrendChartProps {
    data: TrendData[];
}

export function TrendChart({ data }: TrendChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-zinc-900 mb-4">
                    30-Day Trend
                </h3>
                <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">
                    No data available
                </div>
            </Card>
        );
    }

    const chartData = data.map((item) => ({
        ...item,
        dateFormatted: format(parseISO(item.date), "MMM dd"),
    }));

    return (
        <Card className="p-5">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4">
                30-Day Trend
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorLost" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                        <XAxis
                            dataKey="dateFormatted"
                            tick={{ fontSize: 10, fill: "#71717a" }}
                            tickLine={false}
                            axisLine={false}
                            interval={6}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: "#71717a" }}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "white",
                                border: "1px solid #e4e4e7",
                                borderRadius: "6px",
                                fontSize: "12px",
                            }}
                            labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Area
                            type="monotone"
                            dataKey="new"
                            stroke="#3b82f6"
                            fillOpacity={1}
                            fill="url(#colorNew)"
                            name="New"
                        />
                        <Area
                            type="monotone"
                            dataKey="won"
                            stroke="#10b981"
                            fillOpacity={1}
                            fill="url(#colorWon)"
                            name="Won"
                        />
                        <Area
                            type="monotone"
                            dataKey="lost"
                            stroke="#ef4444"
                            fillOpacity={1}
                            fill="url(#colorLost)"
                            name="Lost"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-4 justify-center">
                <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-zinc-600">New</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-zinc-600">Won</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-zinc-600">Lost</span>
                </div>
            </div>
        </Card>
    );
}