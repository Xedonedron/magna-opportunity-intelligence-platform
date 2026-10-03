"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
    X, 
    Sparkles, 
    Shield, 
    Database, 
    Cloud, 
    Network, 
    Star, 
    Check, 
    Loader2, 
    DollarSign,
    Users,
    FileText,
    ArrowRight,
    Server,
    MapPin,
    Mail
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { classifyJobTitle } from "@/lib/pillar-classifier";
import { DEFAULT_TARGET_SOLUTIONS } from "@/lib/master-data";

export interface SelectedStakeholderItem {
    id?: string;
    name: string;
    job_title?: string | null;
    department?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedin_url?: string | null;
    is_primary?: boolean;
}

interface CreateOpportunityFromStakeholdersDialogProps {
    companyId?: string;
    companyName: string;
    industry?: string | null;
    website?: string | null;
    selectedContacts: SelectedStakeholderItem[];
    onClose: () => void;
    onSuccess?: (opportunityId: string) => void;
}

export const MAGNA_TARGET_SOLUTIONS = [
    {
        name: "Cybersecurity Suite",
        pillarKey: "security",
        pillarName: "Cybersecurity Suite",
        icon: Shield,
        colorClass: "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30",
        activeClass: "ring-2 ring-rose-500 bg-rose-50/80 dark:bg-rose-950/60 border-rose-500 text-rose-700 dark:text-rose-300",
        badgeClass: "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60",
        description: "BeyondTrust PAM/EPM, Fortinet, Palo Alto, Chronicle SOC",
    },
    {
        name: "Data Analytics Platform",
        pillarKey: "data",
        pillarName: "Data Analytics & AI",
        icon: Database,
        colorClass: "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30",
        activeClass: "ring-2 ring-blue-500 bg-blue-50/80 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300",
        badgeClass: "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/60",
        description: "Google BigQuery, Databricks, Dataflow, Looker, dbt",
    },
    {
        name: "AI/ML Solutions",
        pillarKey: "data",
        pillarName: "Data Analytics & AI",
        icon: Sparkles,
        colorClass: "border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
        activeClass: "ring-2 ring-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300",
        badgeClass: "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60",
        description: "Google Vertex AI, Gemini Enterprise, Document AI, MLOps",
    },
    {
        name: "Cloud Infrastructure (GCP)",
        pillarKey: "cloud",
        pillarName: "Cloud Infrastructure & Modernization",
        icon: Cloud,
        colorClass: "border-purple-500/40 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30",
        activeClass: "ring-2 ring-purple-500 bg-purple-50/80 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300",
        badgeClass: "bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/60",
        description: "Google Cloud Platform, GKE Kubernetes, Cloud Run, Anthos",
    },
    {
        name: "Enterprise Server & Compute",
        pillarKey: "cloud",
        pillarName: "Cloud Infrastructure & Modernization",
        icon: Server,
        colorClass: "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
        activeClass: "ring-2 ring-amber-500 bg-amber-50/80 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300",
        badgeClass: "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60",
        description: "Dell PowerEdge, HPE ProLiant, Nutanix HCI, VMware vSphere",
    },
    {
        name: "Google Maps Platform (GMaps)",
        pillarKey: "cloud",
        pillarName: "Cloud Infrastructure & Modernization",
        icon: MapPin,
        colorClass: "border-teal-500/40 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30",
        activeClass: "ring-2 ring-teal-500 bg-teal-50/80 dark:bg-teal-950/60 border-teal-500 text-teal-700 dark:text-teal-300",
        badgeClass: "bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-900/60",
        description: "Google Maps Platform, Routes API, Places API, Fleet Tracking",
    },
    {
        name: "Network Solutions",
        pillarKey: "network",
        pillarName: "Network & Enterprise Workplace",
        icon: Network,
        colorClass: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
        activeClass: "ring-2 ring-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300",
        badgeClass: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60",
        description: "Cisco Catalyst, Aruba CX, Campus LAN/WAN, Fortinet SD-WAN",
    },
    {
        name: "Google Workspace (GWS)",
        pillarKey: "network",
        pillarName: "Network & Enterprise Workplace",
        icon: Mail,
        colorClass: "border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30",
        activeClass: "ring-2 ring-sky-500 bg-sky-50/80 dark:bg-sky-950/60 border-sky-500 text-sky-700 dark:text-sky-300",
        badgeClass: "bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-900/60",
        description: "Google Workspace Enterprise, Gmail, Drive DLP, Gemini for Workspace",
    },
];

export function CreateOpportunityFromStakeholdersDialog({
    companyId,
    companyName,
    industry,
    website,
    selectedContacts,
    onClose,
    onSuccess,
}: CreateOpportunityFromStakeholdersDialogProps) {
    const router = useRouter();

    // Auto-detect dominant solution and pillar from selected contacts' job titles
    const detectedSolution = useMemo(() => {
        const counts: Record<string, number> = { security: 0, data: 0, cloud: 0, network: 0 };
        let allTitlesLower = "";
        for (const c of selectedContacts) {
            if (c.job_title) {
                allTitlesLower += " " + c.job_title.toLowerCase();
                const info = classifyJobTitle(c.job_title);
                if (info.isTarget && info.pillarId) {
                    counts[info.pillarId] = (counts[info.pillarId] || 0) + 1;
                }
            }
        }
        let bestKey = "security";
        let bestScore = -1;
        for (const [k, score] of Object.entries(counts)) {
            if (score > bestScore) {
                bestScore = score;
                bestKey = k;
            }
        }

        // Granular suggestion among Magna's 8 official solutions
        if (bestKey === "data") {
            if (/(\bai\b|machine\s*learning|deep\s*learning|\bml\b|artificial|generative|llm)/i.test(allTitlesLower)) {
                return MAGNA_TARGET_SOLUTIONS.find((s) => s.name === "AI/ML Solutions")!;
            }
            return MAGNA_TARGET_SOLUTIONS.find((s) => s.name === "Data Analytics Platform")!;
        }
        if (bestKey === "cloud") {
            if (/(server|hardware|nutanix|vmware|compute|bare\s*metal|data\s*center)/i.test(allTitlesLower)) {
                return MAGNA_TARGET_SOLUTIONS.find((s) => s.name === "Enterprise Server & Compute")!;
            }
            if (/(logistics|fleet|delivery|geospatial|maps|gis)/i.test(allTitlesLower)) {
                return MAGNA_TARGET_SOLUTIONS.find((s) => s.name === "Google Maps Platform (GMaps)")!;
            }
            return MAGNA_TARGET_SOLUTIONS.find((s) => s.name === "Cloud Infrastructure (GCP)")!;
        }
        if (bestKey === "network") {
            if (/(workspace|email|office|collaboration|exchange|zimbra)/i.test(allTitlesLower)) {
                return MAGNA_TARGET_SOLUTIONS.find((s) => s.name === "Google Workspace (GWS)")!;
            }
            return MAGNA_TARGET_SOLUTIONS.find((s) => s.name === "Network Solutions")!;
        }
        return MAGNA_TARGET_SOLUTIONS.find((s) => s.name === "Cybersecurity Suite")!;
    }, [selectedContacts]);

    const [selectedSolutionName, setSelectedSolutionName] = useState<string>(detectedSolution.name);
    const currentSolution = useMemo(() => {
        return MAGNA_TARGET_SOLUTIONS.find((s) => s.name === selectedSolutionName) || detectedSolution;
    }, [selectedSolutionName, detectedSolution]);

    const [selectedPillar, setSelectedPillar] = useState<string>(detectedSolution.pillarKey);
    const [solutionTitle, setSolutionTitle] = useState<string>(detectedSolution.name);
    const [dealTitle, setDealTitle] = useState<string>(`[${detectedSolution.name}] - ${companyName}`);
    const [estimatedValue, setEstimatedValue] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Primary contact state
    const [primaryIdOrName, setPrimaryIdOrName] = useState<string>(() => {
        const primary = selectedContacts.find((c) => c.is_primary) || selectedContacts[0];
        return primary?.id || primary?.name || "";
    });

    const handleSelectSolution = (solName: string) => {
        setSelectedSolutionName(solName);
        const config = MAGNA_TARGET_SOLUTIONS.find((s) => s.name === solName);
        if (config) {
            setSelectedPillar(config.pillarKey);
            setSolutionTitle(config.name);
            setDealTitle(`[${config.name}] - ${companyName}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!dealTitle.trim()) {
            setError("Judul opportunity wajib diisi.");
            return;
        }

        if (selectedContacts.length === 0) {
            setError("Setidaknya satu kontak stakeholder harus dipilih.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Partition contacts into DB IDs vs candidates
            const contactIds = selectedContacts
                .filter((c) => !!c.id)
                .map((c) => c.id as string);

            const candidateContacts = selectedContacts
                .filter((c) => !c.id)
                .map((c) => ({
                    name: c.name,
                    job_title: c.job_title || null,
                    department: c.department || null,
                    email: c.email || null,
                    phone: c.phone || null,
                    linkedin_url: c.linkedin_url || null,
                    is_primary: c.name === primaryIdOrName,
                }));

            // Resolve primary_contact_id if it's a UUID
            const primaryContact = selectedContacts.find(
                (c) => c.id === primaryIdOrName || c.name === primaryIdOrName
            );
            const primaryContactId = primaryContact?.id || undefined;

            const payload = {
                company_id: companyId || undefined,
                company_name: companyName,
                industry: industry || undefined,
                website: website || undefined,
                contact_ids: contactIds,
                candidate_contacts: candidateContacts.length > 0 ? candidateContacts : undefined,
                primary_contact_id: primaryContactId,
                pillar: selectedPillar,
                solution_title: solutionTitle.trim() || undefined,
                custom_title: dealTitle.trim(),
                estimated_value: estimatedValue ? parseFloat(estimatedValue) : 0,
                notes: notes.trim() || undefined,
            };

            const res = await api.post("/api/prospecting/convert-to-opportunity", payload);
            const oppId = res.data.opportunity_id;
            const redirectUrl = res.data.redirect_url || `/opportunities/${oppId}`;

            toast.success("Peluang outbound berhasil dibuat!", {
                description: `Terhubung dengan ${selectedContacts.length} stakeholder untuk solusi ${solutionTitle}.`,
            });

            onClose();
            if (onSuccess) {
                onSuccess(oppId);
            } else {
                router.push(redirectUrl);
            }
        } catch (err: any) {
            const msg =
                err?.response?.data?.detail ||
                err?.message ||
                "Gagal membuat opportunity dari stakeholder.";
            setError(msg);
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <span>Buat Peluang Outbound Baru</span>
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Mengonversi stakeholder directory ke entitas Opportunity dengan hipotesis kebutuhan otomatis.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {error && (
                        <div className="p-3 text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2">
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Company and Contacts Overview */}
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Target Perusahaan</span>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
                                {companyName}
                            </span>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>Stakeholder Terpilih ({selectedContacts.length})</span>
                                </span>
                                <span className="text-[11px] text-zinc-400">
                                    Klik bintang untuk jadikan Primary PIC
                                </span>
                            </div>

                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {selectedContacts.map((c) => {
                                    const isPrimary = (c.id && c.id === primaryIdOrName) || c.name === primaryIdOrName;
                                    return (
                                        <div
                                            key={c.id || c.name}
                                            className={`flex items-center justify-between p-2 rounded-lg text-xs border transition-colors ${
                                                isPrimary
                                                    ? "bg-amber-500/[0.04] border-amber-400/60 dark:border-amber-500/40"
                                                    : "bg-white dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700/60"
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                                        {c.name}
                                                    </span>
                                                    {isPrimary && (
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 font-semibold border border-amber-300 dark:border-amber-800">
                                                            <Star className="w-2.5 h-2.5 fill-current" />
                                                            Primary PIC
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                                    {c.job_title || "Posisi tidak tertera"}
                                                    {c.email ? ` • ${c.email}` : ""}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setPrimaryIdOrName(c.id || c.name)}
                                                title={isPrimary ? "Primary PIC saat ini" : "Jadikan Primary PIC"}
                                                className={`p-1.5 rounded-md transition-colors ${
                                                    isPrimary
                                                        ? "text-amber-500 bg-amber-100 dark:bg-amber-950/50"
                                                        : "text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                                }`}
                                            >
                                                <Star className={`w-3.5 h-3.5 ${isPrimary ? "fill-current" : ""}`} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* 8 Target Solusi Resmi Magna Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                Target Solusi Magna ({MAGNA_TARGET_SOLUTIONS.length} Solusi Resmi)
                            </label>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                Rekomendasi: <span className="font-medium text-blue-600 dark:text-blue-400">{detectedSolution.name}</span>
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {MAGNA_TARGET_SOLUTIONS.map((s) => {
                                const Icon = s.icon;
                                const isSelected = selectedSolutionName === s.name;
                                return (
                                    <button
                                        key={s.name}
                                        type="button"
                                        onClick={() => handleSelectSolution(s.name)}
                                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                                            isSelected ? s.activeClass : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg shrink-0 ${s.colorClass}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                                    {s.name}
                                                </h4>
                                                {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                                            </div>
                                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                                {s.description}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Deal Title */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                            Judul Opportunity
                        </label>
                        <Input
                            value={dealTitle}
                            onChange={(e) => setDealTitle(e.target.value)}
                            placeholder="Contoh: [BeyondTrust PAM] - PT Bank Central Asia Tbk"
                            required
                        />
                    </div>

                    {/* Target Solution Title & Estimated Revenue */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                                Solusi Spesifik
                            </label>
                            <Input
                                value={solutionTitle}
                                onChange={(e) => setSolutionTitle(e.target.value)}
                                placeholder="Contoh: BeyondTrust Privileged Access Management"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Estimasi Nilai Deal (IDR)</span>
                            </label>
                            <Input
                                type="number"
                                value={estimatedValue}
                                onChange={(e) => setEstimatedValue(e.target.value)}
                                placeholder="Contoh: 150000000"
                                min="0"
                            />
                        </div>
                    </div>

                    {/* Strategic Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Catatan Pendukung & Konteks Awal (Opsional)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Tuliskan konteks inisiatif, temuan awal, atau kebutuhan khusus stakeholder..."
                            className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </form>

                {/* Footer Actions */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0 bg-zinc-50/50 dark:bg-zinc-900/50">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Batal
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Memproses Opportunity...</span>
                            </>
                        ) : (
                            <>
                                <span>Konfirmasi & Buat Opportunity</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
