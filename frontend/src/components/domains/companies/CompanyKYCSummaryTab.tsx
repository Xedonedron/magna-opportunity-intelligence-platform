"use client";

import {
    Building2,
    CheckCircle2,
    AlertCircle,
    MapPin,
    ShieldAlert,
    Swords,
    Layers,
} from "lucide-react";
import { useCompanyKYCSummary } from "@/hooks/use-companies";

interface Props {
    companyId: string;
}

export function CompanyKYCSummaryTab({ companyId }: Props) {
    const { data: kyc, isLoading } = useCompanyKYCSummary(companyId);

    if (isLoading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
                <div className="h-28 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
            </div>
        );
    }

    if (!kyc?.has_kyc) {
        return (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-8 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Belum Ada Laporan KYC
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                    Intelligence KYC dihasilkan otomatis dari opportunity saat pipeline KYC selesai dijalankan.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Sinkron dari: <strong>{kyc.source_opportunity_title || "Opportunity"}</strong></span>
                </div>
                {kyc.completed_at && <span>{new Date(kyc.completed_at).toLocaleDateString()}</span>}
            </div>

            {kyc.executive_summary && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Executive Summary</h4>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{kyc.executive_summary}</p>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {kyc.company_overview?.description && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Profil Bisnis</span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{kyc.company_overview.description}</p>
                        {kyc.company_overview.headquarters && (
                            <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>HQ: {kyc.company_overview.headquarters}</span>
                            </div>
                        )}
                    </div>
                )}

                {kyc.business_model && (
                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                            <Layers className="w-3.5 h-3.5" />
                            <span>Business Model</span>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{kyc.business_model}</p>
                    </div>
                )}
            </div>

            {kyc.industry_analysis && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Analisis Industri</h4>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{kyc.industry_analysis}</p>
                </div>
            )}

            {kyc.potential_pain_points && kyc.potential_pain_points.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Potensi Pain Points</span>
                    </div>
                    <ul className="space-y-1.5">
                        {kyc.potential_pain_points.map((pt: any, i: number) => (
                            <li key={i} className="text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                <span>{typeof pt === 'string' ? pt : JSON.stringify(pt)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {kyc.competitor_analysis && kyc.competitor_analysis.length > 0 && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-xs">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
                        <Swords className="w-3.5 h-3.5" />
                        <span>Kompetitor Pasar</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {kyc.competitor_analysis.map((comp: any, i: number) => (
                            <div key={i} className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-800">
                                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{comp.name}</p>
                                {comp.market_position && <p className="text-[11px] text-zinc-500 mt-0.5">{comp.market_position}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
