"use client";

import { useState } from "react";
import { Mail, Phone, Linkedin, Star, Trash2, Edit2 } from "lucide-react";
import type { CompanyContact } from "@/types/company-contact";

interface Props {
    contact: CompanyContact;
    canEdit?: boolean;
    onEdit: (c: CompanyContact) => void;
    onDelete: (id: string) => void;
    onSetPrimary: (c: CompanyContact) => void;
}

export function StakeholderCard({ contact, canEdit, onEdit, onDelete, onSetPrimary }: Props) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    return (
        <div
            className={`rounded-xl border p-4 bg-white dark:bg-zinc-900/70 flex flex-col justify-between ${
                contact.is_primary
                    ? "border-amber-400/60 dark:border-amber-500/40 bg-amber-500/[0.02]"
                    : "border-zinc-200 dark:border-zinc-800"
            }`}
        >
            <div>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">
                                {contact.name}
                            </h3>
                            {contact.is_primary && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-medium border border-amber-300 dark:border-amber-800/60">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span>Primary PIC</span>
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                            {contact.job_title || "Posisi belum diisi"}
                            {contact.department ? ` • ${contact.department}` : ""}
                        </p>
                    </div>
                    {canEdit && (
                        <div className="flex items-center gap-1 shrink-0">
                            {!contact.is_primary && (
                                <button
                                    onClick={() => onSetPrimary(contact)}
                                    title="Jadikan Primary PIC"
                                    className="p-1.5 text-zinc-400 hover:text-amber-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                    <Star className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => onEdit(contact)}
                                title="Edit"
                                className="p-1.5 text-zinc-400 hover:text-blue-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setConfirmDelete(true)}
                                title="Hapus"
                                className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                    {contact.email && (
                        <div className="flex items-center gap-2 truncate">
                            <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <a href={`mailto:${contact.email}`} className="hover:underline text-blue-600 dark:text-blue-400 truncate">
                                {contact.email}
                            </a>
                        </div>
                    )}
                    {contact.phone && (
                        <div className="flex items-center gap-2 truncate">
                            <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <a href={`tel:${contact.phone}`} className="hover:underline">
                                {contact.phone}
                            </a>
                        </div>
                    )}
                    {contact.linkedin_url && (
                        <div className="flex items-center gap-2 truncate">
                            <Linkedin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="hover:underline text-blue-600 dark:text-blue-400 truncate">
                                Profil LinkedIn
                            </a>
                        </div>
                    )}
                </div>

                {contact.notes && (
                    <div className="mt-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                        &ldquo;{contact.notes}&rdquo;
                    </div>
                )}
            </div>

            {confirmDelete && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-900/40 flex items-center justify-between text-xs">
                    <span className="text-red-600 dark:text-red-400 font-medium">Hapus kontak ini?</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                            Batal
                        </button>
                        <button onClick={() => onDelete(contact.id)} className="px-2.5 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium">
                            Hapus
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
