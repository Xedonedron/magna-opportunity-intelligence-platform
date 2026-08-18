"use client";

import { Plus, X, GripVertical } from "lucide-react";
import { useState } from "react";
import type {
    KYCReport,
    KYCUseCase,
    KYCReference,
    KYCCompanyOverview,
    KYCCompetitor,
} from "@/types/kyc";

interface KYCEditFormProps {
    report: KYCReport;
    onChange: (field: keyof KYCReport, value: unknown) => void;
}

export function KYCEditForm({ report, onChange }: KYCEditFormProps) {
    return (
        <div className="space-y-8">
            {/* Executive Summary */}
            <section>
                <SectionLabel>Executive Summary</SectionLabel>
                <textarea
                    value={report.executive_summary || ""}
                    onChange={(e) => onChange("executive_summary", e.target.value)}
                    className="w-full min-h-[150px] px-4 py-3 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
                    placeholder="Enter executive summary..."
                />
            </section>

            {/* Company Overview */}
            <section>
                <SectionLabel>Company Overview</SectionLabel>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-zinc-200 rounded-lg">
                    <TextInput
                        label="Name"
                        value={report.company_overview?.name || ""}
                        onChange={(v) =>
                            onChange("company_overview", {
                                ...report.company_overview,
                                name: v,
                            })
                        }
                    />
                    <TextInput
                        label="Founded"
                        value={report.company_overview?.founded || ""}
                        onChange={(v) =>
                            onChange("company_overview", {
                                ...report.company_overview,
                                founded: v,
                            })
                        }
                    />
                    <TextInput
                        label="Size"
                        value={report.company_overview?.size || ""}
                        onChange={(v) =>
                            onChange("company_overview", {
                                ...report.company_overview,
                                size: v,
                            })
                        }
                    />
                    <TextInput
                        label="Headquarters"
                        value={report.company_overview?.headquarters || ""}
                        onChange={(v) =>
                            onChange("company_overview", {
                                ...report.company_overview,
                                headquarters: v,
                            })
                        }
                    />
                    <div className="md:col-span-2">
                        <TextInput
                            label="Description"
                            value={report.company_overview?.description || ""}
                            onChange={(v) =>
                                onChange("company_overview", {
                                    ...report.company_overview,
                                    description: v,
                                })
                            }
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                            Key Products
                        </label>
                        <TagInput
                            values={report.company_overview?.key_products || []}
                            onChange={(v) =>
                                onChange("company_overview", {
                                    ...report.company_overview,
                                    key_products: v,
                                })
                            }
                            placeholder="Add product..."
                        />
                    </div>
                </div>
            </section>

            {/* Industry Analysis & Business Model */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <SectionLabel>Industry Analysis</SectionLabel>
                    <textarea
                        value={report.industry_analysis || ""}
                        onChange={(e) => onChange("industry_analysis", e.target.value)}
                        className="w-full min-h-[120px] px-4 py-3 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
                        placeholder="Enter industry analysis..."
                    />
                </div>
                <div>
                    <SectionLabel>Business Model</SectionLabel>
                    <textarea
                        value={report.business_model || ""}
                        onChange={(e) => onChange("business_model", e.target.value)}
                        className="w-full min-h-[120px] px-4 py-3 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
                        placeholder="Enter business model..."
                    />
                </div>
            </section>

            {/* Competitor Analysis */}
            <section>
                <SectionLabel>Competitor Analysis</SectionLabel>
                <CompetitorInput
                    competitors={report.competitor_analysis || []}
                    onChange={(competitors) => onChange("competitor_analysis", competitors)}
                />
            </section>

            {/* Customer Need Summary & Pain Points */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <SectionLabel>Customer Need Summary</SectionLabel>
                    <textarea
                        value={report.customer_need_summary || ""}
                        onChange={(e) => onChange("customer_need_summary", e.target.value)}
                        className="w-full min-h-[120px] px-4 py-3 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
                        placeholder="Enter customer need summary..."
                    />
                </div>
                <div>
                    <SectionLabel>Potential Pain Points</SectionLabel>
                    <ListInput
                        values={report.potential_pain_points || []}
                        onChange={(v) => onChange("potential_pain_points", v)}
                        placeholder="Add pain point..."
                    />
                </div>
            </section>

            {/* Use Cases */}
            <section>
                <SectionLabel>Use Cases</SectionLabel>
                <UseCasesInput
                    useCases={report.use_cases || []}
                    onChange={(v) => onChange("use_cases", v)}
                />
            </section>

            {/* Meeting Objectives & Questions */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <SectionLabel>Meeting Objectives</SectionLabel>
                    <ListInput
                        values={report.meeting_objectives || []}
                        onChange={(v) => onChange("meeting_objectives", v)}
                        placeholder="Add objective..."
                    />
                </div>
                <div>
                    <SectionLabel>Recommended Questions</SectionLabel>
                    <ListInput
                        values={report.recommended_questions || []}
                        onChange={(v) => onChange("recommended_questions", v)}
                        placeholder="Add question..."
                    />
                </div>
            </section>

            {/* Preparation Checklist */}
            <section>
                <SectionLabel>Preparation Checklist</SectionLabel>
                <ListInput
                    values={report.preparation_checklist || []}
                    onChange={(v) => onChange("preparation_checklist", v)}
                    placeholder="Add checklist item..."
                />
            </section>

            {/* References */}
            <section>
                <SectionLabel>References</SectionLabel>
                <ReferencesInput
                    references={report.references || []}
                    onChange={(v) => onChange("references", v)}
                />
            </section>
        </div>
    );
}

// Helper Components
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">
            {children}
        </h3>
    );
}

function TextInput({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                {label}
            </label>
            <input
                type="text"
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
        </div>
    );
}

function ListInput({
    values,
    onChange,
    placeholder,
}: {
    values: string[];
    onChange: (values: string[]) => void;
    placeholder: string;
}) {
    const [newItem, setNewItem] = useState("");

    const addItem = () => {
        if (newItem.trim()) {
            onChange([...values, newItem.trim()]);
            setNewItem("");
        }
    };

    const removeItem = (index: number) => {
        onChange(values.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, value: string) => {
        const updated = [...values];
        updated[index] = value;
        onChange(updated);
    };

    return (
        <div className="space-y-2">
            {values.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={item}
                        onChange={(e) => updateItem(index, e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                    />
                    <button
                        onClick={() => removeItem(index)}
                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
                <button
                    onClick={addItem}
                    className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function TagInput({
    values,
    onChange,
    placeholder,
}: {
    values: string[];
    onChange: (values: string[]) => void;
    placeholder: string;
}) {
    const [newItem, setNewItem] = useState("");

    const addItem = () => {
        if (newItem.trim()) {
            onChange([...values, newItem.trim()]);
            setNewItem("");
        }
    };

    const removeItem = (index: number) => {
        onChange(values.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {values.map((item, index) => (
                    <span
                        key={index}
                        className="inline-flex items-center gap-1 text-xs bg-zinc-100 text-zinc-700 px-2 py-1 rounded"
                    >
                        {item}
                        <button
                            onClick={() => removeItem(index)}
                            className="text-zinc-400 hover:text-red-500"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                />
                <button
                    onClick={addItem}
                    className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

function UseCasesInput({
    useCases,
    onChange,
}: {
    useCases: KYCUseCase[];
    onChange: (useCases: KYCUseCase[]) => void;
}) {
    const addUseCase = () => {
        onChange([
            ...useCases,
            {
                title: "",
                description: "",
                problem_solved: "",
                how_it_works: "",
                business_impact: "",
                google_products: [],
                smartnet_solutions: [],
                impact_level: "Medium",
            },
        ]);
    };

    const updateUseCase = (index: number, field: keyof KYCUseCase, value: string | string[]) => {
        const updated = [...useCases];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    const removeUseCase = (index: number) => {
        onChange(useCases.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            {useCases.map((uc, index) => (
                <div
                    key={index}
                    className="border border-zinc-200 rounded-lg p-4 space-y-3"
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500">
                            Use Case #{index + 1}
                        </span>
                        <button
                            onClick={() => removeUseCase(index)}
                            className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <TextInput
                            label="Title"
                            value={uc.title}
                            onChange={(v) => updateUseCase(index, "title", v)}
                        />
                        <div>
                            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                                Impact Level
                            </label>
                            <select
                                value={uc.impact_level}
                                onChange={(e) =>
                                    updateUseCase(index, "impact_level", e.target.value)
                                }
                                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                            >
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                            Description
                        </label>
                        <textarea
                            value={uc.description}
                            onChange={(e) => updateUseCase(index, "description", e.target.value)}
                            className="w-full min-h-[80px] px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <TextInput
                            label="Problem Solved"
                            value={uc.problem_solved}
                            onChange={(v) => updateUseCase(index, "problem_solved", v)}
                        />
                        <TextInput
                            label="How It Works"
                            value={uc.how_it_works}
                            onChange={(v) => updateUseCase(index, "how_it_works", v)}
                        />
                    </div>
                    <TextInput
                        label="Business Impact"
                        value={uc.business_impact}
                        onChange={(v) => updateUseCase(index, "business_impact", v)}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                                Google Products
                            </label>
                            <TagInput
                                values={uc.google_products}
                                onChange={(v) => updateUseCase(index, "google_products", v)}
                                placeholder="Add product..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                                Smartnet Solutions
                            </label>
                            <TagInput
                                values={uc.smartnet_solutions}
                                onChange={(v) => updateUseCase(index, "smartnet_solutions", v)}
                                placeholder="Add solution..."
                            />
                        </div>
                    </div>
                </div>
            ))}
            <button
                onClick={addUseCase}
                className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-lg text-sm text-zinc-500 hover:border-zinc-300 hover:text-zinc-600 transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Add Use Case
            </button>
        </div>
    );
}

function CompetitorInput({
    competitors,
    onChange,
}: {
    competitors: KYCCompetitor[];
    onChange: (competitors: KYCCompetitor[]) => void;
}) {
    const addCompetitor = () => {
        onChange([
            ...competitors,
            {
                name: "",
                market_position: "",
                strengths: [],
                weaknesses: [],
                differentiators: "",
            },
        ]);
    };

    const updateCompetitor = (index: number, field: keyof KYCCompetitor, value: unknown) => {
        const updated = [...competitors];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    const removeCompetitor = (index: number) => {
        onChange(competitors.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            {competitors.map((comp, index) => (
                <div
                    key={index}
                    className="p-4 border border-zinc-200 rounded-lg space-y-3 bg-zinc-50/50"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            Competitor #{index + 1}
                        </span>
                        <button
                            type="button"
                            onClick={() => removeCompetitor(index)}
                            className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <TextInput
                            label="Competitor Name"
                            value={comp.name || ""}
                            onChange={(v) => updateCompetitor(index, "name", v)}
                            placeholder="e.g. Acme Corp"
                        />
                        <TextInput
                            label="Market Position"
                            value={comp.market_position || ""}
                            onChange={(v) => updateCompetitor(index, "market_position", v)}
                            placeholder="e.g. Market Leader / Regional Challenger"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                                Strengths
                            </label>
                            <TagInput
                                values={comp.strengths || []}
                                onChange={(v) => updateCompetitor(index, "strengths", v)}
                                placeholder="Add strength..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                                Weaknesses / Gaps
                            </label>
                            <TagInput
                                values={comp.weaknesses || []}
                                onChange={(v) => updateCompetitor(index, "weaknesses", v)}
                                placeholder="Add weakness..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
                            Differentiator
                        </label>
                        <input
                            type="text"
                            value={comp.differentiators || ""}
                            onChange={(e) => updateCompetitor(index, "differentiators", e.target.value)}
                            placeholder="Key differences compared to target company..."
                            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        />
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={addCompetitor}
                className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-lg text-sm text-zinc-500 hover:border-zinc-300 hover:text-zinc-600 transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Add Competitor
            </button>
        </div>
    );
}

function ReferencesInput({
    references,
    onChange,
}: {
    references: KYCReference[];
    onChange: (references: KYCReference[]) => void;
}) {
    const addReference = () => {
        onChange([
            ...references,
            {
                title: "",
                url: "",
                type: "website",
            },
        ]);
    };

    const updateReference = (index: number, field: keyof KYCReference, value: string) => {
        const updated = [...references];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    const removeReference = (index: number) => {
        onChange(references.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            {references.map((ref, index) => (
                <div
                    key={index}
                    className="flex items-start gap-2 p-3 border border-zinc-200 rounded-lg"
                >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                            type="text"
                            value={ref.title}
                            onChange={(e) => updateReference(index, "title", e.target.value)}
                            placeholder="Title"
                            className="px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        />
                        <input
                            type="url"
                            value={ref.url}
                            onChange={(e) => updateReference(index, "url", e.target.value)}
                            placeholder="URL"
                            className="px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        />
                        <select
                            value={ref.type}
                            onChange={(e) => updateReference(index, "type", e.target.value)}
                            className="px-3 py-2 text-sm border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                        >
                            <option value="website">Website</option>
                            <option value="news">News</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <button
                        onClick={() => removeReference(index)}
                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ))}
            <button
                onClick={addReference}
                className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-lg text-sm text-zinc-500 hover:border-zinc-300 hover:text-zinc-600 transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Add Reference
            </button>
        </div>
    );
}