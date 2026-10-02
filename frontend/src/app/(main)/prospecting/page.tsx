"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    Globe,
    HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { CreditRevealModal } from "@/components/domains/prospecting/CreditRevealModal";

interface CompanyCandidate {
    id?: string | null;
    company_id?: string | null;
    name: string;
    domain?: string | null;
    industry?: string | null;
    country?: string | null;
    city?: string | null;
    employee_count?: any;
    logo_url?: string | null;
    is_saved_in_directory?: boolean;
    in_database?: boolean;
    contacts_count?: number;
    stakeholder_count?: number;
    source?: "moip_database" | "lusha_database" | string;
}

interface ProspectCandidate {
    id: string;
    name?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    job_title: string;
    department?: string | null;
    seniority?: string | null;
    email: string | null;
    phone: string | null;
    linkedin_url?: string | null;
    has_email: boolean;
    has_phone: boolean;
    company_name?: string | null;
    company_domain?: string | null;
    is_saved_in_directory?: boolean;
    local_contact_id?: string | null;
    is_unlocked?: boolean;
    unlocked_email?: string | null;
    unlocked_phone?: string | null;
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
    const router = useRouter();
    const isProspectingEnabled = process.env.NEXT_PUBLIC_ENABLE_PROSPECTING === "true";

    useEffect(() => {
        if (!isProspectingEnabled) {
            router.replace("/dashboard");
        }
    }, [isProspectingEnabled, router]);

    if (!isProspectingEnabled) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center space-y-3 text-center">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                    <AlertCircle className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-zinc-600">Fitur Prospecting sedang dinonaktifkan.</p>
            </div>
        );
    }

    // 1. Quota State
    const [quota, setQuota] = useState<LushaQuota>({ used: 0, remaining: 74, total: 100 });
    const [isLoadingQuota, setIsLoadingQuota] = useState(false);

    // 2. Company Search & Selection State
    const [companyQuery, setCompanyQuery] = useState("");
    const [companyCandidates, setCompanyCandidates] = useState<CompanyCandidate[]>([]);
    const [isSearchingCompany, setIsSearchingCompany] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<CompanyCandidate | null>(null);
    const [isEditingDomain, setIsEditingDomain] = useState(false);
    const [domainInputValue, setDomainInputValue] = useState("");

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

    // Fetch live quota from Lusha
    const fetchQuota = useCallback(async () => {
        setIsLoadingQuota(true);
        try {
            const res = await api.get<{
                success: boolean;
                quota: number;
                used: number;
                limit: number;
            }>("/api/prospecting/lusha/usage");

            if (res.data && res.data.quota !== undefined) {
                setQuota({
                    used: res.data.used ?? 0,
                    remaining: res.data.quota,
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

    // Debounced Company Autocomplete Search
    useEffect(() => {
        if (!companyQuery.trim() || companyQuery.trim().length < 2) {
            setCompanyCandidates([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingCompany(true);
            try {
                const res = await api.get<{ results?: CompanyCandidate[]; companies?: CompanyCandidate[] }>(
                    `/api/prospecting/companies/search?q=${encodeURIComponent(companyQuery.trim())}`
                );
                const list = res.data?.results || res.data?.companies || [];
                setCompanyCandidates(list);
            } catch {
                setCompanyCandidates([]);
            } finally {
                setIsSearchingCompany(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [companyQuery]);

    // Fetch Employees when Company is selected or re-searched with domain
    const handleSelectCompany = async (company: CompanyCandidate, domainOverride?: string) => {
        const resolvedDomain = domainOverride !== undefined ? domainOverride : (company.domain || "");
        const activeCompany: CompanyCandidate = {
            ...company,
            domain: resolvedDomain || undefined,
        };

        setSelectedCompany(activeCompany);
        setDomainInputValue(resolvedDomain);
        setIsEditingDomain(false);
        setCompanyCandidates([]);
        setCompanyQuery(activeCompany.name);
        setSelectedIds(new Set());
        setSelectedJobTitle("all");
        setJobTitleSearchQuery("");
        setSearchError(null);
        setIsLoadingEmployees(true);

        try {
            const res = await api.post<{
                success: boolean;
                contacts: ProspectCandidate[];
                total: number;
                message?: string;
            }>("/api/prospecting/lusha/search", {
                company_name: activeCompany.name,
                company_domain: resolvedDomain.trim() || undefined,
                limit: 50,
            });

            if (res.data?.success && res.data?.contacts) {
                setEmployees(res.data.contacts);
            } else {
                setEmployees([]);
                if (res.data?.message) {
                    setSearchError(res.data.message);
                }
            }
        } catch (err: any) {
            setSearchError(err?.response?.data?.detail || "Gagal menarik data karyawan dari Lusha.");
            setEmployees([]);
        } finally {
            setIsLoadingEmployees(false);
        }
    };

    // Direct Search when user presses Enter or clicks 'Cari Karyawan'
    const handleDirectSearch = (overrideQuery?: string) => {
        const q = (overrideQuery || companyQuery).trim();
        if (!q) return;

        // Pick exact match or first candidate if available, else search directly
        const exactMatch = companyCandidates.find(
            (c) => c.name.toLowerCase() === q.toLowerCase()
        );
        const candidateToUse = exactMatch || (companyCandidates.length === 1 ? companyCandidates[0] : null);

        if (candidateToUse) {
            handleSelectCompany(candidateToUse);
        } else {
            handleSelectCompany({
                name: q,
                country: "Indonesia",
            });
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
        setDomainInputValue("");
        setIsEditingDomain(false);
        setSearchError(null);
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
                const titleStr = (emp.job_title || "").toLowerCase();
                const nameStr = (emp.full_name || emp.name || "").toLowerCase();
                const deptStr = (emp.department || "").toLowerCase();
                if (!titleStr.includes(query) && !nameStr.includes(query) && !deptStr.includes(query)) {
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

    // Trigger Reveal Modal for Selected Candidates
    const handleOpenBulkReveal = () => {
        const toReveal = employees.filter((e) => selectedIds.has(e.id));
        if (toReveal.length === 0) return;
        setCandidatesToReveal(toReveal);
        setIsRevealModalOpen(true);
    };

    // Trigger Reveal Modal for Single Candidate
    const handleOpenSingleReveal = (candidate: ProspectCandidate) => {
        setCandidatesToReveal([candidate]);
        setIsRevealModalOpen(true);
    };

    // Confirm Reveal Handler
    const handleConfirmReveal = async (options: ("email" | "phone")[]) => {
        if (candidatesToReveal.length === 0 || !selectedCompany) return;
        setIsRevealingCredits(true);

        try {
            const updatedEmployees = [...employees];

            for (const cand of candidatesToReveal) {
                const fullName = cand.full_name || cand.name || "Stakeholder";
                const parts = fullName.trim().split(/\s+/);
                const firstName = cand.first_name || parts[0] || "Stakeholder";
                const lastName = cand.last_name || (parts.length > 1 ? parts.slice(1).join(" ") : "Contact");

                const res = await api.post<any>("/api/prospecting/lusha/enrich", {
                    contact_id: cand.id,
                    first_name: firstName,
                    last_name: lastName,
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

    // Save Selected to Stakeholders Directory
    const handleSaveToDirectory = async () => {
        if (selectedIds.size === 0 || !selectedCompany) return;
        setIsSavingToDirectory(true);

        try {
            const selectedCandidates = employees.filter((e) => selectedIds.has(e.id));
            const payload = {
                company_name: selectedCompany.name,
                company_domain: selectedCompany.domain || undefined,
                company_industry: selectedCompany.industry || undefined,
                contacts: selectedCandidates.map((c) => ({
                    full_name: c.full_name || c.name || "Stakeholder",
                    job_title: c.job_title,
                    department: c.department || undefined,
                    email: c.email || undefined,
                    phone: c.phone || undefined,
                    linkedin_url: c.linkedin_url || undefined,
                })),
            };

            const res = await api.post<{
                success: boolean;
                company_id: string;
                contacts_saved: number;
            }>("/api/prospecting/save-to-stakeholders", payload);

            if (res.data?.success) {
                // Update local status
                setEmployees((prev) =>
                    prev.map((e) =>
                        selectedIds.has(e.id) ? { ...e, is_saved_in_directory: true } : e
                    )
                );
                setSelectedCompany((prev) =>
                    prev ? { ...prev, id: res.data.company_id, is_saved_in_directory: true } : null
                );
                setFeedbackMessage({
                    type: "success",
                    text: `Berhasil menyimpan ${res.data.contacts_saved} kontak ke Stakeholder Directory!`,
                });
                setTimeout(() => setFeedbackMessage(null), 5000);
            }
        } catch (err: any) {
            setFeedbackMessage({
                type: "error",
                text: err?.response?.data?.detail || "Gagal menyimpan kontak ke Stakeholder Directory.",
            });
            setTimeout(() => setFeedbackMessage(null), 5000);
        } finally {
            setIsSavingToDirectory(false);
        }
    };

    // Export to Excel 4 Columns
    const handleExportExcel = async () => {
        if (!selectedCompany) return;
        setIsExportingExcel(true);

        try {
            // Priority: selected candidates, or currently filtered employees
            const targetContacts = selectedIds.size > 0
                ? employees.filter((e) => selectedIds.has(e.id))
                : filteredEmployees;

            const res = await api.post(
                "/api/prospecting/export-excel",
                {
                    company_name: selectedCompany.name,
                    contacts: targetContacts.map((c) => ({
                        full_name: c.full_name || c.name || "Stakeholder",
                        job_title: c.job_title,
                        email: c.email || "",
                        phone: c.phone || "",
                    })),
                },
                { responseType: "blob" }
            );

            // Trigger file download
            const blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const safeCompanyName = selectedCompany.name.replace(/[^a-zA-Z0-9]/g, "_");
            a.download = `Kontak_${safeCompanyName}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setFeedbackMessage({
                type: "success",
                text: `File Excel berhasil diunduh (${targetContacts.length} kontak).`,
            });
            setTimeout(() => setFeedbackMessage(null), 4000);
        } catch (err: any) {
            setFeedbackMessage({
                type: "error",
                text: "Gagal mengunduh file spreadsheet Excel.",
            });
            setTimeout(() => setFeedbackMessage(null), 4000);
        } finally {
            setIsExportingExcel(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header with Title & Live Quota Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                        <Users className="w-6 h-6 text-indigo-600" />
                        <span>Lusha Prospecting Hub</span>
                    </h1>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Cari target perusahaan, filter karyawan berdasarkan Job Title riil, buka data kontak selektif, dan sinkronisasi ke Stakeholder Directory.
                    </p>
                </div>

                {/* Quota Widget */}
                <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/80 px-4 py-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs">
                    <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                            Sisa Kuota Lusha
                        </div>
                        <div className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                            {isLoadingQuota ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1 text-indigo-600" />
                            ) : (
                                <>
                                    <span className="text-indigo-600 dark:text-indigo-400">
                                        {quota.remaining}
                                    </span>
                                    <span className="text-zinc-400 font-normal">/ {quota.total} kredit</span>
                                </>
                            )}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={fetchQuota}
                        disabled={isLoadingQuota}
                        title="Segarkan kuota Lusha"
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQuota ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Notification / Feedback Banner */}
            {feedbackMessage && (
                <div
                    className={`p-3.5 rounded-xl text-xs flex items-center justify-between transition-all ${
                        feedbackMessage.type === "success"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {feedbackMessage.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span className="font-medium">{feedbackMessage.text}</span>
                    </div>
                    <button
                        onClick={() => setFeedbackMessage(null)}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Target Company Search Section */}
            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
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
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    value={companyQuery}
                                    onChange={(e) => setCompanyQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleDirectSearch();
                                        }
                                    }}
                                    placeholder="Ketik nama perusahaan (contoh: Bank Mega, OCBC, Ganesha, Telkomsel)..."
                                    className="pl-9 pr-9 h-11 text-sm bg-zinc-50 dark:bg-zinc-800/50"
                                    autoFocus
                                />
                                {isSearchingCompany && (
                                    <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" />
                                )}
                            </div>
                            <Button
                                onClick={() => handleDirectSearch()}
                                disabled={!companyQuery.trim() || isLoadingEmployees}
                                className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center gap-2 shrink-0 shadow-xs"
                            >
                                {isLoadingEmployees ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                                <span>Cari Karyawan</span>
                            </Button>
                        </div>

                        {/* Dropdown Suggestions */}
                        {companyQuery.trim().length >= 2 && (companyCandidates.length > 0 || !isSearchingCompany) && (
                            <div className="absolute z-20 left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                                {/* Direct Search Top Action */}
                                <button
                                    onClick={() => handleDirectSearch()}
                                    className="w-full text-left p-3 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition flex items-center justify-between gap-3 text-indigo-700 dark:text-indigo-300 font-semibold text-xs"
                                >
                                    <span className="flex items-center gap-2">
                                        <Search className="w-3.5 h-3.5 shrink-0" />
                                        <span>
                                            Cari langsung karyawan untuk <strong>"{companyQuery}"</strong> di database Lusha
                                        </span>
                                    </span>
                                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold shrink-0">
                                        Enter ↵
                                    </span>
                                </button>

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
                                                        <span className="font-mono text-[11px] text-zinc-500">
                                                            {cand.domain}
                                                        </span>
                                                    )}
                                                    {(cand.city || cand.country) && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{[cand.city, cand.country].filter(Boolean).join(", ")}</span>
                                                        </>
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
                                            {cand.is_saved_in_directory || cand.in_database ? (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Tersimpan di MOIP ({cand.contacts_count ?? cand.stakeholder_count ?? 0})
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
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/80">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
                                    {selectedCompany.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                            {selectedCompany.name}
                                        </h3>
                                        {(selectedCompany.is_saved_in_directory || selectedCompany.in_database) && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                                MOIP Directory
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        {selectedCompany.domain ? (
                                            <span className="font-mono text-zinc-700 dark:text-zinc-300 flex items-center gap-1 bg-zinc-200/60 dark:bg-zinc-700/60 px-1.5 py-0.5 rounded text-[11px]">
                                                <Globe className="w-3 h-3 text-zinc-500" />
                                                {selectedCompany.domain}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                                                Domain belum diatur
                                            </span>
                                        )}
                                        {(selectedCompany.city || selectedCompany.country) && (
                                            <>
                                                <span>•</span>
                                                <span>{[selectedCompany.city, selectedCompany.country].filter(Boolean).join(", ")}</span>
                                            </>
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

                            <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditingDomain(!isEditingDomain)}
                                    className="text-xs gap-1.5 h-8"
                                >
                                    <Globe className="w-3.5 h-3.5" />
                                    <span>{selectedCompany.domain ? "Ubah Domain" : "Set Domain"}</span>
                                </Button>
                                {selectedCompany.id && (
                                    <Link
                                        href={`/companies/${selectedCompany.id}?tab=stakeholders`}
                                        className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 transition h-8"
                                    >
                                        <span>Direktori MOIP</span>
                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                    </Link>
                                )}
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleSelectCompany(selectedCompany, selectedCompany.domain || undefined)}
                                    disabled={isLoadingEmployees}
                                    className="text-xs gap-1.5 h-8"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEmployees ? "animate-spin" : ""}`} />
                                    <span>Segarkan Data Lusha</span>
                                </Button>
                            </div>
                        </div>

                        {/* Inline Domain Configuration Bar */}
                        {isEditingDomain && (
                            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl flex flex-col sm:flex-row items-center gap-2">
                                <div className="flex items-center gap-2 flex-1 w-full">
                                    <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <Input
                                        value={domainInputValue}
                                        onChange={(e) => setDomainInputValue(e.target.value)}
                                        placeholder="Contoh: ganeshaoperation.com atau bankmega.com"
                                        className="h-9 text-xs bg-white dark:bg-zinc-900 font-mono"
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleSelectCompany(selectedCompany, domainInputValue);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                                    <Button
                                        size="sm"
                                        onClick={() => handleSelectCompany(selectedCompany, domainInputValue)}
                                        disabled={isLoadingEmployees}
                                        className="h-9 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                                    >
                                        {isLoadingEmployees ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            "Terapkan & Cari Ulang"
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditingDomain(false)}
                                        className="h-9 text-xs px-2 text-zinc-500"
                                    >
                                        Batal
                                    </Button>
                                </div>
                            </div>
                        )}
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
                        onClick={() => selectedCompany && handleSelectCompany(selectedCompany, selectedCompany.domain || undefined)}
                        className="h-7 text-xs"
                    >
                        Coba Lagi
                    </Button>
                </div>
            )}

            {/* Main Prospecting Workspace */}
            {selectedCompany && (
                <div className="space-y-4">
                    {/* Discovery Toolbar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                        {/* Dynamic Job Title Filter & Instant Text Search */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                            {/* Dynamic Job Title Dropdown */}
                            <div className="relative min-w-[240px]">
                                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                                <select
                                    value={selectedJobTitle}
                                    onChange={(e) => setSelectedJobTitle(e.target.value)}
                                    className="w-full pl-9 pr-8 h-9 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    <option value="all">
                                        Semua Jabatan ({employees.length} kontak)
                                    </option>
                                    {jobTitleOptions.map((opt, idx) => (
                                        <option key={idx} value={opt.title}>
                                            {opt.title} ({opt.count})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Instant Search Bar */}
                            <div className="relative flex-1">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    value={jobTitleSearchQuery}
                                    onChange={(e) => setJobTitleSearchQuery(e.target.value)}
                                    placeholder="Filter nama atau kata kunci jabatan..."
                                    className="pl-8 h-9 text-xs bg-zinc-50 dark:bg-zinc-800"
                                />
                                {jobTitleSearchQuery && (
                                    <button
                                        onClick={() => setJobTitleSearchQuery("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            {/* Reveal Button */}
                            <Button
                                onClick={handleOpenBulkReveal}
                                disabled={selectedIds.size === 0 || isRevealingCredits}
                                className="h-9 text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                                title="Buka email & telepon kontak terpilih menggunakan kuota Lusha"
                            >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Buka Kontak ({selectedIds.size})</span>
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
                            <div className="py-16 flex flex-col items-center justify-center text-center px-4 max-w-lg mx-auto">
                                <Users className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mb-2" />
                                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {employees.length === 0
                                        ? "Tidak Ada Kontak Karyawan Ditemukan"
                                        : "Tidak Ada Karyawan yang Cocok"}
                                </h4>
                                <p className="text-xs text-zinc-500 mt-1 mb-4 leading-relaxed">
                                    {employees.length === 0
                                        ? `Database Lusha belum mengembalikan kontak publik untuk "${selectedCompany.name}". Coba masukkan domain website resmi perusahaan agar Lusha dapat memetakan organisasi dengan akurat:`
                                        : "Tidak ada karyawan dengan filter jabatan atau kata kunci tersebut. Coba reset filter jabatan Anda."}
                                </p>

                                {employees.length === 0 ? (
                                    <div className="w-full space-y-3">
                                        <div className="flex gap-2">
                                            <Input
                                                value={domainInputValue}
                                                onChange={(e) => setDomainInputValue(e.target.value)}
                                                placeholder="Contoh: ganeshaoperation.com atau bankmega.com"
                                                className="h-9 text-xs bg-zinc-50 dark:bg-zinc-800 font-mono"
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        handleSelectCompany(selectedCompany, domainInputValue);
                                                    }
                                                }}
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => handleSelectCompany(selectedCompany, domainInputValue)}
                                                disabled={isLoadingEmployees || !domainInputValue.trim()}
                                                className="h-9 text-xs px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shrink-0"
                                            >
                                                Cari Ulang
                                            </Button>
                                        </div>
                                        <p className="text-[11px] text-zinc-400">
                                            Tips: Perusahaan multinasional atau lokal seringkali terdaftar di Lusha dengan domain website resminya.
                                        </p>
                                    </div>
                                ) : (
                                    (selectedJobTitle !== "all" || jobTitleSearchQuery) && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedJobTitle("all");
                                                setJobTitleSearchQuery("");
                                            }}
                                            className="text-xs"
                                        >
                                            Reset Filter Jabatan
                                        </Button>
                                    )
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 text-zinc-500 font-medium">
                                            <th className="py-3 px-4 w-10 text-center">
                                                <button
                                                    onClick={handleToggleSelectAll}
                                                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 flex items-center justify-center mx-auto"
                                                    title={
                                                        selectedIds.size === filteredEmployees.length
                                                            ? "Batalkan pilihan semua"
                                                            : "Pilih semua"
                                                    }
                                                >
                                                    {selectedIds.size > 0 &&
                                                    selectedIds.size === filteredEmployees.length ? (
                                                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                                                    ) : (
                                                        <Square className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                                                Karyawan & Jabatan
                                            </th>
                                            <th className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                                                Email
                                            </th>
                                            <th className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                                                Nomor Telepon
                                            </th>
                                            <th className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300 text-center w-24">
                                                LinkedIn
                                            </th>
                                            <th className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300 text-center w-28">
                                                Direktori MOIP
                                            </th>
                                            <th className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300 text-right w-28">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                                        {filteredEmployees.map((emp) => {
                                            const isSelected = selectedIds.has(emp.id);
                                            const isRevealedEmail = Boolean(emp.email);
                                            const isRevealedPhone = Boolean(emp.phone);
                                            const empName = emp.full_name || emp.name || "Stakeholder";

                                            return (
                                                <tr
                                                    key={emp.id}
                                                    className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition ${
                                                        isSelected
                                                            ? "bg-indigo-50/30 dark:bg-indigo-950/20"
                                                            : ""
                                                    }`}
                                                >
                                                    {/* Checkbox */}
                                                    <td className="py-3 px-4 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleSelectOne(emp.id)}
                                                            className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        />
                                                    </td>

                                                    {/* Name & Job Title */}
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-600 dark:text-zinc-300 shrink-0">
                                                                {empName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                                                                    <span>{empName}</span>
                                                                    {emp.department && (
                                                                        <span className="text-[10px] text-zinc-400 font-normal bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                                                            {emp.department}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-zinc-600 dark:text-zinc-300 font-medium text-xs mt-0.5">
                                                                    {emp.job_title}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Email */}
                                                    <td className="py-3 px-4">
                                                        {isRevealedEmail ? (
                                                            <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200 font-mono text-[11px]">
                                                                <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                                <a
                                                                    href={`mailto:${emp.email}`}
                                                                    className="hover:underline truncate max-w-[200px]"
                                                                    title={emp.email!}
                                                                >
                                                                    {emp.email}
                                                                </a>
                                                            </div>
                                                        ) : emp.has_email ? (
                                                            <button
                                                                onClick={() => handleOpenSingleReveal(emp)}
                                                                className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2 py-0.5 rounded transition"
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
                    name: c.full_name || c.name || "Stakeholder",
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
