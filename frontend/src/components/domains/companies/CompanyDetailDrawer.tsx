"use client";

import { useState, useEffect } from "react";
import { X, Building2, Globe, Users, Sparkles, ExternalLink, Layers } from "lucide-react";
import { CompanyKYCSummaryTab } from "./CompanyKYCSummaryTab";
import { StakeholdersTab } from "@/components/domains/stakeholders/StakeholdersTab";
import type { Company } from "@/types/company";

interface CompanyDetailDrawerProps {
    company: Company | null;
    isOpen: boolean;
    onClose: () => void;
    canEdit?: boolean;
}

export function CompanyDetailDrawer({
    company,
    isOpen,
    onClose,
    canEdit = true,
}: CompanyDetailDrawerProps) {
    const [activeTab, setActiveTab] = useState<"kyc" | "stakeholders">("kyc");

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !company) return null;

    return (
        <div
            className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl bg-white dark:bg-zinc-900 h-full flex flex-col shadow-2xl border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/60 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-lg shrink-0 mt-0.5">
                            {company.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {company.name}
                            </h2>
                            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex-wrap">
                                {company.website && (
                                    <a
                                        href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                                    >
                                        <Globe className="w-3.5 h-3.5" />
                                        <span>{company.website.replace(/^https?:\/\//, "")}</span>
                                        <ExternalLink className="w-3 h-3 opacity-60" />
                                    </a>
                                )}
                                {company.industry && (
                                    <span className="inline-flex items-center gap-1">
                                        <Building2 className="w-3.5 h-3.5" />
                                        <span>{company.industry}</span>
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1">
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>{company.opportunities_count} Opportunities</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors shrink-0"
                        title="Tutup (Esc)"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-6 bg-white dark:bg-zinc-900">
                    <button
                        onClick={() => setActiveTab("kyc")}
                        className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === "kyc"
                                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                    >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>KYC Intelligence</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("stakeholders")}
                        className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                            activeTab === "stakeholders"
                                ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                        }`}
                    >
                        <Users className="w-4 h-4 text-blue-500" />
                        <span>Stakeholder Directory</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === "kyc" && (
                        <CompanyKYCSummaryTab companyId={company.id} />
                    )}

                    {activeTab === "stakeholders" && (
                        <StakeholdersTab
                            companyId={company.id}
                            companyName={company.name}
                            canEdit={canEdit}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
