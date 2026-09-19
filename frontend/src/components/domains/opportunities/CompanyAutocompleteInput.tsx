"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Building2, FolderCheck, X, Check, Search, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { useCompanies } from "@/hooks/use-companies";
import type { Company } from "@/types/company";
import { cn } from "@/lib/utils";

interface CompanyAutocompleteInputProps {
    value: string;
    onChange: (val: string) => void;
    selectedCompany: Company | null;
    onSelectCompany: (company: Company) => void;
    onClearCompany: () => void;
    error?: string;
    required?: boolean;
    disabled?: boolean;
}

export function CompanyAutocompleteInput({
    value,
    onChange,
    selectedCompany,
    onSelectCompany,
    onClearCompany,
    error,
    required,
    disabled,
}: CompanyAutocompleteInputProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Debounce query
    const [debouncedQuery, setDebouncedQuery] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(value);
        }, 250);
        return () => clearTimeout(timer);
    }, [value]);

    const { data: companiesData, isLoading } = useCompanies({
        search: debouncedQuery.trim().length >= 2 ? debouncedQuery.trim() : undefined,
        page_size: 8,
    });

    const suggestions = useMemo(() => {
        if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) return [];
        return companiesData?.items || [];
    }, [companiesData, debouncedQuery]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (company: Company) => {
        onSelectCompany(company);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || suggestions.length === 0) {
            if (e.key === "ArrowDown" && suggestions.length > 0) {
                setIsOpen(true);
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        } else if (e.key === "Enter" && highlightedIndex >= 0) {
            e.preventDefault();
            handleSelect(suggestions[highlightedIndex]);
        } else if (e.key === "Escape") {
            setIsOpen(false);
            setHighlightedIndex(-1);
        }
    };

    // Scroll highlighted into view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.children;
            if (items[highlightedIndex]) {
                (items[highlightedIndex] as HTMLElement).scrollIntoView({
                    block: "nearest",
                });
            }
        }
    }, [highlightedIndex]);

    return (
        <div ref={containerRef} className="space-y-2 w-full">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Company Name {required && <span className="text-red-500">*</span>}
            </label>

            {/* Selected Company Banner / Badge */}
            {selectedCompany ? (
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg flex items-start justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                            <FolderCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">
                                    {selectedCompany.name}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">
                                    {selectedCompany.opportunities_count} Deal{selectedCompany.opportunities_count !== 1 ? "s" : ""}
                                </span>
                                {selectedCompany.industry && (
                                    <span className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                                        • {selectedCompany.industry}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-500" />
                                <span>Tautan folder aktif: Profil Perusahaan & Analisis Industri di-reuse (hemat kuota token KYC ~50%).</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClearCompany}
                        className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 transition-colors"
                        title="Lepas tautan folder & buat sebagai perusahaan baru"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <div className="relative flex items-center">
                        <input
                            ref={inputRef}
                            type="text"
                            value={value}
                            disabled={disabled}
                            placeholder="e.g. PT Telkom Indonesia / Danone"
                            onChange={(e) => {
                                onChange(e.target.value);
                                setIsOpen(true);
                                setHighlightedIndex(-1);
                            }}
                            onFocus={() => {
                                if (suggestions.length > 0) setIsOpen(true);
                            }}
                            onKeyDown={handleKeyDown}
                            className={cn(
                                "flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-1 pr-9 text-sm shadow-sm transition-colors text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50",
                                error && "border-red-500 focus-visible:ring-red-500"
                            )}
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Search className="w-4 h-4" />
                            )}
                        </div>
                    </div>

                    {/* Dropdown Suggestions */}
                    {isOpen && value.trim().length >= 2 && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg animate-in fade-in-50 zoom-in-95 duration-100 max-h-64 overflow-y-auto">
                            {suggestions.length > 0 ? (
                                <ul ref={listRef} className="py-1 text-sm">
                                    <li className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-100 dark:border-zinc-700/60 flex items-center justify-between">
                                        <span>Perusahaan Eksisting di Sistem</span>
                                        <span className="font-normal lowercase">Pilih untuk menghemat token KYC</span>
                                    </li>
                                    {suggestions.map((company, index) => {
                                        const isHighlighted = index === highlightedIndex;
                                        return (
                                            <li
                                                key={company.id}
                                                onClick={() => handleSelect(company)}
                                                onMouseEnter={() => setHighlightedIndex(index)}
                                                className={cn(
                                                    "px-3 py-2.5 cursor-pointer transition-colors flex items-center justify-between gap-2 border-b border-zinc-50 dark:border-zinc-800/50 last:border-none",
                                                    isHighlighted
                                                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-200"
                                                        : "hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-zinc-900 dark:text-zinc-100"
                                                )}
                                            >
                                                <div className="flex items-start gap-2 min-w-0">
                                                    <Building2 className="w-4 h-4 mt-0.5 text-zinc-400 shrink-0" />
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-xs sm:text-sm truncate">
                                                            {company.name}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                            {company.industry && <span>{company.industry}</span>}
                                                            {company.website && (
                                                                <span className="truncate max-w-[160px]">
                                                                    • {company.website.replace(/^https?:\/\//, "")}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 flex items-center gap-1.5">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                                                        {company.opportunities_count} deal{company.opportunities_count !== 1 ? "s" : ""}
                                                    </span>
                                                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                                        Pilih
                                                    </span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : !isLoading ? (
                                <div className="p-3 text-xs text-zinc-500 dark:text-zinc-400 text-center">
                                    Tidak ada folder perusahaan serupa yang cocok. Folder baru akan dibuat otomatis saat submit.
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}
