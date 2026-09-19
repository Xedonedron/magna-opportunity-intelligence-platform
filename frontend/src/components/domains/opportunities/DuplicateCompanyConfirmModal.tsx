"use client";

import { Building2, Sparkles, FolderPlus, ArrowRight, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Company } from "@/types/company";

interface DuplicateCompanyConfirmModalProps {
    isOpen: boolean;
    queryName: string;
    matchedCompany: Company;
    similarityScore: number;
    onConfirmLink: () => void;
    onConfirmNew: () => void;
    onCancel: () => void;
}

export function DuplicateCompanyConfirmModal({
    isOpen,
    queryName,
    matchedCompany,
    similarityScore,
    onConfirmLink,
    onConfirmNew,
    onCancel,
}: DuplicateCompanyConfirmModalProps) {
    if (!isOpen) return null;

    const matchPercent = Math.round(similarityScore * 100);

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-8">
                {/* Header */}
                <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                                Perusahaan Serupa Terdeteksi
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Kemiripan nama entitas terdeteksi ({matchPercent}% match).
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 text-sm">
                    <p className="text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm">
                        Anda menginput <span className="font-semibold text-zinc-900 dark:text-zinc-100">&quot;{queryName}&quot;</span>. Sistem mendeteksi folder perusahaan serupa yang sudah terdaftar di database:
                    </p>

                    {/* Comparison Card */}
                    <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                                    <span>{matchedCompany.name}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                                        {matchedCompany.opportunities_count} Deal{matchedCompany.opportunities_count !== 1 ? "s" : ""}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    {matchedCompany.industry && <span>Industri: {matchedCompany.industry}</span>}
                                    {matchedCompany.website && (
                                        <span>• {matchedCompany.website.replace(/^https?:\/\//, "")}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-indigo-100 dark:border-indigo-800/40 flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                            <Sparkles className="w-4 h-4 shrink-0 text-indigo-500" />
                            <span>Menautkan ke folder ini mewarisi Company Profile & menghemat ~50% token KYC.</span>
                        </div>
                    </div>

                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60 flex items-start gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <AlertCircle className="w-4 h-4 shrink-0 text-zinc-400 mt-0.5" />
                        <span>
                            Apakah opportunity baru ini ditujukan untuk entitas perusahaan di atas, atau merupakan perusahaan yang sepenuhnya berbeda secara hukum?
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onCancel}
                        className="w-full sm:w-auto text-xs"
                    >
                        Batal & Edit Nama
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onConfirmNew}
                        className="w-full sm:w-auto text-xs border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
                        Bukan, Buat Folder Baru
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={onConfirmLink}
                        className="w-full sm:w-auto text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                        Ya, Masukkan ke Folder Ini
                    </Button>
                </div>
            </div>
        </div>
    );
}
