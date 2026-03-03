"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

interface StateEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
  content?: string;
}

/** Names of folders/files we treat as "states" for zeroclaw (directory or single file). */
const STATES_PATHS = ["states", "state"] as const;

export function BotStatesTab({
  sessionId,
  botPath,
}: {
  sessionId: string;
  botPath: string;
}) {
  const [entries, setEntries] = useState<StateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);

  const loadStates = async () => {
    setLoading(true);
    setError(null);
    setEntries([]);
    setResolvedPath(null);
    try {
      let found = false;
      for (const sub of STATES_PATHS) {
        const candidatePath = `${botPath}/${sub}`;
        const res = await fetch(
          `/api/ai-bots/files?sessionId=${sessionId}&path=${encodeURIComponent(candidatePath)}`
        );
        const data = await res.json();
        if (res.ok && data.files && data.files.length > 0) {
          setEntries(data.files);
          setResolvedPath(candidatePath);
          found = true;
          break;
        }
        const fileRes = await fetch(
          `/api/ai-bots/files/read?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}&file=${encodeURIComponent(sub)}`
        );
        const fileData = await fileRes.json();
        if (fileRes.ok && fileData.content != null) {
          setEntries([
            {
              name: sub,
              type: "file",
              content: typeof fileData.content === "string" ? fileData.content : JSON.stringify(fileData.content),
            },
          ]);
          setResolvedPath(`${botPath}/${sub}`);
          found = true;
          break;
        }
      }
      if (!found) {
        setError("No states directory or state file found (states/, state, or state.json)");
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load states");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStates();
  }, [sessionId, botPath]);

  const toggleExpand = async (entry: StateEntry) => {
    if (entry.type !== "file" || !entry.name) return;
    const key = entry.name;
    const next = new Set(expanded);
    if (next.has(key)) {
      next.delete(key);
      setExpanded(next);
      return;
    }
    try {
      const prefix = resolvedPath?.startsWith(botPath)
        ? resolvedPath.slice(botPath.length).replace(/^\//, "")
        : "states";
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const res = await fetch(
        `/api/ai-bots/files/read?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}&file=${encodeURIComponent(relPath)}`
      );
      const data = await res.json();
      if (res.ok && data.content != null) {
        setEntries((prev) =>
          prev.map((e) =>
            e.name === entry.name ? { ...e, content: String(data.content) } : e
          )
        );
        next.add(key);
        setExpanded(next);
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorDisplay title="States" message={error} />
        <Button onClick={loadStates} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No state files in this agent
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Agent state</h3>
        <Button size="sm" variant="outline" onClick={loadStates}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <Card key={entry.name} className="bg-card-tint-1">
            <CardContent className="pt-4">
              <button
                type="button"
                onClick={() => toggleExpand(entry)}
                className="w-full text-left flex items-center gap-2"
              >
                {expanded.has(entry.name) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span className="font-medium text-sm">{entry.name}</span>
              </button>
              {expanded.has(entry.name) && entry.content != null && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <pre className="text-xs overflow-auto max-h-64 p-3 rounded bg-muted/50 font-mono whitespace-pre-wrap break-words">
                    {entry.content}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
