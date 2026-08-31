"use client";

import { useState } from "react";
import {
    Users,
    Building2,
    Sparkles,
    RefreshCw,
    Copy,
    Check,
    HelpCircle,
    ShieldCheck,
    Compass,
    AlertCircle,
    Lightbulb,
    CheckCircle2,
    Loader2,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
    usePersonasList,
    usePersonaDetail,
    useGeneratePersona,
} from "@/hooks/use-personas";
import { useLanguage } from "@/context/LanguageContext";
import { formatPersonaToMarkdown } from "@/lib/clipboard-formatters";
import { SeniorityLevel, DepartmentType } from "@/types/persona";

const SENIORITY_LEVELS: SeniorityLevel[] = [
    "Staff",
    "Manager",
    "Head",
    "VP",
    "Director/C-Level",
];

const DEPARTMENTS: DepartmentType[] = [
    "Finance",
    "HR",
    "Marketing",
    "Sales",
    "IT",
    "Operations",
];

interface TargetPersonaTabProps {
    opportunityId: string;
}

export function TargetPersonaTab({ opportunityId }: TargetPersonaTabProps) {
    const { t } = useLanguage();
    const [selectedSeniority, setSelectedSeniority] =
        useState<SeniorityLevel>("Director/C-Level");
    const [selectedDepartment, setSelectedDepartment] =
        useState<DepartmentType>("IT");
    const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
    const [isFullCopied, setIsFullCopied] = useState(false);

    // Fetch list to show available generated combinations
    const { data: personaList, isLoading: isListLoading } =
        usePersonasList(opportunityId);

    // Fetch selected persona
    const {
        data: personaDetail,
        isLoading: isDetailLoading,
        isFetching,
    } = usePersonaDetail(opportunityId, selectedSeniority, selectedDepartment);

    const generateMutation = useGeneratePersona(opportunityId);

    const isPending = generateMutation.isPending;
    const generatingSeniority = generateMutation.variables?.seniority;
    const generatingDepartment = generateMutation.variables?.department;

    const isCurrentTargetGenerating =
        isPending &&
        generatingSeniority === selectedSeniority &&
        generatingDepartment === selectedDepartment;

    const isBackgroundGenerating = isPending && !isCurrentTargetGenerating;

    const handleGenerate = (force = false) => {
        generateMutation.mutate({
            seniority: selectedSeniority,
            department: selectedDepartment,
            force_regenerate: force,
        });
    };

    const isGenerated = (s: SeniorityLevel, d: DepartmentType) => {
        if (!personaList?.items) return false;
        return personaList.items.some(
            (item) => item.seniority === s && item.department === d
        );
    };

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(key);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const copyAllQuestions = () => {
        if (!personaDetail?.questions?.length) return;
        const text = personaDetail.questions
            .map(
                (q, idx) =>
                    `${idx + 1}. [${q.category}] ${q.question}\n   Tujuan: ${q.purpose}`
            )
            .join("\n\n");
        copyToClipboard(text, "all-questions");
    };

    const activePersona =
        personaDetail ||
        (generateMutation.data?.seniority === selectedSeniority &&
            generateMutation.data?.department === selectedDepartment
            ? generateMutation.data
            : null);

    const handleCopyFullPlaybook = () => {
        if (!activePersona) return;
        try {
            const markdown = formatPersonaToMarkdown(activePersona);
            navigator.clipboard.writeText(markdown);
            setIsFullCopied(true);
            toast.success(
                t.opportunityDetail.persona.copyPlaybookSuccess ||
                `Playbook persona (${activePersona.seniority} - ${activePersona.department}) berhasil disalin!`
            );
            setTimeout(() => setIsFullCopied(false), 2500);
        } catch (e) {
            toast.error("Gagal menyalin playbook ke clipboard.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Background generation banner notice */}
            {isBackgroundGenerating && generatingSeniority && generatingDepartment && (
                <div className="flex items-center justify-between gap-3 p-3.5 bg-orange-50 border border-orange-200 rounded-xl text-orange-950 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2.5">
                        <Loader2 className="w-4 h-4 text-orange-600 animate-spin shrink-0" />
                        <div className="text-xs">
                            <span className="font-semibold text-orange-900">{t.opportunityDetail.persona.backgroundNoticeTitle} </span>
                            {t.opportunityDetail.persona.backgroundNoticeDesc} <span className="font-semibold underline">{generatingSeniority} ({generatingDepartment})</span> {t.opportunityDetail.persona.inBackground}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedSeniority(generatingSeniority);
                            setSelectedDepartment(generatingDepartment);
                        }}
                        className="text-xs font-semibold text-orange-700 hover:text-orange-900 bg-white/80 hover:bg-white px-2.5 py-1 rounded-md border border-orange-200/80 transition-colors shrink-0"
                    >
                        {t.opportunityDetail.persona.backgroundNoticeAction}
                    </button>
                </div>
            )}

            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-orange-50 text-orange-600">
                            <Users className="w-5 h-5" />
                        </span>
                        <h3 className="text-base font-semibold text-zinc-900">
                            {t.opportunityDetail.persona.title}
                        </h3>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                        {t.opportunityDetail.persona.subtitle}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Copy Full Playbook Button */}
                    {activePersona && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyFullPlaybook}
                            className="gap-1.5 text-xs text-zinc-700 border-zinc-300 hover:bg-zinc-50 transition-colors"
                            title={t.opportunityDetail.persona.copyFullPlaybook || "Salin Full Playbook"}
                        >
                            {isFullCopied ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-600 font-medium">
                                        {t.opportunityDetail.persona.fullPlaybookCopied || "Playbook Tersalin!"}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>{t.opportunityDetail.persona.copyFullPlaybook || "Salin Full Playbook"}</span>
                                </>
                            )}
                        </Button>
                    )}

                    {activePersona ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerate(true)}
                            disabled={isPending}
                            className="gap-1.5 text-xs text-zinc-700 border-zinc-300 hover:bg-zinc-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isCurrentTargetGenerating ? "animate-spin" : ""}`} />
                            {isCurrentTargetGenerating ? t.opportunityDetail.persona.regenerating : t.opportunityDetail.persona.regeneratePlaybook}
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={() => handleGenerate(false)}
                            disabled={isPending}
                            className="gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                        >
                            <Sparkles className={`w-3.5 h-3.5 ${isCurrentTargetGenerating ? "animate-spin" : ""}`} />
                            {isCurrentTargetGenerating ? t.opportunityDetail.persona.generating : t.opportunityDetail.persona.generatePlaybook}
                        </Button>
                    )}
                </div>
            </div>

            {/* Selectors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Seniority Selector */}
                <Card className="p-4 bg-white border-zinc-200">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-zinc-400" />
                            {t.opportunityDetail.persona.seniorityLevel}
                        </span>
                        <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                            {selectedSeniority}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {SENIORITY_LEVELS.map((lvl) => {
                            const hasCached = isGenerated(lvl, selectedDepartment);
                            const isSelected = selectedSeniority === lvl;
                            const isLvlGenerating =
                                isPending &&
                                generatingSeniority === lvl &&
                                generatingDepartment === selectedDepartment;
                            return (
                                <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => setSelectedSeniority(lvl)}
                                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${isSelected
                                            ? "border-orange-500 bg-orange-50/50 text-orange-950 ring-1 ring-orange-500 shadow-sm"
                                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                                        }`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-xs font-semibold">{lvl}</span>
                                        {isLvlGenerating ? (
                                            <Loader2 className="w-3 h-3 text-orange-600 animate-spin" />
                                        ) : hasCached ? (
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Saved playbook available" />
                                        ) : null}
                                    </div>
                                    <span className="text-[10px] text-zinc-400 mt-0.5">
                                        {lvl === "Director/C-Level" ? "Strategic ROI" : lvl === "Staff" ? "Technical / Hands-on" : "Ops & Team"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </Card>

                {/* Department Selector */}
                <Card className="p-4 bg-white border-zinc-200">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-zinc-400" />
                            {t.opportunityDetail.persona.targetDepartment}
                        </span>
                        <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                            {selectedDepartment}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {DEPARTMENTS.map((dept) => {
                            const hasCached = isGenerated(selectedSeniority, dept);
                            const isSelected = selectedDepartment === dept;
                            const isDeptGenerating =
                                isPending &&
                                generatingDepartment === dept &&
                                generatingSeniority === selectedSeniority;
                            return (
                                <button
                                    key={dept}
                                    type="button"
                                    onClick={() => setSelectedDepartment(dept)}
                                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all ${isSelected
                                            ? "border-orange-500 bg-orange-50/50 text-orange-950 ring-1 ring-orange-500 shadow-sm"
                                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
                                        }`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-xs font-semibold">{dept}</span>
                                        {isDeptGenerating ? (
                                            <Loader2 className="w-3 h-3 text-orange-600 animate-spin" />
                                        ) : hasCached ? (
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Saved playbook available" />
                                        ) : null}
                                    </div>
                                    <span className="text-[10px] text-zinc-400 mt-0.5">
                                        {dept === "IT" ? "Security & Infra" : dept === "Finance" ? "Cost & Budget" : "Workflow & KPI"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </Card>
            </div>

            {/* Main Content Area */}
            {isCurrentTargetGenerating ? (
                <Card className="p-12 text-center bg-white border-zinc-200">
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-full animate-pulse">
                            <Sparkles className="w-6 h-6 animate-spin" />
                        </div>
                        <h4 className="text-sm font-semibold text-zinc-900">
                            {t.opportunityDetail.persona.generating}
                        </h4>
                        <p className="text-xs text-zinc-500 max-w-sm">
                            {t.opportunityDetail.persona.backgroundNoticeDesc} <span className="font-semibold text-zinc-800">{generatingSeniority}</span> ({generatingDepartment}).
                        </p>
                    </div>
                </Card>
            ) : isDetailLoading ? (
                <Card className="p-12 text-center bg-white border-zinc-200">
                    <div className="flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                        <p className="text-xs text-zinc-500">{t.opportunityDetail.persona.loadingPlaybook} {selectedSeniority} ({selectedDepartment})...</p>
                    </div>
                </Card>
            ) : activePersona ? (
                <div className="space-y-6">
                    {/* Key Strategic Focus & Value Props */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Focus Areas */}
                        <Card className="p-5 bg-white border-zinc-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Compass className="w-4 h-4 text-orange-600" />
                                <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                                    {t.opportunityDetail.persona.topPriority} ({activePersona.seniority})
                                </h4>
                            </div>
                            <div className="space-y-3">
                                {activePersona.focus_areas?.map((fa, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-zinc-50 border border-zinc-100">
                                        <span className="text-xs font-semibold text-zinc-900 block mb-1">
                                            {fa.title}
                                        </span>
                                        <p className="text-xs text-zinc-600 leading-relaxed">
                                            {fa.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Value Props */}
                        <Card className="p-5 bg-white border-zinc-200">
                            <div className="flex items-center gap-2 mb-3">
                                <Lightbulb className="w-4 h-4 text-amber-500" />
                                <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                                    {t.opportunityDetail.persona.valuePropsToPitch} ({activePersona.department})
                                </h4>
                            </div>
                            <div className="space-y-2.5">
                                {activePersona.value_props?.map((vp, i) => (
                                    <div key={i} className="flex items-start gap-2 text-xs text-zinc-700 bg-amber-50/40 p-2.5 rounded-lg border border-amber-100/60">
                                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <span>{vp}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Recommended Questions Section */}
                    <Card className="p-5 bg-white border-zinc-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-zinc-100 gap-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <HelpCircle className="w-4 h-4 text-blue-600" />
                                    <h4 className="text-sm font-semibold text-zinc-900">
                                        {t.opportunityDetail.persona.discoveryQuestions}
                                    </h4>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={copyAllQuestions}
                                className="gap-1.5 text-xs self-start sm:self-auto border-zinc-200"
                            >
                                {copiedIndex === "all-questions" ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        <span className="text-emerald-600">{t.opportunityDetail.persona.copied}</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5 text-zinc-500" />
                                        <span>{t.opportunityDetail.persona.copyAll}</span>
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {activePersona.questions?.map((q, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/30 hover:border-zinc-300 hover:bg-white transition-all space-y-2 relative group"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                            {q.category}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                copyToClipboard(
                                                    `[${q.category}] ${q.question}\nTujuan: ${q.purpose}`,
                                                    `q-${idx}`
                                                )
                                            }
                                            className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
                                            title="Copy Question"
                                        >
                                            {copiedIndex === `q-${idx}` ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>

                                    <p className="text-xs font-semibold text-zinc-900 leading-relaxed">
                                        "{q.question}"
                                    </p>

                                    <div className="pt-2 border-t border-zinc-100">
                                        <span className="text-[10px] text-zinc-400 font-medium block">
                                            Target Insight:
                                        </span>
                                        <p className="text-[11px] text-zinc-600 leading-normal">
                                            {q.purpose}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Objection Handling */}
                    {activePersona.objection_handling &&
                        activePersona.objection_handling.length > 0 && (
                            <Card className="p-5 bg-white border-zinc-200">
                                <div className="flex items-center gap-2 mb-4">
                                    <AlertCircle className="w-4 h-4 text-rose-600" />
                                    <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                                        {t.opportunityDetail.persona.objectionHandling}
                                    </h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {activePersona.objection_handling.map((obj, i) => (
                                        <div
                                            key={i}
                                            className="p-3.5 rounded-lg border border-rose-100 bg-rose-50/20 space-y-2"
                                        >
                                            <div className="text-xs font-medium text-rose-900">
                                                <span className="font-bold text-rose-700">{t.opportunityDetail.persona.potentialObjection}: </span>
                                                "{obj.objection}"
                                            </div>
                                            <div className="text-xs text-zinc-700 bg-white p-2.5 rounded border border-zinc-200/80">
                                                <span className="font-semibold text-emerald-700 block mb-0.5">
                                                    {t.opportunityDetail.persona.recommendedResponse}:
                                                </span>
                                                {obj.response}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                </div>
            ) : (
                /* Empty State: Prompt to generate */
                <Card className="p-12 text-center bg-white border-zinc-200 border-dashed">
                    <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
                        <div className="p-3 bg-zinc-100 text-zinc-500 rounded-full">
                            <Users className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-semibold text-zinc-900">
                            {t.opportunityDetail.persona.noPersonaTitle} ({selectedSeniority} - {selectedDepartment})
                        </h4>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                            {t.opportunityDetail.persona.noPersonaDesc}
                        </p>
                        <Button
                            size="sm"
                            onClick={() => handleGenerate(false)}
                            disabled={isPending}
                            className="gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white mt-2 disabled:opacity-50"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {isPending ? t.opportunityDetail.persona.generating : `${t.opportunityDetail.persona.generatePlaybook} (${selectedSeniority} - ${selectedDepartment})`}
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}