"use client";

/** Convert To Milestones Dialog component. */
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog as SharedDialog } from "@/components/molecules/FormsAndDialogs/Dialog";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { GenericInputWithLabel } from "@/components/molecules/Form/GenericInputWithLabel";
import { GenericTextareaWithLabel } from "@/components/molecules/Form/GenericTextareaWithLabel";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

let _milestoneRowKeySeq = 0;
const nextMilestoneKey = () => ++_milestoneRowKeySeq;

export interface MilestoneRow {
  name: string;
  slug: string;
  content: string;
  /** Internal stable key for React reconciliation — not sent to the server. */
  _key: number;
}

interface ConvertToMilestonesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  defaultName: string;
  onSuccess?: () => void;
}

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function ConvertToMilestonesDialog({
  isOpen,
  onClose,
  projectId,
  defaultName,
  onSuccess,
}: ConvertToMilestonesDialogProps) {
  const [rows, setRows] = useState<MilestoneRow[]>([
    { name: defaultName, slug: slugFromName(defaultName), content: "", _key: nextMilestoneKey() },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRows([
        { name: defaultName, slug: slugFromName(defaultName), content: "", _key: nextMilestoneKey() },
      ]);
    }
  }, [isOpen, defaultName]);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, { name: "", slug: "", content: "", _key: nextMilestoneKey() }]);
  }, []);

  const updateRow = useCallback((index: number, field: keyof MilestoneRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "name" && !next[index].slug) {
        next[index].slug = slugFromName(value);
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const toCreate = rows
      .map((r) => ({ ...r, name: r.name.trim() }))
      .filter((r) => r.name.length > 0);
    if (toCreate.length === 0) {
      toast.error("Add at least one milestone with a name.");
      return;
    }
    setSaving(true);
    try {
      for (const row of toCreate) {
        const res = await fetch(`/api/data/projects/${projectId}/milestones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: row.name,
            slug: row.slug.trim() || slugFromName(row.name),
            content: row.content.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error((err as { error?: string }).error ?? "Failed to create milestone");
        }
      }
      toast.success(
        toCreate.length === 1
          ? "Milestone created."
          : `${toCreate.length} milestones created.`
      );
      onSuccess?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create milestones");
    } finally {
      setSaving(false);
    }
  }, [projectId, rows, onSuccess, onClose]);

  return (
    <SharedDialog
      isOpen={isOpen}
      title="Convert to milestones"
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
        Create one or more milestones from this idea. Edit names and add rows as needed.
      </p>
      <div className="space-y-4">
        {rows.map((row, index) => (
          <div
            key={row._key}
            className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Milestone {index + 1}
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
              id={`milestone-name-${index}`}
              label="Name"
              value={row.name}
              onChange={(e) => updateRow(index, "name", e.target.value)}
              placeholder="e.g. v1.0"
            />
            <GenericInputWithLabel
              id={`milestone-slug-${index}`}
              label="Slug (optional)"
              value={row.slug}
              onChange={(e) => updateRow(index, "slug", e.target.value)}
              placeholder="e.g. v1-0"
            />
            <GenericTextareaWithLabel
              id={`milestone-content-${index}`}
              label="Content (optional)"
              value={row.content}
              onChange={(e) => updateRow(index, "content", e.target.value)}
              placeholder="Markdown content"
              rows={2}
            />
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
