/** Kanban Column Card component. */
import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KanbanColumnHeader } from "./KanbanColumnHeader";
import { KanbanTicketCard } from "./KanbanTicketCard";
import type { KanbanColumn, ParsedTicket } from "@/lib/todos-kanban";
import { cn } from "@/lib/utils";

const COLUMN_BG: Record<string, string> = {
  backlog: "bg-amber-500/[0.08] border-amber-500/20",
  in_progress: "bg-blue-500/[0.08] border-blue-500/20",
  done: "bg-sky-500/[0.08] border-sky-500/20",
  testing: "bg-violet-500/[0.08] border-violet-500/20",
};

interface KanbanColumnCardProps {
  columnId: string;
  column: KanbanColumn;
  projectId: string;
  handleMarkDone: (ticketId: string) => Promise<void>;
  handleRedo: (ticketId: string) => Promise<void>;
  handleArchive: (ticketId: string) => Promise<void>;
  handleMoveToInProgress: (ticketId: string) => Promise<void>;
}

export const KanbanColumnCard: React.FC<KanbanColumnCardProps> = ({
  columnId,
  column,
  projectId,
  handleMarkDone,
  handleRedo,
  handleArchive,
  handleMoveToInProgress,
}) => (
  <div
    className={cn(
      "flex min-h-[280px] max-h-[70vh] min-w-0 w-full flex-col rounded-xl border p-4 transition-all duration-300 overflow-hidden",
      COLUMN_BG[columnId] ?? "bg-muted/30 border-border/40"
    )}
    data-testid={`kanban-column-${columnId}`}
  >
    <KanbanColumnHeader columnId={columnId} column={column} />
    <ScrollArea className="flex-1 min-h-0 pt-4 -mx-1 px-1">
      <div className="flex flex-col gap-3 min-w-0 w-full pb-2">
        {column.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-xs text-muted-foreground/40 border-2 border-dashed border-border/30 rounded-lg">
            <span className="opacity-50">No tickets</span>
          </div>
        )}
        {column.items.map((ticket: ParsedTicket) => (
          <KanbanTicketCard
            key={ticket.id}
            ticket={ticket}
            columnId={columnId}
            projectId={projectId}
            onMarkDone={handleMarkDone}
            onRedo={handleRedo}
            onArchive={handleArchive}
            onMoveToInProgress={handleMoveToInProgress}
          />
        ))}
      </div>
    </ScrollArea>
  </div>
);
