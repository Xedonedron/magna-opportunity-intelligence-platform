"use client";

import { useState, useEffect } from "react";
import { X, UserCheck, Calendar } from "lucide-react";
import type { DashboardFilters as Filters } from "@/lib/api/dashboard";
import { fetchMasterData, DEFAULT_PRESALES } from "@/lib/master-data";

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
    userRole: _userRole,
    currentFilters,
}: DashboardFiltersProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [presalesList, setPresalesList] = useState<string[]>(DEFAULT_PRESALES);

    useEffect(() => {
        fetchMasterData()
            .then((data) => {
                if (data?.presales && data.presales.length > 0) {
                    setPresalesList(data.presales);
                }
            })
            .catch((err) => console.warn("Failed to fetch master presales", err));
    }, []);

    const activePresales = currentFilters.engineer_name || currentFilters.engineer_id;

    const handleStatusChange = (status?: string) => {
        onFilterChange({
            ...currentFilters,
            status: status || undefined,
        });
    };

    const handlePresalesChange = (name?: string) => {
        onFilterChange({
            ...currentFilters,
            engineer_name: name || undefined,
            engineer_id: undefined,
        });
    };

    const handleClearFilters = () => {
        onFilterChange({});
    };

    const hasActiveFilters = Boolean(
        currentFilters.status || activePresales || currentFilters.date_from || currentFilters.date_to
    );

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Pre-Sales Dropdown */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 shrink-0">
                            <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            Pre-Sales:
                        </label>
                        <select
                            value={activePresales || ""}
                            onChange={(e) => handlePresalesChange(e.target.value || undefined)}
                            className="h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors font-medium cursor-pointer min-w-[170px]"
                        >
                            <option value="">Semua Pre-Sales</option>
                            {presalesList.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 shrink-0">
                            Status:
                        </label>
                        <select
                            value={currentFilters.status || ""}
                            onChange={(e) => handleStatusChange(e.target.value || undefined)}
                            className="h-9 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors font-medium cursor-pointer min-w-[150px]"
                        >
                            <option value="">Semua Status</option>
                            {STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`text-xs px-3 py-2 rounded-lg border flex items-center gap-1.5 font-medium transition-colors ${
                            isExpanded || currentFilters.date_from || currentFilters.date_to
                                ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100"
                                : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900"
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Periode Tanggal
                        {(currentFilters.date_from || currentFilters.date_to) && (
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                    </button>
                </div>

                {/* Clear All Reset Button */}
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={handleClearFilters}
                        className="text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors font-medium self-start sm:self-auto"
                    >
                        <X className="w-3.5 h-3.5" /> Reset Filter
                    </button>
                )}
            </div>

            {/* Collapsible Secondary Filters: Date Range */}
            {isExpanded && (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Dari:</span>
                        <input
                            type="date"
                            value={currentFilters.date_from || ""}
                            onChange={(e) =>
                                onFilterChange({
                                    ...currentFilters,
                                    date_from: e.target.value || undefined,
                                })
                            }
                            className="h-8 text-xs border border-zinc-200 dark:border-zinc-700 bg-transparent dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md px-2.5 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">Sampai:</span>
                        <input
                            type="date"
                            value={currentFilters.date_to || ""}
                            onChange={(e) =>
                                onFilterChange({
                                    ...currentFilters,
                                    date_to: e.target.value || undefined,
                                })
                            }
                            className="h-8 text-xs border border-zinc-200 dark:border-zinc-700 bg-transparent dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md px-2.5 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}