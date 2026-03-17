"use client";

/** Project Agents Section component. */
import { useState, useEffect, useCallback, useRef } from "react";
import { Bot, Loader2, FileText, FolderInput } from "lucide-react";
import { listProjectFiles, readProjectFile, initializeProjectAgents, type FileEntry } from "@/lib/api-projects";
import type { Project } from "@/types/project";
import { SectionCard } from "@/components/molecules/Displays/DisplayPrimitives";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CURSOR_AGENTS_ROOT } from "@/lib/cursor-paths";
import { isTauri } from "@/lib/tauri";

interface ProjectAgentsSectionProps {
  project: Project;
  projectId: string;
}

/** Humanize filename: "backend-dev" -> "Backend Dev" */
function humanizeAgentName(filename: string): string {
  const base = filename.replace(/\.md$/i, "");
  return base
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** Parse optional YAML frontmatter for name/description (first line after ---). */
function parseFrontmatter(content: string): { name?: string; description?: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const block = match[1];
  const name = block.match(/name:\s*["']?([^"'\n]+)["']?/)?.[1]?.trim();
  const description = block.match(/description:\s*["']?([^"'\n]+)["']?/)?.[1]?.trim();
  return { name, description };
}

export function ProjectAgentsSection({ project, projectId }: ProjectAgentsSectionProps) {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ path: string; name: string; content: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [initializeLoading, setInitializeLoading] = useState(false);

  const cancelledRef = useRef(false);

  const fetchAgents = useCallback(async (getIsCancelled?: () => boolean) => {
    if (!project.repoPath) {
      if (!getIsCancelled?.()) setError("No repository path set for this project.");
      if (!getIsCancelled?.()) setLoading(false);
      return;
    }
    if (!getIsCancelled?.()) setLoading(true);
    if (!getIsCancelled?.()) setError(null);
    try {
      const list = await listProjectFiles(projectId, CURSOR_AGENTS_ROOT, project.repoPath);
      if (getIsCancelled?.()) return;
      const mdFiles = list
        .filter((e) => !e.isDirectory && e.name.toLowerCase().endsWith(".md"))
        .sort((a, b) => a.name.localeCompare(b.name));
      setEntries(mdFiles);
    } catch (e) {
      if (!getIsCancelled?.()) {
        console.error("Failed to list agents:", e);
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (!getIsCancelled?.()) setLoading(false);
    }
  }, [projectId, project.repoPath]);

  useEffect(() => {
    cancelledRef.current = false;
    fetchAgents(() => cancelledRef.current);
    return () => {
      cancelledRef.current = true;
    };
  }, [fetchAgents]);

  const openPreview = async (entry: FileEntry) => {
    const path = `${CURSOR_AGENTS_ROOT}/${entry.name}`;
    setPreviewLoading(true);
    try {
      const content = await readProjectFile(projectId, path, project.repoPath);
      const { name } = parseFrontmatter(content);
      setPreview({
        path: entry.name,
        name: name ?? humanizeAgentName(entry.name),
        content,
      });
    } catch (e) {
      console.error("Failed to read agent file:", e);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (!project.repoPath || !isTauri) return;
    setInitializeLoading(true);
    try {
      const count = await initializeProjectAgents(project.repoPath);
      toast.success(`Copied ${count} agent file(s) from workspace data/agents to .cursor/agents.`);
      await fetchAgents();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to initialize agents");
    } finally {
      setInitializeLoading(false);
    }
  };

  if (!project.repoPath) {
    return (
      <SectionCard accentColor="violet" tint={1} className="w-full">
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <Bot className="h-10 w-10 mb-3 opacity-50" />
          <p className="text-sm">Set a repository path to view agents in <code className="text-xs bg-muted px-1 rounded">{CURSOR_AGENTS_ROOT}</code>.</p>
        </div>
      </SectionCard>
    );
  }

  return (
    <>
      <SectionCard accentColor="violet" tint={2} className="w-full lg:col-span-2">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Agents</h3>
                <p className="text-xs text-muted-foreground">One column per file in {CURSOR_AGENTS_ROOT}</p>
              </div>
            </div>
            {isTauri && (
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs gap-1.5"
                disabled={initializeLoading}
                onClick={() => void handleInitialize()}
                title="Copy workspace data/agents into this project's .cursor/agents"
              >
                {initializeLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FolderInput className="h-3.5 w-3.5" />
                )}
                Initialize
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No .md files in <code className="text-xs bg-muted px-1 rounded">{CURSOR_AGENTS_ROOT}</code>. Use Initialize to copy from workspace data/agents.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 w-full">
              {entries.map((entry) => (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => openPreview(entry)}
                  disabled={previewLoading}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border border-border/40 bg-muted/20",
                    "hover:bg-muted/40 hover:border-violet-500/30 transition-colors text-left w-full",
                    "min-h-[80px]"
                  )}
                >
                  <FileText className="h-5 w-5 text-violet-500 shrink-0" />
                  <span className="text-xs font-medium text-foreground leading-tight text-center line-clamp-2">
                    {humanizeAgentName(entry.name)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium truncate pr-8">
              {preview?.name ?? preview?.path}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden border rounded-md bg-muted/10">
            <ScrollArea className="h-[60vh] w-full p-4">
              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                {preview?.content}
              </pre>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
