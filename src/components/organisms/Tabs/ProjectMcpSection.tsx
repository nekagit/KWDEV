"use client";

/** Project MCP Section: shows current .cursor/mcp.json and MCPs you can add. */
import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, RefreshCw, Plug, Copy, Check, ExternalLink } from "lucide-react";
import { readProjectFileOrEmpty, writeProjectFile } from "@/lib/api-projects";
import type { Project } from "@/types/project";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const cancelledRef = useRef(false);

  const loadMcpJson = useCallback(
    async (getIsCancelled?: () => boolean) => {
      if (!project.repoPath) {
        if (!getIsCancelled?.()) setLoading(false);
        return;
      }
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
      } catch (e) {
        if (!getIsCancelled?.()) {
          setContent('{\n  "mcpServers": {}\n}');
        }
      } finally {
        if (!getIsCancelled?.()) setLoading(false);
      }
    },
    [projectId, project.repoPath]
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
    setSaving(true);
    try {
      await writeProjectFile(projectId, MCP_JSON_PATH, content, project.repoPath);
      toast.success("Saved .cursor/mcp.json. Restart Cursor for MCP changes to apply.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const copySnippet = (id: string, snippet: string) => {
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
      {/* Current mcp.json */}
      <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Current .cursor/mcp.json</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              disabled={loading}
              onClick={() => loadMcpJson()}
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
          </div>
        </div>
        <div className="min-h-[200px] max-h-[320px]">
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <ScrollArea className="h-[300px] w-full">
              <textarea
                className="w-full min-h-[280px] p-4 font-mono text-xs bg-background/50 border-0 focus:ring-0 focus-visible:ring-0 resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
              />
            </ScrollArea>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground px-4 pb-3">
          Project-level config. Cursor also uses <code className="rounded bg-muted px-0.5">~/.cursor/mcp.json</code>.
          Restart Cursor after changes.
        </p>
      </div>

      {/* MCPs you can add */}
      <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
          <h3 className="text-sm font-semibold">MCPs you can add</h3>
          <a
            href="https://cursor.com/docs/mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Docs <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="p-4 space-y-3">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 shrink-0"
                  onClick={() => copySnippet(mcp.name, mcp.snippet)}
                >
                  {copiedId === mcp.name ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Copy snippet
                </Button>
              </div>
              <pre className={cn("mt-2 p-2 rounded bg-muted/30 text-[11px] font-mono overflow-x-auto")}>
                {mcp.snippet}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
