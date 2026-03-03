/** Kanban Column Header component. */
import React from "react";
import {
  ListTodo,
  Play,
  CheckCircle2,
  TestTube2,
} from "lucide-react";
import type { KanbanColumn } from "@/lib/todos-kanban";
import { cn } from "@/lib/utils";

const COLUMN_STYLES: Record<string, { dotColor: string; textColor: string }> = {
  backlog: { dotColor: "bg-amber-400", textColor: "text-amber-400" },
  in_progress: { dotColor: "bg-blue-400", textColor: "text-blue-400" },
  done: { dotColor: "bg-sky-400", textColor: "text-sky-400" },
  testing: { dotColor: "bg-violet-400", textColor: "text-violet-400" },
};

const COLUMN_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  backlog: ListTodo,
  in_progress: Play,
  done: CheckCircle2,
  testing: TestTube2,
};

interface KanbanColumnHeaderProps {
  columnId: string;
  column: KanbanColumn;
}

export const KanbanColumnHeader: React.FC<KanbanColumnHeaderProps> = ({
  columnId,
  column,
}) => {
  const style = COLUMN_STYLES[columnId] ?? COLUMN_STYLES.backlog;
  const Icon = COLUMN_ICONS[columnId];

  return (
    <div className="flex items-center justify-between pb-3 border-b border-border/30">
      <div className="flex items-center gap-2.5">
        <div className={cn("size-2 rounded-full shrink-0", style.dotColor)} />
        {Icon && <Icon className={cn("size-4 shrink-0", style.textColor)} />}
        <h3 className="text-sm font-semibold tracking-tight">
          {column.name}
        </h3>
      </div>
      <span className="text-xs font-medium text-muted-foreground tabular-nums bg-muted/40 rounded-full px-2 py-0.5">
        {column.items.length}
      </span>
    </div>
  );
};
