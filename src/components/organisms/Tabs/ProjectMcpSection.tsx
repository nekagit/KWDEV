"use client";

/** Project MCP Section: manage .cursor/mcp.json and addable MCP templates. */
import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, RefreshCw, Plug, Copy, Check, ExternalLink, Info, Logs } from "lucide-react";
import { readProjectFileOrEmpty, writeProjectFile } from "@/lib/api-projects";
import type { Project } from "@/types/project";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  APP_ACTIVITY_EVENT,
  clearAppActivityLogs,
  getAppActivityLogs,
  logAppActivity,
} from "@/lib/app-activity-log";
import { useRunStore } from "@/store/run-store";

const MCP_JSON_PATH = ".cursor/mcp.json";

/** Example MCPs the user can add (name, description, snippet for mcp.json). */
const ADDABLE_MCPS: { name: string; description: string; snippet: string }[] = [
  {
    name: "Filesystem",
    description: "Read/write files on the local machine.",
    snippet: JSON.stringify(
      {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "${workspaceFolder}"],
      },
      null,
      2
    ),
  },
  {
    name: "Fetch",
    description: "Fetch URLs and web content.",
    snippet: JSON.stringify(
      {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-fetch"],
      },
      null,
      2
    ),
  },
  {
    name: "GitHub",
    description: "GitHub repos, issues, PRs (requires GITHUB_PERSONAL_ACCESS_TOKEN).",
    snippet: JSON.stringify(
      {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: {
          GITHUB_PERSONAL_ACCESS_TOKEN: "<your-token>",
        },
      },
      null,
      2
    ),
  },
  {
    name: "SQLite",
    description: "Query SQLite databases.",
    snippet: JSON.stringify(
      {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-sqlite", "--db-path", "/path/to/db.sqlite"],
      },
      null,
      2
    ),
  },
  {
    name: "Memory",
    description: "Persistent memory for the assistant.",
    snippet: JSON.stringify(
      {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-memory"],
      },
      null,
      2
    ),
  },
];

interface ProjectMcpSectionProps {
  project: Project;
  projectId: string;
}

export function ProjectMcpSection({ project, projectId }: ProjectMcpSectionProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [snippetModal, setSnippetModal] = useState<{ name: string; snippet: string } | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [actionLogs, setActionLogs] = useState<string[]>([]);
  const cancelledRef = useRef(false);
  const runningRuns = useRunStore((s) => s.runningRuns);
  const pendingTempTicketQueue = useRunStore((s) => s.pendingTempTicketQueue);

  const appendLog = useCallback((message: string) => {
    logAppActivity("mcp", message);
    const next = getAppActivityLogs().map(
      (entry) => `[${new Date(entry.timestamp).toLocaleTimeString()}] [${entry.source}] ${entry.message}`
    );
    setActionLogs(next);
  }, []);

  useEffect(() => {
    const syncLogs = () => {
      const next = getAppActivityLogs().map(
        (entry) => `[${new Date(entry.timestamp).toLocaleTimeString()}] [${entry.source}] ${entry.message}`
      );
      setActionLogs(next);
    };
    syncLogs();
    window.addEventListener(APP_ACTIVITY_EVENT, syncLogs);
    return () => window.removeEventListener(APP_ACTIVITY_EVENT, syncLogs);
  }, []);

  const loadMcpJson = useCallback(
    async (getIsCancelled?: () => boolean) => {
      if (!project.repoPath) {
        if (!getIsCancelled?.()) setLoading(false);
        return;
      }
      if (!getIsCancelled?.()) appendLog("Loading .cursor/mcp.json");
      if (!getIsCancelled?.()) setLoading(true);
      try {
        const raw = await readProjectFileOrEmpty(projectId, MCP_JSON_PATH, project.repoPath);
        if (getIsCancelled?.()) return;
        let text = typeof raw === "string" ? raw : "";
        if (text.trim()) {
          try {
            const parsed = JSON.parse(text) as unknown;
            text = JSON.stringify(parsed, null, 2);
          } catch {
            // keep as-is
          }
        } else {
          text = '{\n  "mcpServers": {}\n}';
        }
        setContent(text);
        appendLog("Loaded .cursor/mcp.json");
      } catch (e) {
        if (!getIsCancelled?.()) {
          setContent('{\n  "mcpServers": {}\n}');
        }
        if (!getIsCancelled?.()) appendLog("Failed to load .cursor/mcp.json; using default template");
      } finally {
        if (!getIsCancelled?.()) setLoading(false);
      }
    },
    [appendLog, projectId, project.repoPath]
  );

  useEffect(() => {
    cancelledRef.current = false;
    loadMcpJson(() => cancelledRef.current);
    return () => {
      cancelledRef.current = true;
    };
  }, [loadMcpJson]);

  const handleSave = async () => {
    if (!project.repoPath) return;
    appendLog("Save requested for .cursor/mcp.json");
    setSaving(true);
    try {
      await writeProjectFile(projectId, MCP_JSON_PATH, content, project.repoPath);
      appendLog("Saved .cursor/mcp.json");
      toast.success("Saved .cursor/mcp.json. Restart Cursor for MCP changes to apply.");
    } catch (e) {
      appendLog("Save failed for .cursor/mcp.json");
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const copySnippet = (id: string, snippet: string) => {
    appendLog(`Copied snippet: ${id}`);
    navigator.clipboard.writeText(snippet);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!project.repoPath) {
    return (
      <p className="text-xs text-muted-foreground">
        Set a repository path for this project to view and edit MCP config.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            appendLog("Opened MCP action logs");
            setLogsOpen(true);
          }}
        >
          <Logs className="h-3.5 w-3.5" />
          Logs
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="current-mcp-json" className="border-none">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Plug className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold">Current .cursor/mcp.json</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-0">
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    disabled={loading}
                    onClick={() => {
                      appendLog("Manual refresh requested for .cursor/mcp.json");
                      loadMcpJson();
                    }}
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Refresh
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    disabled={loading || saving}
                    onClick={() => void handleSave()}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    onClick={() => {
                      appendLog("Opened .cursor/mcp.json modal");
                      setJsonModalOpen(true);
                    }}
                    title="Open mcp.json"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Project-level config. Cursor also uses <code className="rounded bg-muted px-0.5">~/.cursor/mcp.json</code>.
                  Restart Cursor after changes.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="addable-mcps" className="border-none">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">MCPs you can add</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-0">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-xs text-muted-foreground">Copy snippets and inspect details via info.</p>
                  <a
                    href="https://cursor.com/docs/mcp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    Docs <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="space-y-3">
                  {ADDABLE_MCPS.map((mcp) => (
                    <div
                      key={mcp.name}
                      className="rounded-lg border border-border/40 bg-muted/10 p-3 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-medium">{mcp.name}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{mcp.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => copySnippet(mcp.name, mcp.snippet)}
                          >
                            {copiedId === mcp.name ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            Copy snippet
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => {
                              appendLog(`Opened snippet modal: ${mcp.name}`);
                              setSnippetModal({ name: mcp.name, snippet: mcp.snippet });
                            }}
                            title={`Open ${mcp.name} snippet`}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      <Dialog
        open={jsonModalOpen}
        onOpenChange={(open) => {
          appendLog(open ? "Opened .cursor/mcp.json modal" : "Closed .cursor/mcp.json modal");
          setJsonModalOpen(open);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">.cursor/mcp.json</DialogTitle>
            <DialogDescription>Edit JSON and save to project config.</DialogDescription>
          </DialogHeader>
          <div className="min-h-[220px] border border-border/50 rounded-md overflow-hidden">
            {loading ? (
              <div className="flex items-center gap-2 p-4 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <ScrollArea className="h-[360px] w-full">
                <textarea
                  className="w-full min-h-[340px] p-4 font-mono text-xs bg-background/50 border-0 focus:ring-0 focus-visible:ring-0 resize-y"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  spellCheck={false}
                />
              </ScrollArea>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                appendLog("Closed .cursor/mcp.json modal");
                setJsonModalOpen(false);
              }}
            >
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              disabled={loading || saving}
              onClick={() => void handleSave()}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!snippetModal}
        onOpenChange={(open) => {
          if (!open) {
            appendLog("Closed snippet modal");
            setSnippetModal(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">{snippetModal?.name} snippet</DialogTitle>
            <DialogDescription>Copy this JSON snippet into mcpServers.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[320px] rounded-md border border-border/50 bg-muted/10 p-3">
            <pre className="text-[11px] font-mono whitespace-pre-wrap break-words">
              {snippetModal?.snippet ?? ""}
            </pre>
          </ScrollArea>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                appendLog("Closed snippet modal");
                setSnippetModal(null);
              }}
            >
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                if (!snippetModal) return;
                copySnippet(snippetModal.name, snippetModal.snippet);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy snippet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={logsOpen}
        onOpenChange={(open) => {
          if (!open) appendLog("Closed MCP action logs");
          setLogsOpen(open);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base">MCP action logs</DialogTitle>
            <DialogDescription>All interactions in this MCP section are listed here.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <ScrollArea className="h-[360px] rounded-md border border-border/50 bg-muted/10 p-3">
            {actionLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No actions logged yet.</p>
            ) : (
              <div className="space-y-1.5">
                {actionLogs.map((entry, index) => (
                  <p key={`${entry}-${index}`} className="text-xs font-mono text-foreground/90">
                    {entry}
                  </p>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="rounded-md border border-border/50 bg-muted/10 p-3 h-[360px] overflow-y-auto">
            <p className="text-xs font-medium mb-2">Current terminals / jobs</p>
            <div className="space-y-2">
              {runningRuns.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active or recent runs.</p>
              ) : (
                runningRuns.map((run) => (
                  <div key={run.runId} className="rounded border border-border/40 bg-background/60 p-2">
                    <p className="text-xs font-medium truncate">{run.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {run.status} • {run.runId}
                      {run.slot ? ` • slot ${run.slot}` : ""}
                    </p>
                  </div>
                ))
              )}
              <div className="pt-2 border-t border-border/40">
                <p className="text-xs font-medium mb-1">Queued jobs</p>
                {pendingTempTicketQueue.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No queued jobs.</p>
                ) : (
                  pendingTempTicketQueue.map((job, index) => (
                    <p key={`${job.label}-${index}`} className="text-[11px] text-muted-foreground truncate">
                      {index + 1}. {job.label}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearAppActivityLogs();
                logAppActivity("mcp", "Cleared MCP action logs");
                setActionLogs([]);
              }}
            >
              Clear logs
            </Button>
            <Button variant="default" size="sm" onClick={() => setLogsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
