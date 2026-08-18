"use client";

import { useState, useEffect } from "react";
import {
    FileText,
    Plus,
    ExternalLink,
    Pencil,
    Trash2,
    Filter,
    ArrowUpDown,
    FileIcon,
    ImageIcon,
    FileSpreadsheet,
    Presentation,
    File,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
    useOpportunityDocuments,
    useDeleteOpportunityDocument,
} from "@/hooks/use-opportunities";
import { fetchMasterData } from "@/lib/master-data";
import { formatDateTime } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import type { OpportunityDocument } from "@/types/opportunity";
import { AddDocumentDialog } from "./AddDocumentDialog";

interface ResourcesTabProps {
    opportunityId: string;
    canCreateEdit?: boolean;
}

// Default document labels
const DEFAULT_DOCUMENT_LABELS = [
    "MoM",
    "Compro",
    "Solution Brief",
    "Assessment List",
    "Technical Proposal",
];

// Extract Google Drive file ID from URL
function extractGoogleDriveId(url: string): string | null {
    const patterns = [
        /\/d\/([a-zA-Z0-9_-]+)/, // /d/{id}
        /id=([a-zA-Z0-9_-]+)/, // id={id}
        /open\?id=([a-zA-Z0-9_-]+)/, // open?id={id}
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Get file type icon based on URL or extension
function getFileIcon(url: string): React.ReactNode {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("docs.google.com/document")) {
        return <FileText className="w-8 h-8 text-blue-500" />;
    }
    if (lowerUrl.includes("docs.google.com/spreadsheets")) {
        return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    }
    if (lowerUrl.includes("docs.google.com/presentation")) {
        return <Presentation className="w-8 h-8 text-yellow-500" />;
    }
    if (lowerUrl.includes("drive.google.com")) {
        return <File className="w-8 h-8 text-zinc-500" />;
    }
    if (lowerUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return <ImageIcon className="w-8 h-8 text-purple-500" />;
    }
    if (lowerUrl.match(/\.pdf$/i)) {
        return <FileText className="w-8 h-8 text-red-500" />;
    }
    return <FileIcon className="w-8 h-8 text-zinc-400" />;
}

// Document Card Component with Thumbnail
function DocumentCard({
    document,
    onEdit,
    onDelete,
    canEdit,
    unknownText,
    editTooltip,
    deleteTooltip,
}: {
    document: OpportunityDocument;
    onEdit: () => void;
    onDelete: () => void;
    canEdit: boolean;
    unknownText: string;
    editTooltip: string;
    deleteTooltip: string;
}) {
    const [thumbnailError, setThumbnailError] = useState(false);
    const driveId = extractGoogleDriveId(document.url);
    const thumbnailUrl = driveId
        ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w300`
        : null;

    return (
        <Card className="group relative overflow-hidden hover:shadow-md transition-shadow">
            {/* Thumbnail / Preview Area */}
            <a
                href={document.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-[4/3] bg-zinc-100 relative overflow-hidden"
            >
                {thumbnailUrl && !thumbnailError ? (
                    <img
                        src={thumbnailUrl}
                        alt={document.title}
                        className="w-full h-full object-cover"
                        onError={() => setThumbnailError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-50">
                        {getFileIcon(document.url)}
                    </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <ExternalLink className="w-6 h-6 text-white drop-shadow-md" />
                </div>
            </a>

            {/* Content */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm text-zinc-900 line-clamp-2 flex-1">
                        {document.title}
                    </h4>
                    {canEdit && (
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={onEdit}
                                className="p-1.5 hover:bg-zinc-100 rounded-md text-zinc-500 hover:text-zinc-700"
                                title={editTooltip}
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={onDelete}
                                className="p-1.5 hover:bg-red-50 rounded-md text-zinc-500 hover:text-red-600"
                                title={deleteTooltip}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Labels */}
                {document.labels && document.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {document.labels.map((label) => (
                            <span
                                key={label}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200"
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                )}

                {/* Description */}
                {document.description && (
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-2">
                        {document.description}
                    </p>
                )}

                {/* Meta */}
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>{formatDateTime(document.created_at)}</span>
                    <span>•</span>
                    <span>{document.uploader?.full_name || unknownText}</span>
                </div>
            </div>
        </Card>
    );
}

export function ResourcesTab({ opportunityId, canCreateEdit = false }: ResourcesTabProps) {
    const { t } = useLanguage();
    const [labelFilter, setLabelFilter] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingDocument, setEditingDocument] = useState<OpportunityDocument | null>(null);
    const [documentLabels, setDocumentLabels] = useState<string[]>(DEFAULT_DOCUMENT_LABELS);

    useEffect(() => {
        fetchMasterData()
            .then((data) => {
                if (data.document_labels && data.document_labels.length > 0) {
                    setDocumentLabels(data.document_labels);
                }
            })
            .catch(() => { });
    }, []);

    const { data: documentsData, isLoading } = useOpportunityDocuments(opportunityId, {
        label: labelFilter || undefined,
        sort_order: sortOrder,
    });

    const deleteDocument = useDeleteOpportunityDocument();

    const handleDelete = async (document: OpportunityDocument) => {
        if (!confirm(`${t.opportunityDetail.documents.deleteConfirm} "${document.title}"?`)) return;
        await deleteDocument.mutateAsync({
            opportunityId,
            documentId: document.id,
        });
    };

    const documents = documentsData?.items || [];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">
                    {t.opportunityDetail.documents.title}
                </h3>
                {canCreateEdit && (
                    <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setShowAddDialog(true)}
                    >
                        <Plus className="w-3.5 h-3.5" /> {t.opportunityDetail.documents.addDocument}
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Label Filter */}
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-zinc-400" />
                    <select
                        value={labelFilter || ""}
                        onChange={(e) => setLabelFilter(e.target.value || null)}
                        className="h-8 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 cursor-pointer"
                    >
                        <option value="">{t.opportunityDetail.documents.allLabels}</option>
                        {documentLabels.map((label) => (
                            <option key={label} value={label}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Sort Order */}
                <button
                    type="button"
                    onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                    className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 rounded-md shadow-sm transition-colors cursor-pointer"
                >
                    <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{sortOrder === "desc" ? t.opportunityDetail.documents.newestFirst : t.opportunityDetail.documents.oldestFirst}</span>
                </button>
            </div>

            {/* Documents Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-lg border border-zinc-200 overflow-hidden animate-pulse">
                            <div className="aspect-[4/3] bg-zinc-100" />
                            <div className="p-4 space-y-2">
                                <div className="h-4 bg-zinc-100 rounded w-3/4" />
                                <div className="h-3 bg-zinc-100 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : documents.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                        {labelFilter
                            ? `${t.opportunityDetail.documents.noDocumentsWithLabel} "${labelFilter}"`
                            : t.opportunityDetail.documents.noDocuments}
                    </p>
                    {canCreateEdit && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="mt-4"
                            onClick={() => setShowAddDialog(true)}
                        >
                            <Plus className="w-4 h-4 mr-1.5" /> {t.opportunityDetail.documents.addFirstDocument}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {documents.map((doc) => (
                        <DocumentCard
                            key={doc.id}
                            document={doc}
                            onEdit={() => setEditingDocument(doc)}
                            onDelete={() => handleDelete(doc)}
                            canEdit={canCreateEdit}
                            unknownText={t.opportunityDetail.documents.unknownUploader}
                            editTooltip={t.opportunityDetail.documents.edit}
                            deleteTooltip={t.opportunityDetail.documents.delete}
                        />
                    ))}
                </div>
            )}

            {/* Add/Edit Document Dialog */}
            {(showAddDialog || editingDocument) && (
                <AddDocumentDialog
                    opportunityId={opportunityId}
                    initialDocument={editingDocument}
                    documentLabels={documentLabels}
                    onClose={() => {
                        setShowAddDialog(false);
                        setEditingDocument(null);
                    }}
                />
            )}
        </div>
    );
}