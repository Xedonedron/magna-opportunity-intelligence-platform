"use client";

import {
    Zap,
    Building2,
    MapPin,
    Briefcase,
    Target,
    HelpCircle,
    ExternalLink,
    AlertTriangle,
    RefreshCw,
    Loader2,
    Edit3,
    X,
    Save,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { UseCaseAccordion } from "./UseCaseAccordion";
import { VersionSelector } from "./VersionSelector";
import { KYCEditForm } from "./KYCEditForm";
import {
    useLatestKYCReport,
    useRegenerateKYC,
    useKYCVersions,
    useUpdateKYCReport,
} from "@/hooks/use-kyc";
import type { KYCReport } from "@/types/kyc";

export function KYCReportTab({ opportunityId }: { opportunityId: string }) {
    const { data: latestReport, isLoading } = useLatestKYCReport(opportunityId);
    const { data: versionsData } = useKYCVersions(opportunityId);
    const regenerate = useRegenerateKYC(opportunityId);
    const updateReport = useUpdateKYCReport(opportunityId);

    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [editingReport, setEditingReport] = useState<KYCReport | null>(null);
    const [showConfirmRegenerate, setShowConfirmRegenerate] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Determine which report to display
    const report = selectedReportId
        ? versionsData?.items.find((r) => r.id === selectedReportId) || latestReport
        : latestReport;

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
            setSaveError("Failed to save changes. Please try again.");
            setTimeout(() => setSaveError(null), 5000);
        }
    };

    // Handle regenerate with confirmation
    const handleRegenerateClick = () => {
        setShowConfirmRegenerate(true);
    };

    const handleConfirmRegenerate = () => {
        regenerate.mutate({});
        setShowConfirmRegenerate(false);
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
                <h3 className="text-lg font-medium text-zinc-900 mb-2">No KYC Report Yet</h3>
                <p className="text-zinc-500 mb-6 max-w-md mx-auto">
                    The AI KYC report will be generated automatically. You can also trigger it
                    manually.
                </p>
                <Button onClick={handleRegenerateClick} disabled={regenerate.isPending}>
                    {regenerate.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Zap className="w-4 h-4 mr-2" />
                    )}
                    Generate KYC Report
                </Button>
            </Card>
        );
    }

    if (report.status === "running") {
        return (
            <Card className="p-12 text-center">
                <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-zinc-900" />
                <h3 className="text-lg font-medium text-zinc-900 mb-2">
                    KYC Analysis in Progress (v{report.version})
                </h3>
                <p className="text-zinc-500 max-w-md mx-auto">
                    Magna AI is scanning web sources, company websites, LinkedIn, and news to build
                    a comprehensive intelligence report. This page will auto-refresh.
                </p>
            </Card>
        );
    }

    if (report.status === "failed") {
        return (
            <Card className="p-12 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-300" />
                <h3 className="text-lg font-medium text-zinc-900 mb-2">KYC Generation Failed</h3>
                <p className="text-zinc-500 mb-2 max-w-md mx-auto">
                    {report.error_message || "An unexpected error occurred during KYC generation."}
                </p>
                <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={handleRegenerateClick}
                    disabled={regenerate.isPending}
                >
                    <RefreshCw className="w-4 h-4 mr-2" /> Retry
                </Button>
            </Card>
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
                        <span className="text-sm font-medium">Edit Mode</span>
                        {hasUnsavedChanges && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                                Unsaved changes
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                            <X className="w-4 h-4 mr-1" /> Cancel
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
                            Save Changes
                        </Button>
                    </div>
                </div>

                {/* Edit Form */}
                <KYCEditForm report={editingReport} onChange={handleFieldChange} />

                {/* Toasts */}
                {saveSuccess && (
                    <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
                        <Save className="w-4 h-4" />
                        Changes saved successfully
                    </div>
                )}
                {saveError && (
                    <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
                        <AlertTriangle className="w-4 h-4" />
                        {saveError}
                    </div>
                )}
            </div>
        );
    }

    // Render view mode
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header with version info & regenerate */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {versionsData && versionsData.items.length > 0 && (
                        <VersionSelector
                            versions={versionsData.items}
                            currentVersionId={selectedReportId || report.id}
                            onSelectVersion={setSelectedReportId}
                        />
                    )}
                    <span className="text-xs text-zinc-400 capitalize">
                        {report.source_type.replace(/_/g, " ")}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                        onClick={handleEnterEditMode}
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2"
                        onClick={handleRegenerateClick}
                        disabled={regenerate.isPending}
                    >
                        {regenerate.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Regenerate
                    </Button>
                </div>
            </div>

            {/* Executive Summary */}
            {report.executive_summary && (
                <section>
                    <SectionTitle>Executive Summary</SectionTitle>
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
                    <SectionTitle>Company Overview</SectionTitle>
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
                            <SectionTitle>Industry Analysis</SectionTitle>
                            <Card className="p-6">
                                <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                    {report.industry_analysis}
                                </p>
                            </Card>
                        </div>
                    )}
                    {report.business_model && (
                        <div>
                            <SectionTitle>Business Model</SectionTitle>
                            <Card className="p-6">
                                <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                    {report.business_model}
                                </p>
                            </Card>
                        </div>
                    )}
                </section>
            )}

            {/* Customer Need Summary & Pain Points */}
            {(report.customer_need_summary ||
                (report.potential_pain_points && report.potential_pain_points.length > 0)) && (
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {report.customer_need_summary && (
                            <div>
                                <SectionTitle>Customer Need Summary</SectionTitle>
                                <Card className="p-6">
                                    <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                        {report.customer_need_summary}
                                    </p>
                                </Card>
                            </div>
                        )}
                        {report.potential_pain_points && report.potential_pain_points.length > 0 && (
                            <div>
                                <SectionTitle>Potential Pain Points</SectionTitle>
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
                    <SectionTitle>Recommended Solutions & Use Cases</SectionTitle>
                    <UseCaseAccordion useCases={report.use_cases} />
                </section>
            )}

            {/* Meeting Objectives & Recommended Questions */}
            {(report.meeting_objectives || report.recommended_questions) && (
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {report.meeting_objectives && report.meeting_objectives.length > 0 && (
                        <div>
                            <SectionTitle>Meeting Objectives</SectionTitle>
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
                    {report.recommended_questions && report.recommended_questions.length > 0 && (
                        <div>
                            <SectionTitle>Recommended Questions</SectionTitle>
                            <Card className="p-6">
                                <ul className="space-y-2">
                                    {report.recommended_questions.map((q, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                                            <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                            {q}
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        </div>
                    )}
                </section>
            )}

            {/* Preparation Checklist */}
            {report.preparation_checklist && report.preparation_checklist.length > 0 && (
                <section>
                    <SectionTitle>Meeting Preparation Checklist</SectionTitle>
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
                    <SectionTitle>References</SectionTitle>
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

            {/* Regenerate Confirmation Dialog */}
            {showConfirmRegenerate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="p-6 max-w-md mx-4">
                        <h3 className="text-lg font-medium text-zinc-900 mb-2">
                            Regenerate KYC Report?
                        </h3>
                        <p className="text-sm text-zinc-600 mb-4">
                            This will create a new version of the KYC report. The current version will still be accessible from the version history.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setShowConfirmRegenerate(false)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleConfirmRegenerate}>
                                Regenerate
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Save Success Toast */}
            {saveSuccess && (
                <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
                    <Save className="w-4 h-4" />
                    Changes saved successfully
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