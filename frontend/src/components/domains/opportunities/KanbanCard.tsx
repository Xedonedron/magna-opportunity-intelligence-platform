"use client";

import Link from "next/link";
import { Draggable } from "@hello-pangea/dnd";
import { Calendar, User, Building2, GripVertical, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import type { Opportunity, OpportunityStatus } from "@/types/opportunity";

interface KanbanCardProps {
    opportunity: Opportunity;
    index: number;
    canEdit: boolean;
    canDelete: boolean;
    hideFinancialNumbers: boolean;
    onDelete: (id: string, name: string) => void;
}

export function KanbanCard({
    opportunity,
    index,
    canEdit,
    canDelete,
    hideFinancialNumbers,
    onDelete,
}: KanbanCardProps) {
    return (
        <Draggable
            draggableId={opportunity.id}
            index={index}
            isDragDisabled={!canEdit}
        >
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`group bg-white border rounded-xl p-3.5 shadow-sm transition-all text-xs space-y-3 relative ${
                        snapshot.isDragging
                            ? "shadow-lg border-blue-400 ring-2 ring-blue-400/20 rotate-1 z-50 bg-white"
                            : "border-zinc-200/90 hover:border-zinc-300 hover:shadow"
                    }`}
                >
                    {/* Header with Grip, Company Name & Actions */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                            {canEdit && (
                                <div
                                    {...provided.dragHandleProps}
                                    className="mt-0.5 text-zinc-300 hover:text-zinc-600 cursor-grab active:cursor-grabbing shrink-0"
                                    title="Drag to change status"
                                >
                                    <GripVertical className="w-3.5 h-3.5" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <Link
                                    href={`/opportunities/${opportunity.id}`}
                                    className="font-bold text-zinc-900 hover:text-blue-600 hover:underline text-sm leading-tight block truncate"
                                >
                                    {opportunity.company_name}
                                </Link>
                                <span className="text-[11px] text-zinc-500 font-medium flex items-center gap-1 mt-0.5">
                                    <Building2 className="w-3 h-3 text-zinc-400 shrink-0" />
                                    <span className="truncate">{opportunity.industry || "General Industry"}</span>
                                </span>
                            </div>
                        </div>

                        {canDelete && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(opportunity.id, opportunity.company_name);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-all shrink-0"
                                title="Delete opportunity"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Needs / Product Tag */}
                    {opportunity.product && (
                        <div className="flex flex-wrap gap-1">
                            {opportunity.product.split(", ").filter(Boolean).map((prod, idx) => (
                                <span
                                    key={idx}
                                    className="bg-zinc-50 border border-zinc-200/80 rounded px-1.5 py-0.5 text-[10px] text-zinc-600 font-medium truncate max-w-full"
                                >
                                    {prod}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Revenue & Date Metrics */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-100 text-[11px]">
                        <div>
                            <span className="text-zinc-400 block text-[9px] uppercase font-semibold tracking-wider">
                                Potential Value
                            </span>
                            <span className="font-bold text-zinc-900 mt-0.5 block truncate">
                                {formatCurrency(
                                    opportunity.potential_revenue,
                                    hideFinancialNumbers
                                )}
                            </span>
                        </div>
                        <div>
                            <span className="text-zinc-400 block text-[9px] uppercase font-semibold tracking-wider">
                                Est. Agenda
                            </span>
                            <span className="text-zinc-700 font-medium mt-0.5 block flex items-center gap-1 truncate">
                                <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                                {opportunity.estimated_agenda_date
                                    ? new Date(opportunity.estimated_agenda_date).toLocaleDateString("id-ID", {
                                          month: "short",
                                          day: "numeric",
                                      })
                                    : "—"}
                            </span>
                        </div>
                    </div>

                    {/* Footer: Assigned Engineer */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px] text-zinc-500">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-[10px] text-zinc-600 shrink-0">
                                {opportunity.assigned_engineer?.charAt(0) || "U"}
                            </div>
                            <span className="truncate">
                                {opportunity.assigned_engineer || "Unassigned"}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </Draggable>
    );
}
