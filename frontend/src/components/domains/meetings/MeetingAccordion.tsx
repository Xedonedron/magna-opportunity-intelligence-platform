"use client";

import { useState } from "react";
import { Calendar, ChevronDown, MapPin, Users, ListChecks, FileText, Edit3 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";
import { EditMeetingDialog } from "./EditMeetingDialog";
import type { Meeting } from "@/types/meeting";

function formatDate(dateStr: string, locale: string): string {
    return new Date(dateStr).toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

interface MeetingAccordionProps {
    meetings: Meeting[];
}

export function MeetingAccordion({ meetings }: MeetingAccordionProps) {
    const { t, locale } = useLanguage();
    const [openId, setOpenId] = useState<string | null>(
        meetings.length > 0 ? meetings[0].id : null
    );
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

    if (meetings.length === 0) {
        return (
            <Card className="p-12 text-center">
                <Calendar className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">
                    {t.opportunityDetail.meetings.noMeetings}
                </p>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {meetings.map((meeting) => {
                const isOpen = openId === meeting.id;
                return (
                    <Card key={meeting.id} className="overflow-hidden">
                        <div className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                            <button
                                onClick={() =>
                                    setOpenId(isOpen ? null : meeting.id)
                                }
                                className="flex-1 flex items-center gap-3 text-left"
                            >
                                <div
                                    className={`p-2 rounded-lg ${isOpen
                                            ? "bg-zinc-900 text-white"
                                            : "bg-zinc-100 text-zinc-500"
                                        }`}
                                >
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-medium text-zinc-900 text-sm">
                                        {meeting.title}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        {formatDate(meeting.date, locale)}
                                        {meeting.location &&
                                            ` • ${meeting.location}`}
                                    </p>
                                </div>
                            </button>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingMeeting(meeting)}
                                    className="h-8 text-xs text-zinc-600 hover:text-zinc-900 gap-1"
                                    title={t.opportunityDetail.meetings.editMeeting}
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    {t.opportunityDetail.meetings.editMeeting}
                                </Button>
                                <button
                                    onClick={() =>
                                        setOpenId(isOpen ? null : meeting.id)
                                    }
                                    className="p-1 text-zinc-400 hover:text-zinc-600 transition-transform"
                                >
                                    <ChevronDown
                                        className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {isOpen && (
                            <div className="px-5 py-5 border-t border-zinc-100 bg-zinc-50/50 space-y-5">
                                {/* Participants */}
                                {meeting.participants &&
                                    meeting.participants.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5" />
                                                {t.opportunityDetail.meetings.participants}
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {meeting.participants.map(
                                                    (p, i) => (
                                                        <span
                                                            key={i}
                                                            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-200 text-zinc-700"
                                                        >
                                                            {p}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                {/* Agenda */}
                                {meeting.agenda && meeting.agenda.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <ListChecks className="w-3.5 h-3.5" />
                                            {t.opportunityDetail.meetings.agenda}
                                        </h4>
                                        <ol className="list-decimal list-inside space-y-1">
                                            {meeting.agenda.map((item, i) => (
                                                <li
                                                    key={i}
                                                    className="text-sm text-zinc-600"
                                                >
                                                    {item}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}

                                {/* Notes */}
                                {meeting.notes && (
                                    <div>
                                        <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5" />
                                            {t.opportunityDetail.meetings.notes}
                                        </h4>
                                        <p className="text-sm text-zinc-600 leading-relaxed bg-white border border-zinc-100 rounded-md p-3">
                                            {meeting.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                );
            })}

            {editingMeeting && (
                <EditMeetingDialog
                    meeting={editingMeeting}
                    onClose={() => setEditingMeeting(null)}
                />
            )}
        </div>
    );
}