"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight, ChevronLeft, Trash2, LayoutGrid, List, Upload } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { KanbanBoard } from "@/components/domains/opportunities/KanbanBoard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useOpportunities, useDeleteOpportunity } from "@/hooks/use-opportunities";
import { timeAgo, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { ALL_STATUSES } from "@/types/opportunity";
import type { OpportunityStatus } from "@/types/opportunity";

export default function OpportunitiesPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
    const [user, setUser] = useState<any>(null);
    const [hideFinancialNumbers, setHideFinancialNumbers] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("moip_user");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                localStorage.removeItem("moip_user");
            }
        }
        const storedView = localStorage.getItem("moip_opportunities_view");
        if (storedView === "kanban" || storedView === "list") {
            setViewMode(storedView);
        }
        api.get("/api/admin/settings")
            .then((res) => setHideFinancialNumbers(Boolean(res.data?.hide_financial_numbers)))
            .catch((e) => console.error("Failed to load settings", e));
    }, []);

    const handleViewModeChange = (mode: "list" | "kanban") => {
        setViewMode(mode);
        localStorage.setItem("moip_opportunities_view", mode);
    };

    const canCreate = user ? user.capabilities?.split(",").map((c: string) => c.trim()).includes("create_edit") : false;
    const canDelete = user ? user.capabilities?.split(",").map((c: string) => c.trim()).includes("delete") : false;

    const deleteMutation = useDeleteOpportunity();

    // In Kanban mode, fetch a larger batch so all status columns are populated
    const { data, isLoading } = useOpportunities({
        page: viewMode === "kanban" ? 1 : page,
        page_size: viewMode === "kanban" ? 100 : 20,
        search: search || undefined,
        status: statusFilter || undefined,
    });

    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

    const handleDelete = (e: React.MouseEvent | null, id: string, name: string) => {
        if (e) e.stopPropagation();
        setDeleteTarget({ id, name });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteMutation.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
        } catch (err) {
            console.error("Gagal menghapus peluang", err);
        }
    };

    const totalPages = data ? Math.ceil(data.total / data.page_size) : 1;

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900">Opportunities</h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        Manage and track your active sales pipeline.
                    </p>
                </div>
                {canCreate && (
                    <div className="flex items-center gap-2">
                        <Link href="/opportunities/import">
                            <Button variant="secondary" className="gap-2 border-zinc-200">
                                <Upload className="w-4 h-4 text-zinc-700" /> Import Leads
                            </Button>
                        </Link>
                        <Link href="/opportunities/create">
                            <Button className="gap-2">
                                <Plus className="w-4 h-4" /> New Opportunity
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            <Card className="flex flex-col">
                {/* Toolbar */}
                <div className="p-4 border-b border-zinc-200 flex items-center justify-between gap-4 bg-zinc-50/50 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Filter companies..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="h-9 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-4 text-sm outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
                        >
                            <option value="">All Status</option>
                            {ALL_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* View Switcher Toggle Buttons */}
                    <div className="flex items-center bg-zinc-200/80 p-1 rounded-lg border border-zinc-300/70">
                        <button
                            type="button"
                            onClick={() => handleViewModeChange("list")}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                viewMode === "list"
                                    ? "bg-white text-zinc-900 shadow-xs"
                                    : "text-zinc-600 hover:text-zinc-900"
                            }`}
                        >
                            <List className="w-3.5 h-3.5" /> List
                        </button>
                        <button
                            type="button"
                            onClick={() => handleViewModeChange("kanban")}
                            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                viewMode === "kanban"
                                    ? "bg-white text-zinc-900 shadow-xs"
                                    : "text-zinc-600 hover:text-zinc-900"
                            }`}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" /> Kanban
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                {viewMode === "kanban" ? (
                    <div className="p-4 bg-zinc-100/40 rounded-b-xl min-h-[500px]">
                        {isLoading ? (
                            <div className="p-12 text-center text-zinc-400 text-sm animate-pulse">
                                Loading Kanban Board...
                            </div>
                        ) : (
                            <KanbanBoard
                                opportunities={data?.items || []}
                                canEdit={canCreate}
                                canDelete={canDelete}
                                hideFinancialNumbers={
                                    hideFinancialNumbers ||
                                    user?.role === "engineer" ||
                                    user?.role === "viewer"
                                }
                                onDelete={(id, name) => handleDelete(null, id, name)}
                                statusFilter={statusFilter}
                            />
                        )}
                    </div>
                ) : (
                    <>
                        {/* Mobile Card List View (visible on < md) */}
                        <div className="block md:hidden space-y-3 p-4">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="p-4 border border-zinc-200 rounded-xl bg-white space-y-3 animate-pulse">
                                        <div className="h-5 bg-zinc-200 rounded w-1/2" />
                                        <div className="h-4 bg-zinc-100 rounded w-1/3" />
                                    </div>
                                ))
                            ) : data && data.items.length > 0 ? (
                                data.items.map((opp) => (
                                    <div
                                        key={opp.id}
                                        onClick={() => router.push(`/opportunities/${opp.id}`)}
                                        className="p-4 border border-zinc-200/90 rounded-xl bg-white shadow-sm space-y-3 active:bg-zinc-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h4 className="font-bold text-zinc-900 text-sm">{opp.company_name}</h4>
                                                <p className="text-xs text-zinc-500 mt-0.5">{opp.industry || "General Industry"}</p>
                                            </div>
                                            <StatusBadge status={opp.status as OpportunityStatus} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs py-2.5 border-y border-zinc-100">
                                            <div>
                                                <span className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">Potential Value</span>
                                                <span className="font-bold text-zinc-900 mt-0.5 block">
                                                    {formatCurrency(
                                                        opp.potential_revenue,
                                                        hideFinancialNumbers || user?.role === "engineer" || user?.role === "viewer"
                                                    )}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-400 block text-[10px] uppercase font-semibold tracking-wider">Est. Agenda</span>
                                                <span className="text-zinc-800 font-medium mt-0.5 block">
                                                    {opp.estimated_agenda_date
                                                        ? new Date(opp.estimated_agenda_date).toLocaleDateString("id-ID", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })
                                                        : "—"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-zinc-500">
                                            <span className="truncate max-w-[180px]">Eng: {opp.assigned_engineer?.full_name || "Unassigned"}</span>
                                            <span className="text-zinc-900 font-semibold flex items-center gap-1 shrink-0">Detail &rarr;</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-xs text-zinc-500 bg-white rounded-xl border border-zinc-200">
                                    No opportunities found.
                                </div>
                            )}
                        </div>

                        {/* Desktop Table (visible on >= md) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Company</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3 font-medium">Industry</th>
                                        <th className="px-6 py-3 font-medium">Potential Value</th>
                                        <th className="px-6 py-3 font-medium">Est. Agenda</th>
                                        <th className="px-6 py-3 font-medium">Engineer</th>
                                        <th className="px-6 py-3 font-medium">Next Meeting</th>
                                        <th className="px-6 py-3 font-medium">Last Update</th>
                                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i}>
                                                <td colSpan={9} className="px-6 py-4">
                                                    <div className="h-4 bg-zinc-100 rounded animate-pulse" />
                                                </td>
                                            </tr>
                                        ))
                                    ) : data && data.items.length > 0 ? (
                                        data.items.map((opp) => (
                                            <tr
                                                key={opp.id}
                                                className="hover:bg-zinc-50/50 group transition-colors cursor-pointer"
                                                onClick={() => router.push(`/opportunities/${opp.id}`)}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-zinc-600">
                                                            {opp.company_name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-zinc-900 group-hover:underline">
                                                                {opp.company_name}
                                                            </span>
                                                            <div className="text-zinc-500 text-xs">
                                                                {opp.id.slice(0, 8)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={opp.status as OpportunityStatus} />
                                                </td>
                                                <td className="px-6 py-4 text-zinc-600">
                                                    {opp.industry || "—"}
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-zinc-900">
                                                    {formatCurrency(
                                                        opp.potential_revenue,
                                                        hideFinancialNumbers || user?.role === "engineer" || user?.role === "viewer"
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-600">
                                                    {opp.estimated_agenda_date
                                                        ? new Date(opp.estimated_agenda_date).toLocaleDateString("en-US", {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })
                                                        : "—"}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-600">
                                                    {opp.assigned_engineer?.full_name || "Unassigned"}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-600">
                                                    {opp.meeting_schedule
                                                        ? new Date(opp.meeting_schedule).toLocaleDateString(
                                                            "en-US",
                                                            {
                                                                month: "short",
                                                                day: "numeric",
                                                                hour: "numeric",
                                                                minute: "2-digit",
                                                            }
                                                        )
                                                        : "—"}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-500 text-xs">
                                                    {timeAgo(opp.updated_at)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {canDelete && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all"
                                                            onClick={(e) => handleDelete(e, opp.id, opp.company_name)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="px-6 py-12 text-center text-zinc-500">
                                                No opportunities found. Create your first opportunity to get
                                                started.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination (visible in list mode) */}
                        <div className="p-4 border-t border-zinc-200 flex items-center justify-between text-sm text-zinc-500 bg-zinc-50/50">
                            <div>
                                Showing {data ? (data.page - 1) * data.page_size + 1 : 0} to{" "}
                                {data ? Math.min(data.page * data.page_size, data.total) : 0} of{" "}
                                {data?.total || 0} results
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    <ChevronLeft className="w-4 h-4" /> Previous
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </Card>

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
        </div>
    );
}