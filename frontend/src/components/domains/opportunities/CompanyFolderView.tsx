"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Folder,
    FolderOpen,
    FolderPlus,
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
    CheckCircle2,
    Sparkles,
    Trash2,
    Zap,
    CircleDashed,
    FolderSymlink,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/Button";
import { MultiSelect } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
    useCompanies,
    useCompany,
    useCreateCompany,
    useCreateCompanyOpportunity,
    useDeleteCompany,
} from "@/hooks/use-companies";
import { useDeleteOpportunity, useUpdateOpportunity } from "@/hooks/use-opportunities";
import { DEFAULT_TARGET_SOLUTIONS } from "@/lib/master-data";
import { formatCurrency, timeAgo } from "@/lib/utils";
import type { Company } from "@/types/company";
import type { Opportunity } from "@/types/opportunity";

interface CompanyFolderViewProps {
    search: string;
    engineerFilter: string;
    presalesList: string[];
    hideFinancialNumbers: boolean;
    canDelete?: boolean;
}

export function CompanyFolderView({
    search,
    engineerFilter,
    presalesList,
    hideFinancialNumbers,
    canDelete,
}: CompanyFolderViewProps) {
    const [expandedCompanyIds, setExpandedCompanyIds] = useState<Set<string>>(new Set());
    const [modalCompany, setModalCompany] = useState<Company | null>(null);
    const [isCreateCompanyOpen, setIsCreateCompanyOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
    const [deleteCompanyTarget, setDeleteCompanyTarget] = useState<{ id: string; name: string } | null>(null);
    const [moveTargetOppty, setMoveTargetOppty] = useState<{ opp: Opportunity; currentCompanyName: string } | null>(null);
    const deleteMutation = useDeleteOpportunity();
    const deleteCompanyMutation = useDeleteCompany();

    const effectiveCanDelete =
        canDelete ??
        (typeof window !== "undefined"
            ? Boolean(
                  localStorage.getItem("moip_user") &&
                      JSON.parse(localStorage.getItem("moip_user") || "{}")
                          ?.capabilities?.split(",")
                          .map((c: string) => c.trim())
                          .includes("delete")
              )
            : false);

    const handleDelete = (e: React.MouseEvent | null, id: string, name: string) => {
        if (e) e.stopPropagation();
        setDeleteTarget({ id, name });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteMutation.mutateAsync(deleteTarget.id);
            toast.success("Peluang berhasil dihapus");
            setDeleteTarget(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || "Gagal menghapus peluang");
            console.error("Gagal menghapus peluang", err);
        }
    };

    const handleDeleteCompany = (e: React.MouseEvent, company: { id: string; name: string }) => {
        e.stopPropagation();
        setDeleteCompanyTarget(company);
    };

    const confirmDeleteCompany = async () => {
        if (!deleteCompanyTarget) return;
        try {
            await deleteCompanyMutation.mutateAsync(deleteCompanyTarget.id);
            toast.success(`Folder perusahaan "${deleteCompanyTarget.name}" berhasil dihapus`);
            setDeleteCompanyTarget(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || "Gagal menghapus folder perusahaan");
            console.error("Gagal menghapus folder perusahaan", err);
        }
    };

    const handleMoveOppty = (e: React.MouseEvent | null, opp: Opportunity, currentCompanyName: string) => {
        if (e) e.stopPropagation();
        setMoveTargetOppty({ opp, currentCompanyName });
    };

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
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                    {search
                        ? "No companies matched your search criteria."
                        : "No company folders available yet. Create a company folder or register a new opportunity."}
                </p>
                <div className="flex items-center justify-center gap-3 mt-5">
                    <Button
                        size="sm"
                        onClick={() => setIsCreateCompanyOpen(true)}
                        className="h-8 text-xs font-medium flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>New Company Folder</span>
                    </Button>
                    <Link href="/opportunities/create">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 text-xs font-medium flex items-center gap-1.5"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>New Opportunity</span>
                        </Button>
                    </Link>
                </div>

                {isCreateCompanyOpen && (
                    <CreateCompanyModal onClose={() => setIsCreateCompanyOpen(false)} />
                )}
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
                        Hierarchical Opportunity Intelligence
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCreateCompanyOpen(true)}
                        className="h-7 text-xs font-medium flex items-center gap-1.5 border-indigo-200 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                    >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>New Company Folder</span>
                    </Button>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <button
                        type="button"
                        onClick={expandAll}
                        className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Expand All
                    </button>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <button
                        type="button"
                        onClick={collapseAll}
                        className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
                            onAddOppty={() => setModalCompany(company)}
                            engineerFilter={engineerFilter}
                            hideFinancialNumbers={hideFinancialNumbers}
                            canDelete={effectiveCanDelete}
                            onDelete={handleDelete}
                            onDeleteCompany={(e) => handleDeleteCompany(e, { id: company.id, name: company.name })}
                            onMoveOppty={handleMoveOppty}
                        />
                    );
                })}
            </div>

            {/* Modal Quick Create Oppty */}
            {modalCompany && (
                <CreateCompanyOpptyModal
                    company={modalCompany}
                    presalesList={presalesList}
                    onClose={() => setModalCompany(null)}
                />
            )}

            {/* Modal Create Company Folder */}
            {isCreateCompanyOpen && (
                <CreateCompanyModal onClose={() => setIsCreateCompanyOpen(false)} />
            )}

            {/* Modal Move Opportunity to Another Company */}
            {moveTargetOppty && (
                <MoveCompanyOpptyModal
                    opp={moveTargetOppty.opp}
                    currentCompanyName={moveTargetOppty.currentCompanyName}
                    companies={companies}
                    onClose={() => setMoveTargetOppty(null)}
                />
            )}

            {/* Custom Confirm Dialog for Delete Opportunity */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Hapus Opportunity"
                description={`Apakah Anda yakin ingin menghapus peluang untuk "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
                confirmText="Hapus"
                cancelText="Batal"
                variant="danger"
                isLoading={deleteMutation.isPending}
                onConfirm={confirmDelete}
                onClose={() => setDeleteTarget(null)}
            />

            {/* Custom Confirm Dialog for Delete Company Folder */}
            <ConfirmDialog
                isOpen={!!deleteCompanyTarget}
                title="Hapus Folder Perusahaan"
                description={`Apakah Anda yakin ingin menghapus folder perusahaan "${deleteCompanyTarget?.name}"? Folder kosong ini akan dihapus secara permanen.`}
                confirmText="Hapus Folder"
                cancelText="Batal"
                variant="danger"
                isLoading={deleteCompanyMutation.isPending}
                onConfirm={confirmDeleteCompany}
                onClose={() => setDeleteCompanyTarget(null)}
            />
        </div>
    );
}

function CompanyCard({
    company,
    isExpanded,
    onToggle,
    onAddOppty,
    engineerFilter,
    hideFinancialNumbers,
    canDelete,
    onDelete,
    onDeleteCompany,
    onMoveOppty,
}: {
    company: Company;
    isExpanded: boolean;
    onToggle: () => void;
    onAddOppty: () => void;
    engineerFilter: string;
    hideFinancialNumbers: boolean;
    canDelete?: boolean;
    onDelete: (e: React.MouseEvent | null, id: string, name: string) => void;
    onDeleteCompany: (e: React.MouseEvent) => void;
    onMoveOppty: (e: React.MouseEvent | null, opp: Opportunity, currentCompanyName: string) => void;
}) {
    const count = company.opportunities_count ?? 0;
    const hasActiveKyC = !!company.business_process || !!company.cached_kyc_data;

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-700">
            {/* Header row (The Folder Container) */}
            <div
                onClick={onToggle}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer select-none bg-zinc-50/40 dark:bg-zinc-900/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors gap-3"
            >
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                        )}
                    </button>

                    <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                        {isExpanded ? (
                            <FolderOpen className="w-5 h-5" />
                        ) : (
                            <Folder className="w-5 h-5" />
                        )}
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                                {company.name}
                            </h3>
                            {hasActiveKyC && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    KYC Profile
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {company.industry && <span>{company.industry}</span>}
                            {company.industry && company.website && <span>•</span>}
                            {company.website && (
                                <a
                                    href={
                                        company.website.startsWith("http")
                                            ? company.website
                                            : `https://${company.website}`
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                                >
                                    <span>{company.website}</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 pl-8 sm:pl-0 justify-between sm:justify-end">
                    <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {count} {count === 1 ? "Oppty" : "Opptys"}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAddOppty();
                            }}
                            className="h-8 text-xs font-medium border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            <span>New Oppty</span>
                        </Button>

                        {canDelete && (
                            count > 0 ? (
                                <button
                                    type="button"
                                    disabled
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 rounded-md text-zinc-300 dark:text-zinc-600 cursor-not-allowed transition-colors"
                                    title="Folder hanya dapat dihapus jika kosong (0 deal). Pindahkan atau hapus semua deal terlebih dahulu."
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onDeleteCompany}
                                    className="p-1.5 rounded-md text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                                    title="Hapus folder perusahaan (kosong)"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Expanded Child Opportunities List */}
            {isExpanded && (
                <CompanyChildOpportunities
                    companyId={company.id}
                    companyName={company.name}
                    engineerFilter={engineerFilter}
                    hideFinancialNumbers={hideFinancialNumbers}
                    canDelete={canDelete}
                    onDelete={onDelete}
                    onAddOppty={onAddOppty}
                    onMove={onMoveOppty}
                />
            )}
        </div>
    );
}

function CompanyChildOpportunities({
    companyId,
    companyName,
    engineerFilter,
    hideFinancialNumbers,
    canDelete,
    onDelete,
    onAddOppty,
    onMove,
}: {
    companyId: string;
    companyName: string;
    engineerFilter: string;
    hideFinancialNumbers: boolean;
    canDelete?: boolean;
    onDelete: (e: React.MouseEvent | null, id: string, name: string) => void;
    onAddOppty: () => void;
    onMove: (e: React.MouseEvent | null, opp: Opportunity, currentCompanyName: string) => void;
}) {
    const { data: detail, isLoading } = useCompany(companyId);

    if (isLoading) {
        return (
            <div className="p-6 text-center text-xs text-zinc-400 flex items-center justify-center gap-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/20">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading opportunities for {companyName}...
            </div>
        );
    }

    const opps = (detail?.opportunities || []).filter((opp) => {
        if (!engineerFilter) return true;
        return opp.assigned_engineer === engineerFilter;
    });

    if (opps.length === 0) {
        return (
            <div className="py-8 px-4 text-center border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-900/20">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {engineerFilter
                        ? "No opportunities assigned to this engineer under this company."
                        : "No opportunities recorded yet."}
                </p>
                <button
                    type="button"
                    onClick={onAddOppty}
                    className="inline-flex items-center text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline mt-2"
                >
                    <Plus className="w-3 h-3 mr-1" /> Add First Oppty
                </button>
            </div>
        );
    }

    return (
        <div className="border-t border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/80 bg-zinc-50/10 dark:bg-zinc-900/10">
            {opps.map((opp) => (
                <OpptyRow
                    key={opp.id}
                    opp={opp}
                    companyName={companyName}
                    hideFinancialNumbers={hideFinancialNumbers}
                    canDelete={canDelete}
                    onDelete={onDelete}
                    onMove={onMove}
                />
            ))}
        </div>
    );
}

function OpptyRow({
    opp,
    companyName,
    hideFinancialNumbers,
    canDelete,
    onDelete,
    onMove,
}: {
    opp: Opportunity;
    companyName: string;
    hideFinancialNumbers: boolean;
    canDelete?: boolean;
    onDelete: (e: React.MouseEvent | null, id: string, name: string) => void;
    onMove: (e: React.MouseEvent | null, opp: Opportunity, currentCompanyName: string) => void;
}) {
    const opptyTitle = opp.deal_title || opp.product || "Opportunity";

    return (
        <div className="p-3.5 sm:px-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1 sm:max-w-md">
                <div className="flex items-center gap-2 flex-wrap">
                    <Link
                        href={`/opportunities/${opp.id}`}
                        className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5"
                    >
                        <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                        <span>{opptyTitle}</span>
                    </Link>
                    <StatusBadge status={opp.status} />
                </div>
                {opp.customer_needs && (
                    <p className="text-zinc-500 dark:text-zinc-400 text-[11px] line-clamp-1">
                        {opp.customer_needs}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-4 sm:gap-6 flex-wrap sm:flex-nowrap justify-between sm:justify-end text-zinc-500 dark:text-zinc-400">
                {opp.assigned_engineer ? (
                    <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-zinc-400" />
                        <span>{opp.assigned_engineer}</span>
                    </div>
                ) : (
                    <span className="text-zinc-400 italic">Unassigned</span>
                )}

                {!hideFinancialNumbers && (
                    <div className="flex items-center gap-1 text-zinc-800 dark:text-zinc-200 font-medium">
                        <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>
                            {opp.potential_revenue
                                ? formatCurrency(opp.potential_revenue)
                                : "-"}
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                    <Calendar className="w-3 h-3" />
                    <span>{timeAgo(opp.created_at)}</span>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => onMove(e, opp, companyName)}
                        className="h-7 px-2 text-xs text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center gap-1 transition-colors"
                        title="Pindahkan deal ke folder perusahaan lain"
                    >
                        <FolderSymlink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Pindah</span>
                    </Button>
                    <Link href={`/opportunities/${opp.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                            View
                        </Button>
                    </Link>
                    {canDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => onDelete(e, opp.id, opptyTitle)}
                            className="h-7 w-7 p-0 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            title="Delete opportunity"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

const folderPipelineSteps = [
    {
        id: 1,
        title: "Creating Opportunity Workspace",
        desc: "Menyiapkan inisiatif deal dan menautkan ke folder perusahaan.",
    },
    {
        id: 2,
        title: "Linking Company Profile & AI KYC",
        desc: "Mewarisi profil statis perusahaan dan meluncurkan background KYC worker.",
    },
    {
        id: 3,
        title: "Finalizing Workspace Intelligence",
        desc: "Menyiapkan panduan persona dan direktori deal inisiatif.",
    },
];

function CreateCompanyOpptyModal({
    company,
    presalesList,
    onClose,
}: {
    company: Company;
    presalesList: string[];
    onClose: () => void;
}) {
    const router = useRouter();
    const createMutation = useCreateCompanyOpportunity();
    const [dealTitle, setDealTitle] = useState("");
    const [selectedSolutions, setSelectedSolutions] = useState<string[]>([]);
    const [customerNeeds, setCustomerNeeds] = useState("");
    const [assignedEngineer, setAssignedEngineer] = useState("");
    const [potentialRevenue, setPotentialRevenue] = useState("");
    const [estimatedAgendaDate, setEstimatedAgendaDate] = useState("");
    const [additionalNotes, setAdditionalNotes] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pipelineState, setPipelineState] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerNeeds.trim()) {
            setErrorMsg("Customer needs / problem statement is required.");
            return;
        }

        const selectedProduct = selectedSolutions.length > 0 ? selectedSolutions.join(", ") : undefined;

        setIsSubmitting(true);
        setPipelineState(1);

        try {
            const newOppty = await createMutation.mutateAsync({
                companyId: company.id,
                input: {
                    deal_title: dealTitle.trim() || undefined,
                    product: selectedProduct,
                    customer_needs: customerNeeds.trim(),
                    assigned_engineer: assignedEngineer || undefined,
                    potential_revenue: potentialRevenue ? parseFloat(potentialRevenue) : undefined,
                    estimated_agenda_date: estimatedAgendaDate
                        ? new Date(estimatedAgendaDate).toISOString()
                        : undefined,
                    additional_notes: additionalNotes.trim() || undefined,
                },
            });

            // Simulate multi-step pipeline progression
            setTimeout(() => setPipelineState(2), 1200);
            setTimeout(() => setPipelineState(3), 2500);
            setTimeout(() => {
                setPipelineState(4);
                toast.success("Opportunity created successfully! Redirecting to workspace...");
                setTimeout(() => {
                    router.push(`/opportunities/${newOppty.id}`);
                }, 800);
            }, 3600);
        } catch (err: any) {
            setErrorMsg(err?.response?.data?.detail || "Failed to create opportunity.");
            setIsSubmitting(false);
            setPipelineState(0);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
                {/* Header */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-800/40">
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-1.5">
                            <span>New Oppty under {company.name}</span>
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Inherits company profile (Module 1 & 2 cached for zero redundant KYC)
                        </p>
                    </div>
                    {!isSubmitting && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-md"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Company Context Banner */}
                <div className="px-4 py-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100/80 dark:border-indigo-900/40 flex items-center justify-between text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span>{company.name}</span>
                        {company.industry && (
                            <span className="text-zinc-500 dark:text-zinc-400">• {company.industry}</span>
                        )}
                        {company.website && (
                            <span className="text-zinc-500 dark:text-zinc-400">• {company.website}</span>
                        )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        Zero KYC Redundancy
                    </span>
                </div>

                {/* Active Creation View / Form View */}
                {isSubmitting ? (
                    <div className="p-6 sm:p-8 space-y-6">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 mb-4">
                                <Zap className="w-7 h-7" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                Processing Opportunity Workspace
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                                Menyiapkan inisiatif deal untuk <span className="font-semibold text-zinc-700 dark:text-zinc-300">{company.name}</span> dan meluncurkan intelligence pipeline.
                            </p>
                        </div>

                        <div className="space-y-3 max-w-md mx-auto">
                            {folderPipelineSteps.map((step) => {
                                const isActive = pipelineState === step.id;
                                const isDone = pipelineState > step.id;

                                return (
                                    <div
                                        key={step.id}
                                        className={`p-3.5 rounded-xl border transition-all duration-300 ${
                                            isActive
                                                ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs"
                                                : isDone
                                                ? "border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60"
                                                : "border-zinc-100 dark:border-zinc-800/60 opacity-40"
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5">
                                                {isDone ? (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                ) : isActive ? (
                                                    <CircleDashed className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                                                ) : (
                                                    <CircleDashed className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                                    {step.title}
                                                </h4>
                                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                                    {step.desc}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="text-center pt-2">
                            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 animate-pulse">
                                {pipelineState < 4 ? "Menyiapkan workspace dan routing..." : "Membuka halaman detail opportunity..."}
                            </span>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-sm max-h-[80vh] overflow-y-auto">
                        {errorMsg && (
                            <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
                                {errorMsg}
                            </div>
                        )}

                        {/* Oppty Initiative Title */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                Oppty Initiative Title
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Supply Chain Analytics / Cloud Migration"
                                value={dealTitle}
                                onChange={(e) => setDealTitle(e.target.value)}
                                className="w-full h-9 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        {/* Target Solution Domain */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                Product / Solution Domain
                            </label>
                            <MultiSelect
                                options={DEFAULT_TARGET_SOLUTIONS}
                                value={selectedSolutions}
                                onChange={setSelectedSolutions}
                                placeholder="Select target solution domain(s)..."
                            />
                        </div>

                        {/* Customer Needs & Problem Statement */}
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

                        {/* Pre-sales & Potential Revenue */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                        {/* Agenda Meeting Date */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                Estimasi Tanggal Agenda / Initial Meeting (Opsional)
                            </label>
                            <input
                                type="datetime-local"
                                value={estimatedAgendaDate}
                                onChange={(e) => setEstimatedAgendaDate(e.target.value)}
                                className="w-full h-9 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        {/* Additional Notes / AI Context */}
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                Additional Context for AI (Optional)
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Catatan teknis tambahan atau instruksi spesifik untuk pipeline intelligence..."
                                value={additionalNotes}
                                onChange={(e) => setAdditionalNotes(e.target.value)}
                                className="w-full p-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        {/* Form Action Buttons */}
                        <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
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
                                        Creating Oppty...
                                    </>
                                ) : (
                                    "Create Oppty"
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

function CreateCompanyModal({ onClose }: { onClose: () => void }) {
    const createMutation = useCreateCompany();
    const [name, setName] = useState("");
    const [website, setWebsite] = useState("");
    const [industry, setIndustry] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setErrorMsg("Nama perusahaan wajib diisi.");
            return;
        }

        try {
            await createMutation.mutateAsync({
                name: name.trim(),
                website: website.trim() || undefined,
                industry: industry.trim() || undefined,
                contact_name: contactName.trim() || undefined,
                contact_email: contactEmail.trim() || undefined,
                contact_phone: contactPhone.trim() || undefined,
            });
            onClose();
        } catch (err: any) {
            setErrorMsg(err?.response?.data?.detail || "Gagal membuat folder perusahaan.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-800/40">
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-1.5">
                            <FolderPlus className="w-4 h-4 text-indigo-600" />
                            <span>New Company Folder</span>
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Daftarkan entitas folder klien untuk mengelompokkan opportunity.
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
                            Nama Perusahaan <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. PT Telekomunikasi Selular / Asuransi Jasindo"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-9 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                Website (Opsional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. jasindo.co.id"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="w-full h-9 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                Industri (Opsional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Financial Services"
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                                className="w-full h-9 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
                        <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                            Informasi Kontak Utama (Opsional)
                        </span>
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="Nama Kontak Person"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                className="w-full h-8 px-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    className="w-full h-8 px-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Nomor Telepon"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    className="w-full h-8 px-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
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
                                    Creating Folder...
                                </>
                            ) : (
                                "Create Folder"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function MoveCompanyOpptyModal({
    opp,
    currentCompanyName,
    companies,
    onClose,
}: {
    opp: Opportunity;
    currentCompanyName: string;
    companies: Company[];
    onClose: () => void;
}) {
    const [targetCompanyId, setTargetCompanyId] = useState<string>("");
    const updateOpptyMutation = useUpdateOpportunity();
    const title = opp.deal_title || opp.product || "Opportunity";

    const availableCompanies = companies.filter((c) => c.id !== opp.company_id);

    const handleMove = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetCompanyId) {
            toast.error("Pilih folder perusahaan tujuan");
            return;
        }
        const targetCompany = companies.find((c) => c.id === targetCompanyId);
        try {
            await updateOpptyMutation.mutateAsync({
                id: opp.id,
                input: { company_id: targetCompanyId },
            });
            toast.success(
                `Peluang "${title}" berhasil dipindahkan ke folder "${targetCompany?.name || "tujuan"}"`
            );
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || "Gagal memindahkan peluang");
            console.error("Gagal memindahkan peluang", err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-800/40">
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-1.5">
                            <FolderSymlink className="w-4 h-4 text-indigo-600" />
                            <span>Pindahkan Peluang</span>
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Alihkan deal ini ke folder klien / entitas perusahaan lain.
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

                <form onSubmit={handleMove} className="p-4 space-y-4 text-sm">
                    <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700/60 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-500 dark:text-zinc-400">Peluang:</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1 max-w-[240px]">
                                {title}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-zinc-500 dark:text-zinc-400">Folder Saat Ini:</span>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                {currentCompanyName || "Tanpa Perusahaan"}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                            Pilih Folder Perusahaan Tujuan <span className="text-red-500">*</span>
                        </label>
                        {availableCompanies.length === 0 ? (
                            <p className="text-xs text-amber-600 dark:text-amber-400 p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-900/60">
                                Tidak ada folder perusahaan lain yang tersedia. Buat folder perusahaan baru terlebih dahulu.
                            </p>
                        ) : (
                            <select
                                value={targetCompanyId}
                                onChange={(e) => setTargetCompanyId(e.target.value)}
                                className="w-full h-9 px-3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                required
                            >
                                <option value="" disabled>
                                    -- Pilih Perusahaan Tujuan --
                                </option>
                                {availableCompanies.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} {c.industry ? `(${c.industry})` : ""}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="pt-3 flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={onClose}
                            className="text-xs"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={!targetCompanyId || updateOpptyMutation.isPending}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {updateOpptyMutation.isPending ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                                    Memindahkan...
                                </>
                            ) : (
                                "Pindahkan Peluang"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

