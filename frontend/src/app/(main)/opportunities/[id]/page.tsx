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
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useOpportunity } from "@/hooks/use-opportunities";
import { useMeetings } from "@/hooks/use-meetings";
import { MeetingAccordion } from "@/components/domains/meetings/MeetingAccordion";
import { CreateMeetingDialog } from "@/components/domains/meetings/CreateMeetingDialog";
import { KYCReportTab } from "@/components/domains/kyc/KYCReportTab";
import { OpportunityChatSidebar } from "@/components/domains/opportunities/OpportunityChatSidebar";
import { formatDateTime, timeAgo } from "@/lib/utils";
import type { OpportunityStatus } from "@/types/opportunity";

const tabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "kyc", label: "KYC Report", icon: FileText },
    { id: "meetings", label: "Meetings", icon: Calendar },
    { id: "timeline", label: "Timeline", icon: GitCommit },
    { id: "versions", label: "Versions", icon: Clock },
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
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem("moip_user");
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch (e) {
                console.error(e);
            }
        }
    }, []);

    const canCreateEdit = user ? user.capabilities?.split(",").map((c: string) => c.trim()).includes("create_edit") : false;

    const { data: opp, isLoading } = useOpportunity(id);
    const { data: meetingsData } = useMeetings(id);

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
                {/* Header */}
                <div className="bg-white border-b border-zinc-200 px-8 pt-8 pb-0 shrink-0">
                <div className="max-w-[1200px] mx-auto">
                    <button
                        onClick={() => router.push("/opportunities")}
                        className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1 mb-4"
                    >
                        <ChevronRight className="w-4 h-4 rotate-180" /> Opportunities
                    </button>

                    <div className="flex items-start justify-between mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">
                                    {opp.company_name}
                                </h1>
                                <StatusBadge status={opp.status as OpportunityStatus} />
                            </div>
                            <p className="text-zinc-500">
                                {opp.id.slice(0, 8)} • Owned by{" "}
                                {opp.assigned_engineer?.full_name || "Unassigned"} • Created{" "}
                                {formatDateTime(opp.created_at)}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                className="gap-2 border-zinc-300"
                                onClick={() => setIsChatOpen(!isChatOpen)}
                            >
                                <Sparkles className="w-4 h-4 text-zinc-900" /> Chat with AI
                            </Button>
                            {canCreateEdit && (
                                <Button
                                    className="gap-2"
                                    onClick={() => setShowCreateMeeting(true)}
                                >
                                    <Plus className="w-4 h-4" /> Log Meeting
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-6 border-b border-zinc-200 translate-y-px">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === tab.id
                                    ? "border-zinc-900 text-zinc-900"
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
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-[1200px] mx-auto">
                    {activeTab === "overview" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card className="p-6">
                                    <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">
                                        Company Information
                                    </h3>
                                    <div className="space-y-3">
                                        <InfoRow
                                            icon={<Building2 className="w-4 h-4" />}
                                            label="Company"
                                            value={opp.company_name}
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
                                        <InfoRow
                                            icon={<User className="w-4 h-4" />}
                                            label="Engineer"
                                            value={opp.assigned_engineer?.full_name}
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

                            {opp.meeting_schedule && (
                                <Card className="p-6">
                                    <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-4">
                                        Next Meeting
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-5 h-5 text-zinc-400" />
                                        <span className="text-sm text-zinc-700">
                                            {formatDateTime(opp.meeting_schedule)}
                                        </span>
                                    </div>
                                </Card>
                            )}
                        </div>
                    )}

                    {activeTab === "timeline" && (
                        <div className="py-4 pl-4 pr-2">
                            <div className="relative border-l border-zinc-200 space-y-8 pb-4">
                                {opp.timeline_events && opp.timeline_events.length > 0 ? (
                                    opp.timeline_events.map((event) => (
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
                                        <Plus className="w-3.5 h-3.5" /> Add Meeting
                                    </Button>
                                )}
                            </div>
                            <MeetingAccordion
                                meetings={meetingsData?.items || []}
                            />
                        </div>
                    )}

                    {activeTab === "versions" && (
                        <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
                            <Clock className="w-12 h-12 mb-4 opacity-20" />
                            <p>
                                KYC version history will be available after AI
                                KYC pipeline implementation.
                            </p>
                            <Button
                                variant="secondary"
                                className="mt-4"
                                onClick={() => setActiveTab("overview")}
                            >
                                Switch to Overview
                            </Button>
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