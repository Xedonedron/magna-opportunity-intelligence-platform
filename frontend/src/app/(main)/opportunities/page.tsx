"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight, ChevronLeft, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useOpportunities, useDeleteOpportunity } from "@/hooks/use-opportunities";
import { timeAgo } from "@/lib/utils";
import { ALL_STATUSES } from "@/types/opportunity";
import type { OpportunityStatus } from "@/types/opportunity";

export default function OpportunitiesPage() {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem("moip_user");
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const canCreate = user ? user.capabilities?.split(",").map((c: string) => c.trim()).includes("create_edit") : false;
    const canDelete = user ? user.capabilities?.split(",").map((c: string) => c.trim()).includes("delete") : false;

    const deleteMutation = useDeleteOpportunity();

    const { data, isLoading } = useOpportunities({
        page,
        page_size: 20,
        search: search || undefined,
        status: statusFilter || undefined,
    });

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation();
        if (confirm(`Apakah Anda yakin ingin menghapus peluang untuk ${name}?`)) {
            try {
                await deleteMutation.mutateAsync(id);
            } catch (err) {
                console.error("Gagal menghapus peluang", err);
                alert("Gagal menghapus peluang.");
            }
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
                    <Link href="/opportunities/create">
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" /> New Opportunity
                        </Button>
                    </Link>
                )}
            </div>

            <Card className="flex flex-col">
                {/* Toolbar */}
                <div className="p-4 border-b border-zinc-200 flex items-center justify-between gap-4 bg-zinc-50/50">
                    <div className="flex items-center gap-2 flex-1">
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
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200">
                            <tr>
                                <th className="px-6 py-3 font-medium">Company</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Industry</th>
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
                                        <td colSpan={7} className="px-6 py-4">
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
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                                        No opportunities found. Create your first opportunity to get
                                        started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
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
            </Card>
        </div>
    );
}