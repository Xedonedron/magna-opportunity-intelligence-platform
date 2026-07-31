"use client";

import { useState } from "react";
import { X, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, SuggestedInput } from "@/components/ui/Input";
import { useUpdateMeeting, useDeleteMeeting } from "@/hooks/use-meetings";
import type { Meeting } from "@/types/meeting";

const LOCATION_SUGGESTIONS = [
    "Google Meet",
    "Zoom",
    "Microsoft Teams",
    "Client Office (On-site)",
    "SMG Office",
];

interface EditMeetingDialogProps {
    meeting: Meeting;
    onClose: () => void;
}

export function EditMeetingDialog({
    meeting,
    onClose,
}: EditMeetingDialogProps) {
    const updateMeeting = useUpdateMeeting();
    const deleteMeeting = useDeleteMeeting();

    // Format ISO date string for datetime-local input (YYYY-MM-DDTHH:mm)
    const initialDate = meeting.date
        ? new Date(meeting.date).toISOString().slice(0, 16)
        : "";

    const [title, setTitle] = useState(meeting.title || "");
    const [date, setDate] = useState(initialDate);
    const [location, setLocation] = useState(meeting.location || "");
    const [participantsText, setParticipantsText] = useState(
        meeting.participants ? meeting.participants.join(", ") : ""
    );
    const [agendaText, setAgendaText] = useState(
        meeting.agenda ? meeting.agenda.join("\n") : ""
    );
    const [notes, setNotes] = useState(meeting.notes || "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMeeting.mutate(
            {
                id: meeting.id,
                payload: {
                    title,
                    date: date ? new Date(date).toISOString() : undefined,
                    location: location || undefined,
                    participants: participantsText
                        ? participantsText.split(",").map((p) => p.trim())
                        : [],
                    agenda: agendaText
                        ? agendaText.split("\n").filter((a) => a.trim())
                        : [],
                    notes: notes || undefined,
                },
            },
            { onSuccess: () => onClose() }
        );
    };

    const handleDelete = () => {
        if (confirm(`Apakah Anda yakin ingin menghapus rapat "${meeting.title}"?`)) {
            deleteMeeting.mutate(meeting.id, {
                onSuccess: () => onClose(),
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
                    <h2 className="text-lg font-semibold text-zinc-900">
                        Edit Meeting & Agenda
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <Input
                        label="Meeting Title"
                        placeholder="e.g. Initial Discovery Call"
                        value={title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setTitle(e.target.value)
                        }
                        required
                    />

                    <Input
                        label="Date & Time"
                        type="datetime-local"
                        value={date}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setDate(e.target.value)
                        }
                        required
                    />

                    <SuggestedInput
                        label="Location"
                        placeholder="e.g. Google Meet, Zoom, Office"
                        value={location}
                        onChange={setLocation}
                        suggestions={LOCATION_SUGGESTIONS}
                    />

                    <Input
                        label="Participants (comma-separated)"
                        placeholder="e.g. Sarah (Magna), John (Acme), Jane (Acme)"
                        value={participantsText}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setParticipantsText(e.target.value)
                        }
                    />

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-zinc-700">
                            Agenda (one per line)
                        </label>
                        <textarea
                            rows={3}
                            placeholder={"Introductions\nCurrent Architecture Review\nPain points discussion"}
                            value={agendaText}
                            onChange={(e) => setAgendaText(e.target.value)}
                            className="flex w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-zinc-700">
                            Notes
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Meeting notes or context..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="flex w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleDelete}
                            disabled={deleteMeeting.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5"
                        >
                            <Trash2 className="w-4 h-4" />
                            Hapus Rapat
                        </Button>

                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={updateMeeting.isPending}
                                className="gap-2"
                            >
                                <Save className="w-4 h-4" />
                                {updateMeeting.isPending
                                    ? "Saving..."
                                    : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
