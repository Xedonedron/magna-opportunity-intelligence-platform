"use client";

import { Droppable } from "@hello-pangea/dnd";
import { KanbanCard } from "./KanbanCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import type { Opportunity, OpportunityStatus } from "@/types/opportunity";

interface KanbanColumnProps {
    status: OpportunityStatus;
    opportunities: Opportunity[];
    canEdit: boolean;
    canDelete: boolean;
    hideFinancialNumbers: boolean;
    onDelete: (id: string, name: string) => void;
    fullWidth?: boolean;
}

export function KanbanColumn({
    status,
    opportunities,
    canEdit,
    canDelete,
    hideFinancialNumbers,
    onDelete,
    fullWidth,
}: KanbanColumnProps) {
    const totalRevenue = opportunities.reduce(
        (sum, opp) => sum + (opp.potential_revenue || 0),
        0
    );

    return (
        <div className={`${fullWidth ? "w-full" : "w-72 shrink-0"} bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-200/90 dark:border-zinc-800 rounded-2xl flex flex-col max-h-[calc(100vh-220px)] min-h-[450px]`}>
            {/* Column Header */}
            <div className="p-3.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xs">
                <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        {opportunities.length}
                    </span>
                </div>
                {totalRevenue > 0 && !hideFinancialNumbers && (
                    <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 truncate max-w-[100px]" title={formatCurrency(totalRevenue)}>
                        {formatCurrency(totalRevenue)}
                    </span>
                )}
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={status}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-2.5 flex-1 overflow-y-auto space-y-2.5 transition-colors rounded-b-2xl min-h-[150px] ${
                            snapshot.isDraggingOver
                                ? "bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-400/30 dark:ring-blue-500/30 ring-inset"
                                : ""
                        }`}
                    >
                        {opportunities.map((opp, index) => (
                            <KanbanCard
                                key={opp.id}
                                opportunity={opp}
                                index={index}
                                canEdit={canEdit}
                                canDelete={canDelete}
                                hideFinancialNumbers={hideFinancialNumbers}
                                onDelete={onDelete}
                            />
                        ))}
                        {provided.placeholder}

                        {opportunities.length === 0 && !snapshot.isDraggingOver && (
                            <div className="h-28 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 dark:text-zinc-600 text-xs font-medium bg-white/40 dark:bg-zinc-900/30">
                                No opportunities
                            </div>
                        )}
                    </div>
                )}
            </Droppable>
        </div>
    );
}
