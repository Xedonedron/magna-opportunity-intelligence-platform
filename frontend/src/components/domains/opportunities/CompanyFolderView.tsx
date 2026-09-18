"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Folder,
    FolderOpen,
    Plus,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Briefcase,
    Building2,
    DollarSign,
    User,
    Calendar,
    Loader2,
    X,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useCompanies, useCompany, useCreateCompanyOpportunity } from "@/hooks/use-companies";
import { formatCurrency, timeAgo } from "@/lib/utils";
import type { Company } from "@/types/company";
import type { Opportunity } from "@/types/opportunity";

interface CompanyFolderViewProps {
    search: string;
    engineerFilter: string;
    presalesList: string[];
    hideFinancialNumbers: boolean;
}

export function CompanyFolderView({
    search,
    engineerFilter,
    presalesList,
    hideFinancialNumbers,
}: CompanyFolderViewProps) {
    const [expandedCompanyIds, setExpandedCompanyIds] = useState<Set<string>>(new Set());
    const [modalCompany, setModalCompany] = useState<Company | null>(null);

    // Fetch companies list
    const { data: companiesData, isLoading } = useCompanies({
        search: search || undefined,
        page_size: 100,
    });

    const toggleExpand = (companyId: string) => {
        setExpandedCompanyIds((prev) => {
            const next = new Set(prev);
            if (next.has(companyId)) {
                next.delete(companyId);
            } else {
                next.add(companyId);
            }
            return next;
        });
    };

    const expandAll = () => {
        if (!companiesData?.items) return;
        setExpandedCompanyIds(new Set(companiesData.items.map((c) => c.id)));
    };

    const collapseAll = () => {
        setExpandedCompanyIds(new Set());
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-16 gap-3 text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm">Loading company folders...</p>
            </div>
        );
    }

    const companies = companiesData?.items || [];

    if (companies.length === 0) {
        return (
            <div className="text-center py-16 px-4">
                <Folder className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                    No Company Folders Found
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {search ? "No companies matched your search criteria." : "No companies available in the platform."}
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 space-y-4">
            {/* Header / Summary Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-xl">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                        {companies.length} Companies
                    </span>
                    <span className="text-zinc-400 dark:text-zinc-600">•</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Hierarchical Deal Intelligence
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={expandAll}
                        className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Expand All
                    </button>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <button
                        type="button"
                        onClick={collapseAll}
                        className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2.5 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Collapse All
                    </button>
                </div>
            </div>

            {/* Folders List */}
            <div className="space-y-3">
                {companies.map((company) => {
                    const isExpanded = expandedCompanyIds.has(company.id);
                    return (
                        <CompanyCard
                            key={company.id}
                            company={company}
                            isExpanded={isExpanded}
                            onToggle={() => toggleExpand(company.id)}
                            onAddDeal={() => setModalCompany(company)}
                            engineerFilter={engineerFilter}
                            hideFinancialNumbers={hideFinancialNumbers}
                        />
                    );
                })}
            </div>

            {/* Modal Quick Create Deal */}
            {modalCompany && (
                <CreateCompanyDealModal
                    company={modalCompany}
                    presalesList={presalesList}
                    onClose={() => setModalCompany(null)}
                />
            )}
        </div>
    );
}

function CompanyCard({
    company,
    isExpanded,
    onToggle,
    onAddDeal,
    engineerFilter,
    hideFinancialNumbers,
}: {
    company: Company;
    isExpanded: boolean;
    onToggle: () => void;
    onAddDeal: () => void;
    engineerFilter: string;
    hideFinancialNumbers: boolean;
}) {
    // Only fetch opportunities details when this card is expanded
    const { data: detailData, isLoading: isDetailLoading } = useCompany(
        isExpanded ? company.id : ""
    );

    let opportunities = detailData?.opportunities || [];
    if (engineerFilter) {
        opportunities = opportunities.filter((o) => o.assigned_engineer === engineerFilter);
    }

    const count = company.opportunities_count;

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden transition-all shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700">
            {/* Folder Header Row */}
            <div
                onClick={onToggle}
                className="p-4 flex items-center justify-between cursor-pointer select-none bg-zinc-50/40 dark:bg-zinc-800/30 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        type="button"
                        className="text-zinc-500 dark:text-zinc-400 p-1 hover:bg-zinc-200/60 dark:hover:bg-zinc-700 rounded-md transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>

                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                        {isExpanded ? (
                            <FolderOpen className="w-5 h-5" />
                        ) : (
                            <Folder className="w-5 h-5" />
                        )}
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base truncate">
                                {company.name}
                            </h3>
                            {company.industry && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                    {company.industry}
                                </span>
                            )}
                            <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    count > 1
                                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                }`}
                            >
                                {count} {count === 1 ? "Deal" : "Deals"}
                            </span>
                        </div>

                        {company.website && (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 truncate flex items-center gap-1">
                                <span>{company.website.replace(/^https?:\/\//, "")}</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={onAddDeal}
                        className="h-8 text-xs font-medium flex items-center gap-1 border border-zinc-200 dark:border-zinc-700"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>New Deal</span>
                    </Button>
                </div>
            </div>

            {/* Expanded Child Deals List */}
            {isExpanded && (
                <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-4 sm:p-5">
                    {/* Company Profile Brief */}
                    {(company.business_process || company.tech_stack) && (
                        <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                            {company.business_process && (
                                <p>
                                    <strong className="text-zinc-700 dark:text-zinc-300">
                                        Core Process:
                                    </strong>{" "}
                                    {company.business_process}
                                </p>
                            )}
                        </div>
                    )}

                    {isDetailLoading ? (
                        <div className="flex items-center justify-center p-8 gap-2 text-zinc-400 text-xs">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading deals for {company.name}...
                        </div>
                    ) : opportunities.length === 0 ? (
                        <div className="text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                            <p className="text-xs text-zinc-500">
                                {engineerFilter
                                    ? "No deals assigned to this engineer under this company."
                                    : "No deals recorded yet."}
                            </p>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={onAddDeal}
                                className="mt-2 text-xs"
                            >
                                <Plus className="w-3 h-3 mr-1" /> Add First Deal
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                            {opportunities.map((opp) => (
                                <DealRow
                                    key={opp.id}
                                    opportunity={opp}
                                    hideFinancialNumbers={hideFinancialNumbers}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function DealRow({
    opportunity,
    hideFinancialNumbers,
}: {
    opportunity: Opportunity;
    hideFinancialNumbers: boolean;
}) {
    const dealTitle =
        opportunity.product ||
        (opportunity.company_name.includes(" - ")
            ? opportunity.company_name.split(" - ").slice(1).join(" - ")
            : opportunity.customer_needs.slice(0, 60));

    return (
        <div className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 px-3 rounded-lg transition-colors group">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <Link
                        href={`/opportunities/${opportunity.id}`}
                        className="font-medium text-sm text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                    >
                        <span>{dealTitle || "Opportunity Deal"}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-zinc-400 transition-opacity" />
                    </Link>
                    <StatusBadge status={opportunity.status} />
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500 mt-1 flex-wrap">
                    {opportunity.assigned_engineer ? (
                        <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300 font-medium">
                            <User className="w-3 h-3" />
                            {opportunity.assigned_engineer}
                        </span>
                    ) : (
                        <span className="text-amber-600 dark:text-amber-400 italic">
                            Unassigned
                        </span>
                    )}

                    {!hideFinancialNumbers && opportunity.potential_revenue && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(opportunity.potential_revenue)}
                        </span>
                    )}

                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {timeAgo(opportunity.updated_at || opportunity.created_at)}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <Link href={`/opportunities/${opportunity.id}`}>
                    <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs font-medium hover:border-indigo-300 dark:hover:border-indigo-700"
                    >
                        Open KYC
                    </Button>
                </Link>
            </div>
        </div>
    );
}

function CreateCompanyDealModal({
    company,
    presalesList,
    onClose,
}: {
    company: Company;
    presalesList: string[];
    onClose: () => void;
}) {
    const createMutation = useCreateCompanyOpportunity();
    const [dealTitle, setDealTitle] = useState("");
    const [product, setProduct] = useState("");
    const [customerNeeds, setCustomerNeeds] = useState("");
    const [assignedEngineer, setAssignedEngineer] = useState("");
    const [potentialRevenue, setPotentialRevenue] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerNeeds.trim()) {
            setErrorMsg("Customer needs / problem statement is required.");
            return;
        }

        try {
            await createMutation.mutateAsync({
                companyId: company.id,
                input: {
                    deal_title: dealTitle.trim() || undefined,
                    product: product.trim() || undefined,
                    customer_needs: customerNeeds.trim(),
                    assigned_engineer: assignedEngineer || undefined,
                    potential_revenue: potentialRevenue ? parseFloat(potentialRevenue) : undefined,
                },
            });
            onClose();
        } catch (err: any) {
            setErrorMsg(err?.response?.data?.detail || "Failed to create child opportunity deal.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/40">
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                            New Deal under {company.name}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Inherits company profile (Module 1 & 2 cached for zero redundant KYC)
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-sm">
                    {errorMsg && (
                        <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
                            {errorMsg}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            Deal Initiative Title
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Supply Chain Analytics / Cloud Migration"
                            value={dealTitle}
                            onChange={(e) => setDealTitle(e.target.value)}
                            className="w-full h-9 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            Product / Solution Domain
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. BigQuery, Greenplum EDW, Nutanix, Palo Alto"
                            value={product}
                            onChange={(e) => setProduct(e.target.value)}
                            className="w-full h-9 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            Customer Needs & Problem Statement <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Deskripsi kendala bisnis, target arsitektur, atau pain point klien..."
                            value={customerNeeds}
                            onChange={(e) => setCustomerNeeds(e.target.value)}
                            className="w-full p-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                Assigned Pre-Sales
                            </label>
                            <select
                                value={assignedEngineer}
                                onChange={(e) => setAssignedEngineer(e.target.value)}
                                className="w-full h-9 px-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Unassigned</option>
                                {presalesList.map((p) => (
                                    <option key={p} value={p}>
                                        {p}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                Potential Revenue (IDR)
                            </label>
                            <input
                                type="number"
                                placeholder="e.g. 500000000"
                                value={potentialRevenue}
                                onChange={(e) => setPotentialRevenue(e.target.value)}
                                className="w-full h-9 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={onClose}
                            className="text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={createMutation.isPending}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {createMutation.isPending ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                    Creating Deal...
                                </>
                            ) : (
                                "Create Deal"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
