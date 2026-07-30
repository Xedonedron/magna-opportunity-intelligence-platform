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

interface ProductDistributionChartProps {
    data: ProductCount[];
}

const COLORS = ["#4285F4", "#AB47BC", "#0F9D58", "#F4B400", "#FF7043", "#00ACC1", "#78909C"];

export function ProductDistributionChart({ data }: ProductDistributionChartProps) {
    if (!data || data.length === 0) {
        return (
            <Card className="p-5">
                <h3 className="text-sm font-semibold text-zinc-900 mb-4">
                    Product Distribution
                </h3>
                <div className="h-64 flex items-center justify-center text-zinc-400 text-sm">
                    No product data available
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
        <Card className="p-5 shadow-sm border border-zinc-200">
            <h3 className="text-sm font-semibold text-zinc-900 mb-4">
                Product Distribution
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={3}
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
            <div className="flex flex-wrap gap-2.5 mt-4">
                {chartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5 text-xs">
                        <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-zinc-600 font-medium">{item.name}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}
