"use client";

import { useState } from "react";
import { Calendar, ChevronDown, MapPin, Users, ListChecks, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Meeting } from "@/types/meeting";

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
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
    const [openId, setOpenId] = useState<string | null>(
        meetings.length > 0 ? meetings[0].id : null
    );

    if (meetings.length === 0) {
        return (
            <Card className="p-12 text-center">
                <Calendar className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">
                    No meetings scheduled yet.
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
                        <button
                            onClick={() =>
                                setOpenId(isOpen ? null : meeting.id)
                            }
                            className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
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
                                        {formatDate(meeting.date)}
                                        {meeting.location &&
                                            ` • ${meeting.location}`}
                                    </p>
                                </div>
                            </div>
                            <ChevronDown
                                className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""
                                    }`}
                            />
                        </button>

                        {isOpen && (
                            <div className="px-5 py-5 border-t border-zinc-100 bg-zinc-50/50 space-y-5">
                                {/* Participants */}
                                {meeting.participants &&
                                    meeting.participants.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5" />
                                                Participants
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
                                            Agenda
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
                                            Notes
                                        </h4>
                                        <p className="text-sm text-zinc-600 leading-relaxed bg-white border border-zinc-100 rounded-md p-3">
                                            {meeting.notes}
                                        </p>
                                    </div>
                                )}

                                {/* Action Items */}
                                {meeting.action_items &&
                                    meeting.action_items.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2">
                                                Action Items
                                            </h4>
                                            <ul className="space-y-1.5">
                                                {meeting.action_items.map(
                                                    (item, i) => (
                                                        <li
                                                            key={i}
                                                            className="flex items-start gap-2 text-sm text-zinc-600"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                className="mt-0.5 w-3.5 h-3.5 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                                            />
                                                            {item}
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        </div>
                                    )}
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}