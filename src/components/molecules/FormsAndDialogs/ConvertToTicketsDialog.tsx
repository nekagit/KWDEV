"use client";

/** Convert To Tickets Dialog component. */
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog as SharedDialog } from "@/components/molecules/FormsAndDialogs/Dialog";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { GenericInputWithLabel } from "@/components/molecules/Form/GenericInputWithLabel";
import { GenericTextareaWithLabel } from "@/components/molecules/Form/GenericTextareaWithLabel";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;

let _ticketRowKeySeq = 0;
const nextTicketKey = () => ++_ticketRowKeySeq;

export interface TicketRow {
  title: string;
  description: string;
  priority: string;
  /** Internal stable key for React reconciliation — not sent to the server. */
  _key: number;
}

interface ConvertToTicketsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  milestoneId: number;
  onSuccess?: () => void;
}

export function ConvertToTicketsDialog({
  isOpen,
  onClose,
  projectId,
  milestoneId,
  onSuccess,
}: ConvertToTicketsDialogProps) {
  const [rows, setRows] = useState<TicketRow[]>([
    { title: "", description: "", priority: "P1", _key: nextTicketKey() },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRows([{ title: "", description: "", priority: "P1", _key: nextTicketKey() }]);
    }
  }, [isOpen]);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { title: "", description: "", priority: "P1", _key: nextTicketKey() }]);
  }, []);

  const updateRow = useCallback(
    (index: number, field: keyof TicketRow, value: string) => {
      setRows((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    const toCreate = rows
      .map((r) => ({ ...r, title: r.title.trim() }))
      .filter((r) => r.title.length > 0);
    if (toCreate.length === 0) {
      toast.error("Add at least one ticket with a title.");
      return;
    }
    setSaving(true);
    try {
      for (const row of toCreate) {
        const res = await fetch(`/api/data/projects/${projectId}/tickets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: row.title,
            description: row.description.trim() || undefined,
            priority: PRIORITIES.includes(row.priority as (typeof PRIORITIES)[number])
              ? row.priority
              : "P1",
            milestone_id: milestoneId,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error((err as { error?: string }).error ?? "Failed to create ticket");
        }
      }
      toast.success(
        toCreate.length === 1
          ? "Ticket created."
          : `${toCreate.length} tickets created.`
      );
      onSuccess?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create tickets");
    } finally {
      setSaving(false);
    }
  }, [projectId, milestoneId, rows, onSuccess, onClose]);

  return (
    <SharedDialog
      isOpen={isOpen}
      title="Convert to tickets"
      onClose={onClose}
      actions={
        <ButtonGroup alignment="right">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Create
          </Button>
        </ButtonGroup>
      }
      panelClassName="max-w-lg"
      bodyClassName="max-h-[70vh] overflow-auto"
    >
      <p className="text-sm text-muted-foreground mb-4">
        Create one or more tickets under this milestone. Idea can be set later when editing a ticket.
      </p>
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div
            key={row._key}
            className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Ticket {index + 1}
              </span>
              {rows.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() =>
                    setRows((prev) => prev.filter((_, i) => i !== index))
                  }
                >
                  Remove
                </Button>
              )}
            </div>
            <GenericInputWithLabel
              id={`ticket-title-${index}`}
              label="Title"
              value={row.title}
              onChange={(e) => updateRow(index, "title", e.target.value)}
              placeholder="e.g. Implement login form"
            />
            <GenericTextareaWithLabel
              id={`ticket-desc-${index}`}
              label="Description (optional)"
              value={row.description}
              onChange={(e) => updateRow(index, "description", e.target.value)}
              placeholder="Details"
              rows={2}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">Priority</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={row.priority}
                onChange={(e) => updateRow(index, "priority", e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
          <Plus className="size-3.5" />
          Add another
        </Button>
      </div>
    </SharedDialog>
  );
}
