"use client";

import { useState, useEffect } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { KanbanColumn } from "./KanbanColumn";
import { useUpdateOpportunity } from "@/hooks/use-opportunities";
import { ALL_STATUSES } from "@/types/opportunity";
import type { Opportunity, OpportunityStatus } from "@/types/opportunity";

interface KanbanBoardProps {
    opportunities: Opportunity[];
    canEdit: boolean;
    canDelete: boolean;
    hideFinancialNumbers: boolean;
    onDelete: (id: string, name: string) => void;
    statusFilter?: string;
}

export function KanbanBoard({
    opportunities,
    canEdit,
    canDelete,
    hideFinancialNumbers,
    onDelete,
    statusFilter,
}: KanbanBoardProps) {
    const [items, setItems] = useState<Opportunity[]>(opportunities);
    const [mobileStatus, setMobileStatus] = useState<OpportunityStatus>(ALL_STATUSES[0]);
    const updateMutation = useUpdateOpportunity();

    // Synchronize local items when opportunities prop changes (e.g. from search/filter)
    useEffect(() => {
        setItems(opportunities);
    }, [opportunities]);

    // Active status columns to display (either filtered or all 12 statuses)
    const columnsToDisplay = statusFilter
        ? ALL_STATUSES.filter((s) => s === statusFilter)
        : ALL_STATUSES;

    // On mobile, if statusFilter is set use that; otherwise use pill selector
    const mobileColumn = statusFilter ? (statusFilter as OpportunityStatus) : mobileStatus;

    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        // Dropped outside a droppable column or dropped in original spot
        if (
            !destination ||
            (destination.droppableId === source.droppableId &&
                destination.index === source.index)
        ) {
            return;
        }

        const sourceStatus = source.droppableId as OpportunityStatus;
        const targetStatus = destination.droppableId as OpportunityStatus;

        // Find dragged opportunity
        const movedOpportunity = items.find((item) => item.id === draggableId);
        if (!movedOpportunity) return;

        // Save original items for rollback on error
        const previousItems = [...items];

        // Optimistically update local state
        const updatedItems = items.map((item) =>
            item.id === draggableId
                ? { ...item, status: targetStatus, updated_at: new Date().toISOString() }
                : item
        );
        setItems(updatedItems);

        try {
            await updateMutation.mutateAsync({
                id: draggableId,
                input: { status: targetStatus },
            });
            toast.success(
                `Status ${movedOpportunity.company_name} updated to ${targetStatus}`
            );
        } catch (error) {
            console.error("Failed to update status via drag and drop", error);
            // Rollback on failure
            setItems(previousItems);
            toast.error("Failed to update opportunity status. Restoring position.");
        }
    };

    const mobileColumnItems = items.filter((item) => item.status === mobileColumn);

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            {/* Mobile: pill tab selector + single column */}
            <div className="md:hidden flex flex-col gap-3">
                <div className="flex overflow-x-auto gap-1.5 pb-2 scrollbar-thin scrollbar-thumb-zinc-300 -mx-1 px-1">
                    {columnsToDisplay.map((status) => {
                        const count = items.filter((i) => i.status === status).length;
                        return (
                            <button
                                key={status}
                                type="button"
                                onClick={() => setMobileStatus(status as OpportunityStatus)}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                    mobileColumn === status
                                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                }`}
                            >
                                {status} {count > 0 && <span className="ml-0.5 opacity-70">({count})</span>}
                            </button>
                        );
                    })}
                </div>
                <KanbanColumn
                    key={mobileColumn}
                    status={mobileColumn}
                    opportunities={mobileColumnItems}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    hideFinancialNumbers={hideFinancialNumbers}
                    onDelete={onDelete}
                    fullWidth
                />
            </div>

            {/* Desktop: full multi-column horizontal scroll */}
            <div className="hidden md:flex gap-4 overflow-x-auto pb-6 pt-1 px-1 scrollbar-thin scrollbar-thumb-zinc-300">
                {columnsToDisplay.map((status) => {
                    const columnItems = items.filter(
                        (item) => item.status === status
                    );
                    return (
                        <KanbanColumn
                            key={status}
                            status={status}
                            opportunities={columnItems}
                            canEdit={canEdit}
                            canDelete={canDelete}
                            hideFinancialNumbers={hideFinancialNumbers}
                            onDelete={onDelete}
                        />
                    );
                })}
            </div>
        </DragDropContext>
    );
}
