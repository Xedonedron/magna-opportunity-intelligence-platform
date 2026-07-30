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
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";

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
    const [aiModel, setAiModel] = useState("nemotron-3-super");
    const [temperature, setTemperature] = useState(0.3);
    const [searchDepth, setSearchDepth] = useState("advanced");
    const [maxResults, setMaxResults] = useState(5);

    // Operations State
    const [metrics, setMetrics] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingOps, setLoadingOps] = useState(false);

    // Save alerts
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveMessage, setSaveMessage] = useState("");

    // Dynamic Tabs list
    const activeTabs = [
        { id: "profile", label: "User Profile", icon: User },
        { id: "ai", label: "AI & Pipeline", icon: BrainCircuit },
        { id: "catalog", label: "Magna Solutions Catalog", icon: BookOpen },
    ];
    if (user?.role === "superadmin") {
        activeTabs.push({ id: "operations", label: "System Operations", icon: Shield });
    }

    // Load from localStorage on mount
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
                setAiModel(parsed.model || "nemotron-3-super");
                setTemperature(parsed.temperature ?? 0.3);
                setSearchDepth(parsed.search_depth || "advanced");
                setMaxResults(parsed.max_results ?? 5);
            } catch (e) {
                console.error("Failed to parse moip_ai_settings", e);
            }
        }
    }, []);

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

    const handleSaveAISettings = () => {
        const aiSettings = {
            model: aiModel,
            temperature,
            search_depth: searchDepth,
            max_results: maxResults,
        };
        localStorage.setItem("moip_ai_settings", JSON.stringify(aiSettings));
        showToast("Pengaturan AI Pipeline berhasil disimpan!");
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
    }, [activeTab, user]);

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
                        className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-all ${
                            activeTab === tab.id
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
                {activeTab === "ai" && (
                    <Card className="p-6 bg-white border border-zinc-200 space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-zinc-900">Konfigurasi AI Pipeline</h3>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                Atur parameter komputasi LLM dan integrasi pencarian Tavily untuk KYC.
                            </p>
                        </div>

                        <div className="space-y-6 max-w-lg">
                            {/* Model Select */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-700 uppercase flex items-center gap-1">
                                    Model LLM Utama <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                                </label>
                                <select
                                    value={aiModel}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    className="w-full h-10 px-3 rounded-md border border-zinc-300 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-white"
                                >
                                    <option value="nemotron-3-super">Nemotron-3 Super (Default - CosmosHub)</option>
                                    <option value="deepseek-3.2">DeepSeek 3.2 (Optimasi Analisis Bisnis)</option>
                                    <option value="gpt-4o">OpenAI GPT-4o (Intelektualitas Tinggi)</option>
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
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                    className="w-full accent-zinc-900 cursor-pointer h-1.5 bg-zinc-100 rounded-lg appearance-none"
                                />
                                <div className="flex justify-between text-[10px] text-zinc-400">
                                    <span>Presisi / Logis (0.0)</span>
                                    <span>Kreatif / Bebas (1.0)</span>
                                </div>
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
                                            value={searchDepth}
                                            onChange={(e) => setSearchDepth(e.target.value)}
                                            className="w-full h-10 px-3 rounded-md border border-zinc-300 text-sm bg-white"
                                        >
                                            <option value="advanced">Advanced (Terstruktur & Analitik)</option>
                                            <option value="basic">Basic (Cepat & Ringkas)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-zinc-700 uppercase">Max Hasil (1 - 10)</label>
                                        <select
                                            value={maxResults}
                                            onChange={(e) => setMaxResults(parseInt(e.target.value))}
                                            className="w-full h-10 px-3 rounded-md border border-zinc-300 text-sm bg-white"
                                        >
                                            <option value={3}>3 Hasil</option>
                                            <option value={5}>5 Hasil (Optimal)</option>
                                            <option value={10}>10 Hasil (Lengkap)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-zinc-100 flex justify-end">
                            <Button onClick={handleSaveAISettings}>Simpan Pengaturan AI</Button>
                        </div>
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
                                    Daftar solusi berikut adalah referensi resmi yang digunakan oleh AI KYC Pipeline saat merumuskan rekomendasi produk pada modul **KYC Report**. Penyuntingan katalog ini dapat dilakukan oleh Administrator di sistem utama.
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

                {/* 4. Admin Operations Tab */}
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
