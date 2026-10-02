"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Target,
    Sparkles,
    Building2,
    Briefcase,
    UserCheck,
    Mail,
    Phone,
    Linkedin,
    Copy,
    Check,
    ArrowRight,
    ArrowLeft,
    HelpCircle,
    ExternalLink,
    Send,
    MessageSquare,
    FileText,
    ShieldAlert,
    Cpu,
    CheckCircle2,
    RefreshCw,
    Network,
    Lock,
    Cloud,
    Database,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// Job Functions / Pillars mapped to Magna Offerings
const JOB_FUNCTIONS = [
    {
        id: "network",
        label: "Network & Enterprise Workplace",
        icon: Network,
        pillar: "Network & Workplace",
        defaultSolution: "Aruba & Cisco Enterprise SD-WAN & Network Observability",
    },
    {
        id: "cybersecurity",
        label: "Cybersecurity & Governance",
        icon: Lock,
        pillar: "Cybersecurity Suite",
        defaultSolution: "Privileged Access Management (PAM) BeyondTrust & Next-Gen SOC",
    },
    {
        id: "cloud",
        label: "Cloud & Infrastructure Modernization",
        icon: Cloud,
        pillar: "Cloud Infrastructure",
        defaultSolution: "Nutanix Cloud Platform & Hybrid Multi-Cloud Migration",
    },
    {
        id: "data_ai",
        label: "Data Analytics & Enterprise AI",
        icon: Database,
        pillar: "Data & AI",
        defaultSolution: "Enterprise Modern Data Lakehouse & AI-Powered Search",
    },
];

const SENIORITY_LEVELS = [
    { id: "c_level", label: "C-Level (CIO, CTO, CISO, CEO)" },
    { id: "vp_director", label: "VP / Senior VP / Director" },
    { id: "head_lead", label: "Head of Dept / Kadiv / Team Lead" },
    { id: "manager", label: "Manager / Section Head" },
    { id: "specialist", label: "Senior Specialist / Solutions Architect" },
];

const INDUSTRIES = [
    "Perbankan & Lembaga Keuangan (FSI)",
    "Telekomunikasi & Media",
    "Kesehatan & Rumah Sakit",
    "Retail & E-Commerce",
    "Manufaktur & Rantai Pasok",
    "Energi, Minyak & Gas, Pertambangan",
    "BUMN & Instansi Pemerintah",
    "Teknologi & Startup",
];

// Sample preset to test the flow instantly
const SAMPLE_PRESET = {
    companyName: "PT Bank Mega Tbk",
    industry: "Perbankan & Lembaga Keuangan (FSI)",
    website: "https://bankmega.com",
    jobFunction: "network",
    seniority: "head_lead",
    fullName: "Budi Santoso, S.T., M.Kom.",
    jobTitle: "Head of Network Engineering & Infrastructure",
    email: "budi.santoso@bankmega.com",
    phone: "+62 812-8899-7711",
    linkedinUrl: "https://linkedin.com/in/budi-santoso-net-id",
};

interface GeneratedDossier {
    companyName: string;
    contactName: string;
    contactTitle: string;
    jobFunction: string;
    seniority: string;
    recommendedSolution: {
        title: string;
        pillar: string;
        primaryProducts: string[];
        executiveSummary: string;
    };
    hypothesizedPainPoints: string[];
    valuePropositions: string[];
    discoveryQuestions: string[];
    outreach: {
        whatsapp: string;
        email: {
            subject: string;
            body: string;
        };
        linkedin: string;
    };
}

export default function ProspectingPage() {
    const router = useRouter();
    const [authChecked, setAuthChecked] = useState(false);
    const [hasAccess, setHasAccess] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem("moip_user");
        if (storedUser) {
            try {
                const u = JSON.parse(storedUser);
                const role = (u.role || "").toLowerCase();
                const caps = (u.capabilities || "").split(",").map((c: string) => c.trim());
                const allowedRoles = ["lgo", "manager", "superadmin", "admin", "lead_gen", "managerial"];
                const allowed = allowedRoles.includes(role) || caps.includes("prospecting");
                setHasAccess(allowed);
            } catch (e) {
                setHasAccess(false);
            }
        }
        setAuthChecked(true);
    }, []);

    // Form state
    const [formData, setFormData] = useState({
        companyName: "",
        industry: "Perbankan & Lembaga Keuangan (FSI)",
        website: "",
        jobFunction: "network",
        seniority: "head_lead",
        fullName: "",
        jobTitle: "",
        email: "",
        phone: "",
        linkedinUrl: "",
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [dossier, setDossier] = useState<GeneratedDossier | null>(null);
    const [activeTab, setActiveTab] = useState<"insights" | "outreach" | "questions">("insights");
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [convertedStatus, setConvertedStatus] = useState<"idle" | "converting" | "converted">("idle");

    const handleCopy = (text: string, fieldId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleLoadSample = () => {
        setFormData(SAMPLE_PRESET);
    };

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        setIsGenerating(true);
        setConvertedStatus("idle");

        // Simulate synthesis based on selected inputs (template stage)
        setTimeout(() => {
            const func = JOB_FUNCTIONS.find((f) => f.id === formData.jobFunction) || JOB_FUNCTIONS[0];
            const seniorityLabel = SENIORITY_LEVELS.find((s) => s.id === formData.seniority)?.label || "Head of Dept";

            let solutionTitle = func.defaultSolution;
            let products = ["Cisco Catalyst SD-WAN", "Aruba Central", "ThousandEyes Observability"];
            let painPoints = [
                "Latensi transaksi dan inter-branch connectivity yang tidak konsisten saat jam operasional puncak.",
                "Visibilitas monitoring jaringan antar cabang yang masih silo dan memakan waktu MTTR lama saat terjadi degradasi.",
                "Tuntutan kepatuhan regulasi OJK & BI terkait network uptime dan disaster recovery readiness yang semakin ketat.",
            ];

            if (formData.jobFunction === "cybersecurity") {
                solutionTitle = "Privileged Access Management (PAM) BeyondTrust & Next-Gen SOC";
                products = ["BeyondTrust Password Safe", "CrowdStrike Falcon XDR", "Splunk SIEM"];
                painPoints = [
                    "Risiko peretasan dan penyalahgunaan kredensial administrator/vendor pihak ketiga pada sistem core.",
                    "Audit kepatuhan UU PDP dan standar keamanan siber perbankan terkait pengetatan akses data nasabah.",
                    "Alert fatigue pada tim IT Security internal tanpa adanya automated threat response 24/7.",
                ];
            } else if (formData.jobFunction === "cloud") {
                solutionTitle = "Nutanix Enterprise Cloud Platform & Kubernetes Modernization";
                products = ["Nutanix AOS/AHV", "Dell PowerEdge Servers", "Red Hat OpenShift"];
                painPoints = [
                    "Biaya renewal lisensi virtualisasi legacy yang melonjak drastis pasca perubahan skema pricing vendor.",
                    "Kompleksitas operasional infrastruktur hybrid yang lambat saat provisioning environment aplikasi baru.",
                    "Kebutuhan modernisasi container platform tanpa mengorbankan keamanan data on-premise.",
                ];
            } else if (formData.jobFunction === "data_ai") {
                solutionTitle = "Enterprise Modern Data Lakehouse & AI Copilot Search";
                products = ["Google BigQuery", "Databricks Lakehouse", "Vertex AI Enterprise Search"];
                painPoints = [
                    "Silo data operasional yang menghambat analitik real-time untuk pengambilan keputusan bisnis cepat.",
                    "Kesulitan karyawan internal dalam menemukan SOP dan regulasi lintas divisi secara akurat.",
                    "Tuntutan C-level untuk mengadopsi AI namun tetap menjaga data privacy dan kontrol keamanan internal.",
                ];
            }

            const company = formData.companyName || "Perusahaan Target";
            const person = formData.fullName || "Bapak/Ibu";
            const title = formData.jobTitle || seniorityLabel;

            const generated: GeneratedDossier = {
                companyName: company,
                contactName: person,
                contactTitle: title,
                jobFunction: func.label,
                seniority: seniorityLabel,
                recommendedSolution: {
                    title: solutionTitle,
                    pillar: func.pillar,
                    primaryProducts: products,
                    executiveSummary: `Pendekatan inisiatif modernisasi infrastruktur yang dirancang khusus untuk divisi ${func.label} di ${company}, menitikberatkan pada efisiensi operasional dan compliance siap audit.`,
                },
                hypothesizedPainPoints: painPoints,
                valuePropositions: [
                    "Partner resmi tersertifikasi prinsipal terkemuka dengan tim engineer tersertifikasi lokal di Indonesia.",
                    "Dukungan managed services & SLA 24/7 dengan garansi respons cepat untuk critical workload.",
                    "Rekam jejak implementasi sukses di lebih dari 50+ enterprise perbankan dan BUMN nasional.",
                ],
                discoveryQuestions: [
                    `Bagaimana tim ${func.label} di ${company} saat ini mengantisipasi lonjakan beban traffic/workload saat peak operational hours?`,
                    `Apakah perubahan skema lisensi vendor atau kepatuhan regulasi industri belakangan ini mempengaruhi roadmap infrastruktur di divisi Anda?`,
                    `Jika ada inisiatif untuk meningkatkan efisiensi dan visibilitas operasional tanpa downtime, tolok ukur sukses (KPI) utama apa yang ingin dicapai tim Bapak/Ibu?`,
                ],
                outreach: {
                    whatsapp: `Halo Pak/Bu ${person.split(" ")[0]}, salam kenal dari tim Enterprise Solution Magna Global. Saya melihat peranan Bapak/Ibu dalam mengawal strategi ${func.label} di ${company}. 

Kami banyak membantu rekan-rekan ${title} di industri serupa mengoptimalkan arsitektur ${func.pillar}—terutama seputar efisiensi OPEX dan keandalan sistem tanpa downtime.

Kira-kira minggu depan apakah ada waktu santai 15 menit via Zoom atau coffee chat untuk saling bertukar pandangan terkait tren ini, Pak/Bu? Terima kasih banyak.`,
                    email: {
                        subject: `Inisiatif Penguatan Arsitektur ${func.pillar} untuk ${company}`,
                        body: `Yth. Bapak/Ibu ${person},\n${title}\n${company}\n\nSemoga email ini menjumpai Bapak/Ibu dalam keadaan prima.\n\nMemperhatikan dinamika transformasi digital di industri ${formData.industry}, kami memahami tantangan krusial yang dihadapi para pemimpin teknologi, khususnya seputar:\n1. ${painPoints[0]}\n2. ${painPoints[1]}\n\nSebagai mitra enterprise technology, PT Magna Mitra Perkasa (Magna Global) memiliki kapabilitas teruji dalam mengimplementasikan solusi ${solutionTitle}.\n\nKami bermaksud mengajukan inisiatif diskusi penjajakan (exploratory session) guna membagikan use case dan referensi implementasi yang relevan bagi ${company}, tanpa komitmen formal apapun.\n\nApakah Bapak/Ibu berkenan meluangkan waktu 20 menit pada minggu ini atau minggu depan?\n\nSalam hormat,\nTim Presales & Enterprise Solutions\nPT Magna Mitra Perkasa`,
                    },
                    linkedin: `Halo Pak/Bu ${person.split(" ")[0]}, salam kenal. Senang melihat rekam jejak kepemimpinan Anda di ${company}. Kami di Magna aktif mendukung optimasi arsitektur ${func.pillar} untuk enterprise nasional. Salam terhubung!`,
                },
            };

            setDossier(generated);
            setIsGenerating(false);
        }, 600);
    };

    const handleConvertToOpportunity = () => {
        setConvertedStatus("converting");
        setTimeout(() => {
            setConvertedStatus("converted");
        }, 800);
    };

    if (authChecked && !hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
                    <ShieldAlert className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                    Akses Fitur Terbatas
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mb-6">
                    Fitur Prospecting Hub dan Lusha Outbound Opportunity Generator hanya dapat diakses oleh role <strong>LGO</strong>, <strong>Manager</strong>, dan <strong>Superadmin</strong>, atau pengguna dengan hak akses capability <code>prospecting</code>.
                </p>
                <Button onClick={() => router.push("/dashboard")} variant="outline" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
                <div>
                    <div className="flex items-center gap-2.5 text-zinc-900 dark:text-zinc-100 font-bold text-2xl tracking-tight">
                        <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shadow-sm">
                            <Target className="w-5 h-5" />
                        </div>
                        <h1>Prospecting Hub</h1>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Opportunity Generator
                        </span>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
                        Jembatan data kontak profesional (Lusha) ke MOIP. Masukkan profil target untuk menghasilkan use case solusi Magna, hipotesis kebutuhan, dan inisiatif pendekatan secara instan.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleLoadSample}
                        className="text-xs gap-1.5"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Muat Contoh Preset (Bank Mega)
                    </Button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Intake Form (Lusha Ingestion) */}
                <div className="lg:col-span-5 space-y-5">
                    <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <form onSubmit={handleGenerate} className="space-y-4">
                            {/* Section 1: Target Organization */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>Target Perusahaan</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                        Nama Perusahaan <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        placeholder="Contoh: PT Bank Mega Tbk"
                                        value={formData.companyName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, companyName: e.target.value })
                                        }
                                        required
                                        className="text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                        Sektor Industri
                                    </label>
                                    <select
                                        className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                        value={formData.industry}
                                        onChange={(e) =>
                                            setFormData({ ...formData, industry: e.target.value })
                                        }
                                    >
                                        {INDUSTRIES.map((ind) => (
                                            <option key={ind} value={ind}>
                                                {ind}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                        Website / Domain Perusahaan
                                    </label>
                                    <Input
                                        placeholder="https://company.co.id"
                                        value={formData.website}
                                        onChange={(e) =>
                                            setFormData({ ...formData, website: e.target.value })
                                        }
                                        className="text-sm"
                                    />
                                </div>
                            </div>

                            <hr className="border-zinc-200 dark:border-zinc-800" />

                            {/* Section 2: Role & Criteria */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    <Briefcase className="w-3.5 h-3.5" />
                                    <span>Kriteria Peran (Field & Seniority)</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                        Bidang / Divisi Pekerjaan
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {JOB_FUNCTIONS.map((jf) => {
                                            const Icon = jf.icon;
                                            const isSelected = formData.jobFunction === jf.id;
                                            return (
                                                <button
                                                    key={jf.id}
                                                    type="button"
                                                    onClick={() =>
                                                        setFormData({ ...formData, jobFunction: jf.id })
                                                    }
                                                    className={cn(
                                                        "flex items-center gap-3 p-2.5 rounded-lg border text-left text-xs transition-all",
                                                        isSelected
                                                            ? "border-zinc-900 dark:border-zinc-100 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs"
                                                            : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400"
                                                    )}
                                                >
                                                    <Icon className="w-4 h-4 shrink-0 text-zinc-700 dark:text-zinc-300" />
                                                    <div className="flex-1 truncate">
                                                        <div>{jf.label}</div>
                                                        <div className="text-[10px] text-zinc-400 font-normal truncate">
                                                            {jf.pillar}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                        Level Jabatan (Seniority)
                                    </label>
                                    <select
                                        className="w-full text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                                        value={formData.seniority}
                                        onChange={(e) =>
                                            setFormData({ ...formData, seniority: e.target.value })
                                        }
                                    >
                                        {SENIORITY_LEVELS.map((lvl) => (
                                            <option key={lvl.id} value={lvl.id}>
                                                {lvl.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <hr className="border-zinc-200 dark:border-zinc-800" />

                            {/* Section 3: Contact Person (from Lusha) */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Kontak Key Person (Data Lusha)</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                            Nama Lengkap <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            placeholder="Budi Santoso"
                                            value={formData.fullName}
                                            onChange={(e) =>
                                                setFormData({ ...formData, fullName: e.target.value })
                                            }
                                            required
                                            className="text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                            Jabatan Persis
                                        </label>
                                        <Input
                                            placeholder="Head of Network Engineering"
                                            value={formData.jobTitle}
                                            onChange={(e) =>
                                                setFormData({ ...formData, jobTitle: e.target.value })
                                            }
                                            className="text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                        Email Kerja
                                    </label>
                                    <Input
                                        type="email"
                                        placeholder="budi@company.co.id"
                                        value={formData.email}
                                        onChange={(e) =>
                                            setFormData({ ...formData, email: e.target.value })
                                        }
                                        className="text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                            No. WhatsApp / HP
                                        </label>
                                        <Input
                                            placeholder="+62 812-xxxx-xxxx"
                                            value={formData.phone}
                                            onChange={(e) =>
                                                setFormData({ ...formData, phone: e.target.value })
                                            }
                                            className="text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                            Profil LinkedIn
                                        </label>
                                        <Input
                                            placeholder="linkedin.com/in/..."
                                            value={formData.linkedinUrl}
                                            onChange={(e) =>
                                                setFormData({ ...formData, linkedinUrl: e.target.value })
                                            }
                                            className="text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="w-full h-11 text-sm font-semibold gap-2 shadow-sm"
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Menganalisis Peran & Solusi Magna...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 text-amber-400" />
                                            <span>Generate Inisiatif Solusi Magna</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>

                {/* Right Column: Output / Dossier Workspace */}
                <div className="lg:col-span-7 space-y-5">
                    {!dossier ? (
                        // Empty State Guide
                        <Card className="p-8 bg-zinc-50/60 dark:bg-zinc-900/60 border-dashed border-2 border-zinc-300 dark:border-zinc-800 text-center space-y-5">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center mx-auto shadow-inner">
                                <Sparkles className="w-7 h-7 text-amber-500" />
                            </div>
                            <div className="max-w-md mx-auto space-y-1.5">
                                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                    Siap Meng-generate Peluang Baru
                                </h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                    Meskipun belum ada problem statement valid atau RFP resmi, sistem akan memetakan peran target ke katalog solusi Magna dan menyusun hipotesis inisiatif pendekatan secara otomatis.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
                                <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mb-1">
                                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                                        1. Bidik Akun
                                    </div>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                        Tentukan company & industri sasaran dari basis data Lusha.
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mb-1">
                                        <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                                        2. Cocokkan Solusi
                                    </div>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                        Role (e.g. Leader Network) otomatis dipasangkan dengan produk Magna.
                                    </p>
                                </div>
                                <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
                                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mb-1">
                                        <Send className="w-3.5 h-3.5 text-purple-500" />
                                        3. Langsung Propose
                                    </div>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                        Dapatkan naskah WhatsApp, email, dan pancingan obrolan presales.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleLoadSample}
                                    className="text-xs gap-1.5"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                    Klik di sini untuk melihat contoh hasil sintesis
                                </Button>
                            </div>
                        </Card>
                    ) : (
                        // Generated Dossier View
                        <div className="space-y-4">
                            {/* Summary Card */}
                            <Card className="p-5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                                                {dossier.companyName}
                                            </span>
                                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                {dossier.jobFunction}
                                            </span>
                                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                                {dossier.seniority}
                                            </span>
                                        </div>
                                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                            {dossier.contactName}
                                        </h2>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {dossier.contactTitle}
                                        </p>
                                    </div>

                                    <div className="text-left sm:text-right shrink-0">
                                        <div className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                                            Rekomendasi Solusi Magna
                                        </div>
                                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 max-w-[220px] sm:ml-auto">
                                            {dossier.recommendedSolution.title}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-1.5">
                                    <span className="text-[10px] font-semibold text-zinc-400 self-center mr-1">
                                        Katalog Produk:
                                    </span>
                                    {dossier.recommendedSolution.primaryProducts.map((p, i) => (
                                        <span
                                            key={i}
                                            className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                        >
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            </Card>

                            {/* Tab Navigation */}
                            <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800">
                                <button
                                    onClick={() => setActiveTab("insights")}
                                    className={cn(
                                        "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2",
                                        activeTab === "insights"
                                            ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                                            : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                                    )}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Hipotesis & Solusi Magna</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab("outreach")}
                                    className={cn(
                                        "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2",
                                        activeTab === "outreach"
                                            ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                                            : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                                    )}
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Naskah Pendekatan (Outreach)</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab("questions")}
                                    className={cn(
                                        "px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2",
                                        activeTab === "questions"
                                            ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                                            : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                                    )}
                                >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span>Pancingan Obrolan Presales</span>
                                </button>
                            </div>

                            {/* Tab Content 1: Insights & Solutions */}
                            {activeTab === "insights" && (
                                <div className="space-y-4">
                                    <Card className="p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                            <ShieldAlert className="w-4 h-4" />
                                            <span>Hipotesis Masalah Operasional (Unstated Pain Points)</span>
                                        </div>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Poin-poin tantangan umum yang dihadapi oleh posisi ini di industri {formData.industry}, siap digunakan sebagai trigger diskusi:
                                        </p>
                                        <div className="space-y-2">
                                            {dossier.hypothesizedPainPoints.map((pain, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-start gap-2.5 p-2.5 rounded-md bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 text-xs text-zinc-800 dark:text-zinc-200"
                                                >
                                                    <span className="font-bold text-amber-700 dark:text-amber-400">
                                                        {idx + 1}.
                                                    </span>
                                                    <span className="leading-relaxed">{pain}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>

                                    <Card className="p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Keunggulan & Value Proposition Magna</span>
                                        </div>
                                        <div className="space-y-2">
                                            {dossier.valuePropositions.map((vp, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300"
                                                >
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                                    <span className="leading-relaxed">{vp}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* Tab Content 2: Outreach Copy */}
                            {activeTab === "outreach" && (
                                <div className="space-y-4">
                                    {/* WhatsApp Copy */}
                                    <Card className="p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                <Phone className="w-3.5 h-3.5" />
                                                <span>WhatsApp Hook (Santai & Personal)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {formData.phone && (
                                                    <a
                                                        href={`https://wa.me/${formData.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(dossier.outreach.whatsapp)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:underline font-medium"
                                                    >
                                                        Buka WhatsApp <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleCopy(dossier.outreach.whatsapp, "wa")}
                                                    className="h-7 text-[11px] gap-1 px-2.5"
                                                >
                                                    {copiedField === "wa" ? (
                                                        <>
                                                            <Check className="w-3 h-3 text-emerald-500" />
                                                            Tersalin
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-3 h-3" />
                                                            Salin Pesan
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed font-mono">
                                            {dossier.outreach.whatsapp}
                                        </div>
                                    </Card>

                                    {/* Email Draft */}
                                    <Card className="p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                                                <Mail className="w-3.5 h-3.5" />
                                                <span>Email Prospecting Formal</span>
                                            </div>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() =>
                                                    handleCopy(
                                                        `Subject: ${dossier.outreach.email.subject}\n\n${dossier.outreach.email.body}`,
                                                        "email"
                                                    )
                                                }
                                                className="h-7 text-[11px] gap-1 px-2.5"
                                            >
                                                {copiedField === "email" ? (
                                                    <>
                                                        <Check className="w-3 h-3 text-emerald-500" />
                                                        Tersalin
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3 h-3" />
                                                        Salin Email Lengkap
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                                            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 pb-1.5 border-b border-zinc-200 dark:border-zinc-700">
                                                <span className="text-zinc-400 font-normal">Subjek: </span>
                                                {dossier.outreach.email.subject}
                                            </div>
                                            <div className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed">
                                                {dossier.outreach.email.body}
                                            </div>
                                        </div>
                                    </Card>

                                    {/* LinkedIn InMail */}
                                    <Card className="p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                <Linkedin className="w-3.5 h-3.5" />
                                                <span>LinkedIn InMail / Note Undangan</span>
                                            </div>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleCopy(dossier.outreach.linkedin, "li")}
                                                className="h-7 text-[11px] gap-1 px-2.5"
                                            >
                                                {copiedField === "li" ? (
                                                    <>
                                                        <Check className="w-3 h-3 text-emerald-500" />
                                                        Tersalin
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3 h-3" />
                                                        Salin
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                        <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed font-mono">
                                            {dossier.outreach.linkedin}
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* Tab Content 3: Discovery Questions */}
                            {activeTab === "questions" && (
                                <Card className="p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                        <HelpCircle className="w-4 h-4" />
                                        <span>Pertanyaan Pancingan Presales (Discovery Questions)</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Gunakan pertanyaan terstruktur ini untuk menggali kebutuhan klien secara halus saat introductory call atau coffee meeting:
                                    </p>
                                    <div className="space-y-2.5">
                                        {dossier.discoveryQuestions.map((q, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-lg bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-900/30 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed flex items-start gap-2.5"
                                            >
                                                <span className="w-5 h-5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200 flex items-center justify-center shrink-0 font-bold text-[10px]">
                                                    {idx + 1}
                                                </span>
                                                <span className="pt-0.5">{q}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            )}

                            {/* Conversion Action Bar */}
                            <Card className="p-4 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-md">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <div className="text-sm font-bold flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-amber-400 dark:text-amber-600" />
                                            <span>Lanjutkan ke Eksekusi Pipeline</span>
                                        </div>
                                        <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">
                                            Kontak akan disimpan ke Stakeholder Directory {dossier.companyName}, dan Opportunity baru berstatus New akan otomatis dibuat.
                                        </p>
                                    </div>

                                    <div>
                                        {convertedStatus === "converted" ? (
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-md shadow-xs">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>Berhasil Ditambahkan ke Pipeline!</span>
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={handleConvertToOpportunity}
                                                disabled={convertedStatus === "converting"}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:text-white text-xs font-bold gap-2 px-4 h-9 shadow-sm"
                                            >
                                                {convertedStatus === "converting" ? (
                                                    <>
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        <span>Menyimpan ke Peluang...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>🚀 Jadikan Peluang Aktif</span>
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
