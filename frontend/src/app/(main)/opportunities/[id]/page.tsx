"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ChevronRight,
    LayoutDashboard,
    Calendar,
    GitCommit,
    FileText,
    Clock,
    Plus,
    Zap,
    CheckCircle2,
    FolderOpen,
    Globe,
    Mail,
    Phone,
    Building2,
    Package,
    User,
    Sparkles,
    ArrowUpDown,
    Edit3,
    Coins,
    CalendarClock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useOpportunity, useUpdateOpportunity } from "@/hooks/use-opportunities";
import { getMasterPresales, fetchMasterData } from "@/lib/master-data";
import { useMeetings } from "@/hooks/use-meetings";
import { MeetingAccordion } from "@/components/domains/meetings/MeetingAccordion";
import { CreateMeetingDialog } from "@/components/domains/meetings/CreateMeetingDialog";
import { EditOpportunityDialog } from "@/components/domains/opportunities/EditOpportunityDialog";
import { KYCReportTab } from "@/components/domains/kyc/KYCReportTab";
import { OpportunityChatSidebar } from "@/components/domains/opportunities/OpportunityChatSidebar";
import { formatDateTime, timeAgo, formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { ALL_STATUSES, type OpportunityStatus } from "@/types/opportunity";

const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "kyc", label: "KYC Report", icon: FileText },
    { id: "meetings", label: "Meetings", icon: Calendar },
    { id: "timeline", label: "Timeline", icon: GitCommit },
];

const eventTypeIcons: Record<string, React.ReactNode> = {
    create: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    update: <GitCommit className="w-4 h-4 text-zinc-500" />,
    meeting: <Calendar className="w-4 h-4 text-blue-500" />,
    system: <Zap className="w-4 h-4 text-zinc-500" />,
    status_change: <GitCommit className="w-4 h-4 text-orange-500" />,
};

export default function OpportunityDetailPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("overview");
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [showCreateMeeting, setShowCreateMeeting] = useState(false);
    const [showEditOpportunity, setShowEditOpportunity] = useState(false);
    const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
    const [user, setUser] = useState<any>(null);
    const [hideFinancialNumbers, setHideFinancialNumbers] = useState(false);
    const [presalesList, setPresalesList] = useState<string[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem("moip_user");
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                localStorage.removeItem("moip_user");
            }
        }
        api.get("/api/admin/settings")
            .then((res) => setHideFinancialNumbers(Boolean(res.data?.hide_financial_numbers)))
            .catch((e) => console.error("Failed to load settings", e));

        fetchMasterData()
            .then((data) => setPresalesList(data.presales))
            .catch((e) => console.error("Failed to fetch master data", e));
    }, []);

    const canCreateEdit = user ? user.capabilities?.split(",").map((c: string) => c.trim()).includes("create_edit") : false;

    const { data: opp, isLoading } = useOpportunity(id);
    const { data: meetingsData } = useMeetings(id);
    const updateOpportunity = useUpdateOpportunity();

    const activePresales = presalesList.length > 0 ? presalesList : getMasterPresales();

    if (isLoading) {
        return (
            <div className="flex flex-col h-full bg-zinc-50">
                <div className="bg-white border-b border-zinc-200 px-8 pt-8 pb-0">
                    <div className="max-w-[1200px] mx-auto">
                        <div className="h-4 w-32 bg-zinc-100 rounded animate-pulse mb-4" />
                        <div className="h-8 w-64 bg-zinc-100 rounded animate-pulse mb-2" />
                        <div className="h-4 w-96 bg-zinc-100 rounded animate-pulse mb-8" />
                        <div className="flex gap-6 border-b border-zinc-200">
                            {tabs.map((t) => (
                                <div key={t.id} className="h-10 w-24 bg-zinc-100 rounded animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!opp) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
                <FolderOpen className="w-12 h-12 mb-4 opacity-20" />
                <p>Opportunity not found.</p>
                <Link href="/opportunities">
                    <Button variant="secondary" className="mt-4">
                        Back to Opportunities
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-zinc-50 overflow-hidden w-full">
            {/* Left Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
                {/* Opportunity Header */}
                <div className="bg-white border-b border-zinc-200 p-4 sm:p-8 pb-0">
                    <div className="max-w-[1200px] mx-auto space-y-6">
                        <button
                            onClick={() => router.push("/opportunities")}
                            className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1 mb-2"
                        >
                            <ChevronRight className="w-4 h-4 rotate-180" /> Opportunities
                        </button>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                                    {opp.company_name}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <StatusBadge status={opp.status as OpportunityStatus} />
                                    {canCreateEdit && (
                                        <select
                                            value={opp.status}
                                            onChange={async (e) => {
                                                const newStatus = e.target.value as OpportunityStatus;
                                                try {
                                                    await updateOpportunity.mutateAsync({
                                                        id: opp.id,
                                                        input: { status: newStatus },
                                                    });
                                                } catch (err) {
                                                    console.error("Gagal memperbarui status", err);
                                                }
                                            }}
                                            disabled={updateOpportunity.isPending}
                                            className="h-8 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-medium text-zinc-700 shadow-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 cursor-pointer disabled:opacity-50"
                                            title="Ubah Status Opportunity"
                                        >
                                            {ALL_STATUSES.map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mt-1.5">
                                <span>ID: {opp.id.slice(0, 8)}</span>
                                <span className="hidden sm:inline">•</span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 font-medium text-zinc-800 border border-zinc-200/80">
                                    <User className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>Pre-Sales:</span>
                                    {canCreateEdit ? (
                                        <select
                                            value={opp.assigned_engineer || ""}
                                            onChange={async (e) => {
                                                const newEng = e.target.value || null;
                                                try {
                                                    await updateOpportunity.mutateAsync({
                                                        id: opp.id,
                                                        input: { assigned_engineer: newEng },
                                                    });
                                                } catch (err) {
                                                    console.error("Gagal memperbarui Pre-Sales", err);
                                                }
                                            }}
                                            disabled={updateOpportunity.isPending}
                                            className="bg-transparent text-xs font-semibold text-zinc-900 border-none outline-none cursor-pointer focus:ring-0"
                                            title="Ubah Assignment Pre-Sales"
                                        >
                                            <option value="">Unassigned</option>
                                            {activePresales.map((name) => (
                                                <option key={name} value={name}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span>{opp.assigned_engineer || "Unassigned"}</span>
                                    )}
                                </span>
                                <span className="hidden sm:inline">•</span>
                                <span>Created {formatDateTime(opp.created_at)}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto">
                            {canCreateEdit && (
                                <Button
                                    variant="secondary"
                                    className="flex-1 sm:flex-initial gap-2 border-zinc-300 text-zinc-700 text-xs sm:text-sm"
                                    onClick={() => setShowEditOpportunity(true)}
                                >
                                    <Edit3 className="w-4 h-4" /> Edit
                                </Button>
                            )}
                            <Button
                                variant="secondary"
                                className="flex-1 sm:flex-initial gap-2 border-zinc-300 text-xs sm:text-sm"
                                onClick={() => setIsChatOpen(!isChatOpen)}
                            >
                                <Sparkles className="w-4 h-4 text-zinc-900" /> AI Chat
                            </Button>
                            {canCreateEdit && (
                                <Button
                                    className="flex-1 sm:flex-initial gap-2 text-xs sm:text-sm"
                                    onClick={() => setShowCreateMeeting(true)}
                                >
                                    <Plus className="w-4 h-4" /> Log Meeting
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 sm:gap-6 border-b border-zinc-200 translate-y-px overflow-x-auto scrollbar-none whitespace-nowrap pb-0.5">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-3 sm:pb-4 text-xs sm:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors shrink-0 ${activeTab === tab.id
                                    ? "border-zinc-900 text-zinc-900 font-semibold"
                                    : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                <div className="max-w-[1200px] mx-auto">
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            {/* Key Opportunity Metrics (Potential Revenue & Agenda Date) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="p-5 border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200/60 shrink-0">
                                            <Coins className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                                                Potential Revenue / Deal Value
                                            </span>
                                            <span className="text-xl font-bold text-zinc-900 mt-0.5 block tracking-tight">
                                                {formatCurrency(
                                                    opp.potential_revenue,
                                                    hideFinancialNumbers || user?.role === "engineer" || user?.role === "viewer"
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-5 border-blue-200/80 bg-gradient-to-br from-blue-50/50 to-white shadow-sm">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center border border-blue-200/60 shrink-0">
                                            <CalendarClock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                                                Estimasi Tanggal Agenda
                                            </span>
                                            <span className="text-base font-bold text-zinc-900 mt-0.5 block tracking-tight">
                                                {(() => {
                                                    const targetDate = opp.estimated_agenda_date || opp.meeting_schedule;
                                                    return targetDate ? formatDateTime(targetDate) : "Belum diagendakan";
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">
                                            Company Information
                                        </h3>
                                        {canCreateEdit && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowEditOpportunity(true)}
                                                className="h-8 text-xs text-zinc-600 hover:text-zinc-900 gap-1"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" /> Edit
                                            </Button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <InfoRow
                                            icon={<Building2 className="w-4 h-4" />}
                                            label="Company"
                                            value={opp.company_name}
                                        />
                                        <InfoRow
                                            icon={<User className="w-4 h-4" />}
                                            label="Contact PIC"
                                            value={opp.contact_name}
                                        />
                                        <InfoRow
                                            icon={<Globe className="w-4 h-4" />}
                                            label="Website"
                                            value={opp.website}
                                            isLink
                                        />
                                        <InfoRow
                                            icon={<Mail className="w-4 h-4" />}
                                            label="Email"
                                            value={opp.email}
                                        />
                                        <InfoRow
                                            icon={<Phone className="w-4 h-4" />}
                                            label="Phone"
                                            value={opp.phone}
                                        />
                                        <InfoRow
                                            icon={<Package className="w-4 h-4" />}
                                            label="Industry"
                                            value={opp.industry}
                                        />
                                        <InfoRow
                                            icon={<Package className="w-4 h-4" />}
                                            label="Solution"
                                            value={opp.product}
                                        />
                                    </div>
                                </Card>

                                <Card className="p-6">
                                    <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">
                                        Customer Needs
                                    </h3>
                                    <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                        {opp.customer_needs}
                                    </p>
                                    {opp.additional_notes && (
                                        <>
                                            <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mt-6 mb-4">
                                                Additional Notes
                                            </h3>
                                            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                                                {opp.additional_notes}
                                            </p>
                                        </>
                                    )}
                                </Card>
                            </div>
                        </div>
                    )}

                    {activeTab === "timeline" && (
                        <div className="py-4 pl-4 pr-2">
                            <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-200">
                                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                    Timeline Activity
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                                    className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 rounded-md shadow-sm transition-colors cursor-pointer"
                                >
                                    <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>{sortOrder === "desc" ? "Terbaru di atas" : "Terlama di atas"}</span>
                                </button>
                            </div>
                            <div className="relative border-l border-zinc-200 space-y-8 pb-4">
                                {opp.timeline_events && opp.timeline_events.length > 0 ? (
                                    [...opp.timeline_events]
                                        .sort((a, b) => {
                                            const timeA = new Date(a.created_at).getTime();
                                            const timeB = new Date(b.created_at).getTime();
                                            return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
                                        })
                                        .map((event) => (
                                            <div key={event.id} className="relative pl-8">
                                                <div className="absolute -left-[17px] top-1 w-8 h-8 bg-white rounded-full border border-zinc-200 flex items-center justify-center shadow-sm">
                                                    {eventTypeIcons[event.event_type] || (
                                                        <GitCommit className="w-4 h-4 text-zinc-500" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-sm text-zinc-900">
                                                            {event.actor_name}
                                                        </span>
                                                        <span className="text-zinc-400 text-sm">•</span>
                                                        <span className="text-zinc-500 text-xs">
                                                            {timeAgo(event.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-zinc-900 font-medium mb-1">
                                                        {event.action}
                                                    </p>
                                                    {event.description && (
                                                        <p className="text-sm text-zinc-600 bg-zinc-50 border border-zinc-100 p-3 rounded-md mt-2 inline-block shadow-sm">
                                                            {event.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    <p className="text-sm text-zinc-500 pl-8">
                                        No timeline events yet.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "kyc" && <KYCReportTab opportunityId={id} />}

                    {activeTab === "meetings" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">
                                    Meeting History
                                </h3>
                                {canCreateEdit && (
                                    <Button
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={() => setShowCreateMeeting(true)}
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Log Meeting
                                    </Button>
                                )}
                            </div>
                            <MeetingAccordion
                                meetings={meetingsData?.items || []}
                            />
                        </div>
                    )}
                </div>
            </div>
            </div>

            {/* Right Collapsible AI Chat Sidebar */}
            <OpportunityChatSidebar
                opportunityId={id}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
            />

            {/* Create Meeting Dialog */}
            {showCreateMeeting && (
                <CreateMeetingDialog
                    opportunityId={id}
                    onClose={() => setShowCreateMeeting(false)}
                />
            )}

            {/* Edit Opportunity Dialog */}
            {showEditOpportunity && (
                <EditOpportunityDialog
                    opportunity={opp}
                    onClose={() => setShowEditOpportunity(false)}
                />
            )}
        </div>
    );
}

function InfoRow({
    icon,
    label,
    value,
    isLink,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | null | undefined;
    isLink?: boolean;
}) {
    return (
        <div className="flex items-center gap-3 py-1.5">
            <span className="text-zinc-400">{icon}</span>
            <span className="text-sm text-zinc-500 w-20 shrink-0">{label}</span>
            {value ? (
                isLink ? (
                    <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                    >
                        {value}
                    </a>
                ) : (
                    <span className="text-sm text-zinc-900">{value}</span>
                )
            ) : (
                <span className="text-sm text-zinc-400">—</span>
            )}
        </div>
    );
}