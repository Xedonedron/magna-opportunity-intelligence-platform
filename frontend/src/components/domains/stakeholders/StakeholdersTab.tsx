"use client";

import { useState } from "react";
import { Plus, User, Building, FileSpreadsheet, Loader2, Sparkles, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StakeholderCard } from "./StakeholderCard";
import { StakeholderFormDialog } from "./StakeholderFormDialog";
import { CreateOpportunityFromStakeholdersDialog } from "./CreateOpportunityFromStakeholdersDialog";
import {
    useCompanyContacts,
    useDeleteCompanyContact,
    useUpdateCompanyContact,
} from "@/hooks/use-company-contacts";
import { api } from "@/lib/api";
import { toast } from "sonner";
import type { CompanyContact } from "@/types/company-contact";

interface StakeholdersTabProps {
    companyId?: string | null;
    companyName?: string;
    canEdit?: boolean;
}

export function StakeholdersTab({
    companyId,
    companyName,
    canEdit = true,
}: StakeholdersTabProps) {
    const { data, isLoading } = useCompanyContacts(companyId);
    const deleteContact = useDeleteCompanyContact();
    const updateContact = useUpdateCompanyContact();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<CompanyContact | null>(
        null
    );
    const [isExporting, setIsExporting] = useState(false);

    // Multi-selection for Opportunity generation
    const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
    const [isOpptyDialogOpen, setIsOpptyDialogOpen] = useState(false);

    const contacts = data?.items || [];

    const handleToggleSelect = (contact: CompanyContact) => {
        setSelectedContactIds((prev) => {
            const next = new Set(prev);
            if (next.has(contact.id)) {
                next.delete(contact.id);
            } else {
                next.add(contact.id);
            }
            return next;
        });
    };

    const handleToggleSelectAll = () => {
        if (selectedContactIds.size === contacts.length) {
            setSelectedContactIds(new Set());
        } else {
            setSelectedContactIds(new Set(contacts.map((c) => c.id)));
        }
    };

    const handleExportExcel = async () => {
        if (!companyId) return;
        setIsExporting(true);
        try {
            const res = await api.get(`/api/companies/${companyId}/contacts/export-excel`, {
                responseType: "blob",
            });
            const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = blobUrl;
            const safeName = (companyName || "Stakeholder").replace(/[^a-zA-Z0-9_-]/g, "_");
            link.setAttribute("download", `Stakeholders_${safeName}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.success("File Excel stakeholders berhasil diunduh!");
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || "Gagal mengunduh file Excel stakeholders.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleOpenCreate = () => {
        setEditingContact(null);
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (contact: CompanyContact) => {
        setEditingContact(contact);
        setIsDialogOpen(true);
    };

    const handleSetPrimary = async (contact: CompanyContact) => {
        if (!companyId || contact.is_primary) return;
        await updateContact.mutateAsync({
            companyId,
            contactId: contact.id,
            input: { is_primary: true },
        });
    };

    const handleDelete = async (contactId: string) => {
        if (!companyId) return;
        await deleteContact.mutateAsync({
            companyId,
            contactId,
        });
    };

    if (!companyId) {
        return (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-8 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
                    <Building className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Belum Terhubung ke Folder Perusahaan
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                    Stakeholder dikelola di level organisasi perusahaan sehingga dapat digunakan bersama di berbagai peluang. Hubungkan peluang ini ke folder perusahaan untuk mulai mengelola daftar stakeholder.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div>
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>Stakeholder Directory</span>
                        {companyName && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-normal">
                                {companyName}
                            </span>
                        )}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Daftar kontak kunci, pembuat keputusan, dan preferensi komunikasi lintas workspace.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    {contacts.length > 0 && (
                        <>
                            <Button
                                onClick={handleToggleSelectAll}
                                variant="secondary"
                                size="sm"
                                className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300"
                                title={selectedContactIds.size === contacts.length ? "Batalkan semua pilihan" : "Pilih semua kontak"}
                            >
                                {selectedContactIds.size === contacts.length && contacts.length > 0 ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                    <Square className="w-3.5 h-3.5 text-zinc-400" />
                                )}
                                <span>
                                    {selectedContactIds.size > 0
                                        ? `${selectedContactIds.size}/${contacts.length} Terpilih`
                                        : "Pilih Semua"}
                                </span>
                            </Button>

                            {selectedContactIds.size > 0 && (
                                <Button
                                    onClick={() => setIsOpptyDialogOpen(true)}
                                    size="sm"
                                    className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>Buat Opportunity ({selectedContactIds.size})</span>
                                </Button>
                            )}

                            <Button
                                onClick={handleExportExcel}
                                disabled={isExporting}
                                variant="secondary"
                                size="sm"
                                className="flex items-center gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                title="Unduh seluruh kontak stakeholder perusahaan ini ke format Excel (.xlsx)"
                            >
                                {isExporting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                )}
                                <span>Unduh Excel</span>
                            </Button>
                        </>
                    )}
                    {canEdit && (
                        <Button
                            onClick={handleOpenCreate}
                            size="sm"
                            className="flex items-center gap-1.5"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Tambah Stakeholder</span>
                        </Button>
                    )}
                </div>
            </div>
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-44 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 animate-pulse"
                        />
                    ))}
                </div>
            ) : contacts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center bg-zinc-50/50 dark:bg-zinc-900/20">
                    <User className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                    <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        Belum ada stakeholder
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                        Tambahkan PIC, pengambil keputusan teknis, atau penanggung jawab komersial perusahaan ini.
                    </p>
                    {canEdit && (
                        <Button
                            onClick={handleOpenCreate}
                            variant="secondary"
                            size="sm"
                            className="mt-4 inline-flex items-center gap-1.5"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Stakeholder Sekarang</span>
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contacts.map((c) => (
                        <StakeholderCard
                            key={c.id}
                            contact={c}
                            canEdit={canEdit}
                            selectable={true}
                            isSelected={selectedContactIds.has(c.id)}
                            onToggleSelect={() => handleToggleSelect(c)}
                            onEdit={handleOpenEdit}
                            onDelete={handleDelete}
                            onSetPrimary={handleSetPrimary}
                        />
                    ))}
                </div>
            )}

            {isDialogOpen && (
                <StakeholderFormDialog
                    companyId={companyId}
                    contact={editingContact}
                    onClose={() => setIsDialogOpen(false)}
                />
            )}

            {isOpptyDialogOpen && (
                <CreateOpportunityFromStakeholdersDialog
                    companyId={companyId}
                    companyName={companyName || "Perusahaan"}
                    selectedContacts={contacts.filter((c) => selectedContactIds.has(c.id))}
                    onClose={() => setIsOpptyDialogOpen(false)}
                />
            )}
        </div>
    );
}
