"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
    ChevronRight,
    Zap,
    CheckCircle2,
    CircleDashed,
    Activity,
} from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, SuggestedInput } from "@/components/ui/Input";
import { useCreateOpportunity } from "@/hooks/use-opportunities";

import { getMasterIndustries, getMasterPresales, fetchMasterData } from "@/lib/master-data";

import { useEffect } from "react";

const formSchema = z.object({
    company_name: z.string().min(1, "Company name is required"),
    website: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().optional(),
    industry: z.string().optional(),
    product: z.string().min(1, "Target Solution is required"),
    customer_needs: z.string().min(1, "Customer needs is required"),
    additional_notes: z.string().optional(),
    potential_revenue: z.string().optional(),
    estimated_agenda_date: z.string().optional(),
    meeting_schedule: z.string().min(1, "Initial Meeting Date is required"),
});

type FormData = z.infer<typeof formSchema>;

const pipelineSteps = [
    {
        id: 1,
        title: "Creating Opportunity Workspace",
        desc: "Setting up database records and folders.",
    },
    {
        id: 2,
        title: "Running AI KYC Analysis",
        desc: "Scanning web sources and company history.",
    },
    {
        id: 3,
        title: "Finalizing Preparation Checklist",
        desc: "Generating recommended questions and use cases.",
    },
];

export default function CreateOpportunityPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pipelineState, setPipelineState] = useState(0);
    const [createdId, setCreatedId] = useState<string | null>(null);

    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 1, 0, 0, 0);
    const defaultDateStr = new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const createOpportunity = useCreateOpportunity();

    const [industriesList, setIndustriesList] = useState<string[]>([]);
    const [presalesList, setPresalesList] = useState<string[]>([]);

    useEffect(() => {
        fetchMasterData().then((data) => {
            setIndustriesList(data.industries);
            setPresalesList(data.presales);
        });
    }, []);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            company_name: "",
            website: "",
            email: "",
            phone: "",
            industry: "",
            product: "",
            customer_needs: "",
            additional_notes: "",
            potential_revenue: "",
            estimated_agenda_date: "",
        },
    });

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setPipelineState(1);

        try {
            const agendaDateIso = data.estimated_agenda_date
                ? new Date(data.estimated_agenda_date).toISOString()
                : null;

            const payload = {
                company_name: data.company_name,
                website: data.website || null,
                email: data.email || null,
                phone: data.phone || null,
                industry: data.industry || null,
                product: data.product || null,
                customer_needs: data.customer_needs,
                additional_notes: data.additional_notes || null,
                potential_revenue: data.potential_revenue ? parseFloat(data.potential_revenue) : null,
                estimated_agenda_date: agendaDateIso,
                meeting_schedule: agendaDateIso,
            };

            const result = await createOpportunity.mutateAsync(payload);
            setCreatedId(result.id);

            // Simulate pipeline progression
            setTimeout(() => setPipelineState(2), 1500);
            setTimeout(() => setPipelineState(3), 3500);
            setTimeout(() => {
                setPipelineState(4);
                toast.success("Opportunity created successfully!");
            }, 5000);
        } catch {
            toast.error("Failed to create opportunity. Please try again.");
            setIsSubmitting(false);
            setPipelineState(0);
        }
    };

    // AI Pipeline View
    if (isSubmitting) {
        return (
            <div className="p-8 max-w-3xl mx-auto mt-12">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-900 text-white shadow-xl mb-6">
                        <Zap className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
                        Processing Opportunity
                    </h1>
                    <p className="text-zinc-500">
                        Magna AI is generating intelligence reports and setting up your workspace.
                    </p>
                </div>

                <div className="space-y-6">
                    {pipelineSteps.map((item) => {
                        const isActive = pipelineState === item.id;
                        const isDone = pipelineState > item.id;

                        return (
                            <Card
                                key={item.id}
                                className={`p-5 transition-all duration-500 ${isActive
                                    ? "ring-2 ring-zinc-900 shadow-md"
                                    : "border-zinc-200"
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                        {isDone ? (
                                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                                        ) : isActive ? (
                                            <CircleDashed className="w-6 h-6 text-zinc-900 animate-spin" />
                                        ) : (
                                            <CircleDashed className="w-6 h-6 text-zinc-300" />
                                        )}
                                    </div>
                                    <div
                                        className={
                                            isDone
                                                ? "opacity-70"
                                                : isActive
                                                    ? "opacity-100"
                                                    : "opacity-40"
                                        }
                                    >
                                        <h3 className="font-medium text-zinc-900">{item.title}</h3>
                                        <p className="text-sm text-zinc-500 mt-1">{item.desc}</p>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {pipelineState === 4 && (
                    <div className="mt-10 flex justify-center">
                        <Button
                            size="lg"
                            onClick={() => router.push(`/opportunities/${createdId}`)}
                        >
                            View Opportunity
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6 sm:space-y-8">
            <div>
                <Link
                    href="/opportunities"
                    className="text-sm text-zinc-500 hover:text-zinc-900 flex items-center gap-1 mb-4"
                >
                    <ChevronRight className="w-4 h-4 rotate-180" /> Back to List
                </Link>
                <h1 className="text-2xl font-semibold text-zinc-900">New Opportunity</h1>
                <p className="text-zinc-500 text-sm mt-1">
                    Enter details to initiate the AI intelligence process.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Card className="p-4 sm:p-6">
                    {/* Company Information Section */}
                    <div className="space-y-6">
                        <h2 className="text-lg font-medium text-zinc-900 border-b border-zinc-100 pb-4">
                            Company Information
                        </h2>
                        <div className="space-y-4">
                            <Input
                                label="Company Name"
                                placeholder="e.g. Acme Corp"
                                required
                                {...register("company_name")}
                            />
                            {errors.company_name && (
                                <p className="text-xs text-red-500">
                                    {errors.company_name.message}
                                </p>
                            )}
                            <Input
                                label="Website URL"
                                placeholder="e.g. https://acme.com"
                                {...register("website")}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Contact Email"
                                    placeholder="john@acme.com"
                                    type="email"
                                    {...register("email")}
                                />
                                <Input
                                    label="Phone"
                                    placeholder="+62 812 3456 7890"
                                    {...register("phone")}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-xs text-red-500">{errors.email.message}</p>
                            )}
                            <SuggestedInput
                                label="Industry"
                                placeholder="e.g. Manufacturing, Finance, Healthcare"
                                value={watch("industry") || ""}
                                onChange={(val) => setValue("industry", val)}
                                suggestions={industriesList.length > 0 ? industriesList : getMasterIndustries()}
                            />
                        </div>
                    </div>

                    {/* Financial Potential & Schedule Section */}
                    <div className="space-y-6 mt-8 pt-6 border-t border-zinc-100">
                        <h2 className="text-lg font-medium text-zinc-900 border-b border-zinc-100 pb-4">
                            Financial Potential & Meeting Schedule
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Potential Revenue / Deal Value (IDR)"
                                type="number"
                                placeholder="e.g. 250000000"
                                {...register("potential_revenue")}
                            />
                            <div className="space-y-1">
                                <Input
                                    label="Estimasi Tanggal Agenda / Initial Meeting"
                                    type="datetime-local"
                                    {...register("estimated_agenda_date")}
                                />
                                <p className="text-xs text-zinc-500">
                                    Pilih tanggal rapat perdana / agenda go-live (opsional jika belum pasti).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Target Solution Section */}
                    <div className="space-y-6 mt-8 pt-6 border-t border-zinc-100">
                        <h2 className="text-lg font-medium text-zinc-900 border-b border-zinc-100 pb-4">
                            Target Solution
                        </h2>
                        <Select label="Target Solution" required {...register("product")}>
                            <option value="">Select solution...</option>
                            <option value="Data Analytics Platform">Data Analytics Platform</option>
                            <option value="AI/ML Solutions">AI/ML Solutions</option>
                            <option value="Google Workspace (GWS)">Google Workspace (GWS)</option>
                            <option value="Google Maps Platform (GMaps)">Google Maps Platform (GMaps)</option>
                            <option value="Cloud Infrastructure (GCP)">Cloud Infrastructure (GCP)</option>
                            <option value="Cybersecurity Suite">Cybersecurity Suite</option>
                            <option value="Network Solutions">Network Solutions</option>
                        </Select>
                    </div>

                    {/* Context & Needs Section */}
                    <div className="space-y-6 mt-8 pt-6 border-t border-zinc-100">
                        <h2 className="text-lg font-medium text-zinc-900 border-b border-zinc-100 pb-4">
                            Context & Needs
                        </h2>
                        <div className="space-y-4">
                            <Textarea
                                label="Known Customer Needs / Pain Points"
                                required
                                placeholder="Describe what the customer is trying to solve..."
                                rows={5}
                                {...register("customer_needs")}
                            />
                            {errors.customer_needs && (
                                <p className="text-xs text-red-500">
                                    {errors.customer_needs.message}
                                </p>
                            )}
                            <Textarea
                                label="Additional Context for AI"
                                placeholder="Any specific areas the KYC report should focus on?"
                                rows={3}
                                {...register("additional_notes")}
                            />
                        </div>
                        <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-md flex gap-3">
                            <Activity className="w-5 h-5 shrink-0" />
                            <p>
                                Upon submission, Magna AI will automatically scan public records
                                and generate a comprehensive KYC report based on these needs.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-zinc-100 flex justify-end">
                        <Button type="submit" className="gap-2">
                            Create Opportunity
                        </Button>
                    </div>
                </Card>
            </form>
        </div>
    );
}