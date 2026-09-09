"use client";

import { useState, useEffect } from "react";
import { Filter, X, UserCheck } from "lucide-react";
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

    const handleStatusChange = (status: string) => {
        onFilterChange({
            ...currentFilters,
            status: status === currentFilters.status ? undefined : status,
        });
    };

    const handlePresalesChange = (name?: string) => {
        onFilterChange({
            ...currentFilters,
            engineer_name: name === activePresales ? undefined : name,
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
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-colors">
            <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
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

                    {activePresales && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 animate-in fade-in duration-200">
                            <UserCheck className="w-3 h-3" />
                            Pre-Sales: <strong className="font-semibold">{activePresales}</strong>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handlePresalesChange(undefined);
                                }}
                                className="hover:text-blue-900 dark:hover:text-blue-100 ml-0.5 transition-colors"
                                title="Remove pre-sales filter"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}

                    {currentFilters.status && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 animate-in fade-in duration-200">
                            Status: <strong className="font-semibold">{currentFilters.status}</strong>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(currentFilters.status!);
                                }}
                                className="hover:text-zinc-900 dark:hover:text-zinc-100 ml-0.5 transition-colors"
                                title="Remove status filter"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    )}
                </div>

                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={handleClearFilters}
                        className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors"
                    >
                        <X className="w-3 h-3" />
                        Clear all
                    </button>
                )}
            </div>

            {isExpanded && (
                <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4 pt-3">
                    {/* Pre-Sales Filter */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                                Pre-Sales / Engineer
                            </label>
                            {activePresales && (
                                <button
                                    type="button"
                                    onClick={() => handlePresalesChange(undefined)}
                                    className="text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
                                >
                                    Reset Pre-Sales
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                onClick={() => handlePresalesChange(undefined)}
                                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                                    !activePresales
                                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold"
                                        : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                                }`}
                            >
                                All Pre-Sales
                            </button>
                            {presalesList.map((name) => (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => handlePresalesChange(name)}
                                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                                        activePresales === name
                                            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold"
                                            : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                                    }`}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                                Status
                            </label>
                            {currentFilters.status && (
                                <button
                                    type="button"
                                    onClick={() => handleStatusChange(currentFilters.status!)}
                                    className="text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 underline"
                                >
                                    Reset Status
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {STATUS_OPTIONS.map((status) => (
                                <button
                                    key={status}
                                    type="button"
                                    onClick={() => handleStatusChange(status)}
                                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                                        currentFilters.status === status
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
                </div>
            )}
        </div>
    );
}