"use client";

import { useState } from "react";
import { ChevronDown, Target, Lightbulb, Settings, TrendingUp, Package, Building2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useLanguage } from "@/context/LanguageContext";
import type { KYCUseCase } from "@/types/kyc";

const impactStyles: Record<string, string> = {
    High: "bg-green-50 text-green-700 border-green-200",
    Medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Low: "bg-zinc-50 text-zinc-600 border-zinc-200",
};

export function UseCaseAccordion({ useCases }: { useCases: KYCUseCase[] }) {
    const { t } = useLanguage();
    const details = t.opportunityDetail.kyc.sections.useCaseDetails;
    const [openId, setOpenId] = useState<string | null>(useCases[0]?.title || null);

    if (!useCases || useCases.length === 0) {
        return (
            <Card className="p-12 text-center text-zinc-500">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>{details?.noUseCases || "No use cases generated yet."}</p>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {useCases.map((uc, idx) => {
                const id = uc.title || `uc-${idx}`;
                const isOpen = openId === id;
                return (
                    <Card key={id} className="overflow-hidden transition-all duration-200">
                        <button
                            onClick={() => setOpenId(isOpen ? null : id)}
                            className="w-full px-5 py-4 flex items-center justify-between bg-white hover:bg-zinc-50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`p-1.5 rounded-md ${isOpen ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"}`}
                                >
                                    <Target className="w-4 h-4" />
                                </div>
                                <span className="font-medium text-zinc-900">{uc.title}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span
                                    className={`text-xs border rounded px-2 py-1 ${impactStyles[uc.impact_level] || impactStyles.Low}`}
                                >
                                    {details?.impact || "Impact"}: {uc.impact_level}
                                </span>
                                <ChevronDown
                                    className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                />
                            </div>
                        </button>
                        {isOpen && (
                            <div className="px-5 py-5 border-t border-zinc-100 bg-zinc-50/50 space-y-5">
                                <DetailSection
                                    icon={<Lightbulb className="w-3.5 h-3.5" />}
                                    title={details?.description || "Description"}
                                    content={uc.description}
                                />
                                <DetailSection
                                    icon={<Target className="w-3.5 h-3.5" />}
                                    title={details?.problemSolved || "Problem Solved"}
                                    content={uc.problem_solved}
                                />
                                <DetailSection
                                    icon={<Settings className="w-3.5 h-3.5" />}
                                    title={details?.howItWorks || "How It Works"}
                                    content={uc.how_it_works}
                                />
                                <DetailSection
                                    icon={<TrendingUp className="w-3.5 h-3.5" />}
                                    title={details?.businessImpact || "Business Impact"}
                                    content={uc.business_impact}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Package className="w-3.5 h-3.5" /> {details?.googleProducts || "Google Products"}
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(uc.google_products || []).map((p) => (
                                                <span
                                                    key={p}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                                                >
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5" /> {details?.smartnetSolutions || "Smartnet Solutions"}
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(uc.smartnet_solutions || []).map((s) => (
                                                <span
                                                    key={s}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-200 text-zinc-800"
                                                >
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}

function DetailSection({
    icon,
    title,
    content,
}: {
    icon: React.ReactNode;
    title: string;
    content: string;
}) {
    return (
        <div>
            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                {icon} {title}
            </h4>
            <p className="text-sm text-zinc-600 leading-relaxed">{content}</p>
        </div>
    );
}