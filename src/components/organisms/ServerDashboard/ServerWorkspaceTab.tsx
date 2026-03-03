"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FolderOpen, Play, RefreshCw, FileText, FileCode, FolderPlus, Terminal } from "lucide-react";
import { toast } from "sonner";
import { getServerApiUrl } from "@/lib/server-api-url";
import { dispatchServerTerminalRanAndOpenFloating, scrollToServerTerminal } from "@/components/organisms/ServerDashboard/ServerTerminalScrollButton";

const WORKSPACE_PATH = "~/kwcode-server";

interface WorkspaceFileEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
}

async function injectCommand(sessionId: string, command: string): Promise<void> {
  const res = await fetch(getServerApiUrl("/api/server/terminal/inject"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, type: "command", command }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || "Inject failed");
  }
}

export function ServerWorkspaceTab({
  sessionId,
  onInitializeWorkspace,
}: {
  sessionId: string;
  onInitializeWorkspace?: () => void;
}) {
  const [files, setFiles] = useState<WorkspaceFileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [listPath, setListPath] = useState<string | null>(null);

  const fetchWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getServerApiUrl(`/api/server/workspace?sessionId=${encodeURIComponent(sessionId)}`));
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to list workspace");
      const list = Array.isArray((data as { files?: WorkspaceFileEntry[] }).files) ? (data as { files: WorkspaceFileEntry[] }).files : [];
      setFiles(list);
      setListPath((data as { path?: string }).path ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load workspace");
      setFiles([]);
      setListPath(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleInitFromTab = useCallback(async () => {
    setInitializing(true);
    try {
      const res = await fetch(getServerApiUrl("/api/server/workspace/init"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || "Init failed");
      toast.success("Workspace created at " + WORKSPACE_PATH);
      await fetchWorkspace();
      await onInitializeWorkspace?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create workspace");
    } finally {
      setInitializing(false);
    }
  }, [sessionId, fetchWorkspace, onInitializeWorkspace]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const isRunnablePrompt = useCallback((fileName: string) => {
    return (
      fileName.endsWith(".prompt.txt") ||
      fileName.endsWith(".prompt.md") ||
      (fileName.endsWith(".txt") && fileName !== "README.txt")
    );
  }, []);

  const handleRun = useCallback(
    async (entry: WorkspaceFileEntry) => {
      if (entry.type === "directory") return;
      const name = entry.name.replace(/"/g, '\\"');
      setRunning(entry.name);
      try {
        if (isRunnablePrompt(entry.name)) {
          const cmd = `cd ${WORKSPACE_PATH} && (command -v agent >/dev/null 2>&1 && agent --trust -p "$(cat "${name}")" || cursor-agent --trust -p "$(cat "${name}")")`;
          await injectCommand(sessionId, cmd);
          dispatchServerTerminalRanAndOpenFloating(sessionId);
          toast.success("Running prompt in terminal. Use the terminal button to view output.");
        } else if (entry.name.endsWith(".sh")) {
          await injectCommand(sessionId, `bash ${WORKSPACE_PATH}/${name}`);
          dispatchServerTerminalRanAndOpenFloating(sessionId);
          toast.success("Running script in terminal. Use the terminal button to view output.");
        } else {
          toast.info("Runnable: .prompt.txt, .prompt.md, .txt (except README), or .sh");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to run");
      } finally {
        setRunning(null);
      }
    },
    [sessionId, isRunnablePrompt]
  );

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderOpen className="size-4 text-emerald-400" />
              Scripts &amp; Prompts
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Files in {listPath ?? WORKSPACE_PATH}. Run prompts (.prompt.txt, .prompt.md, .txt) or scripts (.sh) via Cursor CLI in the server terminal.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={scrollToServerTerminal} className="gap-1.5 shrink-0">
            <Terminal className="size-3.5" />
            View terminal
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Button variant="outline" size="sm" onClick={fetchWorkspace} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
          {files.length === 0 && (
            <Button size="sm" onClick={handleInitFromTab} disabled={initializing}>
              {initializing ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
              Initialize workspace
            </Button>
          )}
        </div>
        {loading && files.length === 0 ? (
          <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : files.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 space-y-2">
            <p>No scripts or prompts yet. The workspace folder is created at {WORKSPACE_PATH} on the server.</p>
            <p>Click <strong>Initialize workspace</strong> above to create {WORKSPACE_PATH} with a default prompt file and README.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {files.map((entry) => (
              <li
                key={entry.name}
                className="flex items-center gap-3 rounded-lg border border-border/40 bg-muted/20 px-3 py-2"
              >
                {entry.type === "directory" ? (
                  <FolderOpen className="size-4 text-muted-foreground shrink-0" />
                ) : entry.name.endsWith(".sh") ? (
                  <FileCode className="size-4 text-amber-500/80 shrink-0" />
                ) : (
                  <FileText className="size-4 text-sky-500/80 shrink-0" />
                )}
                <span className="flex-1 min-w-0 truncate font-mono text-sm" title={entry.name}>
                  {entry.name}
                </span>
                {entry.modified && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{entry.modified}</span>
                )}
                {entry.type === "file" && (isRunnablePrompt(entry.name) || entry.name.endsWith(".sh")) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    disabled={running !== null}
                    onClick={() => handleRun(entry)}
                  >
                    {running === entry.name ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Play className="size-3.5" />
                    )}
                    Run
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
