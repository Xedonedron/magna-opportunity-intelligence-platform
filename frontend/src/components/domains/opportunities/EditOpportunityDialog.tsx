"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select, SuggestedInput } from "@/components/ui/Input";
import { useUpdateOpportunity } from "@/hooks/use-opportunities";
import type { Opportunity } from "@/types/opportunity";

import { useEffect } from "react";
import { getMasterIndustries, fetchMasterData } from "@/lib/master-data";

interface EditOpportunityDialogProps {
    opportunity: Opportunity;
    onClose: () => void;
}

export function EditOpportunityDialog({
    opportunity,
    onClose,
}: EditOpportunityDialogProps) {
    const updateOpportunity = useUpdateOpportunity();
    const [industriesList, setIndustriesList] = useState<string[]>([]);

    useEffect(() => {
        fetchMasterData().then((data) => setIndustriesList(data.industries));
    }, []);

    // Initial datetime-local string format YYYY-MM-DDTHH:mm
    const initialSchedule = opportunity.meeting_schedule
        ? new Date(opportunity.meeting_schedule).toISOString().slice(0, 16)
        : "";

    const [companyName, setCompanyName] = useState(opportunity.company_name || "");
    const [website, setWebsite] = useState(opportunity.website || "");
    const [email, setEmail] = useState(opportunity.email || "");
    const [phone, setPhone] = useState(opportunity.phone || "");
    const [industry, setIndustry] = useState(opportunity.industry || "");
    const [product, setProduct] = useState(opportunity.product || "");
    const [customerNeeds, setCustomerNeeds] = useState(opportunity.customer_needs || "");
    const [additionalNotes, setAdditionalNotes] = useState(opportunity.additional_notes || "");
    const [meetingSchedule, setMeetingSchedule] = useState(initialSchedule);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateOpportunity.mutateAsync({
                id: opportunity.id,
                input: {
                    company_name: companyName,
                    website: website || null,
                    email: email || null,
                    phone: phone || null,
                    industry: industry || null,
                    product: product || null,
                    customer_needs: customerNeeds,
                    additional_notes: additionalNotes || null,
                    meeting_schedule: meetingSchedule
                        ? new Date(meetingSchedule).toISOString()
                        : null,
                },
            });
            onClose();
        } catch (err) {
            console.error("Failed to update opportunity", err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
                    <h2 className="text-lg font-semibold text-zinc-900">
                        Edit Opportunity Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-zinc-400 hover:text-zinc-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Company Information */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            Company Information
                        </h3>
                        <Input
                            label="Company Name"
                            placeholder="e.g. Acme Corp"
                            value={companyName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setCompanyName(e.target.value)
                            }
                            required
                        />
                        <Input
                            label="Website URL"
                            placeholder="e.g. https://acme.com"
                            value={website}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setWebsite(e.target.value)
                            }
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Contact Email"
                                type="email"
                                placeholder="john@acme.com"
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEmail(e.target.value)
                                }
                            />
                            <Input
                                label="Phone"
                                placeholder="+62 812 3456 7890"
                                value={phone}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setPhone(e.target.value)
                                }
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SuggestedInput
                                label="Industry"
                                placeholder="e.g. Manufacturing, Finance"
                                value={industry}
                                onChange={setIndustry}
                                suggestions={industriesList.length > 0 ? industriesList : getMasterIndustries()}
                            />
                            <Select
                                label="Target Solution"
                                value={product}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    setProduct(e.target.value)
                                }
                            >
                                <option value="">Select solution...</option>
                                <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                                <option value="Cybersecurity Suite">Cybersecurity Suite</option>
                                <option value="Data Analytics Platform">Data Analytics Platform</option>
                                <option value="AI/ML Solutions">AI/ML Solutions</option>
                                <option value="Network Solutions">Network Solutions</option>
                            </Select>
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="space-y-4 pt-4 border-t border-zinc-100">
                        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            Meeting Schedule
                        </h3>
                        <Input
                            label="Next Meeting Date & Time"
                            type="datetime-local"
                            value={meetingSchedule}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setMeetingSchedule(e.target.value)
                            }
                        />
                    </div>

                    {/* Customer Needs & Context */}
                    <div className="space-y-4 pt-4 border-t border-zinc-100">
                        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            Needs & Additional Context
                        </h3>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-zinc-700">
                                Known Customer Needs / Pain Points
                            </label>
                            <textarea
                                rows={4}
                                required
                                value={customerNeeds}
                                onChange={(e) => setCustomerNeeds(e.target.value)}
                                className="flex w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-zinc-700">
                                Additional Notes
                            </label>
                            <textarea
                                rows={3}
                                value={additionalNotes}
                                onChange={(e) => setAdditionalNotes(e.target.value)}
                                className="flex w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={updateOpportunity.isPending}
                            className="gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {updateOpportunity.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
