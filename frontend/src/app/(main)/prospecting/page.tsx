"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
    Building2,
    Users,
    Search,
    Download,
    Mail,
    Phone,
    Linkedin,
    CheckCircle2,
    Lock,
    Unlock,
    RefreshCw,
    AlertCircle,
    Loader2,
    X,
    Filter,
    ArrowUpRight,
    UserCheck,
    CheckSquare,
    Square,
    Save,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { CreditRevealModal } from "@/components/domains/prospecting/CreditRevealModal";

interface CompanyCandidate {
    id?: string | null;
    name: string;
    domain?: string | null;
    industry?: string | null;
    employee_count?: number | null;
    logo_url?: string | null;
    is_saved_in_directory?: boolean;
    contacts_count?: number;
    source: "moip_database" | "lusha_database";
}

interface ProspectCandidate {
    id: string;
    name: string;
    first_name?: string;
    last_name?: string;
    job_title: string;
    department?: string | null;
    seniority?: string | null;
    email: string | null;
    phone: string | null;
    linkedin_url: string | null;
    has_email: boolean;
    has_phone: boolean;
    is_saved_in_directory: boolean;
    local_contact_id?: string | null;
    reveal_status?: {
        email: boolean;
        phone: boolean;
    };
}

interface LushaQuota {
    used: number;
    remaining: number;
    total: number;
}

export default function ProspectingPage() {
    // 1. Quota State
    const [quota, setQuota] = useState<LushaQuota>({ used: 0, remaining: 74, total: 100 });
    const [isLoadingQuota, setIsLoadingQuota] = useState(false);

    // 2. Company Search & Selection State
    const [companyQuery, setCompanyQuery] = useState("");
    const [companyCandidates, setCompanyCandidates] = useState<CompanyCandidate[]>([]);
    const [isSearchingCompany, setIsSearchingCompany] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<CompanyCandidate | null>(null);

    // 3. Employee Discovery State
    const [employees, setEmployees] = useState<ProspectCandidate[]>([]);
    const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // 4. Filtering State (Pure Dynamic Job Title)
    const [selectedJobTitle, setSelectedJobTitle] = useState<string>("all");
    const [jobTitleSearchQuery, setJobTitleSearchQuery] = useState<string>("");

    // 5. Selection & Action State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isRevealModalOpen, setIsRevealModalOpen] = useState(false);
    const [candidatesToReveal, setCandidatesToReveal] = useState<ProspectCandidate[]>([]);
    const [isRevealingCredits, setIsRevealingCredits] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isSavingToDirectory, setIsSavingToDirectory] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Fetch initial quota
    const fetchQuota = useCallback(async () => {
        setIsLoadingQuota(true);
        try {
            const res = await api.get<any>("/prospecting/lusha/quota");
            if (res.data) {
                setQuota({
                    used: res.data.used ?? 0,
                    remaining: res.data.remaining ?? 74,
                    total: res.data.limit ?? 100,
                });
            }
        } catch {
            // Keep fallback quota
        } finally {
            setIsLoadingQuota(false);
        }
    }, []);

    useEffect(() => {
        fetchQuota();
    }, [fetchQuota]);

    // Debounced Company Search
    useEffect(() => {
        if (!companyQuery.trim() || companyQuery.trim().length < 2) {
            setCompanyCandidates([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingCompany(true);
            try {
                const res = await api.get<{ companies: CompanyCandidate[] }>(
                    `/prospecting/companies/search?q=${encodeURIComponent(companyQuery.trim())}`
                );
                setCompanyCandidates(res.data?.companies || []);
            } catch {
                setCompanyCandidates([]);
            } finally {
                setIsSearchingCompany(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [companyQuery]);

    // Fetch Employees when Company is selected
    const handleSelectCompany = async (company: CompanyCandidate) => {
        setSelectedCompany(company);
        setCompanyCandidates([]);
        setCompanyQuery(company.name);
        setSelectedIds(new Set());
        setSelectedJobTitle("all");
        setJobTitleSearchQuery("");
        setSearchError(null);
        setIsLoadingEmployees(true);

        try {
            const res = await api.post<{ success: boolean; contacts: ProspectCandidate[]; total: number }>(
                "/prospecting/lusha/search",
                {
                    company_name: company.name,
                    company_domain: company.domain || undefined,
                    limit: 50,
                }
            );

            if (res.data && res.data.contacts) {
                setEmployees(res.data.contacts);
            } else {
                setEmployees([]);
            }
        } catch (err: any) {
            setSearchError(err?.response?.data?.detail || "Gagal menarik data karyawan dari Lusha.");
            setEmployees([]);
        } finally {
            setIsLoadingEmployees(false);
        }
    };

    // Reset Selected Company
    const handleResetCompany = () => {
        setSelectedCompany(null);
        setEmployees([]);
        setSelectedIds(new Set());
        setSelectedJobTitle("all");
        setJobTitleSearchQuery("");
        setCompanyQuery("");
    };

    // Dynamic Job Titles extraction from actual Lusha response
    const jobTitleOptions = useMemo(() => {
        const titleCounts = new Map<string, number>();
        employees.forEach((emp) => {
            const title = emp.job_title?.trim();
            if (title) {
                titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
            }
        });

        return Array.from(titleCounts.entries())
            .map(([title, count]) => ({ title, count }))
            .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title));
    }, [employees]);

    // Filtered Employees based on exact Job Title & keyword search
    const filteredEmployees = useMemo(() => {
        return employees.filter((emp) => {
            // Match dropdown title
            if (selectedJobTitle !== "all" && emp.job_title !== selectedJobTitle) {
                return false;
            }
            // Match text search (Title or Name)
            if (jobTitleSearchQuery.trim()) {
                const query = jobTitleSearchQuery.toLowerCase();
                const matchesTitle = emp.job_title.toLowerCase().includes(query);
                const matchesName = emp.name.toLowerCase().includes(query);
                const matchesDept = (emp.department || "").toLowerCase().includes(query);
                if (!matchesTitle && !matchesName && !matchesDept) {
                    return false;
                }
            }
            return true;
        });
    }, [employees, selectedJobTitle, jobTitleSearchQuery]);

    // Selection Handlers
    const handleToggleSelectAll = () => {
        if (selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));
        }
    };

    const handleToggleSelectOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    // Open Single Reveal Modal
    const handleOpenSingleReveal = (emp: ProspectCandidate) => {
        setCandidatesToReveal([emp]);
        setIsRevealModalOpen(true);
    };

    // Open Bulk Reveal Modal
    const handleOpenBulkReveal = () => {
        const selected = employees.filter((e) => selectedIds.has(e.id));
        if (selected.length === 0) return;
        setCandidatesToReveal(selected);
        setIsRevealModalOpen(true);
    };

    // Confirm Reveal Handler
    const handleConfirmReveal = async (options: ("email" | "phone")[]) => {
        if (candidatesToReveal.length === 0 || !selectedCompany) return;
        setIsRevealingCredits(true);

        try {
            const updatedEmployees = [...employees];

            for (const cand of candidatesToReveal) {
                const res = await api.post<any>("/prospecting/lusha/enrich", {
                    contact_id: cand.id,
                    first_name: cand.first_name || cand.name.split(" ")[0],
                    last_name: cand.last_name || cand.name.split(" ").slice(1).join(" ") || "Stakeholder",
                    company_name: selectedCompany.name,
                    company_domain: selectedCompany.domain || undefined,
                    reveal: options,
                });

                if (res.data?.success && res.data?.contact) {
                    const enriched = res.data.contact;
                    const idx = updatedEmployees.findIndex((e) => e.id === cand.id);
                    if (idx !== -1) {
                        updatedEmployees[idx] = {
                            ...updatedEmployees[idx],
                            email: enriched.email || updatedEmployees[idx].email,
                            phone: enriched.phone || updatedEmployees[idx].phone,
                            has_email: Boolean(enriched.email || updatedEmployees[idx].email),
                            has_phone: Boolean(enriched.phone || updatedEmployees[idx].phone),
                            is_saved_in_directory: true,
                            local_contact_id: res.data.company_contact_id || updatedEmployees[idx].local_contact_id,
                            reveal_status: {
                                email: Boolean(enriched.email || updatedEmployees[idx].reveal_status?.email),
                                phone: Boolean(enriched.phone || updatedEmployees[idx].reveal_status?.phone),
                            },
                        };
                    }
                }
            }

            setEmployees(updatedEmployees);
            setIsRevealModalOpen(false);
            setCandidatesToReveal([]);
            fetchQuota();
            setFeedbackMessage({
                type: "success",
                text: `Berhasil membuka kontak ${candidatesToReveal.length} orang dan otomatis tersimpan ke Stakeholder Directory.`,
            });
            setTimeout(() => setFeedbackMessage(null), 5000);
        } catch (err: any) {
            setFeedbackMessage({
                type: "error",
                text: err?.response?.data?.detail || "Terjadi kendala saat membuka kontak Lusha.",
            });
            setTimeout(() => setFeedbackMessage(null), 5000);
        } finally {
            setIsRevealingCredits(false);
        }
    };

    // Save Selected to Stakeholder Directory
    const handleSaveToDirectory = async () => {
        const toSave = employees.filter((e) => selectedIds.has(e.id));
        if (toSave.length === 0 || !selectedCompany) return;

        setIsSavingToDirectory(true);
        try {
            await api.post("/prospecting/save-to-stakeholders", {
                company_name: selectedCompany.name,
                company_domain: selectedCompany.domain || undefined,
                industry: selectedCompany.industry || undefined,
                contacts: toSave.map((c) => ({
                    full_name: c.name,
                    job_title: c.job_title,
                    department: c.department || undefined,
                    email: c.email || undefined,
                    phone: c.phone || undefined,
                    linkedin_url: c.linkedin_url || undefined,
                })),
            });

            // Mark saved in local state
            setEmployees((prev) =>
                prev.map((e) => (selectedIds.has(e.id) ? { ...e, is_saved_in_directory: true } : e))
            );

            setFeedbackMessage({
                type: "success",
                text: `${toSave.length} stakeholder berhasil disinkronkan ke Stakeholder Directory MOIP.`,
            });
            setTimeout(() => setFeedbackMessage(null), 5000);
        } catch (err: any) {
            setFeedbackMessage({
                type: "error",
                text: err?.response?.data?.detail || "Gagal menyimpan kontak ke direktori.",
            });
            setTimeout(() => setFeedbackMessage(null), 5000);
        } finally {
            setIsSavingToDirectory(false);
        }
    };

    // Export to Excel (4 Mandatory Columns)
    const handleExportExcel = async () => {
        if (!selectedCompany) return;

        // If items are selected, export selected; else export all currently filtered
        const exportTargets = selectedIds.size > 0
            ? employees.filter((e) => selectedIds.has(e.id))
            : filteredEmployees;

        if (exportTargets.length === 0) {
            setFeedbackMessage({
                type: "error",
                text: "Tidak ada data kontak untuk diekspor ke Excel.",
            });
            setTimeout(() => setFeedbackMessage(null), 4000);
            return;
        }

        setIsExportingExcel(true);
        try {
            const payload = {
                company_name: selectedCompany.name,
                contacts: exportTargets.map((c) => ({
                    full_name: c.name,
                    job_title: c.job_title,
                    email: c.email || null,
                    phone: c.phone || null,
                })),
            };

            const response = await api.post("/prospecting/export-excel", payload, {
                responseType: "blob",
            });

            const blob = new Blob([response.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const safeComp = selectedCompany.name.replace(/[^a-zA-Z0-9_-]/g, "_");
            a.download = `Kontak_Lusha_${safeComp}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            setFeedbackMessage({
                type: "success",
                text: `File Excel 4 kolom (${exportTargets.length} kontak) berhasil diunduh.`,
            });
            setTimeout(() => setFeedbackMessage(null), 4000);
        } catch (err: any) {
            setFeedbackMessage({
                type: "error",
                text: err?.response?.data?.detail || "Gagal mengekspor file Excel.",
            });
            setTimeout(() => setFeedbackMessage(null), 4000);
        } finally {
            setIsExportingExcel(false);
        }
    };

    return (
        <div className="space-y-6 pb-16">
            {/* Header & Quota Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                            <Users className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                            Lusha Prospecting Hub
                        </h1>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Cari target perusahaan, filter karyawan berdasarkan Job Title riil, buka data kontak selektif, dan sinkronisasi ke Stakeholder Directory.
                    </p>
                </div>

                {/* Quota Indicator */}
                <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 shadow-xs">
                    <div className="flex flex-col">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Sisa Kuota Lusha
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                {quota.remaining}
                            </span>
                            <span className="text-xs text-zinc-400">
                                / {quota.total} kredit
                            </span>
                        </div>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={fetchQuota}
                        disabled={isLoadingQuota}
                        className="h-8 w-8 p-0 ml-2"
                        title="Segarkan Sisa Kuota"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQuota ? "animate-spin text-indigo-600" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Notification / Feedback Banner */}
            {feedbackMessage && (
                <div
                    className={`p-3.5 rounded-lg flex items-center justify-between text-xs font-medium ${
                        feedbackMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {feedbackMessage.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{feedbackMessage.text}</span>
                    </div>
                    <button
                        onClick={() => setFeedbackMessage(null)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Step 1: Target Perusahaan (Search & Auto-Disambiguate) */}
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                            Target Perusahaan
                        </span>
                    </div>
                    {selectedCompany && (
                        <button
                            onClick={handleResetCompany}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                        >
                            <span>Ganti Perusahaan Target</span>
                        </button>
                    )}
                </div>

                {!selectedCompany ? (
                    <div className="relative">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                            <Input
                                value={companyQuery}
                                onChange={(e) => setCompanyQuery(e.target.value)}
                                placeholder="Ketik nama perusahaan (contoh: Bank Mega, OCBC, Indosat, Telkomsel)..."
                                className="pl-9 pr-9 h-11 text-sm bg-zinc-50 dark:bg-zinc-800/50"
                                autoFocus
                            />
                            {isSearchingCompany && (
                                <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" />
                            )}
                        </div>

                        {/* Dropdown Suggestions */}
                        {companyCandidates.length > 0 && (
                            <div className="absolute z-20 left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                                {companyCandidates.map((cand, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectCompany(cand)}
                                        className="w-full text-left p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition flex items-center justify-between gap-3 group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold text-xs shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600 transition">
                                                {cand.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-indigo-600 transition">
                                                    {cand.name}
                                                </div>
                                                <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-2 mt-0.5">
                                                    {cand.domain && (
                                                        <span className="font-mono text-[11px] text-zinc-400">
                                                            {cand.domain}
                                                        </span>
                                                    )}
                                                    {cand.industry && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{cand.industry}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="shrink-0">
                                            {cand.is_saved_in_directory ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Tersimpan di MOIP ({cand.contacts_count || 0})
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                                    Database Lusha
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Active Selected Company Card */
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                                {selectedCompany.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                        {selectedCompany.name}
                                    </h3>
                                    {selectedCompany.is_saved_in_directory && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                            MOIP Directory
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    {selectedCompany.domain && (
                                        <span className="font-mono text-zinc-600 dark:text-zinc-300">
                                            {selectedCompany.domain}
                                        </span>
                                    )}
                                    {selectedCompany.industry && (
                                        <>
                                            <span>•</span>
                                            <span>{selectedCompany.industry}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {selectedCompany.id && (
                                <Link
                                    href={`/companies/${selectedCompany.id}?tab=stakeholders`}
                                    className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 transition"
                                >
                                    <span>Lihat Direktori Perusahaan</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </Link>
                            )}
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleSelectCompany(selectedCompany)}
                                disabled={isLoadingEmployees}
                                className="text-xs gap-1.5 h-8"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEmployees ? "animate-spin" : ""}`} />
                                <span>Segarkan Data Lusha</span>
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Error Banner */}
            {searchError && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{searchError}</span>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => selectedCompany && handleSelectCompany(selectedCompany)}
                        className="h-7 text-xs"
                    >
                        Coba Lagi
                    </Button>
                </div>
            )}

            {/* Step 2: Employee Discovery Table & Pure Dynamic Job Title Filtering */}
            {selectedCompany && (
                <div className="space-y-4">
                    {/* Controls & Filter Toolbar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        {/* Dynamic Job Title Filter & Search */}
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 shrink-0 mr-1">
                                <Filter className="w-3.5 h-3.5" />
                                <span>Filter Job Title:</span>
                            </div>

                            {/* Dynamic Job Title Select */}
                            <select
                                value={selectedJobTitle}
                                onChange={(e) => setSelectedJobTitle(e.target.value)}
                                className="h-9 px-3 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium focus:ring-2 focus:ring-indigo-500 max-w-[280px] truncate"
                            >
                                <option value="all">
                                    Semua Jabatan ({employees.length})
                                </option>
                                {jobTitleOptions.map((opt, i) => (
                                    <option key={i} value={opt.title}>
                                        {opt.title} ({opt.count})
                                    </option>
                                ))}
                            </select>

                            {/* Job Title / Name Keyword Search */}
                            <div className="relative min-w-[200px] flex-1 max-w-xs">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    value={jobTitleSearchQuery}
                                    onChange={(e) => setJobTitleSearchQuery(e.target.value)}
                                    placeholder="Cari kata kunci jabatan / nama..."
                                    className="pl-8 pr-7 h-9 text-xs bg-zinc-50 dark:bg-zinc-800"
                                />
                                {jobTitleSearchQuery && (
                                    <button
                                        onClick={() => setJobTitleSearchQuery("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Clear Filter Button */}
                            {(selectedJobTitle !== "all" || jobTitleSearchQuery) && (
                                <button
                                    onClick={() => {
                                        setSelectedJobTitle("all");
                                        setJobTitleSearchQuery("");
                                    }}
                                    className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline px-1"
                                >
                                    Reset Filter
                                </button>
                            )}
                        </div>

                        {/* Action Buttons Toolbar */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {/* Counter */}
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-2">
                                Menampilkan <strong className="text-zinc-900 dark:text-zinc-100">{filteredEmployees.length}</strong> karyawan
                                {selectedIds.size > 0 && (
                                    <span className="ml-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                                        ({selectedIds.size} dipilih)
                                    </span>
                                )}
                            </span>

                            {/* Reveal Button */}
                            <Button
                                onClick={handleOpenBulkReveal}
                                disabled={selectedIds.size === 0 || isRevealingCredits}
                                className="h-9 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-xs"
                            >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Buka Kontak {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}</span>
                            </Button>

                            {/* Save to Directory */}
                            <Button
                                variant="secondary"
                                onClick={handleSaveToDirectory}
                                disabled={selectedIds.size === 0 || isSavingToDirectory}
                                className="h-9 text-xs font-semibold gap-1.5"
                                title="Sinkronkan kontak terpilih ke database internal MOIP"
                            >
                                {isSavingToDirectory ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Save className="w-3.5 h-3.5" />
                                )}
                                <span>Simpan ke Direktori</span>
                            </Button>

                            {/* Export Excel Button */}
                            <Button
                                variant="secondary"
                                onClick={handleExportExcel}
                                disabled={isExportingExcel || filteredEmployees.length === 0}
                                className="h-9 text-xs font-semibold gap-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                title="Unduh spreadsheet Excel (.xlsx) dengan 4 kolom: Nama, Job Title, Email, Nomor Telepon"
                            >
                                {isExportingExcel ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Download className="w-3.5 h-3.5" />
                                )}
                                <span>Ekspor Excel</span>
                            </Button>
                        </div>
                    </div>

                    {/* Table View */}
                    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
                        {isLoadingEmployees ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                <div>
                                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        Menghubungkan ke Database Lusha...
                                    </h4>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        Mengambil daftar karyawan dan mengekstrak job title untuk {selectedCompany.name}
                                    </p>
                                </div>
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                                <Users className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mb-2" />
                                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    Tidak Ada Karyawan yang Cocok
                                </h4>
                                <p className="text-xs text-zinc-500 max-w-md mt-1 mb-4">
                                    {employees.length === 0
                                        ? "Database Lusha belum mengembalikan kontak publik untuk perusahaan ini."
                                        : "Tidak ada karyawan dengan filter jabatan tersebut. Coba ganti pilihan filter jabatan Anda."}
                                </p>
                                {(selectedJobTitle !== "all" || jobTitleSearchQuery) && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedJobTitle("all");
                                            setJobTitleSearchQuery("");
                                        }}
                                        className="text-xs"
                                    >
                                        Tampilkan Semua Karyawan ({employees.length})
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[11px]">
                                            <th className="py-3 px-4 w-10 text-center">
                                                <button
                                                    onClick={handleToggleSelectAll}
                                                    className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                                    title={
                                                        selectedIds.size === filteredEmployees.length
                                                            ? "Batal Pilih Semua"
                                                            : "Pilih Semua"
                                                    }
                                                >
                                                    {selectedIds.size === filteredEmployees.length &&
                                                    filteredEmployees.length > 0 ? (
                                                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                                                    ) : (
                                                        <Square className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="py-3 px-4">Nama Lengkap</th>
                                            <th className="py-3 px-4">Job Title / Jabatan</th>
                                            <th className="py-3 px-4">Work Email</th>
                                            <th className="py-3 px-4">No. WhatsApp / HP</th>
                                            <th className="py-3 px-4 text-center">LinkedIn</th>
                                            <th className="py-3 px-4 text-center">Status Direktori</th>
                                            <th className="py-3 px-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                        {filteredEmployees.map((emp) => {
                                            const isSelected = selectedIds.has(emp.id);
                                            const isRevealedEmail = Boolean(emp.email);
                                            const isRevealedPhone = Boolean(emp.phone);

                                            return (
                                                <tr
                                                    key={emp.id}
                                                    className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition ${
                                                        isSelected
                                                            ? "bg-indigo-50/40 dark:bg-indigo-950/20"
                                                            : ""
                                                    }`}
                                                >
                                                    {/* Checkbox */}
                                                    <td className="py-3 px-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleSelectOne(emp.id)}
                                                            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                                                        />
                                                    </td>

                                                    {/* Full Name */}
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                                                                {emp.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                                    {emp.name}
                                                                </div>
                                                                {emp.department && (
                                                                    <div className="text-[11px] text-zinc-400">
                                                                        {emp.department}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Exact Job Title */}
                                                    <td className="py-3 px-4">
                                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-xs">
                                                            {emp.job_title}
                                                        </span>
                                                    </td>

                                                    {/* Email */}
                                                    <td className="py-3 px-4">
                                                        {isRevealedEmail ? (
                                                            <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                                                                <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                                <a
                                                                    href={`mailto:${emp.email}`}
                                                                    className="hover:underline truncate max-w-[180px]"
                                                                    title={emp.email!}
                                                                >
                                                                    {emp.email}
                                                                </a>
                                                            </div>
                                                        ) : emp.has_email ? (
                                                            <button
                                                                onClick={() => handleOpenSingleReveal(emp)}
                                                                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2 py-0.5 rounded transition"
                                                                title="Klik untuk membuka email via kuota Lusha"
                                                            >
                                                                <Lock className="w-3 h-3" />
                                                                <span>Tersedia (1 Kredit)</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-zinc-300 dark:text-zinc-600">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Phone */}
                                                    <td className="py-3 px-4">
                                                        {isRevealedPhone ? (
                                                            <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                                                                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                                <a
                                                                    href={`https://wa.me/${emp.phone!.replace(/[^0-9]/g, "")}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="hover:underline truncate"
                                                                >
                                                                    {emp.phone}
                                                                </a>
                                                            </div>
                                                        ) : emp.has_phone ? (
                                                            <button
                                                                onClick={() => handleOpenSingleReveal(emp)}
                                                                className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 px-2 py-0.5 rounded transition"
                                                                title="Klik untuk membuka nomor HP via kuota Lusha"
                                                            >
                                                                <Lock className="w-3 h-3" />
                                                                <span>Tersedia (1 Kredit)</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-zinc-300 dark:text-zinc-600">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* LinkedIn */}
                                                    <td className="py-3 px-4 text-center">
                                                        {emp.linkedin_url ? (
                                                            <a
                                                                href={emp.linkedin_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition"
                                                                title="Buka Profil LinkedIn"
                                                            >
                                                                <Linkedin className="w-4 h-4" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-zinc-300 dark:text-zinc-600">
                                                                —
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Directory Status */}
                                                    <td className="py-3 px-4 text-center">
                                                        {emp.is_saved_in_directory ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300">
                                                                <UserCheck className="w-3 h-3" />
                                                                Tersimpan
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                                                                Belum Ada
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Action */}
                                                    <td className="py-3 px-4 text-right">
                                                        {!isRevealedEmail || !isRevealedPhone ? (
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() => handleOpenSingleReveal(emp)}
                                                                className="h-7 text-[11px] px-2.5 font-medium gap-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                                                            >
                                                                <Unlock className="w-3 h-3" />
                                                                <span>Buka Kontak</span>
                                                            </Button>
                                                        ) : (
                                                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                                Lengkap
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Credit Reveal Confirmation Modal */}
            <CreditRevealModal
                isOpen={isRevealModalOpen}
                onClose={() => setIsRevealModalOpen(false)}
                contacts={candidatesToReveal.map((c) => ({
                    id: c.id,
                    name: c.name,
                    job_title: c.job_title,
                    has_email: c.has_email,
                    has_phone: c.has_phone,
                }))}
                currentQuota={quota.remaining}
                isLoading={isRevealingCredits}
                onConfirm={handleConfirmReveal}
            />
        </div>
    );
}
