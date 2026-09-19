"use client";

import { useState } from "react";
import { X, User, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    useCreateCompanyContact,
    useUpdateCompanyContact,
} from "@/hooks/use-company-contacts";
import type { CompanyContact } from "@/types/company-contact";

interface StakeholderFormDialogProps {
    companyId: string;
    contact?: CompanyContact | null;
    onClose: () => void;
}

export function StakeholderFormDialog({
    companyId,
    contact,
    onClose,
}: StakeholderFormDialogProps) {
    const isEdit = !!contact;
    const createContact = useCreateCompanyContact();
    const updateContact = useUpdateCompanyContact();

    const [name, setName] = useState(contact?.name || "");
    const [jobTitle, setJobTitle] = useState(contact?.job_title || "");
    const [department, setDepartment] = useState(contact?.department || "");
    const [email, setEmail] = useState(contact?.email || "");
    const [phone, setPhone] = useState(contact?.phone || "");
    const [linkedinUrl, setLinkedinUrl] = useState(contact?.linkedin_url || "");
    const [isPrimary, setIsPrimary] = useState(contact?.is_primary || false);
    const [notes, setNotes] = useState(contact?.notes || "");
    const [error, setError] = useState<string | null>(null);

    const isPending = createContact.isPending || updateContact.isPending;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError("Nama stakeholder wajib diisi.");
            return;
        }

        const payload = {
            name: name.trim(),
            job_title: jobTitle.trim() || null,
            department: department.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            linkedin_url: linkedinUrl.trim() || null,
            is_primary: isPrimary,
            notes: notes.trim() || null,
        };

        try {
            if (isEdit) {
                await updateContact.mutateAsync({
                    companyId,
                    contactId: contact.id,
                    input: payload,
                });
            } else {
                await createContact.mutateAsync({
                    companyId,
                    input: payload,
                });
            }
            onClose();
        } catch (err: any) {
            setError(
                err.response?.data?.detail ||
                "Gagal menyimpan data stakeholder."
            );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
                onClick={onClose}
            />
            <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 z-10 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-5">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                {isEdit ? "Edit Stakeholder" : "Tambah Stakeholder Baru"}
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Profil kontak enterprise dan pemegang keputusan
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-lg text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Nama Lengkap <span className="text-red-500">*</span>
                        </label>
                        <Input
                            placeholder="Contoh: Budi Santoso"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Jabatan / Role
                            </label>
                            <Input
                                placeholder="Contoh: VP Infrastructure"
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Departemen / Divisi
                            </label>
                            <Input
                                placeholder="Contoh: IT Architecture"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Email
                            </label>
                            <Input
                                type="email"
                                placeholder="budi@company.co.id"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                No. Telepon / WhatsApp
                            </label>
                            <Input
                                placeholder="+62 812-xxxx-xxxx"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Profil LinkedIn
                        </label>
                        <Input
                            placeholder="https://linkedin.com/in/username"
                            value={linkedinUrl}
                            onChange={(e) => setLinkedinUrl(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60">
                        <input
                            type="checkbox"
                            id="is_primary"
                            checked={isPrimary}
                            onChange={(e) => setIsPrimary(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label
                            htmlFor="is_primary"
                            className="text-xs text-zinc-700 dark:text-zinc-200 cursor-pointer flex items-center gap-1.5 select-none"
                        >
                            <Star className="w-3.5 h-3.5 text-amber-500" />
                            <span>
                                Tandai sebagai <strong>Kontak Utama (Primary PIC)</strong>
                            </span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Catatan / Preferensi Komunikasi
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Contoh: Lebih responsif via WhatsApp. Tertarik dengan efisiensi lisensi cloud."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2.5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            disabled={isPending}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending
                                ? "Menyimpan..."
                                : isEdit
                                ? "Simpan Perubahan"
                                : "Tambah Stakeholder"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
