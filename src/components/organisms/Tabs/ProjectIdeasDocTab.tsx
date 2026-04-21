"use client";

/**
 * Project Ideas Tab component - displays ideas from the database in a table.
 * Migrated from ideas.md file-based storage to database storage.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Lightbulb,
  Plus,
  Flag,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { ConvertToMilestonesDialog } from "@/components/molecules/FormsAndDialogs/ConvertToMilestonesDialog";
import { invoke, isTauri, projectIdArgOptionalPayload } from "@/lib/tauri";
import { getIdeasList } from "@/lib/api-ideas";
import type { Project } from "@/types/project";
import type { IdeaRecord, IdeaCategory } from "@/types/idea";
import { SectionCard } from "@/components/molecules/Displays/DisplayPrimitives";
import { EmptyState } from "@/components/molecules/Display/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog as SharedDialog } from "@/components/molecules/FormsAndDialogs/Dialog";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";

const CATEGORY_LABELS: Record<IdeaCategory, string> = {
  saas: "SaaS",
  iaas: "IaaS",
  paas: "PaaS",
  website: "Website",
  webapp: "Web App",
  webshop: "Webshop",
  other: "Other",
};

function formatUpdatedAt(updatedAt: string | undefined): string {
  if (!updatedAt) return "—";
  try {
    const d = new Date(updatedAt);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "short" });
  } catch {
    return "—";
  }
}

interface ProjectIdeasDocTabProps {
  project: Project;
  projectId: string;
  docsRefreshKey?: number;
}

export function ProjectIdeasDocTab({ project, projectId, docsRefreshKey }: ProjectIdeasDocTabProps) {
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIdeaId, setSelectedIdeaId] = useState<number | null>(null);
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [newIdeaDescription, setNewIdeaDescription] = useState("");
  const [newIdeaCategory, setNewIdeaCategory] = useState<IdeaCategory>("other");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [convertMilestonesOpen, setConvertMilestonesOpen] = useState(false);
  const [convertMilestonesDefaultName, setConvertMilestonesDefaultName] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const fetchIdeas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ideasList: IdeaRecord[] = await getIdeasList(projectId).then((rows) =>
        Array.isArray(rows) ? (rows as IdeaRecord[]) : []
      );
      setIdeas(ideasList);
      setSelectedIdeaId((prev) => {
        if (ideasList.length === 0) return null;
        const stillExists = ideasList.some((i) => i.id === prev);
        return stillExists ? prev : ideasList[0].id;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas, docsRefreshKey]);

  const addIdea = useCallback(async () => {
    const title = newIdeaTitle.trim();
    if (!title) {
      toast.error("Title is required");
      return;
    }
    const description = newIdeaDescription.trim();
    setAdding(true);
    try {
      let finalTitle = title;
      let finalDescription = description || "";
      let upgradeSucceeded = false;
      try {
        if (isTauri) {
          const result = await invoke<{ improvedTitle: string; improvedDescription: string }>(
            "improve_idea_for_project",
            {
              projectId,
              rawTitle: title,
              rawDescription: description,
            }
          );
          finalTitle = result.improvedTitle?.trim() || title;
          finalDescription = result.improvedDescription?.trim() ?? description;
          upgradeSucceeded = true;
        } else {
          const rawIdea = description ? `${title}\n\n${description}` : title;
          const res = await fetch(`/api/data/projects/${projectId}/improve-idea`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawIdea }),
          });
          if (res.ok) {
            const data = (await res.json()) as { improvedTitle?: string; improvedDescription?: string };
            finalTitle = data.improvedTitle?.trim() || title;
            finalDescription = data.improvedDescription?.trim() ?? description;
            upgradeSucceeded = true;
          } else {
            throw new Error((await res.json().catch(() => ({})) as { detail?: string }).detail || res.statusText);
          }
        }
      } catch (_upgradeErr) {
        // fallback: keep original title and description
      }
      if (isTauri) {
        await invoke("create_idea", {
          args: {
            projectId,
            title: finalTitle,
            description: finalDescription || null,
            category: newIdeaCategory,
            source: "manual",
          },
        });
      } else {
        const res = await fetch("/api/data/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            title: finalTitle,
            description: finalDescription || null,
            category: newIdeaCategory,
            source: "manual",
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || res.statusText);
        }
      }
      setNewIdeaTitle("");
      setNewIdeaDescription("");
      setNewIdeaCategory("other");
      await fetchIdeas();
      toast.success(upgradeSucceeded ? "Idea added" : "Idea added (upgrade unavailable)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add idea");
    } finally {
      setAdding(false);
    }
  }, [newIdeaTitle, newIdeaDescription, newIdeaCategory, projectId, fetchIdeas]);

  const deleteIdea = useCallback(async (ideaId: number) => {
    setDeleting(ideaId);
    try {
      if (isTauri) {
        await invoke("delete_idea", { args: { ideaId } });
      } else {
        const res = await fetch(`/api/data/ideas/${ideaId}`, { method: "DELETE" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || res.statusText);
        }
      }
      setIdeas((prev) => prev.filter((i) => i.id !== ideaId));
      setSelectedIdeaId((prev) => (prev === ideaId ? null : prev));
      toast.success("Idea deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete idea");
    } finally {
      setDeleting(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-border/40 bg-muted/10 py-24">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Loading ideas…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Ideas ({ideas.length})
        </h2>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchIdeas}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </Button>
          {selectedIdeaId != null && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const selected = ideas.find((idea) => idea.id === selectedIdeaId);
                  if (!selected) return;
                  setConvertMilestonesDefaultName(selected.title);
                  setConvertMilestonesOpen(true);
                }}
                className="gap-1.5"
              >
                <Flag className="h-3.5 w-3.5" />
                Convert to milestones
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={deleting === selectedIdeaId}
                onClick={() => {
                  if (selectedIdeaId == null) return;
                  void deleteIdea(selectedIdeaId);
                }}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                {deleting === selectedIdeaId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </Button>
            </>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add idea
          </Button>
        </div>
      </div>
      {ideas.length === 0 ? (
        <EmptyState
          icon={<Lightbulb className="size-6 text-muted-foreground" />}
          title="No ideas yet"
          description="Ideas are DB entries with an id for planning and conversion. Add one to start building milestones."
          action={
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Add idea
            </Button>
          }
        />
      ) : (
        <SectionCard accentColor="amber" tint={1} className="flex-1 min-h-0 flex flex-col">
          <p className="text-xs text-muted-foreground mb-3">
            DB entries with an id for project planning. Select a row, then use actions to convert or delete.
          </p>
          <div className="rounded-md border border-border/60 overflow-hidden flex-1 min-h-0 flex flex-col">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[1%]">#</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden sm:table-cell w-[100px]">Category</TableHead>
                  <TableHead className="w-[100px] text-right">Updated</TableHead>
                  <TableHead className="w-[1%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ideas.map((idea) => (
                  <TableRow
                    key={idea.id}
                    className={cn(
                      "cursor-pointer",
                      selectedIdeaId === idea.id && "bg-muted/60"
                    )}
                    onClick={() => setSelectedIdeaId(idea.id)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">{idea.id}</TableCell>
                    <TableCell className="font-medium">{idea.title}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                      {CATEGORY_LABELS[idea.category] || idea.category}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {formatUpdatedAt(idea.updated_at)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={(e) => {
                            e.preventDefault();
                            setSelectedIdeaId(idea.id);
                            setConvertMilestonesDefaultName(idea.title);
                            setConvertMilestonesOpen(true);
                          }}
                          title="Convert to milestones"
                        >
                          <Flag className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          disabled={deleting === idea.id}
                          onClick={(e) => {
                            e.preventDefault();
                            void deleteIdea(idea.id);
                          }}
                          title="Delete"
                        >
                          {deleting === idea.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>
      )}

      <SharedDialog
        isOpen={addOpen}
        title="Add idea"
        onClose={() => {
          if (adding) return;
          setAddOpen(false);
        }}
        actions={
          <ButtonGroup alignment="right">
            <Button
              variant="outline"
              onClick={() => {
                setAddOpen(false);
              }}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void addIdea()}
              disabled={!newIdeaTitle.trim() || adding}
            >
              {adding ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Add
            </Button>
          </ButtonGroup>
        }
      >
        <div className="space-y-3">
          <Input
            placeholder="Idea title (required)"
            value={newIdeaTitle}
            onChange={(e) => setNewIdeaTitle(e.target.value)}
            disabled={adding}
          />
          <Textarea
            className="min-h-[72px] text-sm"
            placeholder="Description (optional)"
            value={newIdeaDescription}
            onChange={(e) => setNewIdeaDescription(e.target.value)}
            disabled={adding}
          />
          <Select
            value={newIdeaCategory}
            onValueChange={(v) => setNewIdeaCategory(v as IdeaCategory)}
            disabled={adding}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SharedDialog>

      <ConvertToMilestonesDialog
        isOpen={convertMilestonesOpen}
        onClose={() => setConvertMilestonesOpen(false)}
        projectId={projectId}
        defaultName={convertMilestonesDefaultName}
      />
    </div>
  );
}
