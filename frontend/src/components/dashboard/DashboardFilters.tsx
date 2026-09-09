"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import type { DashboardFilters as Filters } from "@/lib/api/dashboard";

interface DashboardFiltersProps {
    onFilterChange: (filters: Filters) => void;
    userRole: string;
    currentFilters: Filters;
}

const STATUS_OPTIONS = [
    "New",
    "KYC Running",
    "Ready Meeting",
    "Meeting Scheduled",
    "Meeting Done",
    "Need Proposal",
    "Negotiation",
    "PO",
    "Won",
    "Lost",
    "On Hold",
];

export function DashboardFilters({
    onFilterChange,
    userRole,
    currentFilters,
}: DashboardFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const canFilterByEngineer = userRole === "admin" || userRole === "manager";

    const handleStatusChange = (status: string) => {
        onFilterChange({
            ...currentFilters,
            status: status === currentFilters.status ? undefined : status,
        });
    };

    const handleClearFilters = () => {
        onFilterChange({});
    };

    const hasActiveFilters =
        currentFilters.status || currentFilters.engineer_id || currentFilters.date_from || currentFilters.date_to;

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-colors">
            <div className="px-4 py-3 flex items-center justify-between">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                    <Filter className="w-4 h-4" />
                    Filters
                    {hasActiveFilters && (
                        <span className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs px-1.5 py-0.5 rounded font-medium">
                            Active
                        </span>
                    )}
                </button>
                {hasActiveFilters && (
                    <button
                        onClick={handleClearFilters}
                        className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Clear all
                    </button>
                )}
            </div>

            {isExpanded && (
                <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                    {/* Status Filter */}
                    <div>
                        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
                            Status
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {STATUS_OPTIONS.map((status) => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusChange(status)}
                                    className={`text-xs px-2 py-1 rounded border transition-colors ${currentFilters.status === status
                                            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold"
                                            : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
                                From
                            </label>
                            <input
                                type="date"
                                value={currentFilters.date_from || ""}
                                onChange={(e) =>
                                    onFilterChange({
                                        ...currentFilters,
                                        date_from: e.target.value || undefined,
                                    })
                                }
                                className="w-full text-sm border border-zinc-200 dark:border-zinc-700 bg-transparent dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-400/20 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
                                To
                            </label>
                            <input
                                type="date"
                                value={currentFilters.date_to || ""}
                                onChange={(e) =>
                                    onFilterChange({
                                        ...currentFilters,
                                        date_to: e.target.value || undefined,
                                    })
                                }
                                className="w-full text-sm border border-zinc-200 dark:border-zinc-700 bg-transparent dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-400/20 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Engineer Filter (admin/manager only) */}
                    {canFilterByEngineer && (
                        <div>
                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
                                Engineer (optional)
                            </label>
                            <input
                                type="text"
                                placeholder="Engineer ID..."
                                value={currentFilters.engineer_id || ""}
                                onChange={(e) =>
                                    onFilterChange({
                                        ...currentFilters,
                                        engineer_id: e.target.value || undefined,
                                    })
                                }
                                className="w-full text-sm border border-zinc-200 dark:border-zinc-700 bg-transparent dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-400/20 transition-colors"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}