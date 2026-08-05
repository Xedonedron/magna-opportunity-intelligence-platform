"use client";

import { useState, useEffect, useRef } from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
    useCreateOpportunityDocument,
    useUpdateOpportunityDocument,
} from "@/hooks/use-opportunities";
import type { OpportunityDocument } from "@/types/opportunity";

interface AddDocumentDialogProps {
    opportunityId: string;
    initialDocument?: OpportunityDocument | null;
    documentLabels: string[];
    onClose: () => void;
}

export function AddDocumentDialog({
    opportunityId,
    initialDocument,
    documentLabels,
    onClose,
}: AddDocumentDialogProps) {
    const isEditing = !!initialDocument;
    const [title, setTitle] = useState(initialDocument?.title || "");
    const [url, setUrl] = useState(initialDocument?.url || "");
    const [description, setDescription] = useState(initialDocument?.description || "");
    const [selectedLabel, setSelectedLabel] = useState<string | null>(initialDocument?.labels?.[0] || null);
    const [showLabelDropdown, setShowLabelDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const createDocument = useCreateOpportunityDocument();
    const updateDocument = useUpdateOpportunityDocument();

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowLabelDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !url.trim()) return;

        const payload = {
            title: title.trim(),
            url: url.trim(),
            description: description.trim() || null,
            labels: selectedLabel ? [selectedLabel] : null,
        };

        try {
            if (isEditing && initialDocument) {
                await updateDocument.mutateAsync({
                    opportunityId,
                    documentId: initialDocument.id,
                    input: payload,
                });
            } else {
                await createDocument.mutateAsync({
                    opportunityId,
                    input: payload,
                });
            }
            onClose();
        } catch (error) {
            console.error("Failed to save document:", error);
        }
    };

    const selectLabel = (label: string) => {
        setSelectedLabel(label);
        setShowLabelDropdown(false);
    };

    const clearLabel = () => {
        setSelectedLabel(null);
    };

    const isLoading = createDocument.isPending || updateDocument.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
                    <h2 className="text-lg font-semibold text-zinc-900">
                        {isEditing ? "Edit Document" : "Add Document"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Meeting Minutes - Demo Session"
                            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-colors"
                            required
                        />
                    </div>

                    {/* URL */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                            URL <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://drive.google.com/..."
                            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-colors"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description or notes..."
                            rows={2}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-colors resize-none"
                        />
                    </div>

                    {/* Label - Single Select Dropdown */}
                    <div ref={dropdownRef} className="relative">
                        <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                            Label
                        </label>

                        {/* Dropdown Trigger */}
                        <button
                            type="button"
                            onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 text-sm focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 outline-none transition-colors text-left flex items-center justify-between bg-white hover:bg-zinc-50"
                        >
                            <span className={selectedLabel ? "text-zinc-900" : "text-zinc-400"}>
                                {selectedLabel || "Select a label..."}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showLabelDropdown ? "rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {showLabelDropdown && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {/* Clear selection option */}
                                {selectedLabel && (
                                    <button
                                        type="button"
                                        onClick={clearLabel}
                                        className="w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between hover:bg-zinc-50 transition-colors text-zinc-500 border-b border-zinc-100"
                                    >
                                        <span>Clear selection</span>
                                        <X className="w-4 h-4" />
                                    </button>
                                )}

                                {documentLabels.map((label) => {
                                    const isSelected = selectedLabel === label;
                                    return (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => selectLabel(label)}
                                            className={`w-full px-3.5 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${isSelected
                                                ? "bg-zinc-100 text-zinc-900 font-medium"
                                                : "hover:bg-zinc-50"
                                                }`}
                                        >
                                            <span>{label}</span>
                                            {isSelected && <Check className="w-4 h-4 text-green-600" />}
                                        </button>
                                    );
                                })}

                                {documentLabels.length === 0 && (
                                    <p className="px-3.5 py-2.5 text-sm text-zinc-500">
                                        No labels available
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !title.trim() || !url.trim()}>
                            {isLoading
                                ? "Saving..."
                                : isEditing
                                    ? "Save Changes"
                                    : "Add Document"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}