"use client";

import { useState } from "react";
import {
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Copy,
    Check,
    RefreshCw,
    Loader2,
    Settings,
    Info,
    Terminal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { parsePipelineError } from "@/lib/error-utils";
import { useLanguage } from "@/context/LanguageContext";

interface CollapsibleErrorAlertProps {
    title?: string;
    errorMessage?: string | null;
    onRetry?: () => void;
    isRetrying?: boolean;
    canRetry?: boolean;
    showSettingsLink?: boolean;
    onNavigateSettings?: () => void;
    className?: string;
}

export function CollapsibleErrorAlert({
    title,
    errorMessage,
    onRetry,
    isRetrying = false,
    canRetry = true,
    showSettingsLink = false,
    onNavigateSettings,
    className = "",
}: CollapsibleErrorAlertProps) {
    const { locale } = useLanguage();
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const parsed = parsePipelineError(errorMessage, (locale as "id" | "en") || "id");
    const displayTitle = title || parsed.title;

    const handleCopy = () => {
        if (!parsed.rawDetails) return;
        navigator.clipboard.writeText(parsed.rawDetails);
        setCopied(true);
        toast.success(
            locale === "id"
                ? "Detail error berhasil disalin ke clipboard."
                : "Error details copied to clipboard."
        );
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <Card className={`p-6 sm:p-8 bg-white border border-red-200/80 shadow-sm rounded-xl ${className}`}>
            {/* Top Header: Warning Icon + Friendly Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200/60 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-zinc-900 leading-tight">
                            {displayTitle}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                            {locale === "id" ? "Proses pembuatan KYC terhenti" : "KYC pipeline generation halted"}
                            {parsed.statusCode ? ` (HTTP ${parsed.statusCode})` : ""}
                        </p>
                    </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                    {showSettingsLink && onNavigateSettings && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onNavigateSettings}
                            className="text-xs border-zinc-200 text-zinc-700 hover:bg-zinc-50 gap-1.5"
                        >
                            <Settings className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{locale === "id" ? "Pengaturan AI" : "AI Settings"}</span>
                        </Button>
                    )}
                    {canRetry && onRetry && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onRetry}
                            disabled={isRetrying}
                            className="text-xs gap-1.5 font-medium border border-zinc-200"
                        >
                            {isRetrying ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-700" />
                                    <span>{locale === "id" ? "Mencoba Ulang..." : "Retrying..."}</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 text-zinc-700" />
                                    <span>{locale === "id" ? "Coba Lagi" : "Retry"}</span>
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Non-Technical Summary & Explanation */}
            <div className="py-4 space-y-3">
                <div className="p-3.5 bg-red-50/40 rounded-lg border border-red-100">
                    <p className="text-sm font-medium text-zinc-800 leading-relaxed">
                        {parsed.summary}
                    </p>
                </div>

                {/* Suggestion Callout */}
                {parsed.suggestion && (
                    <div className="flex items-start gap-2.5 p-3 bg-zinc-50 rounded-lg border border-zinc-200/60 text-xs text-zinc-600">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                            <strong className="font-semibold text-zinc-800">
                                {locale === "id" ? "Saran Tindakan: " : "Suggested Action: "}
                            </strong>
                            {parsed.suggestion}
                        </span>
                    </div>
                )}
            </div>

            {/* Expandable Technical Details Dropdown */}
            <div className="border-t border-zinc-100 pt-3">
                <button
                    type="button"
                    onClick={() => setIsDetailsOpen((prev) => !prev)}
                    className="flex items-center justify-between w-full py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors group"
                >
                    <div className="flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700" />
                        <span>
                            {isDetailsOpen
                                ? locale === "id"
                                    ? "Sembunyikan Detail Teknis & Log Error"
                                    : "Hide Technical Details & Error Log"
                                : locale === "id"
                                    ? "Lihat Detail Teknis & Log Error"
                                    : "View Technical Details & Error Log"}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-700">
                        <span className="text-[11px]">
                            {isDetailsOpen
                                ? locale === "id"
                                    ? "Tutup"
                                    : "Collapse"
                                : locale === "id"
                                    ? "Buka"
                                    : "Expand"}
                        </span>
                        {isDetailsOpen ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </div>
                </button>

                {/* Dropdown Content Box */}
                {isDetailsOpen && (
                    <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="relative rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-200 border border-zinc-800 shadow-inner">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[11px] text-zinc-400">
                                <span>Raw Exception / Diagnostic Payload:</span>
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                                    title="Copy raw error string"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3 h-3 text-emerald-400" />
                                            <span className="text-emerald-400 text-[10px]">Tersalin</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3 h-3" />
                                            <span className="text-[10px]">Salin Error</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <pre className="whitespace-pre-wrap break-all leading-relaxed max-h-60 overflow-y-auto text-red-300/90 scrollbar-thin scrollbar-thumb-zinc-700">
                                {parsed.rawDetails}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
