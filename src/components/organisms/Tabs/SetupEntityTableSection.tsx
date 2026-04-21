"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createSetupEntity,
  deleteSetupEntity,
  ensureSetupEntityMigrated,
  listSetupEntities,
  updateSetupEntity,
  type SetupEntityRecord,
  type SetupEntityType,
} from "@/lib/setup-entities";

const ENTITY_LABELS: Record<SetupEntityType, { singular: string; addButton: string; empty: string }> = {
  prompts: { singular: "Prompt", addButton: "Add Prompt", empty: "No prompts yet." },
  skills: { singular: "Skill", addButton: "Add Skill", empty: "No skills yet." },
  rules: { singular: "Rule", addButton: "Add Rule", empty: "No rules yet." },
  mcp: { singular: "MCP Server", addButton: "Add MCP Server", empty: "No MCP servers yet." },
  agents: { singular: "Agent", addButton: "Add Agent", empty: "No agents yet." },
};

type FormState = {
  name: string;
  description: string;
  content: string;
  category: string;
};

const EMPTY_FORM: FormState = { name: "", description: "", content: "", category: "" };

export function SetupEntityTableSection({
  projectId,
  projectPath,
  entityType,
  categoryFilter,
}: {
  projectId: string;
  projectPath: string;
  entityType: SetupEntityType;
  categoryFilter?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<SetupEntityRecord[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const labels = useMemo(() => {
    const base = ENTITY_LABELS[entityType];
    if (entityType !== "rules" || !categoryFilter?.trim()) return base;
    const normalized = categoryFilter.trim();
    const categoryLabel = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
    return {
      singular: `${categoryLabel} Rule`,
      addButton: `Add ${categoryLabel} Rule`,
      empty: `No ${categoryLabel.toLowerCase()} rules yet.`,
    };
  }, [entityType, categoryFilter]);

  const load = useCallback(async () => {
    if (!projectPath.trim()) {
      setLoading(false);
      setRecords([]);
      return;
    }
    setLoading(true);
    try {
      await ensureSetupEntityMigrated(projectId, projectPath, entityType);
      const list = await listSetupEntities(projectId, entityType);
      setRecords(list);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to load ${entityType}`);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, projectId, projectPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const recordsByCategory = categoryFilter
      ? records.filter(
          (record) =>
            (record.category ?? "").trim().toLowerCase() ===
            categoryFilter.trim().toLowerCase()
        )
      : records;
    const q = query.trim().toLowerCase();
    if (!q) return recordsByCategory;
    return recordsByCategory.filter((record) => {
      return (
        record.name.toLowerCase().includes(q) ||
        record.description.toLowerCase().includes(q) ||
        record.content.toLowerCase().includes(q) ||
        (record.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [records, query, categoryFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      category: categoryFilter?.trim() ?? "",
    });
    setOpen(true);
  };

  const openEdit = (record: SetupEntityRecord) => {
    setEditingId(record.id);
    setForm({
      name: record.name,
      description: record.description,
      content: record.content,
      category: record.category ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    const effectiveCategory =
      form.category.trim() || categoryFilter?.trim() || undefined;
    setSaving(true);
    try {
      if (editingId) {
        await updateSetupEntity(projectId, entityType, editingId, {
          name: form.name.trim(),
          description: form.description,
          content: form.content,
          category: effectiveCategory,
        });
        toast.success(`${labels.singular} updated.`);
      } else {
        await createSetupEntity(projectId, entityType, {
          name: form.name.trim(),
          description: form.description,
          content: form.content,
          category: effectiveCategory,
        });
        toast.success(`${labels.singular} added.`);
      }
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to save ${labels.singular.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteSetupEntity(projectId, entityType, id);
      toast.success(`${labels.singular} deleted.`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to delete ${labels.singular.toLowerCase()}`);
    }
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-4 md:p-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${entityType}...`}
          className="h-8 max-w-sm text-xs"
        />
        <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openCreate}>
          <Plus className="size-3.5" />
          {labels.addButton}
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">{labels.empty}</p>
      ) : (
        <ScrollArea className="h-[calc(100vh-18rem)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">Updated</TableHead>
                <TableHead className="text-xs w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-xs font-medium">{record.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[420px] truncate">
                    {record.description || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="size-7" onClick={() => openEdit(record)} title="Edit">
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-7"
                        onClick={() => void remove(record.id)}
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? `Edit ${labels.singular}` : labels.addButton}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="h-9 text-sm"
            />
            <Input
              placeholder="Description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="h-9 text-sm"
            />
            {entityType === "rules" && !categoryFilter ? (
              <Input
                placeholder="Category (optional)"
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                className="h-9 text-sm"
              />
            ) : null}
            <textarea
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              placeholder="Content"
              className="w-full min-h-[220px] rounded-md border border-border/60 bg-background px-3 py-2 text-xs font-mono"
            />
            <div className="flex justify-end">
              <Button size="sm" className="h-8 text-xs gap-1.5" disabled={saving} onClick={() => void submit()}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
