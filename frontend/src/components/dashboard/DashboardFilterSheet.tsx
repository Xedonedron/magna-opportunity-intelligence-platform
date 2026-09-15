"use client";

import { X, Filter, Check } from "lucide-react";
import type { DashboardFilters as Filters } from "@/lib/api/dashboard";
import { Button } from "@/components/ui/Button";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentFilters: Filters;
    onFilterChange: (f: Filters) => void;
    onReset: () => void;
    activePresales?: string;
    presalesList: string[];
    statusOptions: string[];
    activeCount: number;
}

export function DashboardFilterSheet({
    isOpen,
    onClose,
    currentFilters,
    onFilterChange,
    onReset,
    activePresales,
    presalesList,
    statusOptions,
    activeCount,
}: Props) {
    if (!isOpen) return null;

    return (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />
            <div className="relative w-full bg-white dark:bg-zinc-900 rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 max-h-[85vh] flex flex-col z-10 shadow-2xl animate-in slide-in-from-bottom duration-200">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 mx-auto mb-3" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">Filter & Periode</h3>
                            {activeCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                                    {activeCount}
                                </span>
                            )}
                        </div>
                        <button onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-4 overflow-y-auto space-y-4 flex-1">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">Pre-Sales</label>
                        <select
                            value={activePresales || ""}
                            onChange={(e) => onFilterChange({ ...currentFilters, engineer_name: e.target.value || undefined, engineer_id: undefined })}
                            className="h-11 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 text-base outline-none"
                        >
                            <option value="">Semua Pre-Sales</option>
                            {presalesList.map((n) => (<option key={n} value={n}>{n}</option>))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">Status</label>
                        <select
                            value={currentFilters.status || ""}
                            onChange={(e) => onFilterChange({ ...currentFilters, status: e.target.value || undefined })}
                            className="h-11 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3 text-base outline-none"
                        >
                            <option value="">Semua Status</option>
                            {statusOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                        </select>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Periode Tanggal</label>
                        <input
                            type="date"
                            value={currentFilters.date_from || ""}
                            onChange={(e) => onFilterChange({ ...currentFilters, date_from: e.target.value || undefined })}
                            className="h-11 w-full text-base border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 outline-none"
                        />
                        <input
                            type="date"
                            value={currentFilters.date_to || ""}
                            onChange={(e) => onFilterChange({ ...currentFilters, date_to: e.target.value || undefined })}
                            className="h-11 w-full text-base border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-3 outline-none"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
                    {activeCount > 0 && (
                        <Button variant="outline" onClick={onReset} className="flex-1 min-h-[44px]">Reset</Button>
                    )}
                    <Button onClick={onClose} className="flex-1 min-h-[44px] gap-1.5">
                        <Check className="w-4 h-4" /> Terapkan
                    </Button>
                </div>
            </div>
        </div>
    );
}
