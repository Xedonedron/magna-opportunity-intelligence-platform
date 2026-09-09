"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Cpu,
    Coins,
    Activity,
    Sparkles,
    Clock,
    TrendingUp,
    TrendingDown,
    User,
    Briefcase,
    Search,
    MessageSquare,
    Calendar,
    ChevronRight,
    ChevronLeft,
    Copy,
    Check,
    ExternalLink,
    ShieldAlert,
    Filter,
    RefreshCw,
    Layers,
    Eye,
    ChevronDown,
    ChevronUp,
    Loader2,
    DollarSign,
    Terminal,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from "recharts";

export function formatNumber(val?: number): string {
    if (val === undefined || val === null) return "0";
    return val.toLocaleString("id-ID");
}

export function formatUSD(val?: number): string {
    if (val === undefined || val === null) return "$0.00";
    if (val < 0.01 && val > 0) return `$${val.toFixed(4)}`;
    return `$${val.toFixed(2)}`;
}

export function formatIDR(val?: number): string {
    if (val === undefined || val === null) return "Rp 0";
    return `Rp ${Math.round(val).toLocaleString("id-ID")}`;
}

export function formatRelativeTime(dateStr?: string | null): string {
    if (!dateStr) return "-";
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (diffInSeconds < 60) return "Baru saja";
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} jam lalu`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return "Kemarin";
        return `${diffInDays} hari lalu`;
    } catch {
        return dateStr;
    }
}

export function AITokenMonitoringTab() {
    const [subTab, setSubTab] = useState<"overview" | "oppty" | "users" | "audit">("overview");

    // Metrics state
    const [metrics, setMetrics] = useState<any>(null);
    const [loadingMetrics, setLoadingMetrics] = useState(false);

    // Oppty state
    const [opptyData, setOpptyData] = useState<any>({ items: [], total: 0, page: 1, total_pages: 1 });
    const [opptySearch, setOpptySearch] = useState("");
    const [opptyPage, setOpptyPage] = useState(1);
    const [loadingOppty, setLoadingOppty] = useState(false);

    // User state
    const [userData, setUserData] = useState<any>({ items: [], total: 0, page: 1, total_pages: 1 });
    const [userSearch, setUserSearch] = useState("");
    const [userRole, setUserRole] = useState("all");
    const [userPage, setUserPage] = useState(1);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Audit Queries state
    const [auditData, setAuditData] = useState<any>({ items: [], total: 0, page: 1, total_pages: 1 });
    const [auditSearch, setAuditSearch] = useState("");
    const [auditUserId, setAuditUserId] = useState<string>("");
    const [auditOpptyId, setAuditOpptyId] = useState<string>("");
    const [auditPage, setAuditPage] = useState(1);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);

    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // 1. Fetch Metrics
    const fetchMetrics = useCallback(async () => {
        setLoadingMetrics(true);
        try {
            const res = await api.get("/api/admin/ai/metrics");
            setMetrics(res.data);
        } catch (e) {
            console.error("Failed to load AI metrics", e);
        } finally {
            setLoadingMetrics(false);
        }
    }, []);

    // 2. Fetch Oppty Usage
    const fetchOpptyUsage = useCallback(async () => {
        setLoadingOppty(true);
        try {
            const params: any = { page: opptyPage, page_size: 10 };
            if (opptySearch.trim()) params.search = opptySearch.trim();
            const res = await api.get("/api/admin/ai/usage/by-opportunity", { params });
            setOpptyData(res.data);
        } catch (e) {
            console.error("Failed to load Oppty AI usage", e);
        } finally {
            setLoadingOppty(false);
        }
    }, [opptyPage, opptySearch]);

    // 3. Fetch User Usage
    const fetchUserUsage = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const params: any = { page: userPage, page_size: 10 };
            if (userSearch.trim()) params.search = userSearch.trim();
            if (userRole !== "all") params.role = userRole;
            const res = await api.get("/api/admin/ai/usage/by-user", { params });
            setUserData(res.data);
        } catch (e) {
            console.error("Failed to load User AI usage", e);
        } finally {
            setLoadingUsers(false);
        }
    }, [userPage, userSearch, userRole]);

    // 4. Fetch Audit Queries
    const fetchAuditQueries = useCallback(async () => {
        setLoadingAudit(true);
        try {
            const params: any = { page: auditPage, page_size: 10 };
            if (auditSearch.trim()) params.search = auditSearch.trim();
            if (auditUserId) params.user_id = auditUserId;
            if (auditOpptyId) params.opportunity_id = auditOpptyId;
            const res = await api.get("/api/admin/ai/assistant-queries", { params });
            setAuditData(res.data);
        } catch (e) {
            console.error("Failed to load AI queries audit", e);
        } finally {
            setLoadingAudit(false);
        }
    }, [auditPage, auditSearch, auditUserId, auditOpptyId]);

    // Initial load
    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    useEffect(() => {
        if (subTab === "oppty") fetchOpptyUsage();
        if (subTab === "users") fetchUserUsage();
        if (subTab === "audit") fetchAuditQueries();
    }, [subTab, fetchOpptyUsage, fetchUserUsage, fetchAuditQueries]);

    // Drill down helper: Jump to audit tab with specific user/oppty filter
    const filterAuditByUser = (userId: string) => {
        setAuditUserId(userId);
        setAuditOpptyId("");
        setAuditPage(1);
        setSubTab("audit");
    };

    const filterAuditByOppty = (opptyId: string) => {
        setAuditOpptyId(opptyId);
        setAuditUserId("");
        setAuditPage(1);
        setSubTab("audit");
    };

    const todayTokens = metrics?.today?.total_tokens ?? 0;
    const yesterdayTokens = metrics?.yesterday?.total_tokens ?? 0;
    const tokenDiffPercent = yesterdayTokens > 0
        ? Math.round(((todayTokens - yesterdayTokens) / yesterdayTokens) * 100)
        : (todayTokens > 0 ? 100 : 0);

    return (
        <div className="space-y-6">
            {/* Header Title & Refresh */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                    <div className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            AI Token & Cost Monitoring
                        </h2>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Pemantauan penggunaan token internal mandiri, estimasi biaya pricing, atribusi per peluang & user, serta audit transparansi query AI Assistant.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            fetchMetrics();
                            if (subTab === "oppty") fetchOpptyUsage();
                            if (subTab === "users") fetchUserUsage();
                            if (subTab === "audit") fetchAuditQueries();
                        }}
                        className="text-xs flex items-center gap-1.5 h-8"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingMetrics ? "animate-spin" : ""}`} />
                        Segarkan
                    </Button>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Today Tokens */}
                <Card className="p-4 relative overflow-hidden bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-zinc-900 border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Token Hari Ini</span>
                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                            <Cpu className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                            {formatNumber(todayTokens)}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                            <span className="text-zinc-500 dark:text-zinc-400">
                                In: {formatNumber(metrics?.today?.prompt_tokens)} | Out: {formatNumber(metrics?.today?.completion_tokens)}
                            </span>
                            {tokenDiffPercent !== 0 && (
                                <span className={`flex items-center font-medium ${tokenDiffPercent > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"}`}>
                                    {tokenDiffPercent > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                                    {tokenDiffPercent > 0 ? `+${tokenDiffPercent}%` : `${tokenDiffPercent}%`}
                                </span>
                            )}
                        </div>
                    </div>
                </Card>

                {/* 2. Today Cost */}
                <Card className="p-4 relative overflow-hidden bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-zinc-900 border-emerald-100 dark:border-emerald-900/50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Estimasi Biaya Hari Ini</span>
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                            <Coins className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                            {formatUSD(metrics?.today?.cost_usd)}
                        </div>
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 font-medium">
                            ≈ {formatIDR(metrics?.today?.cost_idr)}
                            <span className="text-zinc-400 dark:text-zinc-500 ml-1.5 font-normal">
                                (All-time: {formatUSD(metrics?.all_time?.cost_usd)})
                            </span>
                        </div>
                    </div>
                </Card>

                {/* 3. AI Invocations */}
                <Card className="p-4 relative overflow-hidden bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-zinc-900 border-blue-100 dark:border-blue-900/50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Panggilan AI Hari Ini</span>
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                            <Activity className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                            {formatNumber(metrics?.today?.requests_count)}
                            <span className="text-xs font-normal text-zinc-500 ml-1">panggilan</span>
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{metrics?.today?.active_users ?? 0} user aktif menggunakan AI</span>
                        </div>
                    </div>
                </Card>

                {/* 4. Top Model */}
                <Card className="p-4 relative overflow-hidden bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-zinc-900 border-purple-100 dark:border-purple-900/50">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Model Teratas</span>
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                            <Sparkles className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate" title={metrics?.model_breakdown?.[0]?.model_name || "N/A"}>
                            {metrics?.model_breakdown?.[0]?.model_name || "Belum ada data"}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            {metrics?.model_breakdown?.[0]?.share_percentage ?? 0}% dari seluruh konsumsi token
                        </div>
                    </div>
                </Card>
            </div>

            {/* Sub-Tabs Navigation */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-1 sm:gap-2">
                <button
                    onClick={() => setSubTab("overview")}
                    className={`pb-3 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${
                        subTab === "overview"
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold"
                            : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                    }`}
                >
                    <TrendingUp className="w-4 h-4" />
                    Tren & Distribusi
                </button>
                <button
                    onClick={() => setSubTab("oppty")}
                    className={`pb-3 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${
                        subTab === "oppty"
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold"
                            : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                    }`}
                >
                    <Briefcase className="w-4 h-4" />
                    Per Opportunity
                </button>
                <button
                    onClick={() => setSubTab("users")}
                    className={`pb-3 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${
                        subTab === "users"
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold"
                            : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                    }`}
                >
                    <User className="w-4 h-4" />
                    Per User (Abuse Monitor)
                </button>
                <button
                    onClick={() => setSubTab("audit")}
                    className={`pb-3 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${
                        subTab === "audit"
                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold"
                            : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                    }`}
                >
                    <Terminal className="w-4 h-4" />
                    Audit Query & Prompt AI
                    {auditUserId || auditOpptyId ? (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    ) : null}
                </button>
            </div>

            {/* TAB 1: OVERVIEW & TRENDS */}
            {subTab === "overview" && (
                <div className="space-y-6">
                    {/* Daily Trend Chart */}
                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                    Tren Konsumsi Token Harian (14 Hari Terakhir)
                                </h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    Volume token dan panggilan model AI per hari.
                                </p>
                            </div>
                        </div>

                        <div className="h-64 w-full">
                            {metrics?.daily_trend && metrics.daily_trend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metrics.daily_trend}>
                                        <defs>
                                            <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                                        <XAxis dataKey="display_date" stroke="#9ca3af" fontSize={11} />
                                        <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#1f2937",
                                                border: "none",
                                                borderRadius: "8px",
                                                fontSize: "12px",
                                                color: "#f3f4f6",
                                            }}
                                            formatter={(value: any) => [`${formatNumber(value)} token`, "Penggunaan"]}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="tokens"
                                            stroke="#6366f1"
                                            strokeWidth={2}
                                            fillOpacity={1}
                                            fill="url(#tokenGradient)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                                    Belum ada data tren harian tercatat.
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Model & Feature Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Model Distribution */}
                        <Card className="p-5">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
                                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                Distribusi Model LLM
                            </h3>
                            <div className="space-y-3">
                                {metrics?.model_breakdown && metrics.model_breakdown.length > 0 ? (
                                    metrics.model_breakdown.map((m: any, idx: number) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                                    {m.model_name}
                                                </span>
                                                <span className="text-zinc-500 dark:text-zinc-400 font-mono">
                                                    {formatNumber(m.total_tokens)} token ({m.share_percentage}%) • {formatUSD(m.cost_usd)}
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
                                                    style={{ width: `${Math.min(100, Math.max(2, m.share_percentage))}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-zinc-400 text-center py-6">
                                        Belum ada riwayat model tercatat.
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Feature Breakdown */}
                        <Card className="p-5">
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-3">
                                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                Distribusi Fitur AI
                            </h3>
                            <div className="space-y-3">
                                {metrics?.feature_breakdown && metrics.feature_breakdown.length > 0 ? (
                                    metrics.feature_breakdown.map((f: any, idx: number) => {
                                        const featureLabels: Record<string, string> = {
                                            opportunity_chat: "AI Pre-sales Assistant (Chat Embed)",
                                            kyc_generation: "Riset KYC Pipeline Otomatis",
                                            persona_generation: "Target Persona & Playbook Gen",
                                            ai_validation: "AI Validation & Grounding",
                                            test_connection: "Pengujian Koneksi Admin",
                                        };
                                        const label = featureLabels[f.feature] || f.feature;
                                        return (
                                            <div key={idx} className="p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                                <div>
                                                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                        {label}
                                                    </div>
                                                    <div className="text-[11px] text-zinc-500 mt-0.5">
                                                        {formatNumber(f.count)} kali dieksekusi
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
                                                        {formatNumber(f.total_tokens)} token
                                                    </div>
                                                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                                                        {formatUSD(f.cost_usd)} ({formatIDR(f.cost_idr)})
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-xs text-zinc-400 text-center py-6">
                                        Belum ada riwayat fitur tercatat.
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB 2: PER OPPORTUNITY */}
            {subTab === "oppty" && (
                <Card className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                Penggunaan Token per Opportunity
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Identifikasi peluang atau deal yang paling intensif menggunakan AI Assistant dan riset KYC.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative w-full sm:w-64">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                                <Input
                                    value={opptySearch}
                                    onChange={(e) => {
                                        setOpptySearch(e.target.value);
                                        setOpptyPage(1);
                                    }}
                                    placeholder="Cari nama atau ID..."
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                                    <th className="py-2.5 px-3">Opportunity</th>
                                    <th className="py-2.5 px-3">Opportunity ID</th>
                                    <th className="py-2.5 px-3 text-right">Total Token</th>
                                    <th className="py-2.5 px-3 text-right">Estimasi Biaya</th>
                                    <th className="py-2.5 px-3 text-center">Chat / Total Panggilan</th>
                                    <th className="py-2.5 px-3">Terakhir Dipakai</th>
                                    <th className="py-2.5 px-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                                {loadingOppty ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-zinc-400">
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                                            Memuat data penggunaan per opportunity...
                                        </td>
                                    </tr>
                                ) : opptyData.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-zinc-400">
                                            Tidak ditemukan riwayat penggunaan AI untuk kriteria ini.
                                        </td>
                                    </tr>
                                ) : (
                                    opptyData.items.map((item: any) => (
                                        <tr key={item.opportunity_id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                                            <td className="py-3 px-3">
                                                <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                                    {item.company_name}
                                                </div>
                                                <div className="text-[11px] text-zinc-400">
                                                    {item.industry}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-1 rounded w-fit">
                                                    <span className="truncate max-w-[120px]">{item.opportunity_id}</span>
                                                    <button
                                                        onClick={() => handleCopy(item.opportunity_id, item.opportunity_id)}
                                                        title="Salin ID"
                                                        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                                    >
                                                        {copiedId === item.opportunity_id ? (
                                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                                {formatNumber(item.total_tokens)}
                                                <div className="text-[10px] text-zinc-400 font-normal">
                                                    In: {formatNumber(item.prompt_tokens)} | Out: {formatNumber(item.completion_tokens)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-right font-mono">
                                                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatUSD(item.cost_usd)}
                                                </div>
                                                <div className="text-[10px] text-zinc-500">
                                                    {formatIDR(item.cost_idr)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className="font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-medium">
                                                    {item.chat_count} chat / {item.requests_count} calls
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400 text-[11px]">
                                                {formatRelativeTime(item.last_used_at)}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => filterAuditByOppty(item.opportunity_id)}
                                                    className="h-7 text-[11px] px-2 flex items-center gap-1"
                                                >
                                                    <Terminal className="w-3 h-3 text-indigo-500" />
                                                    Audit Query
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {opptyData.total_pages > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                            <span className="text-zinc-500">
                                Menampilkan halaman {opptyData.page} dari {opptyData.total_pages} ({opptyData.total} peluang)
                            </span>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={opptyPage <= 1}
                                    onClick={() => setOpptyPage((p) => Math.max(1, p - 1))}
                                    className="h-7 px-2"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={opptyPage >= opptyData.total_pages}
                                    onClick={() => setOpptyPage((p) => p + 1)}
                                    className="h-7 px-2"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* TAB 3: PER USER (ABUSE DETECTION) */}
            {subTab === "users" && (
                <Card className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-amber-500" />
                                Penggunaan Token per User (Abuse Prevention)
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Pantau konsumsi token per akun pengguna dan frekuensi query AI Assistant untuk mendeteksi potensi pemborosan kuota.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={userRole}
                                onChange={(e) => {
                                    setUserRole(e.target.value);
                                    setUserPage(1);
                                }}
                                className="h-9 text-xs rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 text-zinc-700 dark:text-zinc-300"
                            >
                                <option value="all">Semua Role</option>
                                <option value="superadmin">Superadmin</option>
                                <option value="admin">Admin</option>
                                <option value="presales">Presales</option>
                                <option value="engineer">Engineer</option>
                                <option value="lead_gen">Lead Gen</option>
                            </select>
                            <div className="relative w-full sm:w-60">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                                <Input
                                    value={userSearch}
                                    onChange={(e) => {
                                        setUserSearch(e.target.value);
                                        setUserPage(1);
                                    }}
                                    placeholder="Cari user..."
                                    className="pl-9 h-9 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                                    <th className="py-2.5 px-3">Pengguna</th>
                                    <th className="py-2.5 px-3">Role</th>
                                    <th className="py-2.5 px-3 text-right">Total Token</th>
                                    <th className="py-2.5 px-3 text-center">Query AI Assistant</th>
                                    <th className="py-2.5 px-3 text-right">Estimasi Biaya</th>
                                    <th className="py-2.5 px-3">Terakhir Aktif AI</th>
                                    <th className="py-2.5 px-3 text-center">Aksi Audit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                                {loadingUsers ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-zinc-400">
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                                            Memuat data konsumsi token per user...
                                        </td>
                                    </tr>
                                ) : userData.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-zinc-400">
                                            Tidak ditemukan data penggunaan AI untuk kriteria ini.
                                        </td>
                                    </tr>
                                ) : (
                                    userData.items.map((u: any) => {
                                        const isHighChatUser = u.chat_count > 30;
                                        return (
                                            <tr key={u.user_id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                                                <td className="py-3 px-3">
                                                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                                        {u.full_name}
                                                    </div>
                                                    <div className="text-[11px] text-zinc-400">
                                                        {u.email}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                                    {formatNumber(u.total_tokens)}
                                                    <div className="text-[10px] text-zinc-400 font-normal">
                                                        In: {formatNumber(u.prompt_tokens)} | Out: {formatNumber(u.completion_tokens)}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <span className={`font-mono px-2 py-0.5 rounded-full font-bold ${
                                                            isHighChatUser
                                                                ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                                                                : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                                                        }`}>
                                                            {u.chat_count} queries
                                                        </span>
                                                        {isHighChatUser && (
                                                            <span title="User intensif query AI" className="text-amber-500">⚠️</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono">
                                                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                                        {formatUSD(u.cost_usd)}
                                                    </div>
                                                    <div className="text-[10px] text-zinc-500">
                                                        {formatIDR(u.cost_idr)}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400 text-[11px]">
                                                    {formatRelativeTime(u.last_used_at)}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => filterAuditByUser(u.user_id)}
                                                        className="h-7 text-[11px] px-2 flex items-center gap-1"
                                                    >
                                                        <Terminal className="w-3 h-3 text-indigo-500" />
                                                        Audit Prompt
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {userData.total_pages > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                            <span className="text-zinc-500">
                                Menampilkan halaman {userData.page} dari {userData.total_pages} ({userData.total} user)
                            </span>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={userPage <= 1}
                                    onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                                    className="h-7 px-2"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={userPage >= userData.total_pages}
                                    onClick={() => setUserPage((p) => p + 1)}
                                    className="h-7 px-2"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            )}

            {/* TAB 4: AUDIT QUERY & PROMPT AI ASSISTANT (TRANSPARANSI PENUH) */}
            {subTab === "audit" && (
                <Card className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                Audit Query & Prompt AI Assistant (Transparansi)
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Inspeksi langsung pertanyaan apa saja yang diajukan oleh pengguna ke asisten AI untuk memantau topik dan mendeteksi penyalahgunaan.
                            </p>
                        </div>
                        {(auditUserId || auditOpptyId) && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1.5">
                                    Filter aktif: {auditUserId ? "User Terpilih" : "Opportunity Terpilih"}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setAuditUserId("");
                                        setAuditOpptyId("");
                                        setAuditPage(1);
                                    }}
                                    className="h-7 text-xs text-zinc-500 hover:text-zinc-800"
                                >
                                    Reset Filter
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Filter Bar */}
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                            <Input
                                value={auditSearch}
                                onChange={(e) => {
                                    setAuditSearch(e.target.value);
                                    setAuditPage(1);
                                }}
                                placeholder="Cari isi prompt, nama pengguna, atau peluang..."
                                className="pl-9 h-9 text-xs"
                            />
                        </div>
                    </div>

                    {/* Feed of Queries */}
                    <div className="space-y-3">
                        {loadingAudit ? (
                            <div className="py-12 text-center text-zinc-400">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                                Memuat log query AI Assistant...
                            </div>
                        ) : auditData.items.length === 0 ? (
                            <div className="py-12 text-center text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                                <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                                    Belum ada query yang tercatat.
                                </div>
                                <div className="text-[11px] text-zinc-400 mt-0.5">
                                    Setiap pertanyaan pengguna ke AI Assistant akan langsung muncul di sini secara real-time.
                                </div>
                            </div>
                        ) : (
                            auditData.items.map((log: any) => {
                                const isExpanded = expandedPromptId === log.id;
                                return (
                                    <div
                                        key={log.id}
                                        className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all space-y-3"
                                    >
                                        {/* Row Header: User, Opportunity, Timestamp */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                                                    <User className="w-3.5 h-3.5 text-indigo-500" />
                                                    <span>{log.user?.full_name}</span>
                                                    <span className="text-[10px] font-normal text-zinc-400">
                                                        ({log.user?.email})
                                                    </span>
                                                    <span className="px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                                        {log.user?.role}
                                                    </span>
                                                </div>

                                                <span className="text-zinc-300 dark:text-zinc-700">•</span>

                                                <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                                                    <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                                                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                                        {log.opportunity?.company_name}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[11px] text-zinc-400">
                                                    {new Date(log.created_at).toLocaleString("id-ID", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        second: "2-digit",
                                                    })}
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                                                    {log.model_name}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Prompt Content Box (The exact query sent by user!) */}
                                        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80 text-xs">
                                            <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1 mb-1">
                                                <MessageSquare className="w-3 h-3 text-indigo-500" />
                                                Prompt / Pertanyaan User:
                                            </div>
                                            <div className="font-mono text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
                                                {log.query_prompt || "<Tidak ada rekaman teks prompt>"}
                                            </div>
                                        </div>

                                        {/* Token & Cost Badge footer + Expand AI Response button */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                                            <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500">
                                                <span>Total Token: <strong className="text-zinc-800 dark:text-zinc-200">{formatNumber(log.total_tokens)}</strong> ({log.prompt_tokens} in / {log.completion_tokens} out)</span>
                                                <span>Biaya: <strong className="text-emerald-600 dark:text-emerald-400">{formatUSD(log.cost_usd)}</strong> ({formatIDR(log.cost_idr)})</span>
                                                {log.duration_ms && (
                                                    <span>Durasi: <strong className="text-zinc-700 dark:text-zinc-300">{(log.duration_ms / 1000).toFixed(1)}s</strong></span>
                                                )}
                                            </div>

                                            {log.response_preview && (
                                                <button
                                                    onClick={() => setExpandedPromptId(isExpanded ? null : log.id)}
                                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                                                >
                                                    {isExpanded ? (
                                                        <>Tutup Respons AI <ChevronUp className="w-3.5 h-3.5" /></>
                                                    ) : (
                                                        <>Lihat Jawaban AI <ChevronDown className="w-3.5 h-3.5" /></>
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {/* Expanded AI Response Preview */}
                                        {isExpanded && log.response_preview && (
                                            <div className="p-3 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs mt-2 animate-in fade-in-50">
                                                <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1 mb-1">
                                                    <Sparkles className="w-3 h-3 text-indigo-500" />
                                                    Jawaban Asisten AI:
                                                </div>
                                                <div className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto pr-1">
                                                    {log.response_preview}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    {auditData.total_pages > 1 && (
                        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                            <span className="text-zinc-500">
                                Menampilkan halaman {auditData.page} dari {auditData.total_pages} ({auditData.total} catatan prompt)
                            </span>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={auditPage <= 1}
                                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                                    className="h-7 px-2"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={auditPage >= auditData.total_pages}
                                    onClick={() => setAuditPage((p) => p + 1)}
                                    className="h-7 px-2"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}
