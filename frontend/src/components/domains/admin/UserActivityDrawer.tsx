"use client";

import { useState, useEffect, useCallback } from "react";
import {
    X,
    Clock,
    Calendar,
    Activity,
    User,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Filter,
    RefreshCw,
    Globe,
    Layers,
    FileText,
    Sparkles,
    Shield,
    Trash2,
    Edit3,
    PlusCircle,
    LogIn,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface UserActivityDrawerProps {
    user: {
        id: string;
        email: string;
        full_name: string;
        role: string;
        is_active: boolean;
        capabilities?: string;
        created_at?: string;
        last_login?: string;
        last_active_at?: string;
        activity_summary?: {
            days_active_this_month: number;
            actions_count_this_month: number;
            total_actions_all_time: number;
            last_action?: any;
        };
    } | null;
    isOpen: boolean;
    onClose: () => void;
}

export function formatRelativeTime(dateStr?: string | null): string {
    if (!dateStr) return "Belum pernah aktif";
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return "Baru saja";
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} jam yang lalu`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return "Kemarin";
        if (diffInDays < 30) return `${diffInDays} hari yang lalu`;
        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) return `${diffInMonths} bulan yang lalu`;
        return `${Math.floor(diffInDays / 365)} tahun yang lalu`;
    } catch {
        return dateStr;
    }
}

export function formatDateTime(dateStr?: string | null): string {
    if (!dateStr) return "-";
    try {
        return new Date(dateStr).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    } catch {
        return dateStr;
    }
}

export function UserActivityDrawer({ user, isOpen, onClose }: UserActivityDrawerProps) {
    const [activities, setActivities] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const [category, setCategory] = useState("all");
    const [range, setRange] = useState("all");
    const [loading, setLoading] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
    const [summary, setSummary] = useState<any>(null);

    const fetchActivities = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString(),
            });
            if (category !== "all") params.set("category", category);
            if (range !== "all") params.set("range", range);

            const res = await api.get(`/api/admin/users/${user.id}/activity?${params.toString()}`);
            setActivities(res.data.items || []);
            setTotal(res.data.total || 0);
            if (res.data.summary) {
                setSummary(res.data.summary);
            }
        } catch (e) {
            console.error("Failed to load user activities", e);
        } finally {
            setLoading(false);
        }
    }, [user, page, category, range]);

    useEffect(() => {
        if (isOpen && user) {
            fetchActivities();
        } else {
            setActivities([]);
            setTotal(0);
            setPage(1);
            setCategory("all");
            setRange("all");
            setExpandedIds({});
        }
    }, [isOpen, user, fetchActivities]);

    if (!isOpen || !user) return null;

    const totalPages = Math.ceil(total / pageSize) || 1;

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const getActionBadge = (action: string, label: string) => {
        const act = action.toLowerCase();
        if (act.includes("create") || act.includes("added")) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <PlusCircle className="w-3 h-3 text-emerald-600" />
                    {label || "Dibuat"}
                </span>
            );
        }
        if (act.includes("delete") || act.includes("deleted")) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                    <Trash2 className="w-3 h-3 text-rose-600" />
                    {label || "Dihapus"}
                </span>
            );
        }
        if (act.includes("status")) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    <CheckCircle2 className="w-3 h-3 text-purple-600" />
                    {label || "Status Berubah"}
                </span>
            );
        }
        if (act.includes("kyc") || act.includes("persona") || act.includes("chat")) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    {label || "AI & KYC"}
                </span>
            );
        }
        if (act.includes("login")) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                    <LogIn className="w-3 h-3 text-zinc-600" />
                    {label || "Login"}
                </span>
            );
        }
        if (act.includes("user_access") || act.includes("master_data") || act.includes("settings")) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <Shield className="w-3 h-3 text-blue-600" />
                    {label || "Admin"}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                <Edit3 className="w-3 h-3 text-sky-600" />
                {label || "Diperbarui"}
            </span>
        );
    };

    const daysActive = summary?.days_active_this_month ?? user.activity_summary?.days_active_this_month ?? 0;
    const actionsThisMonth = summary?.actions_count_this_month ?? user.activity_summary?.actions_count_this_month ?? 0;
    const totalAllTime = summary?.total_actions_all_time ?? user.activity_summary?.total_actions_all_time ?? 0;
    const lastActiveDate = user.last_active_at || user.last_login;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
            <div
                className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl border-l border-zinc-200 animate-in slide-in-from-right duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Drawer Header */}
                <div className="p-6 border-b border-zinc-200 bg-zinc-50/50 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-lg font-bold text-zinc-900 truncate">{user.full_name}</h2>
                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${user.role === "superadmin"
                                    ? "bg-violet-50 text-violet-700 border-violet-200"
                                    : user.role === "manager"
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-zinc-100 text-zinc-600 border-zinc-200"
                                    }`}>
                                    {user.role}
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${user.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                                    {user.is_active ? "Akun Aktif" : "Akun Nonaktif"}
                                </span>
                            </div>
                            <p className="text-xs text-zinc-500 truncate mt-0.5">{user.email}</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
                        title="Tutup"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Telemetry KPI Cards */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-100/60 border-b border-zinc-200">
                    <div className="p-3 bg-white rounded-lg border border-zinc-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-semibold uppercase">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Terakhir Interaksi</span>
                        </div>
                        <div className="mt-1.5">
                            <p className="text-sm font-bold text-zinc-900 leading-tight">
                                {formatRelativeTime(lastActiveDate)}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
                                {formatDateTime(lastActiveDate)}
                            </p>
                        </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-zinc-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-semibold uppercase">
                            <Calendar className="w-3.5 h-3.5 text-purple-500" />
                            <span>Keaktifan Bulan Ini</span>
                        </div>
                        <div className="mt-1.5">
                            <p className="text-base font-extrabold text-purple-700 leading-tight">
                                {daysActive} <span className="text-xs font-normal text-zinc-500">Hari Aktif</span>
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-0.5">
                                {actionsThisMonth} aksi bulan ini
                            </p>
                        </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-zinc-200 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-semibold uppercase">
                            <Activity className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Total Aktivitas</span>
                        </div>
                        <div className="mt-1.5">
                            <p className="text-base font-extrabold text-emerald-700 leading-tight">
                                {totalAllTime} <span className="text-xs font-normal text-zinc-500">Aksi Total</span>
                            </p>
                            <p className="text-[10px] text-zinc-400 mt-0.5">
                                Sejak akun dibuat
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter Controls Bar */}
                <div className="p-4 border-b border-zinc-200 bg-white space-y-3">
                    {/* Time Range Selector */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                            <Filter className="w-3 h-3" /> Waktu:
                        </span>
                        {[
                            { id: "all", label: "Semua Waktu" },
                            { id: "today", label: "Hari Ini" },
                            { id: "7d", label: "7 Hari Terakhir" },
                            { id: "month", label: "Bulan Ini" },
                        ].map((r) => (
                            <button
                                key={r.id}
                                onClick={() => {
                                    setRange(r.id);
                                    setPage(1);
                                }}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all shrink-0 ${range === r.id
                                    ? "bg-zinc-900 text-white shadow-sm"
                                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Category Selector */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                            <Layers className="w-3 h-3" /> Kategori:
                        </span>
                        {[
                            { id: "all", label: "Semua Aksi" },
                            { id: "opportunities", label: "Peluang (Opportunity)" },
                            { id: "meetings", label: "Rapat (Meeting)" },
                            { id: "kyc", label: "KYC & Persona" },
                            { id: "auth", label: "Login Sesi" },
                            { id: "admin", label: "Akses & Pengaturan" },
                        ].map((c) => (
                            <button
                                key={c.id}
                                onClick={() => {
                                    setCategory(c.id);
                                    setPage(1);
                                }}
                                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all shrink-0 ${category === c.id
                                    ? "bg-emerald-700 text-white shadow-sm"
                                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                    }`}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Timeline Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            Riwayat Kronologis ({total} Aktivitas Ditemukan)
                        </h3>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => fetchActivities()}
                            disabled={loading}
                            className="text-xs gap-1.5 py-1 h-7 text-zinc-600"
                        >
                            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                            Segarkan
                        </Button>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
                            <p className="text-xs font-medium">Memuat riwayat aktivitas {user.full_name}...</p>
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="py-16 text-center space-y-2 border border-dashed border-zinc-200 rounded-xl bg-zinc-50">
                            <AlertCircle className="w-8 h-8 text-zinc-300 mx-auto" />
                            <p className="text-sm font-semibold text-zinc-700">Belum ada aktivitas tercatat</p>
                            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                                Pengguna ini belum melakukan aktivitas yang sesuai dengan kriteria filter yang Anda pilih.
                            </p>
                        </div>
                    ) : (
                        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                            {activities.map((act) => {
                                const isExpanded = !!expandedIds[act.id];
                                const hasDiff = (act.old_value && Object.keys(act.old_value).length > 0) ||
                                    (act.new_value && Object.keys(act.new_value).length > 0) ||
                                    (act.extra_data?.changed_fields && act.extra_data.changed_fields.length > 0);

                                return (
                                    <div key={act.id} className="relative group">
                                        {/* Dot Indicator */}
                                        <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-zinc-700 group-hover:border-emerald-600 group-hover:scale-110 transition-all shadow-sm" />

                                        <div className="p-3.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all shadow-sm space-y-2">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {getActionBadge(act.action, act.action_label)}
                                                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                                                        {act.entity_type}
                                                    </span>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-xs font-semibold text-zinc-700 block">
                                                        {formatRelativeTime(act.created_at)}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400 font-mono">
                                                        {formatDateTime(act.created_at)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Narrative Description */}
                                            <p className="text-xs font-medium text-zinc-800 leading-relaxed">
                                                {act.description}
                                            </p>

                                            {/* Expandable Field Diff Section */}
                                            {hasDiff && (
                                                <div className="pt-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleExpand(act.id)}
                                                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 transition-colors"
                                                    >
                                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                        <span>{isExpanded ? "Sembunyikan Rincian Nilai" : "Lihat Rincian Perubahan Data"}</span>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="mt-2 p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-xs font-mono space-y-2 animate-in fade-in duration-150">
                                                            {act.extra_data?.changed_fields && (
                                                                <div>
                                                                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                                                                        Kolom yang Diubah:
                                                                    </span>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {act.extra_data.changed_fields.map((f: string) => (
                                                                            <span key={f} className="bg-zinc-200/80 text-zinc-700 px-1.5 py-0.5 rounded text-[10px]">
                                                                                {f}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-zinc-200">
                                                                {act.old_value && (
                                                                    <div className="p-2 bg-rose-50/50 rounded border border-rose-200/60">
                                                                        <span className="text-[10px] font-bold text-rose-700 block mb-0.5">Nilai Sebelumnya:</span>
                                                                        <pre className="text-[10px] text-zinc-700 whitespace-pre-wrap overflow-x-auto max-h-32">
                                                                            {JSON.stringify(act.old_value, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                )}
                                                                {act.new_value && (
                                                                    <div className="p-2 bg-emerald-50/50 rounded border border-emerald-200/60">
                                                                        <span className="text-[10px] font-bold text-emerald-700 block mb-0.5">Nilai Baru:</span>
                                                                        <pre className="text-[10px] text-zinc-700 whitespace-pre-wrap overflow-x-auto max-h-32">
                                                                            {JSON.stringify(act.new_value, null, 2)}
                                                                        </pre>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Technical Footer Metadata */}
                                            {(act.ip_address || act.user_agent) && (
                                                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400">
                                                    {act.ip_address && (
                                                        <span className="flex items-center gap-1 font-mono">
                                                            <Globe className="w-3 h-3 text-zinc-300" />
                                                            IP: {act.ip_address}
                                                        </span>
                                                    )}
                                                    {act.user_agent && (
                                                        <span className="truncate max-w-[280px]" title={act.user_agent}>
                                                            {act.user_agent.split(" ")[0]}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer with Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs">
                        <span className="text-zinc-500 font-medium">
                            Halaman <strong className="text-zinc-900">{page}</strong> dari <strong className="text-zinc-900">{totalPages}</strong> ({total} total aksi)
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1 || loading}
                                className="text-xs gap-1 py-1 h-8"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages || loading}
                                className="text-xs gap-1 py-1 h-8"
                            >
                                Selanjutnya <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
