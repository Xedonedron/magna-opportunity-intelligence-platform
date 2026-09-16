"use client";

import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { Card } from "@/components/ui/Card";
import type { ProductCount } from "@/types/dashboard";

interface SolutionDistributionChartProps {
    data: ProductCount[];
}

const COLORS = ["#4285F4", "#AB47BC", "#0F9D58", "#F4B400", "#FF7043", "#00ACC1", "#78909C"];

export function SolutionDistributionChart({ data }: SolutionDistributionChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Solution Distribution
                </h3>
                <div className="h-64 flex items-center justify-center text-zinc-400 text-sm">
                    No solution data available
                </div>
            </Card>
        );
    }

    // Sort data descending by count
    const sortedData = [...data].sort((a, b) => b.count - a.count);

    let chartData: { name: string; value: number; color: string }[] = [];

    if (sortedData.length <= 5) {
        chartData = sortedData.map((item, index) => ({
            name: item.product === "None" ? "Belum Ditentukan" : item.product,
            value: item.count,
            color: COLORS[index % COLORS.length],
        }));
    } else {
        const top4 = sortedData.slice(0, 4);
        const othersCount = sortedData.slice(4).reduce((sum, item) => sum + item.count, 0);

        chartData = top4.map((item, index) => ({
            name: item.product === "None" ? "Belum Ditentukan" : item.product,
            value: item.count,
            color: COLORS[index % COLORS.length],
        }));

        if (othersCount > 0) {
            chartData.push({
                name: "Others",
                value: othersCount,
                color: "#94A3B8",
            });
        }
    }

    return (
        <Card className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 sm:mb-4">
                Solution Distribution
            </h3>
            <div className="h-[240px] md:h-64 outline-none focus:outline-none">
                <ResponsiveContainer width="100%" height="100%" className="outline-none focus:outline-none">
                    <PieChart className="outline-none focus:outline-none" style={{ outline: "none" }}>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={2}
                            dataKey="value"
                            className="outline-none focus:outline-none"
                            style={{ outline: "none" }}
                        >
                            {chartData.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    className="outline-none focus:outline-none"
                                    style={{ outline: "none" }}
                                />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#18181b",
                                borderColor: "#27272a",
                                borderRadius: "8px",
                                fontSize: "12px",
                                color: "#f4f4f5",
                            }}
                            itemStyle={{ color: "#f4f4f5" }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 sm:mt-4 max-h-24 overflow-y-auto">
                {chartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                        <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-zinc-600 dark:text-zinc-400 truncate">
                            {item.name} ({item.value})
                        </span>
                    </div>
                ))}
            </div>
        </Card>
    );
}
