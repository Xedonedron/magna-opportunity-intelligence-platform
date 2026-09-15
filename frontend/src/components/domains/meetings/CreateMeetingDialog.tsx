"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, SuggestedInput } from "@/components/ui/Input";
import { useCreateMeeting } from "@/hooks/use-meetings";
import { useLanguage } from "@/context/LanguageContext";

const LOCATION_SUGGESTIONS = [
    "Google Meet",
    "Zoom",
    "Microsoft Teams",
    "Client Office (On-site)",
    "SMG Office",
];

interface CreateMeetingDialogProps {
    opportunityId: string;
    onClose: () => void;
}

export function CreateMeetingDialog({
    opportunityId,
    onClose,
}: CreateMeetingDialogProps) {
    const { t } = useLanguage();
    const createMeeting = useCreateMeeting();
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [location, setLocation] = useState("");
    const [participantsText, setParticipantsText] = useState("");
    const [agendaText, setAgendaText] = useState("");
    const [notes, setNotes] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createMeeting.mutate(
            {
                opportunity_id: opportunityId,
                title,
                date: new Date(date).toISOString(),
                location: location || undefined,
                participants: participantsText
                    ? participantsText.split(",").map((p) => p.trim())
                    : undefined,
                agenda: agendaText
                    ? agendaText.split("\n").filter((a) => a.trim())
                    : undefined,
                notes: notes || undefined,
            },
            { onSuccess: () => onClose() }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-lg sm:mx-4 max-h-[90vh] overflow-y-auto">
                {/* Mobile drag pill */}
                <div className="sm:hidden flex justify-center pt-2 pb-1">
                    <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                </div>
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {t.opportunityDetail.meetings.scheduleMeeting}
                    </h2>
                    <button
                        onClick={onClose}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                    <Input
                        label={t.opportunityDetail.meetings.formTitle}
                        placeholder="e.g. Initial Discovery Call"
                        value={title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setTitle(e.target.value)
                        }
                        required
                    />

                    <Input
                        label={t.opportunityDetail.meetings.formDateTime}
                        type="datetime-local"
                        value={date}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setDate(e.target.value)
                        }
                        required
                    />

                    <SuggestedInput
                        label={t.opportunityDetail.meetings.formLocation}
                        placeholder="e.g. Google Meet, Zoom, Office"
                        value={location}
                        onChange={setLocation}
                        suggestions={LOCATION_SUGGESTIONS}
                    />

                    <Input
                        label={t.opportunityDetail.meetings.formParticipants}
                        placeholder="e.g. Sarah (Magna), John (Acme), Jane (Acme)"
                        value={participantsText}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setParticipantsText(e.target.value)
                        }
                    />

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {t.opportunityDetail.meetings.formAgenda}
                        </label>
                        <textarea
                            rows={3}
                            placeholder={"Introductions\nCurrent Architecture Review\nPain points discussion"}
                            value={agendaText}
                            onChange={(e) => setAgendaText(e.target.value)}
                            className="flex w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-base sm:text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-400"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {t.opportunityDetail.meetings.formNotes}
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Pre-meeting notes or context..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="flex w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-transparent px-3 py-2 text-base sm:text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-400"
                        />
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="min-h-[44px] sm:min-h-0"
                        >
                            {t.opportunityDetail.meetings.cancel}
                        </Button>
                        <Button
                            type="submit"
                            disabled={createMeeting.isPending}
                            className="gap-2 min-h-[44px] sm:min-h-0"
                        >
                            <Plus className="w-4 h-4" />
                            {createMeeting.isPending
                                ? t.opportunityDetail.meetings.scheduling
                                : t.opportunityDetail.meetings.scheduleMeeting}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}