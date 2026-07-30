"use client";

import { useState } from "react";
import Link from "next/link";
import {
    Calendar,
    Search,
    MapPin,
    Users,
    ChevronDown,
    ChevronUp,
    FileText,
    CheckSquare,
    FolderOpen,
    Clock,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useMeetings } from "@/hooks/use-meetings";
import { useOpportunities } from "@/hooks/use-opportunities";
import { formatDateTime } from "@/lib/utils";
import type { Meeting } from "@/types/meeting";

export default function MeetingsPage() {
    const { data: meetingsData, isLoading: isLoadingMeetings } = useMeetings();
    const { data: opportunitiesData } = useOpportunities({ page_size: 100 });
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedMeetings, setExpandedMeetings] = useState<Record<string, boolean>>({});

    // Map opportunity ID to Company Name for easy lookup
    const opportunityMap = opportunitiesData?.items.reduce((acc, opp) => {
        acc[opp.id] = opp.company_name;
        return acc;
    }, {} as Record<string, string>) || {};

    const toggleExpand = (meetingId: string) => {
        setExpandedMeetings((prev) => ({
            ...prev,
            [meetingId]: !prev[meetingId],
        }));
    };

    if (isLoadingMeetings) {
        return (
            <div className="p-8 max-w-5xl mx-auto space-y-6">
                <div className="h-8 w-48 bg-zinc-200 rounded animate-pulse mb-6" />
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-32 bg-zinc-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    const meetings = meetingsData?.items || [];
    const filteredMeetings = meetings.filter((meeting) => {
        const titleMatch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase());
        const companyName = opportunityMap[meeting.opportunity_id] || "";
        const companyMatch = companyName.toLowerCase().includes(searchTerm.toLowerCase());
        return titleMatch || companyMatch;
    });

    // Compute stats
    const totalMeetings = meetings.length;
    const totalActionItems = meetings.reduce((acc, m) => acc + (m.action_items?.length || 0), 0);

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            {/* Header & Overview Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 pb-6">
                <div>
                    <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight flex items-center gap-2">
                        <Calendar className="w-8 h-8 text-zinc-800" /> Meetings Dashboard
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        Kelola dan tinjau semua agenda pertemuan pre-sales Smartnet Magna Global secara terpusat.
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-zinc-50 border border-zinc-200 px-4 py-2.5 rounded-lg text-center shadow-sm">
                        <p className="text-xs text-zinc-500 font-medium uppercase">Total Rapat</p>
                        <p className="text-xl font-semibold text-zinc-900 mt-0.5">{totalMeetings}</p>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-200 px-4 py-2.5 rounded-lg text-center shadow-sm">
                        <p className="text-xs text-zinc-500 font-medium uppercase">Action Items</p>
                        <p className="text-xl font-semibold text-zinc-900 mt-0.5">{totalActionItems}</p>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                    placeholder="Cari berdasarkan judul rapat atau nama perusahaan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 w-full"
                />
            </div>

            {/* Meetings List */}
            {filteredMeetings.length === 0 ? (
                <Card className="p-12 text-center border border-zinc-200 bg-white">
                    <FolderOpen className="w-12 h-12 mx-auto text-zinc-200 mb-4" />
                    <h3 className="text-lg font-medium text-zinc-900">Belum Ada Pertemuan</h3>
                    <p className="text-zinc-500 text-sm mt-1">
                        Tidak ada agenda rapat yang cocok dengan pencarian Anda atau belum ada rapat yang dijadwalkan.
                    </p>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredMeetings.map((meeting) => {
                        const isExpanded = !!expandedMeetings[meeting.id];
                        const companyName = opportunityMap[meeting.opportunity_id] || "Peluang Baru";

                        return (
                            <Card
                                key={meeting.id}
                                className={`border transition-all duration-200 bg-white overflow-hidden ${
                                    isExpanded
                                        ? "border-zinc-400 shadow-md"
                                        : "border-zinc-200 hover:border-zinc-300 hover:shadow-sm"
                                }`}
                            >
                                <div
                                    className="p-6 cursor-pointer flex justify-between items-start gap-4 select-none"
                                    onClick={() => toggleExpand(meeting.id)}
                                >
                                    <div className="space-y-2 flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link
                                                href={`/opportunities/${meeting.opportunity_id}`}
                                                className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/80 px-2 py-0.5 rounded transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {companyName}
                                            </Link>
                                            <span className="text-zinc-300">•</span>
                                            <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" /> {formatDateTime(meeting.date)}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-zinc-900 truncate">
                                            {meeting.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 pt-1">
                                            {meeting.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3.5 h-3.5" /> {meeting.location}
                                                </span>
                                            )}
                                            {meeting.participants && meeting.participants.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-3.5 h-3.5" /> {meeting.participants.length} Partisipan
                                                </span>
                                            )}
                                            {meeting.action_items && meeting.action_items.length > 0 && (
                                                <span className="flex items-center gap-1 font-medium text-zinc-700">
                                                    <CheckSquare className="w-3.5 h-3.5" /> {meeting.action_items.length} Action Items
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="h-8 w-8 p-0 shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleExpand(meeting.id);
                                        }}
                                    >
                                        {isExpanded ? (
                                            <ChevronUp className="w-4 h-4" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>

                                {/* Expanded Details Section */}
                                {isExpanded && (
                                    <div className="border-t border-zinc-100 bg-zinc-50/50 p-6 space-y-6">
                                        {/* Agenda & Notes */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {meeting.agenda && meeting.agenda.length > 0 && (
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                                        Agenda Rapat
                                                    </h4>
                                                    <ul className="list-disc list-inside space-y-1 text-sm text-zinc-700">
                                                        {meeting.agenda.map((item, index) => (
                                                            <li key={index}>{item}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {meeting.notes && (
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                                                        <FileText className="w-3.5 h-3.5" /> Catatan Pertemuan
                                                    </h4>
                                                    <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                                                        {meeting.notes}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Items */}
                                        {meeting.action_items && meeting.action_items.length > 0 && (
                                            <div className="border-t border-zinc-100 pt-4 space-y-2">
                                                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                                    Action Items / Tindak Lanjut
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {meeting.action_items.map((item, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex items-start gap-2.5 bg-white border border-zinc-200/60 p-3 rounded-md text-sm text-zinc-700 shadow-sm"
                                                        >
                                                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 shrink-0" />
                                                            <span>{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
