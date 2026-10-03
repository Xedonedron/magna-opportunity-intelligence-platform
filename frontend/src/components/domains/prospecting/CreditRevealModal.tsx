"use client";

import { useState } from "react";
import { Lock, Mail, Phone, AlertTriangle, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface CandidateToReveal {
    id: string;
    name: string;
    job_title: string;
    has_email?: boolean;
    has_phone?: boolean;
    email_credits?: number;
    phone_credits?: number;
    is_unlocked?: boolean;
    unlocked_email?: string | null;
    unlocked_phone?: string | null;
}

interface CreditRevealModalProps {
    isOpen: boolean;
    onClose: () => void;
    contacts: CandidateToReveal[];
    currentQuota: number | null;
    isLoading: boolean;
    onConfirm: (revealOptions: ("email" | "phone")[]) => Promise<void>;
}

export function CreditRevealModal({
    isOpen,
    onClose,
    contacts,
    currentQuota,
    isLoading,
    onConfirm,
}: CreditRevealModalProps) {
    const [revealEmail, setRevealEmail] = useState(true);
    const [revealPhone, setRevealPhone] = useState(true);

    if (!isOpen || contacts.length === 0) return null;

    let totalEmailCredits = 0;
    let totalPhoneCredits = 0;

    contacts.forEach((c) => {
        const emailCost = c.unlocked_email ? 0 : (c.email_credits ?? 1);
        const phoneCost = c.unlocked_phone ? 0 : (c.phone_credits ?? 1);
        totalEmailCredits += emailCost;
        totalPhoneCredits += phoneCost;
    });

    const emailCost = revealEmail ? totalEmailCredits : 0;
    const phoneCost = revealPhone ? totalPhoneCredits : 0;
    const totalCreditsRequired = emailCost + phoneCost;

    const isQuotaSufficient =
        currentQuota === null || currentQuota >= totalCreditsRequired;

    const handleConfirm = async () => {
        const options: ("email" | "phone")[] = [];
        if (revealEmail) options.push("email");
        if (revealPhone) options.push("phone");
        if (options.length === 0) return;
        await onConfirm(options);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5"
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Lock className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                            Konfirmasi Pembukaan Kredit Lusha
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Pilih atribut kontak yang ingin di-reveal. Kredit hanya akan dipotong sesuai atribut yang Anda pilih.
                        </p>
                    </div>
                </div>

                {/* Target Contacts Preview */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800/80 max-h-36 overflow-y-auto space-y-1.5 text-xs">
                    <div className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Target Kontak ({contacts.length}):
                    </div>
                    {contacts.map((c) => (
                        <div
                            key={c.id}
                            className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 py-0.5 border-b border-zinc-200/50 dark:border-zinc-800/50 last:border-0"
                        >
                            <span className="font-medium text-zinc-900 dark:text-zinc-200 truncate max-w-[200px]">
                                {c.name}
                            </span>
                            <span className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                                {c.job_title}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Attribute Checkboxes */}
                <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                        Pilih Data yang Ingin Dibuka:
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition">
                        <div className="flex items-center gap-2.5">
                            <input
                                type="checkbox"
                                checked={revealEmail}
                                onChange={(e) => setRevealEmail(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                <Mail className="w-4 h-4 text-emerald-600" />
                                <span>Alamat Email Terverifikasi</span>
                            </div>
                        </div>
                        <span className="text-[11px] text-zinc-500 font-mono">Total {totalEmailCredits} kredit</span>
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition">
                        <div className="flex items-center gap-2.5">
                            <input
                                type="checkbox"
                                checked={revealPhone}
                                onChange={(e) => setRevealPhone(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-2 text-xs font-medium text-zinc-800 dark:text-zinc-200">
                                <Phone className="w-4 h-4 text-blue-600" />
                                <span>Nomor HP / WhatsApp Direct</span>
                            </div>
                        </div>
                        <span className="text-[11px] text-zinc-500 font-mono">Total {totalPhoneCredits} kredit</span>
                    </label>
                </div>

                {/* Credit Summary Box */}
                <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-zinc-700 dark:text-zinc-300">
                        <span>Total Kontak Dipilih:</span>
                        <span className="font-semibold">{contacts.length} orang</span>
                    </div>
                    <div className="border-t border-blue-200 dark:border-blue-900/60 pt-1.5 flex justify-between items-center font-bold text-blue-950 dark:text-blue-200">
                        <span>Total Biaya Kredit Lusha:</span>
                        <span className="text-sm">{totalCreditsRequired} Kredit</span>
                    </div>
                    {currentQuota !== null && (
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5 flex justify-between">
                            <span>Sisa Kuota Akun Saat Ini:</span>
                            <span className="font-mono">{currentQuota} kredit</span>
                        </div>
                    )}
                </div>

                {!isQuotaSufficient && (
                    <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Sisa kuota Lusha tidak mencukupi untuk membuka seluruh data kontak ini.</span>
                    </div>
                )}

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleConfirm}
                        disabled={isLoading || (!revealEmail && !revealPhone) || !isQuotaSufficient}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-medium"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Membuka Data...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Konfirmasi Buka Data ({totalCreditsRequired} Kredit)</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
