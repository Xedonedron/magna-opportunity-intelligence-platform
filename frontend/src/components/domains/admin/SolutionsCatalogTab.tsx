"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Cloud,
    Database,
    Shield,
    Network,
    Plus,
    Search,
    ExternalLink,
    Edit2,
    Trash2,
    Sparkles,
    CheckCircle2,
    Layers,
    Building2,
    Cpu,
    Server,
    Loader2,
    X,
    RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { solutionsApi, MasterSolution, MasterSolutionPayload } from "@/lib/api/solutions";

const PILLAR_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; badgeBg: string }> = {
    "Cloud Infrastructure & Modernization": {
        label: "Cloud & Infra",
        icon: Cloud,
        color: "text-blue-600 dark:text-blue-400",
        badgeBg: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
    },
    "Data Analytics & AI": {
        label: "Data & AI",
        icon: Database,
        color: "text-violet-600 dark:text-violet-400",
        badgeBg: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900",
    },
    "Cybersecurity Suite": {
        label: "Cybersecurity",
        icon: Shield,
        color: "text-emerald-600 dark:text-emerald-400",
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    },
    "Security Management Solution": {
        label: "Security Mgmt",
        icon: Shield,
        color: "text-emerald-600 dark:text-emerald-400",
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    },
    "IT Infrastructure Solution": {
        label: "IT Infrastructure",
        icon: Server,
        color: "text-amber-600 dark:text-amber-400",
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    },
    "Network & Enterprise Workplace": {
        label: "Network & Workplace",
        icon: Network,
        color: "text-cyan-600 dark:text-cyan-400",
        badgeBg: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900",
    },
};

export function SolutionsCatalogTab() {
    const [user, setUser] = useState<{ role?: string; capabilities?: string[] } | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem("moip_user");
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse moip_user", e);
            }
        }
    }, []);

    const canManage = user?.role === "superadmin" || user?.role === "admin" || user?.capabilities?.includes("create_edit");

    const [solutions, setSolutions] = useState<MasterSolution[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedPillar, setSelectedPillar] = useState<string>("all");
    const [selectedTier, setSelectedTier] = useState<number | "all">("all");

    // Modal state
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const [editingSolution, setEditingSolution] = useState<MasterSolution | null>(null);
    const [submitting, setSubmitting] = useState<boolean>(false);

    // Form state
    const [formData, setFormData] = useState<MasterSolutionPayload>({
        title: "",
        pillar: "Data Analytics & AI",
        tier: 1,
        primary_products: [],
        target_industries: ["Enterprise General"],
        business_impact: "",
        pain_points: [],
        key_subheadings: [],
        source_url: "",
        is_active: true,
    });
    const [productsInput, setProductsInput] = useState<string>("");
    const [industriesInput, setIndustriesInput] = useState<string>("");
    const [painPointsInput, setPainPointsInput] = useState<string>("");

    const fetchSolutions = async () => {
        setLoading(true);
        try {
            const data = await solutionsApi.list();
            setSolutions(data.items || []);
        } catch (err) {
            console.error("Failed to load solutions catalog:", err);
            toast.error("Gagal memuat katalog solusi dari server.");
        } finally {
            setLoading(false);
        }
    };
    const [syncing, setSyncing] = useState<boolean>(false);

    const handleSyncMaster = async () => {
        if (!confirm("Sinkronkan seluruh katalog solusi dengan data master resmi (40 solusi terkurasi)? Solusi lama dengan URL tidak valid akan dibersihkan.")) {
            return;
        }
        setSyncing(true);
        try {
            const res = await solutionsApi.syncMasterCatalog();
            toast.success(res.message || "Katalog solusi berhasil disinkronkan dengan data master!");
            await fetchSolutions();
        } catch (err: any) {
            console.error("Failed to sync solutions:", err);
            toast.error(err?.response?.data?.detail || "Gagal menyinkronkan katalog solusi.");
        } finally {
            setSyncing(false);
        }
    };


    useEffect(() => {
        fetchSolutions();
    }, []);

    const openCreateDialog = () => {
        setEditingSolution(null);
        setFormData({
            title: "",
            pillar: "Cloud Infrastructure & Modernization",
            tier: 1,
            primary_products: [],
            target_industries: ["Enterprise General"],
            business_impact: "",
            pain_points: [],
            key_subheadings: [],
            source_url: "",
            is_active: true,
        });
        setProductsInput("");
        setIndustriesInput("Enterprise General");
        setPainPointsInput("");
        setDialogOpen(true);
    };

    const openEditDialog = (item: MasterSolution) => {
        setEditingSolution(item);
        setFormData({
            title: item.title,
            pillar: item.pillar,
            tier: item.tier,
            primary_products: item.primary_products,
            target_industries: item.target_industries,
            business_impact: item.business_impact || "",
            pain_points: item.pain_points || [],
            key_subheadings: item.key_subheadings || [],
            source_url: item.source_url || "",
            is_active: item.is_active,
        });
        setProductsInput((item.primary_products || []).join(", "));
        setIndustriesInput((item.target_industries || []).join(", "));
        setPainPointsInput((item.pain_points || []).join("\n"));
        setDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            toast.error("Judul solusi wajib diisi.");
            return;
        }

        const primary_products = productsInput
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);

        const target_industries = industriesInput
            .split(",")
            .map((i) => i.trim())
            .filter(Boolean);

        const pain_points = painPointsInput
            .split("\n")
            .map((p) => p.trim())
            .filter(Boolean);

        const payload: MasterSolutionPayload = {
            ...formData,
            primary_products,
            target_industries: target_industries.length > 0 ? target_industries : ["Enterprise General"],
            pain_points,
        };

        setSubmitting(true);
        try {
            if (editingSolution) {
                await solutionsApi.update(editingSolution.id, payload);
                toast.success("Solusi berhasil diperbarui!");
            } else {
                await solutionsApi.create(payload);
                toast.success("Solusi baru berhasil ditambahkan!");
            }
            setDialogOpen(false);
            fetchSolutions();
        } catch (err) {
            console.error("Failed to save solution:", err);
            toast.error("Gagal menyimpan data solusi.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Hapus solusi "${title}" dari katalog master?`)) return;
        try {
            await solutionsApi.delete(id);
            toast.success("Solusi berhasil dihapus.");
            setSolutions((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
            console.error("Failed to delete solution:", err);
            toast.error("Gagal menghapus solusi.");
        }
    };

    const filteredSolutions = useMemo(() => {
        return solutions.filter((item) => {
            if (selectedPillar !== "all" && item.pillar !== selectedPillar) return false;
            if (selectedTier !== "all" && item.tier !== selectedTier) return false;
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = item.title.toLowerCase().includes(q);
                const matchProds = (item.primary_products || []).some((p) => p.toLowerCase().includes(q));
                const matchInd = (item.target_industries || []).some((i) => i.toLowerCase().includes(q));
                const matchImpact = (item.business_impact || "").toLowerCase().includes(q);
                if (!matchTitle && !matchProds && !matchInd && !matchImpact) return false;
            }
            return true;
        });
    }, [solutions, selectedPillar, selectedTier, searchQuery]);

    const tier1Count = solutions.filter((s) => s.tier === 1).length;
    const tier2Count = solutions.filter((s) => s.tier === 2).length;

    return (
        <div className="space-y-6">
            {/* Header / Banner */}
            <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-purple-950/30 border border-blue-200/70 dark:border-blue-900/40 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                            Katalog Solusi & Grounding Resmi PT Smartnet Magna Global
                        </h3>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-800 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-200">
                            {solutions.length} Solusi Aktif
                        </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
                        Katalog resmi ini adalah <strong>Single Source of Truth</strong> yang langsung diinjeksikan oleh AI Engine untuk menyusun laporan <strong>KYC Presales</strong>, memetakan arsitektur produk Google Cloud, serta memandu percakapan pada <strong>AI Assistant Chat</strong>.
                    </p>
                </div>

                {canManage && (
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            onClick={handleSyncMaster}
                            disabled={syncing}
                            variant="outline"
                            className="text-xs h-9 gap-1.5 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                            title="Sinkronkan database dengan 40 solusi resmi dan bersihkan link lama"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                            {syncing ? "Menyinkronkan..." : "Sinkronkan Master Data"}
                        </Button>
                        <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 gap-1.5 shadow-sm">
                            <Plus className="w-4 h-4" /> Tambah Solusi Baru
                        </Button>
                    </div>
                )}
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                {/* Search */}
                <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari solusi, produk (e.g. BigQuery, GKE), industri..."
                        className="pl-9 text-xs h-9 bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
                    />
                </div>

                {/* Pillar Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                        variant={selectedPillar === "all" ? "primary" : "outline"}
                        size="sm"
                        onClick={() => setSelectedPillar("all")}
                        className="text-xs h-8 px-3"
                    >
                        Semua ({solutions.length})
                    </Button>
                    {Object.entries(PILLAR_CONFIG).map(([key, config]) => {
                        const count = solutions.filter((s) => s.pillar === key).length;
                        return (
                            <Button
                                key={key}
                                variant={selectedPillar === key ? "primary" : "outline"}
                                size="sm"
                                onClick={() => setSelectedPillar(key)}
                                className="text-xs h-8 px-2.5 gap-1.5"
                            >
                                <config.icon className={`w-3.5 h-3.5 ${selectedPillar === key ? "text-white" : config.color}`} />
                                {config.label} ({count})
                            </Button>
                        );
                    })}
                </div>

                {/* Tier Switcher */}
                <div className="flex items-center gap-1 shrink-0 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-md text-xs">
                    <button
                        type="button"
                        onClick={() => setSelectedTier("all")}
                        className={`px-2.5 py-1 rounded font-medium transition-all ${selectedTier === "all" ? "bg-white dark:bg-zinc-700 shadow-xs text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
                    >
                        Semua
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedTier(1)}
                        className={`px-2.5 py-1 rounded font-medium transition-all ${selectedTier === 1 ? "bg-white dark:bg-zinc-700 shadow-xs text-blue-700 dark:text-blue-300 font-semibold" : "text-zinc-500"}`}
                    >
                        Tier 1: Produk ({tier1Count})
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedTier(2)}
                        className={`px-2.5 py-1 rounded font-medium transition-all ${selectedTier === 2 ? "bg-white dark:bg-zinc-700 shadow-xs text-purple-700 dark:text-purple-300 font-semibold" : "text-zinc-500"}`}
                    >
                        Tier 2: Framework ({tier2Count})
                    </button>
                </div>
            </div>

            {/* Content List */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-zinc-400">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-sm">Memuat katalog solusi master data...</p>
                </div>
            ) : filteredSolutions.length === 0 ? (
                <div className="py-16 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                    <Layers className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto" />
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tidak ada solusi yang cocok dengan filter.</p>
                    <p className="text-xs text-zinc-400">Coba ubah kata kunci pencarian atau reset filter pilar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredSolutions.map((item) => {
                        const pillarInfo = PILLAR_CONFIG[item.pillar] || {
                            label: item.pillar,
                            icon: Layers,
                            color: "text-zinc-600",
                            badgeBg: "bg-zinc-100 text-zinc-700 border-zinc-200",
                        };
                        const Icon = pillarInfo.icon;

                        return (
                            <Card
                                key={item.id}
                                className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                            >
                                <div className="space-y-3">
                                    {/* Top Metadata */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className={`text-[10px] font-semibold py-0.5 px-2 rounded-full border flex items-center gap-1 ${pillarInfo.badgeBg}`}>
                                                <Icon className="w-3 h-3 inline-block" />
                                                {pillarInfo.label}
                                            </span>
                                            <span
                                                className={`text-[10px] font-medium py-0.5 px-2 rounded-full ${item.tier === 1 ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300" : "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"}`}
                                            >
                                                {item.tier === 1 ? "Tier 1: Produk Konkret" : "Tier 2: Framework"}
                                            </span>
                                        </div>

                                        {canManage && (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditDialog(item)}
                                                    className="w-7 h-7 p-0 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                                    title="Edit Solusi"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(item.id, item.title)}
                                                    className="w-7 h-7 p-0 text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                                                    title="Hapus Solusi"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-snug hover:text-blue-600 transition-colors">
                                            {item.title}
                                        </h4>
                                    </div>

                                    {/* Tech Stack Badges */}
                                    {item.primary_products && item.primary_products.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1">
                                            <Cpu className="w-3 h-3 text-zinc-400 shrink-0 mr-0.5" />
                                            {item.primary_products.map((prod) => (
                                                <span
                                                    key={prod}
                                                    className="text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded"
                                                >
                                                    {prod}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Business Impact / Highlights */}
                                    {item.business_impact && (
                                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-3">
                                            {item.business_impact}
                                        </p>
                                    )}

                                    {/* Pain Points */}
                                    {item.pain_points && item.pain_points.length > 0 && (
                                        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-md border border-zinc-100 dark:border-zinc-800/80 space-y-1">
                                            <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                                Kendala yang Diselesaikan:
                                            </p>
                                            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-normal line-clamp-2">
                                                {item.pain_points[0]}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Info / Action */}
                                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                        <Building2 className="w-3 h-3 text-zinc-400" />
                                        <span>{(item.target_industries || []).join(", ") || "Enterprise"}</span>
                                    </div>

                                    {item.source_url && (
                                        <a
                                            href={item.source_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                                        >
                                            Baca Artikel <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Custom Modal Dialog (Tailwind native, reliable on all platforms) */}
            {dialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
                        onClick={() => setDialogOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="relative bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                {editingSolution ? "Edit Solusi Pre-Sales" : "Tambah Solusi Pre-Sales Baru"}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setDialogOpen(false)}
                                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body Form */}
                        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
                            {/* Title */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                    Judul Solusi / Kasus Nyata *
                                </label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Contoh: Real-Time Anti-Fraud & Predictive Analytics untuk FSI"
                                    className="text-xs h-9"
                                    required
                                />
                            </div>

                            {/* Pillar & Tier */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        Pilar Solusi *
                                    </label>
                                    <select
                                        value={formData.pillar}
                                        onChange={(e) => setFormData({ ...formData, pillar: e.target.value })}
                                        className="w-full text-xs h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                                    >
                                        {Object.keys(PILLAR_CONFIG).map((p) => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        Kategori Tier *
                                    </label>
                                    <select
                                        value={formData.tier}
                                        onChange={(e) => setFormData({ ...formData, tier: parseInt(e.target.value) || 1 })}
                                        className="w-full text-xs h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
                                    >
                                        <option value={1}>Tier 1: Produk Konkret & Studi Kasus</option>
                                        <option value={2}>Tier 2: Niche Framework & Presales Strategic</option>
                                    </select>
                                </div>
                            </div>

                            {/* Tech Stack */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                    Produk Teknologi Utama (Pisahkan dengan koma)
                                </label>
                                <Input
                                    value={productsInput}
                                    onChange={(e) => setProductsInput(e.target.value)}
                                    placeholder="Contoh: Dataflow, BigQuery ML, Vertex AI, Pub/Sub, Looker"
                                    className="text-xs h-9"
                                />
                                <p className="text-[11px] text-zinc-400">Kata kunci ini akan dicocokkan otomatis oleh AI saat memetakan rekomendasi solusi klien.</p>
                            </div>

                            {/* Industries */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                    Target Industri (Pisahkan dengan koma)
                                </label>
                                <Input
                                    value={industriesInput}
                                    onChange={(e) => setIndustriesInput(e.target.value)}
                                    placeholder="Contoh: FSI / Banking & Multifinance, Enterprise General"
                                    className="text-xs h-9"
                                />
                            </div>

                            {/* Business Impact */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                    Dampak Bisnis / Value Proposition
                                </label>
                                <textarea
                                    value={formData.business_impact || ""}
                                    onChange={(e) => setFormData({ ...formData, business_impact: e.target.value })}
                                    placeholder="Jelaskan dampak terukur solusi ini bagi klien..."
                                    rows={3}
                                    className="w-full text-xs p-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 resize-y"
                                />
                            </div>

                            {/* Pain Points */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                    Kendala Klien yang Diselesaikan (Satu kendala per baris)
                                </label>
                                <textarea
                                    value={painPointsInput}
                                    onChange={(e) => setPainPointsInput(e.target.value)}
                                    placeholder="Kerugian transaksi fraud tinggi karena sistem batch lambat..."
                                    rows={3}
                                    className="w-full text-xs p-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 resize-y"
                                />
                            </div>

                            {/* Source URL */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                    Link Referensi Artikel / Studi Kasus
                                </label>
                                <Input
                                    value={formData.source_url || ""}
                                    onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                                    placeholder="https://magnaglobal.id/articles/..."
                                    className="text-xs h-9"
                                />
                            </div>

                            {/* Modal Footer */}
                            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                    className="text-xs h-9"
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                                >
                                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                                    Simpan Solusi
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
