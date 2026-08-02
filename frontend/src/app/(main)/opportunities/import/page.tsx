"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Upload,
    FileSpreadsheet,
    Download,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Users,
    Building2,
    Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useImportOpportunities, ImportResult } from "@/hooks/use-opportunities";
import { toast } from "sonner";

export default function ImportLeadsPage() {
    const router = RouterHook();
    const importOpportunities = useImportOpportunities();

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    function RouterHook() {
        return useRouter();
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            validateAndSetFile(file);
        }
    };

    const validateAndSetFile = (file: File) => {
        const name = file.name.toLowerCase();
        if (name.endsWith(".csv") || name.endsWith(".xlsx") || name.endsWith(".xls")) {
            setSelectedFile(file);
            setImportResult(null);
        } else {
            toast.error("Harap pilih file dengan format .csv atau .xlsx!");
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleDownloadTemplate = () => {
        const csvContent =
            "company_name,contact_name,email,phone,website,industry,product,potential_revenue,estimated_agenda_date,customer_needs\n" +
            "PT Bank Mandiri Sejahtera,Hendra Setiawan (IT Dir),hendra@mandirisejahtera.co.id,08123456789,https://mandirisejahtera.co.id,Banking,Data Analytics Platform,500000000,2026-08-15 10:00,Kebutuhan migrasi data warehouse dan analytics platform\n" +
            "PT Toko Retail Nusantara,Dian Kartika (Procurement),dian@tokoretail.com,08198765432,https://tokoretail.com,Retail & E-commerce,AI/ML Solutions,250000000,2026-08-20 14:00,Pengembangan recommendation engine untuk e-commerce";

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "MOIP_Lead_Import_Template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Template CSV berhasil diunduh!");
    };

    const handleUploadSubmit = async () => {
        if (!selectedFile) return;

        try {
            const res = await importOpportunities.mutateAsync(selectedFile);
            setImportResult(res);
            toast.success(`Berhasil mengimpor ${res.imported_count} leads prospect!`);
        } catch (err: unknown) {
            const errorObj = err as { response?: { data?: { detail?: string } } };
            toast.error(errorObj.response?.data?.detail || "Gagal mengimpor file leads. Coba lagi.");
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6 sm:space-y-8">
            {/* Top Navigation */}
            <div>
                <Link
                    href="/opportunities"
                    className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Opportunities
                </Link>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                            Bulk Import Leads & Opportunities
                        </h1>
                        <p className="text-sm text-zinc-500 mt-1">
                            Unggah spreadsheet CSV/Excel berisi data prospect & kontak untuk mengimpor leads secara otomatis ke MOIP.
                        </p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={handleDownloadTemplate}
                        className="gap-2 shrink-0 border-zinc-200"
                    >
                        <Download className="w-4 h-4 text-zinc-700" />
                        Download Template CSV
                    </Button>
                </div>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-zinc-50/50 border-zinc-200/80">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4" />
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">Profil Kontak</h4>
                            <p className="text-xs text-zinc-500 mt-0.5">Nama PIC, Email, HP/WA otomatis tersimpan rapi.</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-zinc-50/50 border-zinc-200/80">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">Normalisasi Data</h4>
                            <p className="text-xs text-zinc-500 mt-0.5">Format HP (+62) & Domain otomatis dirapikan.</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-zinc-50/50 border-zinc-200/80">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">AI Auto-KYC</h4>
                            <p className="text-xs text-zinc-500 mt-0.5">Pipeline AI Intelligence otomatis dipicu per lead.</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Upload Zone */}
            <Card className="p-6 sm:p-8 border-dashed border-2 border-zinc-300">
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                        isDragging
                            ? "border-zinc-900 bg-zinc-50 scale-[0.99]"
                            : selectedFile
                            ? "border-emerald-500 bg-emerald-50/30"
                            : "border-zinc-200 hover:border-zinc-400 bg-white"
                    }`}
                >
                    <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                        id="lead-file-input"
                    />
                    <label htmlFor="lead-file-input" className="w-full flex flex-col items-center cursor-pointer">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-700 flex items-center justify-center mb-4 shadow-inner">
                            {selectedFile ? (
                                <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                            ) : (
                                <Upload className="w-7 h-7 text-zinc-600" />
                            )}
                        </div>

                        {selectedFile ? (
                            <div className="text-center space-y-1">
                                <p className="text-sm font-semibold text-zinc-900">{selectedFile.name}</p>
                                <p className="text-xs text-zinc-500">
                                    {(selectedFile.size / 1024).toFixed(1)} KB • Klik atau drag file lain untuk mengganti
                                </p>
                            </div>
                        ) : (
                            <div className="text-center space-y-1">
                                <p className="text-sm font-medium text-zinc-900">
                                    Klik untuk memilih file atau <span className="underline font-semibold">drag & drop</span> di sini
                                </p>
                                <p className="text-xs text-zinc-500">Mendukung file format CSV (.csv) atau Excel (.xlsx)</p>
                            </div>
                        )}
                    </label>
                </div>

                {/* Submit Action */}
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-zinc-100">
                    <p className="text-xs text-zinc-500">
                        Header kolom standar: <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">company_name</code>, <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">contact_name</code>, <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">email</code>, <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">phone</code>
                    </p>
                    <Button
                        disabled={!selectedFile || importOpportunities.isPending}
                        onClick={handleUploadSubmit}
                        className="w-full sm:w-auto min-w-[160px] gap-2"
                    >
                        {importOpportunities.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Mengimpor...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" /> Mulai Impor Leads
                            </>
                        )}
                    </Button>
                </div>
            </Card>

            {/* Import Results Summary */}
            {importResult && (
                <Card className="p-6 border-emerald-200 bg-emerald-50/20 space-y-4">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div>
                            <h3 className="text-base font-semibold text-zinc-900">
                                Impor Berhasil Selesai!
                            </h3>
                            <p className="text-xs text-zinc-600">
                                Total <span className="font-bold text-emerald-700">{importResult.imported_count}</span> prospect leads berhasil dimasukkan ke MOIP.
                            </p>
                        </div>
                    </div>

                    {importResult.errors && importResult.errors.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                            <div className="flex items-center gap-1.5 font-semibold">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <span>{importResult.failed_count} baris gagal diimpor:</span>
                            </div>
                            <ul className="list-disc list-inside space-y-0.5 text-zinc-600 pl-1">
                                {importResult.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="pt-2 flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setSelectedFile(null);
                                setImportResult(null);
                            }}
                            className="text-xs border-zinc-200"
                        >
                            Impor File Lain
                        </Button>
                        <Button
                            onClick={() => router.push("/opportunities")}
                            className="text-xs"
                        >
                            Lihat Daftar Opportunities
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
}
