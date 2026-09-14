"use client";

import { Check, ChevronDown, History } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function cleanVersionTitle(title?: string | null): string {
    if (!title) return "";
    return title.replace(/^v\d+\s*[-–—:]?\s*/i, "").trim();
}

interface VersionInfo {
    id: string;
    version: number;
    title?: string;
    focus_notes?: string;
    status: string;
    source_type: string;
    created_at: string;
}

interface VersionSelectorProps {
    versions: VersionInfo[];
    currentVersionId: string | null;
    onSelectVersion: (versionId: string) => void;
}

export function VersionSelector({
    versions,
    currentVersionId,
    onSelectVersion,
}: VersionSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (versions.length === 0) {
        return null;
    }

    const currentVersion = versions.find((v) => v.id === currentVersionId) || versions[0];
    const currentTitle = cleanVersionTitle(currentVersion.title);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getSourceTypeLabel = (sourceType: string) => {
        const labels: Record<string, string> = {
            automatic: "Auto-generated",
            manual_regenerate: "Regenerated",
            engineer_edited: "Edited",
        };
        return labels[sourceType] || sourceType;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors max-w-xs sm:max-w-md text-left"
                title={currentTitle ? `v${currentVersion.version} - ${currentTitle}` : `v${currentVersion.version}`}
            >
                <History className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className="font-semibold text-zinc-900 shrink-0">v{currentVersion.version}</span>
                {currentTitle && (
                    <span className="text-zinc-600 truncate text-xs font-normal">
                        - {currentTitle}
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ml-auto ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-84 sm:w-[420px] max-w-[92vw] bg-white border border-zinc-200 rounded-lg shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider border-b border-zinc-100 flex items-center justify-between">
                        <span>Version History</span>
                        <span className="text-[10px] text-zinc-400 lowercase">{versions.length} versions</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
                        {versions.map((version) => {
                            const title = cleanVersionTitle(version.title);
                            const isSelected = version.id === currentVersionId;

                            return (
                                <button
                                    key={version.id}
                                    type="button"
                                    onClick={() => {
                                        onSelectVersion(version.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-3.5 py-2.5 text-left hover:bg-zinc-50 transition-colors flex items-start gap-2.5 ${
                                        isSelected ? "bg-zinc-50/80" : ""
                                    }`}
                                >
                                    <div className="mt-0.5 shrink-0">
                                        {isSelected ? (
                                            <Check className="w-4 h-4 text-zinc-900" />
                                        ) : (
                                            <div className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm text-zinc-900">v{version.version}</span>
                                                <span className="text-xs text-zinc-400">
                                                    {getSourceTypeLabel(version.source_type)}
                                                </span>
                                            </div>
                                            <span
                                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                                                    version.status === "completed"
                                                        ? "bg-green-100 text-green-700"
                                                        : version.status === "running"
                                                            ? "bg-blue-100 text-blue-700"
                                                            : version.status === "failed"
                                                                ? "bg-red-100 text-red-700"
                                                                : "bg-zinc-100 text-zinc-600"
                                                }`}
                                            >
                                                {version.status}
                                            </span>
                                        </div>

                                        {/* Version Title with Word Wrap */}
                                        {title && (
                                            <p className="text-xs font-medium text-zinc-800 break-words whitespace-normal leading-relaxed">
                                                {title}
                                            </p>
                                        )}

                                        {/* Version Focus Notes with Word Wrap */}
                                        {version.focus_notes && (
                                            <div className="text-[11px] text-zinc-600 bg-amber-50/70 border border-amber-200/50 rounded px-2 py-1 break-words whitespace-normal leading-snug">
                                                <span className="font-semibold text-amber-800">Fokus: </span>
                                                <span>{version.focus_notes}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                            <span>{formatDate(version.created_at)}</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}