"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select, SuggestedInput, MultiSelect } from "@/components/ui/Input";
import { useUpdateOpportunity } from "@/hooks/use-opportunities";
import type { Opportunity } from "@/types/opportunity";
import { toast } from "sonner";

import { useEffect } from "react";
import { getMasterIndustries, getMasterPresales, fetchMasterData, DEFAULT_TARGET_SOLUTIONS } from "@/lib/master-data";

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
    const [presalesList, setPresalesList] = useState<string[]>([]);

    useEffect(() => {
        fetchMasterData().then((data) => {
            setIndustriesList(data.industries);
            setPresalesList(data.presales);
        });
    }, []);

    // Initial datetime-local string format YYYY-MM-DDTHH:mm
    const initialSchedule = opportunity.meeting_schedule
        ? new Date(opportunity.meeting_schedule).toISOString().slice(0, 16)
        : "";
    const initialAgendaDate = opportunity.estimated_agenda_date
        ? new Date(opportunity.estimated_agenda_date).toISOString().slice(0, 16)
        : "";

    const [companyName, setCompanyName] = useState(opportunity.company_name || "");
    const [website, setWebsite] = useState(opportunity.website || "");
    const [email, setEmail] = useState(opportunity.email || "");
    const [phone, setPhone] = useState(opportunity.phone || "");
    const [industry, setIndustry] = useState(opportunity.industry || "");
    const [product, setProduct] = useState(opportunity.product || "");
    const [assignedEngineer, setAssignedEngineer] = useState(opportunity.assigned_engineer || "");
    const [customerNeeds, setCustomerNeeds] = useState(opportunity.customer_needs || "");
    const [additionalNotes, setAdditionalNotes] = useState(opportunity.additional_notes || "");
    const [meetingSchedule, setMeetingSchedule] = useState(initialSchedule);
    const [potentialRevenue, setPotentialRevenue] = useState<string>(
        opportunity.potential_revenue ? String(opportunity.potential_revenue) : ""
    );
    const [estimatedAgendaDate, setEstimatedAgendaDate] = useState<string>(initialAgendaDate);

    const activePresales = presalesList.length > 0 ? presalesList : getMasterPresales();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyName.trim()) {
            toast.error("Company name is required");
            return;
        }
        if (!website.trim()) {
            toast.error("Website URL is required for AI context");
            return;
        }
        if (!industry.trim()) {
            toast.error("Industry is required for AI context");
            return;
        }

        const trimmedWebsite = website.trim();
        const formattedWebsite = trimmedWebsite.startsWith("http://") || trimmedWebsite.startsWith("https://")
            ? trimmedWebsite
            : `https://${trimmedWebsite}`;

        try {
            await updateOpportunity.mutateAsync({
                id: opportunity.id,
                input: {
                    company_name: companyName.trim(),
                    website: formattedWebsite,
                    email: email || null,
                    phone: phone || null,
                    industry: industry.trim(),
                    product: product || null,
                    assigned_engineer: assignedEngineer || null,
                    customer_needs: customerNeeds,
                    additional_notes: additionalNotes || null,
                    potential_revenue: potentialRevenue ? parseFloat(potentialRevenue) : null,
                    estimated_agenda_date: estimatedAgendaDate
                        ? new Date(estimatedAgendaDate).toISOString()
                        : null,
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-zinc-900 rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-2xl sm:mx-4 max-h-[90vh] overflow-y-auto">
                {/* Mobile drag pill */}
                <div className="sm:hidden flex justify-center pt-2 pb-1">
                    <div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                </div>
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Edit Opportunity Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
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
                            required
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                required
                            />
                            <MultiSelect
                                label="Target Solution"
                                options={DEFAULT_TARGET_SOLUTIONS}
                                value={product ? product.split(", ").filter(Boolean) : []}
                                onChange={(selected) => setProduct(selected.join(", "))}
                                placeholder="Select one or more solutions..."
                            />
                        </div>
                        <div className="space-y-1">
                            <Select
                                label="Assigned Pre-Sales / Engineer"
                                value={assignedEngineer}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    setAssignedEngineer(e.target.value)
                                }
                            >
                                <option value="">Unassigned (Belum ditugaskan)</option>
                                {activePresales.map((name) => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    {/* Potential Revenue & Agenda Schedule */}
                    <div className="space-y-4 pt-4 border-t border-zinc-100">
                        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            Financial Potential & Agenda Schedule
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Potential Revenue / Deal Value (IDR)"
                                type="number"
                                placeholder="e.g. 250000000"
                                value={potentialRevenue}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setPotentialRevenue(e.target.value)
                                }
                            />
                            <Input
                                label="Estimasi Tanggal Agenda"
                                type="datetime-local"
                                value={estimatedAgendaDate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setEstimatedAgendaDate(e.target.value)
                                }
                            />
                        </div>
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
                                className="flex w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-base sm:text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900"
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
                                className="flex w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-base sm:text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-900"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t border-zinc-100">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="min-h-[44px] sm:min-h-0"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={updateOpportunity.isPending}
                            className="gap-2 min-h-[44px] sm:min-h-0"
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
