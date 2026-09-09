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
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs transition-colors">
            {/* Main Bar: Always Visible Pre-Sales Selector + Additional Filter Toggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
                {/* Pre-Sales Filter Chips - ALWAYS DIRECTLY VISIBLE */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mr-1 shrink-0">
                        <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Pre-Sales:
                    </span>

                    <button
                        type="button"
                        onClick={() => handlePresalesChange(undefined)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                            !activePresales
                                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-xs font-semibold"
                                : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                        }`}
                    >
                        Semua Pre-Sales
                    </button>

                    {presalesList.map((name) => {
                        const isSelected = activePresales === name;
                        return (
                            <button
                                key={name}
                                type="button"
                                onClick={() => handlePresalesChange(name)}
                                className={`text-xs px-3.5 py-1.5 rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
                                    isSelected
                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm font-semibold"
                                        : "bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                                }`}
                            >
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                {name}
                            </button>
                        );
                    })}
                </div>

                {/* Right Side: Advanced Filters (Status & Date) + Clear All */}
                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 font-medium transition-colors ${
                            isExpanded || currentFilters.status || currentFilters.date_from || currentFilters.date_to
                                ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100"
                                : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900"
                        }`}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        Filter Status & Tanggal
                        {(currentFilters.status || currentFilters.date_from || currentFilters.date_to) && (
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                        )}
                    </button>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleClearFilters}
                            className="text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 px-2 py-1.5 transition-colors font-medium"
                        >
                            <X className="w-3.5 h-3.5" /> Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Collapsible Secondary Filters: Status & Date Range */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                    {/* Status Filter */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                                Status Peluang
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
                                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
                                Dari Tanggal
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
                                className="w-full text-sm border border-zinc-200 dark:border-zinc-700 bg-transparent dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-400/20 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
                                Sampai Tanggal
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
                                className="w-full text-sm border border-zinc-200 dark:border-zinc-700 bg-transparent dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-400/20 transition-colors"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}