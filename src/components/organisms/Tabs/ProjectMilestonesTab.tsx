"use client";

/** Project Milestones Tab component. */
import { useState, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/molecules/Displays/DisplayPrimitives";
import { EmptyState } from "@/components/molecules/Display/EmptyState";
import { Flag, Loader2, FileText, Plus, Pencil, Trash2, ListTodo } from "lucide-react";
import { fetchProjectMilestones } from "@/lib/fetch-project-milestones";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConvertToTicketsDialog } from "@/components/molecules/FormsAndDialogs/ConvertToTicketsDialog";
import { toast } from "sonner";
import type { Project } from "@/types/project";
import type { MilestoneRecord } from "@/types/milestone";
import { cn } from "@/lib/utils";
import { Dialog as SharedDialog } from "@/components/molecules/FormsAndDialogs/Dialog";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { GenericInputWithLabel } from "@/components/molecules/Form/GenericInputWithLabel";
import { GenericTextareaWithLabel } from "@/components/molecules/Form/GenericTextareaWithLabel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Removed: file-based milestone folder functions - milestones are now stored in the database only

/** Minimal prose-style classes for markdown (aligned with SetupDocBlock). */
const markdownClasses =
  "text-sm text-foreground [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:bg-muted/50 [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:overflow-x-auto [&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_p]:mb-2 last:[&_p]:mb-0 [&_table]:border-collapse [&_th]:border [&_td]:border [&_th]:px-2 [&_td]:px-2 [&_th]:py-1 [&_td]:py-1";

function formatUpdatedAt(updatedAt: string): string {
  try {
    const d = new Date(updatedAt);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return "—";
  }
}

interface ProjectMilestonesTabProps {
  project: Project;
  projectId: string;
  onTicketAdded?: () => void;
}

export function ProjectMilestonesTab({
  project,
  projectId,
  onTicketAdded,
}: ProjectMilestonesTabProps) {
  const [milestones, setMilestones] = useState<MilestoneRecord[]>([]);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSlug, setAddSlug] = useState("");
  const [addContent, setAddContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [convertTicketsOpen, setConvertTicketsOpen] = useState(false);

  const loadMilestones = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const list = await fetchProjectMilestones(projectId);
      setMilestones(list);
      if (list.length > 0) {
        setSelectedMilestoneId((prev) => (prev === null ? list[0].id : prev));
      }
    } catch {
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  const handleAddMilestone = useCallback(async () => {
    const name = addName.trim();
    if (!name) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/data/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: addSlug.trim() || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          content: addContent.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create milestone");
      }
      const created = (await res.json()) as MilestoneRecord;
      setMilestones((prev) => [...prev, created]);
      setSelectedMilestoneId(created.id);
      setAddOpen(false);
      setAddName("");
      setAddSlug("");
      setAddContent("");
      toast.success("Milestone created.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [projectId, addName, addSlug, addContent]);

  const openEdit = useCallback((m: MilestoneRecord) => {
    setSelectedMilestoneId(m.id);
    setEditName(m.name);
    setEditSlug(m.slug);
    setEditContent(m.content ?? "");
    setEditOpen(true);
  }, []);

  const handleUpdateMilestone = useCallback(async () => {
    if (selectedMilestoneId == null) return;
    setEditSaving(true);
    try {
      const res = await fetch(
        `/api/data/projects/${projectId}/milestones/${selectedMilestoneId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            slug: editSlug.trim() || undefined,
            content: editContent.trim() || undefined,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update milestone");
      }
      await loadMilestones();
      setEditOpen(false);
      toast.success("Milestone updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setEditSaving(false);
    }
  }, [projectId, selectedMilestoneId, editName, editSlug, editContent, loadMilestones]);

  const handleDeleteMilestone = useCallback(async (id?: number) => {
    const toDelete = id ?? selectedMilestoneId;
    if (toDelete == null) return;
    setDeleteSaving(true);
    try {
      const res = await fetch(
        `/api/data/projects/${projectId}/milestones/${toDelete}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete milestone");
      }
      setEditOpen(false);
      setSelectedMilestoneId((prev) => (prev === toDelete ? null : prev));
      setMilestones((prev) => prev.filter((m) => m.id !== toDelete));
      toast.success("Milestone removed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleteSaving(false);
    }
  }, [projectId, selectedMilestoneId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading milestones…</span>
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <div className="w-full flex flex-col gap-4">
        <EmptyState
          icon={<Flag className="size-6 text-muted-foreground" />}
          title="No milestones yet"
          description="Milestones are DB entries with an id so you can reference them from tickets and implementation log. Create one to assign to tickets."
          action={
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Add milestone
            </Button>
          }
        />
        <SharedDialog
          isOpen={addOpen}
          title="Add milestone"
          onClose={() => setAddOpen(false)}
          actions={
            <ButtonGroup alignment="right">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAddMilestone} disabled={saving || !addName.trim()}>
                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Add
              </Button>
            </ButtonGroup>
          }
        >
          <GenericInputWithLabel id="milestone-name" label="Name" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. v1.0" />
          <GenericInputWithLabel id="milestone-slug" label="Slug (optional)" value={addSlug} onChange={(e) => setAddSlug(e.target.value)} placeholder="e.g. v1-0" />
          <GenericTextareaWithLabel id="milestone-content" label="Content (optional)" value={addContent} onChange={(e) => setAddContent(e.target.value)} placeholder="Markdown content" />
        </SharedDialog>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-medium text-muted-foreground">
          Milestones ({milestones.length})
        </h2>
        <div className="flex items-center gap-1.5">
          {selectedMilestoneId != null && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConvertTicketsOpen(true)}
                className="gap-1.5"
              >
                <ListTodo className="h-3.5 w-3.5" />
                Convert to tickets
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const m = milestones.find((x) => x.id === selectedMilestoneId);
                  if (m) openEdit(m);
                }}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedMilestoneId == null) return;
                  handleDeleteMilestone();
                }}
                disabled={deleteSaving}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                {deleteSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add milestone
          </Button>
        </div>
      </div>
      <SectionCard accentColor="orange" tint={1} className="flex-1 min-h-0 flex flex-col">
        <Tabs defaultValue="milestones" className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-xs text-muted-foreground">
              DB entries with an id for tickets and implementation log. Select a row, then switch tabs to review content.
            </p>
            <TabsList>
              <TabsTrigger value="milestones">Milestones</TabsTrigger>
              <TabsTrigger value="content" disabled={selectedMilestoneId == null}>
                Content
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="milestones" className="mt-0">
            <div className="rounded-md border border-border/60 overflow-hidden flex-1 min-h-0 flex flex-col">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[1%]">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Slug</TableHead>
                    <TableHead className="w-[100px] text-right">Updated</TableHead>
                    <TableHead className="w-[1%] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestones.map((m) => (
                    <TableRow
                      key={m.id}
                      className={cn(
                        "cursor-pointer",
                        selectedMilestoneId === m.id && "bg-muted/60"
                      )}
                      onClick={() => setSelectedMilestoneId(m.id)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">{m.id}</TableCell>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">{m.slug || "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">{formatUpdatedAt(m.updated_at ?? "")}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => {
                              setSelectedMilestoneId(m.id);
                              setConvertTicketsOpen(true);
                            }}
                            title="Convert to tickets"
                          >
                            <ListTodo className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={(e) => { e.preventDefault(); openEdit(m); }}
                            title="Edit"
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            disabled={deleteSaving}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteMilestone(m.id);
                            }}
                            title="Delete"
                          >
                            {deleteSaving ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="content" className="mt-0">
            {selectedMilestoneId != null ? (() => {
              const selected = milestones.find((m) => m.id === selectedMilestoneId);
              if (!selected) return null;
              const hasContent = selected.content != null && selected.content.trim() !== "";
              return (
                <div className="rounded-md border border-border/60 overflow-hidden flex-1 min-h-[120px] flex flex-col">
                  <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2 bg-muted/20">
                    <FileText className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-semibold">Content - {selected.name}</span>
                  </div>
                  {hasContent ? (
                    <div className={cn("p-3 pr-4 overflow-y-auto", markdownClasses)}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground italic">
                      No content for this milestone. Use Edit to add markdown content.
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="rounded-md border border-border/60 p-4 text-sm text-muted-foreground italic">
                Select a milestone from the Milestones tab to view content.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SectionCard>

      <SharedDialog
        isOpen={addOpen}
        title="Add milestone"
        onClose={() => setAddOpen(false)}
        actions={
          <ButtonGroup alignment="right">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMilestone} disabled={saving || !addName.trim()}>
              {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Add
            </Button>
          </ButtonGroup>
        }
      >
        <GenericInputWithLabel id="milestone-name" label="Name" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. v1.0" />
        <GenericInputWithLabel id="milestone-slug" label="Slug (optional)" value={addSlug} onChange={(e) => setAddSlug(e.target.value)} placeholder="e.g. v1-0" />
        <GenericTextareaWithLabel id="milestone-content" label="Content (optional)" value={addContent} onChange={(e) => setAddContent(e.target.value)} placeholder="Markdown content" />
      </SharedDialog>

      <SharedDialog
        isOpen={editOpen}
        title={`Edit milestone${selectedMilestoneId != null ? ` (id ${selectedMilestoneId})` : ""}`}
        onClose={() => setEditOpen(false)}
        actions={
          <ButtonGroup alignment="right">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateMilestone} disabled={editSaving || !editName.trim()}>
              {editSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Update
            </Button>
          </ButtonGroup>
        }
      >
        <GenericInputWithLabel id="edit-milestone-name" label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="e.g. v1.0" />
        <GenericInputWithLabel id="edit-milestone-slug" label="Slug (optional)" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder="e.g. v1-0" />
        <GenericTextareaWithLabel id="edit-milestone-content" label="Content (optional)" value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="Markdown content" />
      </SharedDialog>

      {selectedMilestoneId != null && (
        <ConvertToTicketsDialog
          isOpen={convertTicketsOpen}
          onClose={() => setConvertTicketsOpen(false)}
          projectId={projectId}
          milestoneId={selectedMilestoneId}
          onSuccess={onTicketAdded}
        />
      )}
    </div>
  );
}
