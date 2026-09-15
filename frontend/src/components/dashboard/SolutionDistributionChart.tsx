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

    const chartData = data.map((item, index) => ({
        name: item.product === "None" ? "Belum Ditentukan" : item.product,
        value: item.count,
        color: COLORS[index % COLORS.length],
    }));

    return (
        <Card className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 sm:mb-4">
                Solution Distribution
            </h3>
            <div className="h-[240px] md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={2}
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
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
