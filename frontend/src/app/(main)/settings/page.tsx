"use client";

import { useState, useEffect } from "react";
import {
    Settings,
    User,
    BrainCircuit,
    BookOpen,
    CheckCircle2,
    Shield,
    Database,
    Network,
    Cloud,
    HelpCircle,
    Info,
    Users,
    Loader2,
    AlertCircle,
    Save,
    Plus,
    Trash2,
    X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { fetchMasterData, updateMasterData, getMasterIndustries, getMasterPresales } from "@/lib/master-data";

const tabs = [
    { id: "profile", label: "User Profile", icon: User },
    { id: "ai", label: "AI & Pipeline", icon: BrainCircuit },
    { id: "catalog", label: "Magna Solutions Catalog", icon: BookOpen },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("profile");

    // Profile State
    const [user, setUser] = useState<{ full_name: string; email: string; role: string } | null>(null);
    const [fullName, setFullName] = useState("");

    // AI Settings State
    const [llmProvider, setLlmProvider] = useState("google");
    const [aiModel, setAiModel] = useState("gemma-4-26b-a4b-it");
    const [temperature, setTemperature] = useState(0.0);
    const [searchDepth, setSearchDepth] = useState("advanced");
    const [maxResults, setMaxResults] = useState(5);
    const [geminiApiKey, setGeminiApiKey] = useState("");
    const [openaiApiKey, setOpenaiApiKey] = useState("");
    const [maskedGeminiKey, setMaskedGeminiKey] = useState("");
    const [maskedOpenaiKey, setMaskedOpenaiKey] = useState("");
    const [savingAiSettings, setSavingAiSettings] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null);

    // Operations State
    const [metrics, setMetrics] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingOps, setLoadingOps] = useState(false);

    // User Management State
    const [userList, setUserList] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userListError, setUserListError] = useState<string | null>(null);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editDraft, setEditDraft] = useState<{ role: string; capabilities: string; is_active: boolean } | null>(null);
    const [savingUserId, setSavingUserId] = useState<string | null>(null);

    // Master Data State
    const [masterIndustries, setMasterIndustries] = useState<string[]>([]);
    const [masterPresales, setMasterPresales] = useState<string[]>([]);
    const [newIndustry, setNewIndustry] = useState("");
    const [newPresales, setNewPresales] = useState("");
    const [savingMasterData, setSavingMasterData] = useState(false);

    // Save alerts
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");

    const isSuperAdmin = user?.role === "superadmin";

    // Dynamic Tabs list
    const activeTabs = [
        { id: "profile", label: "User Profile", icon: User },
        { id: "catalog", label: "Magna Solutions Catalog", icon: BookOpen },
    ];
    if (isSuperAdmin) {
        activeTabs.push({ id: "ai", label: "AI & Pipeline", icon: BrainCircuit });
        activeTabs.push({ id: "master_data", label: "Master Data (Presales & Industry)", icon: Database });
        activeTabs.push({ id: "users", label: "User Management", icon: Users });
        activeTabs.push({ id: "operations", label: "System Operations", icon: Shield });
    }

    const fetchServerSettings = async () => {
        try {
            const res = await api.get("/api/admin/settings");
            const data = res.data;
            if (data) {
                setLlmProvider(data.llm_provider || "google");
                setAiModel(data.ai_model || "gemma-4-26b-a4b-it");
                setTemperature(data.temperature ?? 0.0);
                setSearchDepth(data.search_depth || "advanced");
                setMaxResults(data.max_results ?? 5);
                setMaskedGeminiKey(data.masked_gemini_key || "");
                setMaskedOpenaiKey(data.masked_openai_key || "");
            }
        } catch (e) {
            console.error("Failed to load settings from server, falling back to localStorage", e);
        }
    };

    // Load from localStorage & server on mount
    useEffect(() => {
        const storedUser = localStorage.getItem("moip_user");
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                setUser(parsed);
                setFullName(parsed.full_name || "");
            } catch (e) {
                console.error("Failed to parse moip_user", e);
            }
        }

        const storedAi = localStorage.getItem("moip_ai_settings");
        if (storedAi) {
            try {
                const parsed = JSON.parse(storedAi);
                setLlmProvider(parsed.provider || "google");
                setAiModel(parsed.model || "gemma-4-26b-a4b-it");
                setTemperature(parsed.temperature ?? 0.0);
                setSearchDepth(parsed.search_depth || "advanced");
                setMaxResults(parsed.max_results ?? 5);
            } catch (e) {
                console.error("Failed to parse moip_ai_settings", e);
            }
        }

        fetchServerSettings();

        fetchMasterData().then((data) => {
            setMasterIndustries(data.industries);
            setMasterPresales(data.presales);
        });
    }, []);

    const handleAddIndustry = () => {
        if (!newIndustry.trim()) return;
        if (masterIndustries.includes(newIndustry.trim())) return;
        setMasterIndustries([...masterIndustries, newIndustry.trim()]);
        setNewIndustry("");
    };

    const handleRemoveIndustry = (item: string) => {
        setMasterIndustries(masterIndustries.filter((i) => i !== item));
    };

    const handleAddPresales = () => {
        if (!newPresales.trim()) return;
        if (masterPresales.includes(newPresales.trim())) return;
        setMasterPresales([...masterPresales, newPresales.trim()]);
        setNewPresales("");
    };

    const handleRemovePresales = (item: string) => {
        setMasterPresales(masterPresales.filter((p) => p !== item));
    };

    const handleSaveMasterData = async () => {
        setSavingMasterData(true);
        try {
            await updateMasterData({
                industries: masterIndustries,
                presales: masterPresales,
            });
            showToast("Master Data (Pre-Sales & Industry) berhasil disimpan!");
        } catch (e) {
            showToast("Gagal menyimpan Master Data.");
        } finally {
            setSavingMasterData(false);
        }
    };

    const handleSaveProfile = () => {
        if (!user) return;
        const updatedUser = { ...user, full_name: fullName };
        localStorage.setItem("moip_user", JSON.stringify(updatedUser));
        setUser(updatedUser);

        showToast("Profil berhasil diperbarui!");

        // Trigger page reload after brief delay so sidebar updates dynamically
        setTimeout(() => {
            window.location.reload();
        }, 800);
    };

    const handleSaveAISettings = async () => {
        setSavingAiSettings(true);
        try {
            await api.patch("/api/admin/settings", {
                llm_provider: llmProvider,
                ai_model: aiModel,
                temperature,
                search_depth: searchDepth,
                max_results: maxResults,
                gemini_api_key: geminiApiKey.trim() || undefined,
                openai_api_key: openaiApiKey.trim() || undefined,
            });

            const aiSettings = {
                provider: llmProvider,
                model: aiModel,
                temperature,
                search_depth: searchDepth,
                max_results: maxResults,
            };
            localStorage.setItem("moip_ai_settings", JSON.stringify(aiSettings));

            showToast("Pengaturan AI Pipeline & Provider berhasil disimpan ke server!");
            setGeminiApiKey("");
            setOpenaiApiKey("");
            fetchServerSettings();
        } catch (e: any) {
            console.error("Gagal menyimpan ke server", e);
            const msg = e?.response?.data?.detail || "Gagal menyimpan ke server.";
            showToast(msg);
        } finally {
            setSavingAiSettings(false);
        }
    };

    const handleTestConnection = async () => {
        setTestingConnection(true);
        setTestResult(null);
        try {
            const currentKey = llmProvider === "google" ? geminiApiKey : openaiApiKey;
            const res = await api.post("/api/admin/settings/test-connection", {
                provider: llmProvider,
                model: aiModel,
                api_key: currentKey.trim() || undefined,
            });
            setTestResult(res.data);
        } catch (e: any) {
            setTestResult({
                status: "error",
                message: e?.response?.data?.detail || "Gagal menguji koneksi ke LLM Provider.",
            });
        } finally {
            setTestingConnection(false);
        }
    };

    const showToast = (message: string) => {
        setSaveMessage(message);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    useEffect(() => {
        if (activeTab === "operations" && user?.role === "superadmin") {
            async function fetchAdminData() {
                setLoadingOps(true);
                try {
                    const metricsRes = await api.get("/api/admin/metrics");
                    setMetrics(metricsRes.data);

                    const logsRes = await api.get("/api/admin/logs?limit=30");
                    setLogs(logsRes.data.items);
                } catch (e) {
                    console.error("Gagal mengambil data operasional admin", e);
                } finally {
                    setLoadingOps(false);
                }
            }
            fetchAdminData();
        }

        if (activeTab === "users" && user?.role === "superadmin") {
            async function fetchUsers() {
                setLoadingUsers(true);
                setUserListError(null);
                try {
                    const res = await api.get("/api/admin/users");
                    setUserList(res.data);
                } catch (e: any) {
                    setUserListError("Gagal memuat daftar pengguna.");
                } finally {
                    setLoadingUsers(false);
                }
            }
            fetchUsers();
        }
    }, [activeTab, user]);

    const ROLE_OPTIONS = ["viewer", "engineer", "sales", "presales", "lgo", "manager", "superadmin"];

    const ROLE_DEFAULTS: Record<string, string> = {
        viewer: "view",
        engineer: "view,generate_kyc",
        sales: "view,create_edit,delete,generate_kyc",
        presales: "view,create_edit,delete,generate_kyc",
        lgo: "view,create_edit,delete,generate_kyc",
        manager: "view,create_edit,delete,generate_kyc",
        superadmin: "view,create_edit,delete,generate_kyc,user_management",
    };

    const ALL_CAPS = ["view", "create_edit", "delete", "generate_kyc", "user_management"];
    const CAP_LABELS: Record<string, string> = {
        view: "View",
        create_edit: "Create & Edit",
        delete: "Delete",
        generate_kyc: "Generate KYC",
        user_management: "User Management",
    };

    const startEditing = (u: any) => {
        setEditingUserId(u.id);
        setEditDraft({ role: u.role, capabilities: u.capabilities || "view", is_active: u.is_active });
    };

    const cancelEditing = () => {
        setEditingUserId(null);
        setEditDraft(null);
    };

    const toggleCap = (cap: string) => {
        if (!editDraft) return;
        const caps = editDraft.capabilities.split(",").map((c) => c.trim()).filter(Boolean);
        const next = caps.includes(cap) ? caps.filter((c) => c !== cap) : [...caps, cap];
        setEditDraft({ ...editDraft, capabilities: next.join(",") });
    };

    const handleRoleChange = (role: string) => {
        if (!editDraft) return;
        setEditDraft({ ...editDraft, role, capabilities: ROLE_DEFAULTS[role] || "view" });
    };

    const handleSaveUser = async (userId: string) => {
        if (!editDraft) return;
        setSavingUserId(userId);
        try {
            await api.patch(`/api/admin/users/${userId}`, editDraft);
            setUserList((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, ...editDraft } : u))
            );
            cancelEditing();
            showToast("Akses pengguna berhasil diperbarui!");
        } catch (e: any) {
            const msg = e?.response?.data?.detail || "Gagal menyimpan perubahan.";
            showToast(msg);
        } finally {
            setSavingUserId(null);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="border-b border-zinc-200 pb-6">
                <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                    <Settings className="w-8 h-8 text-zinc-800" /> Settings
                </h1>
                <p className="text-zinc-500 text-sm mt-1">
                    Konfigurasi profil Anda dan atur parameter kecerdasan buatan (AI) pendukung KYC.
                </p>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-zinc-200 gap-4">
                {activeTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.id
                            ? "border-zinc-900 text-zinc-900"
                            : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Toast Success Alert */}
            {saveSuccess && (
                <div className="bg-emerald-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-medium">{saveMessage}</span>
                </div>
            )}

            {/* Tab Contents */}
            <div className="space-y-6">
                {/* 1. Profile Tab */}
                {activeTab === "profile" && (
                    <Card className="p-6 bg-white border border-zinc-200 space-y-6">
                        <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
                            <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200">
                                <User className="w-6 h-6 text-zinc-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-900">{user?.full_name || "User"}</h3>
                                <p className="text-xs text-zinc-400 font-mono mt-0.5 uppercase">{user?.role || "Engineer"}</p>
                            </div>
                        </div>

                        <div className="space-y-4 max-w-md">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-500 uppercase">Nama Lengkap</label>
                                <Input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Masukkan nama lengkap Anda"
                                />
                            </div>

                            <div className="space-y-1.5 opacity-60">
                                <label className="text-xs font-semibold text-zinc-500 uppercase">Email</label>
                                <Input
                                    value={user?.email || ""}
                                    disabled
                                    className="bg-zinc-50 select-none cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-100 flex justify-end">
                            <Button onClick={handleSaveProfile}>Simpan Profil</Button>
                        </div>
                    </Card>
                )}

                {/* 2. AI Settings Tab */}
                {activeTab === "ai" && isSuperAdmin && (
                    <Card className="p-6 bg-white border border-zinc-200 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-zinc-900">Konfigurasi AI Pipeline & Multi-Provider LLM</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                Pilih provider kecerdasan buatan (Google AI Studio vs OpenAI Compatible), atur API Key, dan tentukan model inference pendukung KYC.
                            </p>
                        </div>

                        <div className="space-y-6 max-w-xl">
                            {/* LLM Provider Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-700 uppercase tracking-wider flex items-center gap-1">
                                    Aktif LLM Provider <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        disabled={!isSuperAdmin}
                                        onClick={() => {
                                            if (!isSuperAdmin) return;
                                            setLlmProvider("google");
                                            setAiModel("gemma-4-26b-a4b-it");
                                        }}
                                        className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${!isSuperAdmin ? "opacity-80 cursor-not-allowed " : ""
                                            }${llmProvider === "google"
                                                ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600"
                                                : "border-zinc-200 bg-white hover:border-zinc-300"
                                            }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-zinc-900">Google AI Studio</span>
                                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Recommended</span>
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                Gemma 4 & Gemini models via Google GenAI SDK. Manage your own billing.
                                            </p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        disabled={!isSuperAdmin}
                                        onClick={() => {
                                            if (!isSuperAdmin) return;
                                            setLlmProvider("openai");
                                            setAiModel("deepseek-3.2");
                                        }}
                                        className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${!isSuperAdmin ? "opacity-80 cursor-not-allowed " : ""
                                            }${llmProvider === "openai"
                                                ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                                                : "border-zinc-200 bg-white hover:border-zinc-300"
                                            }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-zinc-900">OpenAI Compatible</span>
                                                <span className="text-[10px] bg-zinc-100 text-zinc-700 font-bold px-2 py-0.5 rounded-full">CosmosHub</span>
                                            </div>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                DeepSeek 3.2 & Nemotron-3 Super via OpenAI API endpoints.
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Model Select */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-700 uppercase flex items-center gap-1">
                                    Model LLM Utama
                                </label>
                                <select
                                    disabled={!isSuperAdmin}
                                    value={aiModel}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    className={`w-full h-10 px-3 rounded-md border border-zinc-300 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white ${!isSuperAdmin ? "bg-zinc-50 cursor-not-allowed text-zinc-600" : ""
                                        }`}
                                >
                                    {llmProvider === "google" ? (
                                        <>
                                            <option value="gemma-4-26b-a4b-it">Gemma 4 26B (Default - Google AI Studio)</option>
                                            <option value="gemini-3.6-flash">Gemini 3.6 Flash (Fast & Analytical)</option>
                                            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep Context)</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="deepseek-3.2">DeepSeek 3.2 (Optimasi Analisis Bisnis)</option>
                                            <option value="nemotron-3-super">Nemotron-3 Super (CosmosHub)</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Temperature Slider */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs font-semibold text-zinc-700 uppercase">
                                    <span>Temperature LLM: {temperature}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    disabled={!isSuperAdmin}
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className={`w-full accent-zinc-900 h-1.5 bg-zinc-100 rounded-lg appearance-none ${!isSuperAdmin ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                                        }`}
                                />
                                <div className="flex justify-between text-[10px] text-zinc-400">
                                    <span>Presisi / Logis (0.0)</span>
                                    <span>Kreatif / Bebas (1.0)</span>
                                </div>
                            </div>

                            {/* API Keys Configuration */}
                            <div className="border-t border-zinc-100 pt-6 space-y-4">
                                <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                                    <Shield className="w-4 h-4 text-zinc-700" /> Kunci API & Akses Provider
                                </h4>

                                {llmProvider === "google" && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-semibold text-zinc-700 uppercase">Google AI Studio API Key</label>
                                            {maskedGeminiKey && (
                                                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                    Aktif: {maskedGeminiKey}
                                                </span>
                                            )}
                                        </div>
                                        <Input
                                            type="password"
                                            disabled={!isSuperAdmin}
                                            placeholder={
                                                !isSuperAdmin
                                                    ? "Dikonfigurasi oleh Superadmin"
                                                    : maskedGeminiKey
                                                        ? "Kosongkan jika tidak ingin mengubah API Key"
                                                        : "Masukkan Google AI Studio API Key (AIzaSy...)"
                                            }
                                            value={geminiApiKey}
                                            onChange={(e) => setGeminiApiKey(e.target.value)}
                                            className={!isSuperAdmin ? "bg-zinc-50 cursor-not-allowed" : ""}
                                        />
                                        <p className="text-[11px] text-zinc-500">
                                            Dapatkan API Key gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google AI Studio</a> untuk mengelola billing & kuota secara mandiri.
                                        </p>
                                    </div>
                                )}

                                {llmProvider === "openai" && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-semibold text-zinc-700 uppercase">OpenAI / CosmosHub API Key</label>
                                            {maskedOpenaiKey && (
                                                <span className="text-[10px] font-mono text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                                                    Aktif: {maskedOpenaiKey}
                                                </span>
                                            )}
                                        </div>
                                        <Input
                                            type="password"
                                            disabled={!isSuperAdmin}
                                            placeholder={
                                                !isSuperAdmin
                                                    ? "Dikonfigurasi oleh Superadmin"
                                                    : maskedOpenaiKey
                                                        ? "Kosongkan jika tidak ingin mengubah API Key"
                                                        : "Masukkan API Key (sk-...)"
                                            }
                                            value={openaiApiKey}
                                            onChange={(e) => setOpenaiApiKey(e.target.value)}
                                            className={!isSuperAdmin ? "bg-zinc-50 cursor-not-allowed" : ""}
                                        />
                                    </div>
                                )}

                                {/* Test Connection */}
                                {isSuperAdmin && (
                                    <div className="pt-2 flex items-center justify-between gap-4">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleTestConnection}
                                            disabled={testingConnection}
                                            className="text-xs gap-1.5"
                                        >
                                            {testingConnection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                                            Test Koneksi Model
                                        </Button>

                                        {testResult && (
                                            <div className={`text-xs px-3 py-1.5 rounded-md flex items-center gap-1.5 max-w-xs ${testResult.status === "success"
                                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                                    : "bg-red-50 text-red-800 border border-red-200"
                                                }`}>
                                                {testResult.status === "success" ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
                                                <span className="truncate">{testResult.message}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Tavily Search Settings */}
                            <div className="border-t border-zinc-100 pt-6 space-y-4">
                                <h4 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                                    <Database className="w-4 h-4 text-zinc-600" /> Pengaturan Pencarian Tavily
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-700 uppercase">Kedalaman Pencarian</label>
                                        <select
                                            disabled={!isSuperAdmin}
                                            value={searchDepth}
                                            onChange={(e) => setSearchDepth(e.target.value)}
                                            className={`w-full h-10 px-3 rounded-md border border-zinc-300 text-sm bg-white ${!isSuperAdmin ? "bg-zinc-50 cursor-not-allowed text-zinc-600" : ""
                                                }`}
                                        >
                                            <option value="advanced">Advanced (Terstruktur & Analitik)</option>
                                            <option value="basic">Basic (Cepat & Ringkas)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-700 uppercase">Max Hasil (1 - 10)</label>
                                        <select
                                            disabled={!isSuperAdmin}
                                            value={maxResults}
                                            onChange={(e) => setMaxResults(parseInt(e.target.value))}
                                            className={`w-full h-10 px-3 rounded-md border border-zinc-300 text-sm bg-white ${!isSuperAdmin ? "bg-zinc-50 cursor-not-allowed text-zinc-600" : ""
                                                }`}
                                        >
                                            <option value={3}>3 Hasil</option>
                                            <option value={5}>5 Hasil (Optimal)</option>
                                            <option value={10}>10 Hasil (Lengkap)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isSuperAdmin && (
                            <div className="pt-4 border-t border-zinc-100 flex justify-end">
                                <Button onClick={handleSaveAISettings} disabled={savingAiSettings} className="gap-2">
                                    {savingAiSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Simpan Pengaturan AI
                                </Button>
                            </div>
                        )}
                    </Card>
                )}

                {/* 3. Catalog Tab */}
                {activeTab === "catalog" && (
                    <div className="space-y-6">
                        <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-lg flex items-start gap-3">
                            <Info className="w-5 h-5 text-zinc-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-zinc-600 leading-relaxed">
                                <p className="font-semibold text-zinc-800">Katalog Solusi Pre-Sales Smartnet Magna Global</p>
                                <p className="mt-0.5">
                                    Daftar solusi berikut adalah referensi resmi yang digunakan oleh AI KYC Pipeline saat merumuskan rekomendasi produk pada modul KYC Report. Penyuntingan katalog ini dapat dilakukan oleh Administrator di sistem utama.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Google Cloud */}
                            <Card className="p-5 bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all space-y-3">
                                <div className="flex items-center gap-2 text-zinc-900 font-semibold">
                                    <Cloud className="w-5 h-5 text-blue-600" /> Cloud & Infrastructure
                                </div>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Solusi migrasi, tata kelola, dan modernisasi sistem berbasis Google Cloud (GCP, GKE, Serverless, Compute Engine, Cloud Run).
                                </p>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">GCP Migration</span>
                                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">GKE</span>
                                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">Kubernetes</span>
                                </div>
                            </Card>

                            {/* Data & AI */}
                            <Card className="p-5 bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all space-y-3">
                                <div className="flex items-center gap-2 text-zinc-900 font-semibold">
                                    <Database className="w-5 h-5 text-violet-600" /> Data Analytics & AI
                                </div>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Arsitektur data modern (BigQuery Data Warehouse), visualisasi visual (Looker Studio, Power BI), dan pemodelan prediktif (Vertex AI).
                                </p>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">BigQuery</span>
                                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">Looker</span>
                                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">Vertex AI</span>
                                </div>
                            </Card>

                            {/* Cybersecurity */}
                            <Card className="p-5 bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all space-y-3">
                                <div className="flex items-center gap-2 text-zinc-900 font-semibold">
                                    <Shield className="w-5 h-5 text-emerald-600" /> Cybersecurity Suite
                                </div>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Sistem keamanan korporat menyeluruh (Zero Trust, SIEM/SOC, Penetration Testing, Audit Kepatuhan, Keamanan Awan).
                                </p>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">Zero Trust</span>
                                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">SIEM</span>
                                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">Pen Testing</span>
                                </div>
                            </Card>

                            {/* Network */}
                            <Card className="p-5 bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all space-y-3">
                                <div className="flex items-center gap-2 text-zinc-900 font-semibold">
                                    <Network className="w-5 h-5 text-amber-600" /> Network Solutions
                                </div>
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Infrastruktur jaringan korporat terdistribusi yang aman dan andal (SD-WAN integration, Enterprise Networking, SASE).
                                </p>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">SD-WAN</span>
                                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">SASE</span>
                                    <span className="text-[10px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full font-medium">Routing</span>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Master Data Management Tab (Superadmin Only) */}
                {activeTab === "master_data" && user?.role === "superadmin" && (
                    <Card className="p-6 bg-white border border-zinc-200 space-y-8">
                        <div>
                            <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                                <Database className="w-5 h-5 text-zinc-700" /> Master Data Management
                            </h3>
                            <p className="text-xs text-zinc-500 mt-1">
                                Kelola daftar opsi preset untuk tim **Pre-Sales** dan bidang **Industry**. Perubahan di sini akan langsung menjadi opsi pilihan pada form New Opportunity dan Edit Opportunity.
                            </p>
                        </div>

                        {/* Pre-Sales Team Options */}
                        <div className="space-y-4 border-t border-zinc-100 pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-semibold text-zinc-900">Nama Tim Pre-Sales (Predefined Options)</h4>
                                    <p className="text-xs text-zinc-400 mt-0.5">Daftar anggota tim Pre-Sales Smartnet Magna Global.</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                {masterPresales.map((name) => (
                                    <span
                                        key={name}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-medium text-xs border border-purple-200"
                                    >
                                        <User className="w-3.5 h-3.5" />
                                        {name}
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePresales(name)}
                                            className="hover:text-purple-900 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 max-w-sm pt-2">
                                <Input
                                    placeholder="Tambah nama presales baru (e.g. Devi, Robi, Gerry)"
                                    value={newPresales}
                                    onChange={(e) => setNewPresales(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddPresales();
                                        }
                                    }}
                                />
                                <Button type="button" size="sm" onClick={handleAddPresales} className="shrink-0 gap-1">
                                    <Plus className="w-4 h-4" /> Add
                                </Button>
                            </div>
                        </div>

                        {/* Industry Categories Options */}
                        <div className="space-y-4 border-t border-zinc-100 pt-6">
                            <div>
                                <h4 className="text-sm font-semibold text-zinc-900">Kategori Industry (Predefined Options)</h4>
                                <p className="text-xs text-zinc-400 mt-0.5">Daftar sektor industri klien.</p>
                            </div>

                            <div className="flex flex-wrap gap-2 pt-2">
                                {masterIndustries.map((ind) => (
                                    <span
                                        key={ind}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium text-xs border border-blue-200"
                                    >
                                        {ind}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveIndustry(ind)}
                                            className="hover:text-blue-900 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 max-w-sm pt-2">
                                <Input
                                    placeholder="Tambah industri baru (e.g. Automotive)"
                                    value={newIndustry}
                                    onChange={(e) => setNewIndustry(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleAddIndustry();
                                        }
                                    }}
                                />
                                <Button type="button" size="sm" onClick={handleAddIndustry} className="shrink-0 gap-1">
                                    <Plus className="w-4 h-4" /> Add
                                </Button>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-100 flex justify-end">
                            <Button onClick={handleSaveMasterData} disabled={savingMasterData} className="gap-2">
                                {savingMasterData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Simpan Master Data
                            </Button>
                        </div>
                    </Card>
                )}

                {/* 4. User Management Tab */}
                {activeTab === "users" && user?.role === "superadmin" && (
                    <div className="space-y-5">
                        <div className="border-b border-zinc-100 pb-4">
                            <h3 className="text-base font-semibold text-zinc-900 flex items-center gap-2"><Users className="w-5 h-5" /> User Access Control & Management</h3>
                            <p className="text-xs text-zinc-500 mt-1">Kelola role dan kapabilitas setiap pengguna yang terdaftar di sistem. Pengguna tidak dapat melihat pengaturan kapabilitas mereka sendiri.</p>
                        </div>

                        {loadingUsers && (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-7 h-7 animate-spin text-zinc-300" />
                            </div>
                        )}
                        {userListError && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {userListError}
                            </div>
                        )}
                        {!loadingUsers && !userListError && (
                            <div className="space-y-3">
                                {userList.map((u) => {
                                    const isEditing = editingUserId === u.id;
                                    const isSelf = u.email === user?.email;
                                    const draft = isEditing ? editDraft! : null;
                                    const caps = isEditing
                                        ? (draft!.capabilities || "").split(",").map((c) => c.trim()).filter(Boolean)
                                        : (u.capabilities || "").split(",").map((c: string) => c.trim()).filter(Boolean);

                                    return (
                                        <Card key={u.id} className={`p-4 border ${isEditing ? "border-zinc-900 bg-white shadow-md" : "border-zinc-200 bg-white"}  transition-all`}>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                                        <User className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-zinc-900 truncate">{u.full_name}</p>
                                                        <p className="text-xs text-zinc-400 truncate">{u.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {!isEditing ? (
                                                        <>
                                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${u.role === "superadmin" ? "bg-violet-50 text-violet-700 border-violet-200" :
                                                                    u.role === "manager" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                                        "bg-zinc-100 text-zinc-600 border-zinc-200"
                                                                }`}>{u.role}</span>
                                                            {!isSelf && (
                                                                <Button size="sm" variant="secondary" className="text-xs" onClick={() => startEditing(u)}>Edit Access</Button>
                                                            )}
                                                            {isSelf && <span className="text-[10px] text-zinc-400 italic">You</span>}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button size="sm" variant="secondary" onClick={cancelEditing} className="text-xs">Cancel</Button>
                                                            <Button
                                                                size="sm"
                                                                className="text-xs gap-1.5"
                                                                onClick={() => handleSaveUser(u.id)}
                                                                disabled={savingUserId === u.id}
                                                            >
                                                                {savingUserId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                                Save
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {isEditing && draft && (
                                                <div className="mt-4 pt-4 border-t border-zinc-100 space-y-4">
                                                    {/* Role Selector */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Role (tampilan sistem)</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {ROLE_OPTIONS.map((r) => (
                                                                <button
                                                                    key={r}
                                                                    onClick={() => handleRoleChange(r)}
                                                                    className={`text-xs px-3 py-1 rounded-full border font-semibold uppercase transition-all ${draft.role === r
                                                                            ? "bg-zinc-900 text-white border-zinc-900"
                                                                            : "bg-white text-zinc-600 border-zinc-300 hover:border-zinc-600"
                                                                        }`}
                                                                >
                                                                    {r}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Capabilities Toggles */}
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Kapabilitas (tidak terlihat oleh pengguna)</label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {ALL_CAPS.map((cap) => {
                                                                const active = caps.includes(cap);
                                                                return (
                                                                    <button
                                                                        key={cap}
                                                                        onClick={() => toggleCap(cap)}
                                                                        className={`text-xs px-3 py-1 rounded-full border font-medium transition-all flex items-center gap-1.5 ${active
                                                                                ? "bg-emerald-600 text-white border-emerald-600"
                                                                                : "bg-white text-zinc-400 border-zinc-200 hover:border-zinc-400"
                                                                            }`}
                                                                    >
                                                                        {active && <CheckCircle2 className="w-3 h-3" />}
                                                                        {CAP_LABELS[cap]}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Active Toggle */}
                                                    <div className="flex items-center gap-3">
                                                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status Akun</label>
                                                        <button
                                                            onClick={() => setEditDraft({ ...draft, is_active: !draft.is_active })}
                                                            className={`relative w-10 h-5 rounded-full transition-colors ${draft.is_active ? "bg-emerald-500" : "bg-zinc-300"
                                                                }`}
                                                        >
                                                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${draft.is_active ? "translate-x-5" : ""
                                                                }`} />
                                                        </button>
                                                        <span className="text-xs text-zinc-500">{draft.is_active ? "Aktif" : "Nonaktif"}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Readonly capability summary */}
                                            {!isEditing && (
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {caps.map((c: string) => (
                                                        <span key={c} className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-medium border border-zinc-200">
                                                            {CAP_LABELS[c] || c}
                                                        </span>
                                                    ))}
                                                    {!u.is_active && (
                                                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium border border-red-200">Nonaktif</span>
                                                    )}
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}
                                {userList.length === 0 && (
                                    <p className="text-sm text-zinc-400 text-center py-8">Belum ada pengguna terdaftar.</p>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 5. Admin Operations Tab */}
                {activeTab === "operations" && user?.role === "superadmin" && (
                    <div className="space-y-6">
                        {loadingOps ? (
                            <div className="space-y-4 pt-12">
                                <div className="h-20 w-full bg-zinc-200 rounded animate-pulse" />
                                <div className="h-40 w-full bg-zinc-200 rounded animate-pulse" />
                            </div>
                        ) : (
                            <>
                                {/* Metrics Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Card className="p-4 bg-white border border-zinc-200 shadow-sm text-center">
                                        <p className="text-[10px] text-zinc-500 font-semibold uppercase">Total Opportunities</p>
                                        <p className="text-2xl font-bold text-zinc-900 mt-1">{metrics?.totals?.opportunities ?? 0}</p>
                                    </Card>
                                    <Card className="p-4 bg-white border border-zinc-200 shadow-sm text-center">
                                        <p className="text-[10px] text-zinc-500 font-semibold uppercase">Total Meetings</p>
                                        <p className="text-2xl font-bold text-zinc-900 mt-1">{metrics?.totals?.meetings ?? 0}</p>
                                    </Card>
                                    <Card className="p-4 bg-white border border-zinc-200 shadow-sm text-center">
                                        <p className="text-[10px] text-zinc-500 font-semibold uppercase">Total KYC Reports</p>
                                        <p className="text-2xl font-bold text-zinc-900 mt-1">{metrics?.totals?.kyc_reports ?? 0}</p>
                                    </Card>
                                    <Card className="p-4 bg-white border border-zinc-200 shadow-sm text-center">
                                        <p className="text-[10px] text-zinc-500 font-semibold uppercase">Registered Users</p>
                                        <p className="text-2xl font-bold text-zinc-900 mt-1">{metrics?.totals?.users ?? 0}</p>
                                    </Card>
                                </div>

                                {/* Status Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card className="p-5 bg-white border border-zinc-200 shadow-sm">
                                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">KYC Generation Status</h4>
                                        <div className="space-y-2">
                                            {metrics?.kyc_status_breakdown && Object.entries(metrics.kyc_status_breakdown).map(([status, count]) => (
                                                <div key={status} className="flex justify-between items-center text-sm border-b border-zinc-50 pb-1.5">
                                                    <span className="font-medium text-zinc-600 uppercase text-xs">{status}</span>
                                                    <span className="font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded text-xs">{count as any}</span>
                                                </div>
                                            ))}
                                            {(!metrics?.kyc_status_breakdown || Object.keys(metrics.kyc_status_breakdown).length === 0) && (
                                                <p className="text-xs text-zinc-500">Tidak ada status laporan KYC.</p>
                                            )}
                                        </div>
                                    </Card>

                                    <Card className="p-5 bg-white border border-zinc-200 shadow-sm">
                                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">User Role Distribution</h4>
                                        <div className="space-y-2">
                                            {metrics?.user_roles_breakdown && Object.entries(metrics.user_roles_breakdown).map(([role, count]) => (
                                                <div key={role} className="flex justify-between items-center text-sm border-b border-zinc-50 pb-1.5">
                                                    <span className="font-medium text-zinc-600 uppercase text-xs">{role}</span>
                                                    <span className="font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded text-xs">{count as any}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </div>

                                {/* System Logs Table */}
                                <Card className="p-5 bg-white border border-zinc-200 shadow-sm">
                                    <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
                                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">System Activity Logs (Recent 30)</h4>
                                        <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded text-zinc-500 font-medium">Real-time DB Logs</span>
                                    </div>
                                    <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="border-b border-zinc-200 text-zinc-400 font-semibold uppercase font-bold">
                                                    <th className="pb-2">Waktu</th>
                                                    <th className="pb-2">Pengguna</th>
                                                    <th className="pb-2">Aktivitas</th>
                                                    <th className="pb-2">Entitas</th>
                                                    <th className="pb-2">ID Entitas</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-100 text-zinc-700">
                                                {logs.map((log) => (
                                                    <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                                                        <td className="py-2.5 font-mono text-[10px] text-zinc-500">{new Date(log.created_at).toLocaleString("id-ID")}</td>
                                                        <td className="py-2.5 font-medium">{log.user_name} ({log.user_email})</td>
                                                        <td className="py-2.5"><span className="bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-full font-medium text-[10px]">{log.action}</span></td>
                                                        <td className="py-2.5 font-medium text-zinc-600">{log.entity_type}</td>
                                                        <td className="py-2.5 text-zinc-400 font-mono text-[10px]">{log.entity_id.slice(0, 8)}</td>
                                                    </tr>
                                                ))}
                                                {logs.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="py-4 text-center text-zinc-400">Tidak ada log aktivitas sistem.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
