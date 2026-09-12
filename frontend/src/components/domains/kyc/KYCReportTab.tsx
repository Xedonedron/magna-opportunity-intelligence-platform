"use client";

import {
    Zap,
    Building2,
    MapPin,
    Briefcase,
    Target,
    Users,
    Swords,
    HelpCircle,
    ExternalLink,
    AlertTriangle,
    RefreshCw,
    Loader2,
    Edit3,
    X,
    Save,
    CheckCircle2,
    Clock,
    Copy,
    Check,
    Sparkles,
    Wrench,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CollapsibleErrorAlert } from "@/components/ui/CollapsibleErrorAlert";
import { UseCaseAccordion } from "./UseCaseAccordion";
import { VersionSelector } from "./VersionSelector";
import { KYCEditForm } from "./KYCEditForm";
import {
    useLatestKYCReport,
    useRegenerateKYC,
    useKYCVersions,
    useUpdateKYCReport,
} from "@/hooks/use-kyc";
import { useLanguage } from "@/context/LanguageContext";
import { formatKYCToMarkdown } from "@/lib/clipboard-formatters";
import type { KYCReport } from "@/types/kyc";
import { normalizeRecommendedQuestions } from "@/types/kyc";

export function KYCReportTab({ opportunityId }: { opportunityId: string }) {
    const router = useRouter();
    const { t } = useLanguage();
    const { data: latestReport, isLoading } = useLatestKYCReport(opportunityId);
    const { data: versionsData } = useKYCVersions(opportunityId);
    const regenerate = useRegenerateKYC(opportunityId);
    const updateReport = useUpdateKYCReport(opportunityId);

    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [editingReport, setEditingReport] = useState<KYCReport | null>(null);
    const [showConfirmRegenerate, setShowConfirmRegenerate] = useState(false);
    const [regenerateTitle, setRegenerateTitle] = useState("");
    const [regenerateFocus, setRegenerateFocus] = useState("");
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isCopied, setIsCopied] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem("moip_user");
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                localStorage.removeItem("moip_user");
            }
        }
    }, []);

    const canEdit = user ? user.capabilities?.split(",").map((c: string) => c.trim()).includes("create_edit") : false;
    const canGenerate = user ? user.capabilities?.split(",").map((c: string) => c.trim()).includes("generate_kyc") : false;

    // Determine which report to display
    const report = selectedReportId
        ? versionsData?.items.find((r) => r.id === selectedReportId) || latestReport
        : latestReport;

    // Sync title input and reset inline title edit when report changes
    useEffect(() => {
        if (report) {
            setTitleInput(report.title || "");
            setIsEditingTitle(false);
        }
    }, [report?.id]);

    // Reset edit state when report changes
    useEffect(() => {
        setIsEditMode(false);
        setEditingReport(null);
    }, [selectedReportId]);

    // Sync editing report when display report changes
    useEffect(() => {
        if (report && !isEditMode) {
            setEditingReport(null);
        }
    }, [report, isEditMode]);

    // Handle edit mode toggle
    const handleEnterEditMode = () => {
        if (report) {
            setEditingReport(JSON.parse(JSON.stringify(report)));
            setIsEditMode(true);
        }
    };

    const handleCancelEdit = () => {
        setEditingReport(null);
        setIsEditMode(false);
    };

    // Handle field change in edit mode
    const handleFieldChange = (field: keyof KYCReport, value: unknown) => {
        if (editingReport) {
            setEditingReport({
                ...editingReport,
                [field]: value,
            });
        }
    };

    // Handle save
    const handleSave = async () => {
        if (!editingReport) return;

        try {
            await updateReport.mutateAsync({
                reportId: editingReport.id,
                data: editingReport,
            });
            setIsEditMode(false);
            setEditingReport(null);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            setSaveError(t.opportunityDetail.kyc.saveError || "Failed to save changes. Please try again.");
            setTimeout(() => setSaveError(null), 5000);
        }
    };

    // Handle quick title save via pencil icon
    const handleSaveTitle = async () => {
        if (!report) return;
        try {
            await updateReport.mutateAsync({
                reportId: report.id,
                data: { title: titleInput.trim() || undefined },
            });
            setIsEditingTitle(false);
            toast.success("Deskripsi versi berhasil diperbarui");
        } catch (error) {
            toast.error("Gagal memperbarui deskripsi versi");
        }
    };

    // Handle regenerate modal trigger
    const handleRegenerateClick = () => {
        const currentMax = versionsData?.items.reduce((max, v) => Math.max(max, v.version), 0) || report?.version || 1;
        const nextVersion = currentMax + 1;
        setRegenerateTitle(`v${nextVersion} - `);
        setRegenerateFocus("");
        setShowConfirmRegenerate(true);
    };

    const handleConfirmRegenerate = async () => {
        try {
            const cleanTitle = regenerateTitle.trim() || undefined;
            const cleanFocus = regenerateFocus.trim() || undefined;
            await regenerate.mutateAsync({
                source_type: "manual_regenerate",
                title: cleanTitle,
                focus_notes: cleanFocus,
            });
            setShowConfirmRegenerate(false);
            setSelectedReportId(null); // Auto-track latestReport
            toast.success("Regenerasi KYC berhasil dimulai.");
        } catch (error) {
            toast.error("Gagal memulai regenerasi KYC.");
        }
    };

    // Handle copy KYC to clipboard
    const handleCopyKYC = () => {
        if (!report) return;
        try {
            const markdown = formatKYCToMarkdown(report);
            navigator.clipboard.writeText(markdown);
            setIsCopied(true);
            toast.success(t.opportunityDetail.kyc.copySuccess || "Laporan KYC berhasil disalin ke clipboard.");
            setTimeout(() => setIsCopied(false), 2500);
        } catch (e) {
            toast.error("Gagal menyalin laporan ke clipboard.");
        }
    };

    // Check for unsaved changes
    const hasUnsavedChanges = isEditMode && editingReport && report &&
        JSON.stringify(editingReport) !== JSON.stringify(report);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    if (!report) {
        return (
            <Card className="p-12 text-center">
                <Zap className="w-12 h-12 mx-auto mb-4 text-zinc-200" />
                <h3 className="text-lg font-medium text-zinc-900 mb-2">{t.opportunityDetail.kyc.noReportTitle}</h3>
                <p className="text-zinc-500 mb-6 max-w-md mx-auto">
                    {t.opportunityDetail.kyc.noReportDesc}
                </p>
                {canGenerate && (
                    <Button onClick={handleRegenerateClick} disabled={regenerate.isPending}>
                        {regenerate.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Zap className="w-4 h-4 mr-2" />
                        )}
                        {t.opportunityDetail.kyc.generateButton}
                    </Button>
                )}
            </Card>
        );
    }

    // Header component containing VersionSelector, Version Title + Pencil Edit, and Actions
    const renderHeader = () => (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
            <div className="flex items-center gap-3 flex-wrap">
                {versionsData && versionsData.items.length > 0 && (
                    <VersionSelector
                        versions={versionsData.items}
                        currentVersionId={selectedReportId || report?.id || null}
                        onSelectVersion={(id) => setSelectedReportId(id)}
                    />
                )}

                {/* Version Title & Pencil Edit Button */}
                {report && (
                    <div className="flex items-center gap-1.5">
                        {isEditingTitle ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in">
                                <input
                                    type="text"
                                    value={titleInput}
                                    onChange={(e) => setTitleInput(e.target.value)}
                                    placeholder="Judul / deskripsi versi (contoh: Penambahan konteks switch)..."
                                    className="px-2.5 py-1 text-xs border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 w-52 sm:w-64"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveTitle();
                                        if (e.key === "Escape") setIsEditingTitle(false);
                                    }}
                                    autoFocus
                                />
                                <Button
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={handleSaveTitle}
                                    disabled={updateReport.isPending}
                                    title="Simpan judul versi"
                                >
                                    <Check className="w-3 h-3" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => {
                                        setIsEditingTitle(false);
                                        setTitleInput(report.title || "");
                                    }}
                                    title="Batal"
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ) : (
                            canEdit && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTitleInput(report.title || "");
                                        setIsEditingTitle(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200/80 rounded-md transition-colors"
                                    title="Ubah deskripsi versi ini"
                                >
                                    <Edit3 className="w-3 h-3 text-zinc-400" />
                                    <span>{report.title ? "Ubah Deskripsi" : "Beri Deskripsi"}</span>
                                </button>
                            )
                        )}
                    </div>
                )}

                {report && (
                    <span className="text-xs text-zinc-400 capitalize hidden sm:inline">
                        • {report.source_type.replace(/_/g, " ")}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                {/* Copy to Clipboard Button (only when report is completed) */}
                {report && report.status === "completed" && (
                    <Button
                        variant="secondary"
                        size="sm"
                        className="gap-1.5 text-xs text-zinc-700 border border-zinc-200 hover:bg-zinc-100 transition-colors"
                        onClick={handleCopyKYC}
                        title={t.opportunityDetail.kyc.copyButton || "Salin Laporan KYC"}
                    >
                        {isCopied ? (
                            <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600 font-medium">
                                    {t.opportunityDetail.kyc.copied || "Laporan Tersalin!"}
                                </span>
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                                <span>{t.opportunityDetail.kyc.copyButton || "Salin Laporan KYC"}</span>
                            </>
                        )}
                    </Button>
                )}

                {canEdit && report && report.status === "completed" && (
                    <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                        onClick={handleEnterEditMode}
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        {t.opportunityDetail.kyc.editButton}
                    </Button>
                )}

                {canGenerate && (
                    <Button
                        variant={report?.status === "failed" ? "primary" : "secondary"}
                        size="sm"
                        className="gap-2"
                        onClick={handleRegenerateClick}
                        disabled={regenerate.isPending || report?.status === "running"}
                    >
                        {regenerate.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        {report?.status === "failed"
                            ? "Generate Ulang Versi Baru"
                            : regenerate.isPending
                                ? t.opportunityDetail.kyc.regenerating
                                : t.opportunityDetail.kyc.regenerateButton}
                    </Button>
                )}
            </div>
        </div>
    );

    // Enhanced Regenerate Modal Dialog
    const renderRegenerateModal = () => {
        if (!showConfirmRegenerate) return null;

        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-2 mb-3">
                        <RefreshCw className="w-5 h-5 text-zinc-900" />
                        <h3 className="text-lg font-semibold text-zinc-900">
                            {t.opportunityDetail.kyc.confirmRegenerateTitle || "Generate Ulang Laporan KYC"}
                        </h3>
                    </div>
                    <p className="text-sm text-zinc-600 mb-4">
                        {t.opportunityDetail.kyc.confirmRegenerateDesc || "Analisis AI akan membuat versi baru berdasarkan profil opportunity terkini."}
                    </p>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                                Judul / Label Versi (Opsional)
                            </label>
                            <input
                                type="text"
                                value={regenerateTitle}
                                onChange={(e) => setRegenerateTitle(e.target.value)}
                                placeholder="Contoh: v2 - Penambahan konteks untuk core switch"
                                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                                Fokus / Instruksi Pembaruan Versi (Opsional)
                            </label>
                            <textarea
                                rows={3}
                                value={regenerateFocus}
                                onChange={(e) => setRegenerateFocus(e.target.value)}
                                placeholder="Tuliskan arahan spesifik jika konteks berubah, contoh: Fokus pada pengadaan Server On-Premise & migrasi compute. Abaikan kebutuhan WiFi/Network sebelumnya."
                                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 placeholder:text-zinc-400"
                            />
                            <p className="text-[11px] text-zinc-500 mt-1">
                                AI akan mengisolasi fokus analisis ke arahan ini agar hasil tidak bercampur dengan konteks sebelumnya.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                        <Button
                            variant="secondary"
                            onClick={() => setShowConfirmRegenerate(false)}
                            disabled={regenerate.isPending}
                        >
                            {t.common.cancel}
                        </Button>
                        <Button 
                            onClick={handleConfirmRegenerate}
                            disabled={regenerate.isPending}
                            className="gap-2"
                        >
                            {regenerate.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4" />
                            )}
                            {regenerate.isPending ? "Memulai Analisis..." : "Generate Versi Baru"}
                        </Button>
                    </div>
                </Card>
            </div>
        );
    };

    if (report.status === "running") {
        const currentStep = report.progress_step || "received";
        
        // Map current step to aligned percentage
        const stepProgressMap: Record<string, number> = {
            received: 20,
            fetching_web: 45,
            fetching_industry: 70,
            analyzing: 88,
            completed: 100,
        };

        const percent = report.progress_percent || stepProgressMap[currentStep] || 20;
        
        const steps = [
            { key: "received", label: t.opportunityDetail.kyc.progress.received, desc: t.opportunityDetail.kyc.progress.receivedDesc },
            { key: "fetching_web", label: t.opportunityDetail.kyc.progress.fetchingWeb, desc: t.opportunityDetail.kyc.progress.fetchingWebDesc },
            { key: "fetching_industry", label: t.opportunityDetail.kyc.progress.fetchingIndustry, desc: t.opportunityDetail.kyc.progress.fetchingIndustryDesc },
            { key: "analyzing", label: t.opportunityDetail.kyc.progress.analyzing, desc: t.opportunityDetail.kyc.progress.analyzingDesc },
        ];

        const getStepState = (stepKey: string, currentStepName: string | undefined) => {
            const stepOrder = ["received", "fetching_web", "fetching_industry", "analyzing", "completed"];
            const currentIndex = stepOrder.indexOf(currentStepName || "received");
            const targetIndex = stepOrder.indexOf(stepKey);
            
            if (currentIndex > targetIndex) return "completed";
            if (currentIndex === targetIndex) return "active";
            return "pending";
        };

        // Calculate timeline line height to match active step
        const stepIndexMap: Record<string, number> = {
            received: 0,
            fetching_web: 1,
            fetching_industry: 2,
            analyzing: 3,
            completed: 4,
        };
        const currentStepIdx = stepIndexMap[currentStep] ?? 0;
        const timelineLineHeight = Math.min(100, Math.max(10, ((currentStepIdx + 0.5) / steps.length) * 100));

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                {renderHeader()}
                <Card className="p-8 max-w-2xl mx-auto border border-zinc-200 shadow-sm bg-white mt-4">
                    <div className="text-center mb-6">
                        <div className="inline-flex p-3 rounded-full bg-zinc-50 border border-zinc-100 mb-3 animate-pulse">
                            <Loader2 className="w-6 h-6 animate-spin text-zinc-950" />
                        </div>
                        <h3 className="text-xl font-semibold text-zinc-950">
                            Analisis KYC Sedang Berjalan (v{report.version})
                        </h3>
                        <p className="text-zinc-500 text-sm mt-1">
                            Magna AI sedang mengumpulkan informasi dari berbagai sumber. Halaman ini akan diperbarui secara otomatis.
                        </p>
                    </div>

                    {/* Progress bar with percentage indicator */}
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-2 text-xs font-medium text-zinc-500">
                            <span>Progress Analisis</span>
                            <span className="text-zinc-950 font-semibold">{percent}%</span>
                        </div>
                        <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                            <div 
                                className="bg-zinc-900 h-full transition-all duration-500 ease-out rounded-full"
                                style={{ width: `${Math.min(100, Math.max(5, percent))}%` }}
                            />
                        </div>
                    </div>

                    {/* Vertical Timeline Steps */}
                    <div className="space-y-6 relative">
                        {/* Background grey vertical connector line */}
                        <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-zinc-100" />
                        {/* Active green/dark vertical connector line synced with progress */}
                        <div 
                            className="absolute left-[15px] top-3 w-0.5 bg-zinc-900 transition-all duration-500 ease-out" 
                            style={{ height: `${timelineLineHeight}%` }}
                        />
                        {steps.map((step) => {
                            const state = getStepState(step.key, currentStep);
                            return (
                                <div key={step.key} className="flex gap-4 items-start relative z-10">
                                    <div className="flex items-center justify-center">
                                        {state === "completed" && (
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                        )}
                                        {state === "active" && (
                                            <div className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-white shadow-md animate-pulse">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            </div>
                                        )}
                                        {state === "pending" && (
                                            <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center text-zinc-300">
                                                <Clock className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 pt-0.5">
                                        <h4 className={`text-sm font-semibold transition-colors ${
                                            state === "active" 
                                                ? "text-zinc-950" 
                                                : state === "completed" 
                                                    ? "text-zinc-800" 
                                                    : "text-zinc-400"
                                        }`}>
                                            {step.label}
                                        </h4>
                                        <p className={`text-xs mt-0.5 transition-colors ${
                                            state === "active" 
                                                ? "text-zinc-600" 
                                                : state === "completed" 
                                                    ? "text-zinc-500" 
                                                    : "text-zinc-400"
                                        }`}>
                                            {step.desc}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
                {renderRegenerateModal()}
            </div>
        );
    }

    if (report.status === "failed") {
        const isSuperAdmin = user?.role === "superadmin";
        const otherCompletedVersion = versionsData?.items.find(
            (v) => v.status === "completed" && v.id !== report.id
        );

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                {renderHeader()}
                <div className="max-w-3xl mx-auto mt-4 space-y-3">
                    {otherCompletedVersion && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50/90 border border-blue-200 rounded-xl text-blue-900 shadow-sm animate-in fade-in">
                            <div className="flex items-center gap-2.5">
                                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="text-xs">
                                    Versi ini gagal dibuat, namun <strong>v{otherCompletedVersion.version}{otherCompletedVersion.title ? ` - ${otherCompletedVersion.title}` : ""}</strong> telah berhasil dibuat.
                                </span>
                            </div>
                            <Button
                                size="sm"
                                variant="secondary"
                                className="text-xs h-7 bg-white hover:bg-blue-50 border-blue-200 text-blue-800 shrink-0 shadow-xs"
                                onClick={() => setSelectedReportId(otherCompletedVersion.id)}
                            >
                                Buka v{otherCompletedVersion.version}
                            </Button>
                        </div>
                    )}
                    <CollapsibleErrorAlert
                        title={t.opportunityDetail.kyc.failedTitle || "Pembuatan Laporan KYC Gagal"}
                        errorMessage={report.error_message}
                        canRetry={canGenerate}
                        onRetry={handleRegenerateClick}
                        isRetrying={regenerate.isPending}
                        showSettingsLink={isSuperAdmin}
                        onNavigateSettings={() => router.push("/settings")}
                    />
                </div>
                {renderRegenerateModal()}
            </div>
        );
    }

    // Render edit mode
    if (isEditMode && editingReport) {
        return (
            <div className="space-y-6">
                {/* Save/Cancel Bar */}
                <div className="sticky top-0 z-20 bg-white border-b border-zinc-200 -mx-4 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm font-medium">{t.opportunityDetail.kyc.editButton}</span>
                        {hasUnsavedChanges && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                Unsaved changes
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                            <X className="w-4 h-4 mr-1" /> {t.common.cancel}
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={updateReport.isPending}
                        >
                            {updateReport.isPending ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-1" />
                            )}
                            {t.opportunityDetail.kyc.saveButton}
                        </Button>
                    </div>
                </div>

                {/* Edit Form */}
                <KYCEditForm report={editingReport} onChange={handleFieldChange} />

                {/* Toasts */}
                {saveSuccess && (
                    <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
                        <Save className="w-4 h-4" />
                        {t.opportunityDetail.kyc.saveSuccess}
                    </div>
                )}
                {saveError && (
                    <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
                        <AlertTriangle className="w-4 h-4" />
                        {saveError}
                    </div>
                )}
                {renderRegenerateModal()}
            </div>
        );
    }

    // Render view mode
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header with version info & actions */}
            {renderHeader()}

            {/* Executive Summary */}
            {report.executive_summary && (
                <section>
                    <SectionTitle>{t.opportunityDetail.kyc.sections.executiveSummary || "Executive Summary"}</SectionTitle>
                    <Card className="p-6 bg-zinc-900 text-zinc-50 border-none shadow-md">
                        <div className="flex gap-4 items-start">
                            <Zap className="w-6 h-6 text-zinc-400 shrink-0 mt-1" />
                            <p className="leading-relaxed whitespace-pre-wrap">
                                {report.executive_summary}
                            </p>
                        </div>
                    </Card>
                </section>
            )}

            {/* Company Overview */}
            {report.company_overview && (
                <section>
                    <SectionTitle>{t.opportunityDetail.kyc.sections.companyOverview || "Company Overview"}</SectionTitle>
                    <Card className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <OverviewItem
                                    icon={<Building2 className="w-4 h-4" />}
                                    label="Name"
                                    value={report.company_overview.name}
                                />
                                {report.company_overview.founded && (
                                    <OverviewItem
                                        icon={<Building2 className="w-4 h-4" />}
                                        label="Founded"
                                        value={report.company_overview.founded}
                                    />
                                )}
                                {report.company_overview.size && (
                                    <OverviewItem
                                        icon={<Briefcase className="w-4 h-4" />}
                                        label="Size"
                                        value={report.company_overview.size}
                                    />
                                )}
                            </div>
                            <div className="space-y-3">
                                {report.company_overview.headquarters && (
                                    <OverviewItem
                                        icon={<MapPin className="w-4 h-4" />}
                                        label="HQ"
                                        value={report.company_overview.headquarters}
                                    />
                                )}
                                {report.company_overview.key_products &&
                                    report.company_overview.key_products.length > 0 && (
                                        <div>
                                            <span className="text-xs text-zinc-500 uppercase tracking-wider">
                                                Key Products
                                            </span>
                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                {report.company_overview.key_products.map((p) => (
                                                    <span
                                                        key={p}
                                                        className="text-xs bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded"
                                                    >
                                                        {p}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                            </div>
                        </div>
                        {report.company_overview.description && (
                            <p className="text-sm text-zinc-600 leading-relaxed mt-4 pt-4 border-t border-zinc-100">
                                {report.company_overview.description}
                            </p>
                        )}
                    </Card>
                </section>
            )}

            {/* Industry & Business Model */}
            {(report.industry_analysis || report.business_model) && (
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {report.industry_analysis && (
                        <div>
                            <SectionTitle>{t.opportunityDetail.kyc.sections.industryAnalysis || "Industry Analysis"}</SectionTitle>
                            <Card className="p-6">
                                <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                    {report.industry_analysis}
                                </p>
                            </Card>
                        </div>
                    )}
                    {report.business_model && (
                        <div>
                            <SectionTitle>{t.opportunityDetail.kyc.sections.businessModel || "Business Model"}</SectionTitle>
                            <Card className="p-6">
                                <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                    {report.business_model}
                                </p>
                            </Card>
                        </div>
                    )}
                </section>
            )}

            {/* Competitor Analysis */}
            {report.competitor_analysis && report.competitor_analysis.length > 0 && (
                <section>
                    <SectionTitle>{t.opportunityDetail.kyc.sections.competitorAnalysis || "Competitor Analysis"}</SectionTitle>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {report.competitor_analysis.map((comp, idx) => (
                            <Card key={idx} className="p-5 flex flex-col justify-between border-zinc-200">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                                        <div className="w-8 h-8 rounded bg-zinc-100 flex items-center justify-center text-zinc-600">
                                            <Swords className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-zinc-900 leading-tight">
                                                {comp.name}
                                            </h4>
                                            <span className="text-[11px] font-medium text-zinc-500">
                                                {comp.market_position || "Competitor"}
                                            </span>
                                        </div>
                                    </div>

                                    {comp.strengths && comp.strengths.length > 0 && (
                                        <div>
                                            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                                                Strengths
                                            </span>
                                            <ul className="space-y-1">
                                                {comp.strengths.map((s, sIdx) => (
                                                    <li key={sIdx} className="text-xs text-zinc-600 flex items-start gap-1.5">
                                                        <span className="text-emerald-500 font-bold leading-none mt-0.5">•</span>
                                                        <span>{s}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {comp.weaknesses && comp.weaknesses.length > 0 && (
                                        <div>
                                            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                                                Weaknesses / Gaps
                                            </span>
                                            <ul className="space-y-1">
                                                {comp.weaknesses.map((w, wIdx) => (
                                                    <li key={wIdx} className="text-xs text-zinc-600 flex items-start gap-1.5">
                                                        <span className="text-rose-500 font-bold leading-none mt-0.5">•</span>
                                                        <span>{w}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {comp.differentiators && (
                                        <div className="pt-2 border-t border-zinc-100">
                                            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-0.5">
                                                Differentiator
                                            </span>
                                            <p className="text-xs text-zinc-700 italic">
                                                {comp.differentiators}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            )}

            {/* Customer Need Summary & Pain Points */}
            {(report.customer_need_summary ||
                (report.potential_pain_points && report.potential_pain_points.length > 0)) && (
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {report.customer_need_summary && (
                            <div>
                                <SectionTitle>{t.opportunityDetail.kyc.sections.customerNeedSummary || "Customer Need Summary"}</SectionTitle>
                                <Card className="p-6">
                                    <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                        {report.customer_need_summary}
                                    </p>
                                </Card>
                            </div>
                        )}
                        {report.potential_pain_points && report.potential_pain_points.length > 0 && (
                            <div>
                                <SectionTitle>{t.opportunityDetail.kyc.sections.potentialPainPoints || "Potential Pain Points"}</SectionTitle>
                                <Card className="p-6">
                                    <ul className="space-y-2">
                                        {report.potential_pain_points.map((point, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                                                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                                                {point}
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            </div>
                        )}
                    </section>
                )}

            {/* Use Cases */}
            {report.use_cases && report.use_cases.length > 0 && (
                <section>
                    <SectionTitle>{t.opportunityDetail.kyc.sections.recommendedUseCases || "Recommended Solutions & Use Cases"}</SectionTitle>
                    <UseCaseAccordion useCases={report.use_cases} />
                </section>
            )}

            {/* Meeting Objectives & Recommended Questions */}
            {(report.meeting_objectives || report.recommended_questions) && (() => {
                const rq = normalizeRecommendedQuestions(report.recommended_questions);
                const hasBusiness = rq.business.length > 0;
                const hasTechnical = rq.technical.length > 0;
                const hasQuestions = hasBusiness || hasTechnical;
                return (
                <section className="space-y-6">
                    {/* Meeting Objectives */}
                    {report.meeting_objectives && report.meeting_objectives.length > 0 && (
                        <div>
                            <SectionTitle>{t.opportunityDetail.kyc.sections.meetingObjectives || "Meeting Objectives"}</SectionTitle>
                            <Card className="p-6">
                                <ul className="space-y-2">
                                    {report.meeting_objectives.map((obj, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                                            <Target className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                                            {obj}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        </div>
                    )}
                    {/* Recommended Questions — Business & Technical */}
                    {hasQuestions && (
                        <div>
                            <SectionTitle>{t.opportunityDetail.kyc.sections.recommendedQuestions || "Recommended Questions"}</SectionTitle>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {hasBusiness && (
                                    <Card className="p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Briefcase className="w-4 h-4 text-indigo-500" />
                                            <h4 className="text-sm font-semibold text-indigo-700">Business Discovery</h4>
                                        </div>
                                        <p className="text-xs text-zinc-400 mb-3">Target: C-Level / Business Owner / VP</p>
                                        <ul className="space-y-2">
                                            {rq.business.map((q, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                                                    <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                                                    {q}
                                                </li>
                                            ))}
                                        </ul>
                                    </Card>
                                )}
                                {hasTechnical && (
                                    <Card className="p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Wrench className="w-4 h-4 text-emerald-500" />
                                            <h4 className="text-sm font-semibold text-emerald-700">Technical Discovery</h4>
                                        </div>
                                        <p className="text-xs text-zinc-400 mb-3">Target: CTO / IT Manager / DevOps / SecOps</p>
                                        <ul className="space-y-2">
                                            {rq.technical.map((q, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                                                    <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                                    {q}
                                                </li>
                                            ))}
                                        </ul>
                                    </Card>
                                )}
                            </div>
                        </div>
                    )}
                </section>
                );
            })()}

            {/* Preparation Checklist */}
            {report.preparation_checklist && report.preparation_checklist.length > 0 && (
                <section>
                    <SectionTitle>{t.opportunityDetail.kyc.sections.preparationChecklist || "Meeting Preparation Checklist"}</SectionTitle>
                    <Card className="p-0">
                        <ul className="divide-y divide-zinc-100">
                            {report.preparation_checklist.map((item, idx) => (
                                <li key={idx} className="p-4 flex gap-3 hover:bg-zinc-50">
                                    <input
                                        type="checkbox"
                                        className="mt-1 w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                    />
                                    <span className="text-sm text-zinc-700">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </section>
            )}

            {/* References */}
            {report.references && report.references.length > 0 && (
                <section>
                    <SectionTitle>{t.opportunityDetail.kyc.sections.externalReferences || "References"}</SectionTitle>
                    <Card className="p-6">
                        <ul className="space-y-2">
                            {report.references.map((ref, i) => (
                                <li key={i}>
                                    <a
                                        href={ref.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{ref.title || ref.url}</span>
                                        <span className="text-xs text-zinc-400 capitalize shrink-0">
                                            ({ref.type})
                                        </span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </section>
            )}

            {/* Enhanced Regenerate Modal Dialog */}
            {renderRegenerateModal()}

            {/* Save Success Toast */}
            {saveSuccess && (
                <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
                    <Save className="w-4 h-4" />
                    {t.opportunityDetail.kyc.saveSuccess}
                </div>
            )}
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">
            {children}
        </h3>
    );
}

function OverviewItem({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-zinc-400">{icon}</span>
            <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider block">{label}</span>
                <span className="text-sm text-zinc-900">{value}</span>
            </div>
        </div>
    );
}