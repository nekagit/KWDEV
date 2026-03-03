"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

interface MemoryFile {
  name: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
  content?: string;
}

export function BotMemoryTab({
  sessionId,
  botPath,
}: {
  sessionId: string;
  botPath: string;
}) {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const loadMemory = async () => {
    setLoading(true);
    setError(null);
    try {
      const memoryPath = `${botPath}/memory`;
      const res = await fetch(
        `/api/ai-bots/files?sessionId=${sessionId}&path=${encodeURIComponent(memoryPath)}`
      );
      const data = await res.json();

      if (res.ok && data.files) {
        setFiles(data.files);
      } else {
        setFiles([]);
        setError("Memory directory not found");
      }
    } catch (err) {
      setError((err as Error).message || "Failed to load memory files");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemory();
  }, [sessionId, botPath]);

  const toggleFileExpand = async (fileName: string) => {
    const newExpanded = new Set(expandedFiles);

    if (newExpanded.has(fileName)) {
      newExpanded.delete(fileName);
      setExpandedFiles(newExpanded);
    } else {
      // Load file content
      try {
        const res = await fetch(
          `/api/ai-bots/files/read?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}&file=memory/${fileName}`
        );
        const data = await res.json();

        if (res.ok && data.content) {
          setFiles((prev) =>
            prev.map((f) =>
              f.name === fileName ? { ...f, content: data.content } : f
            )
          );
          newExpanded.add(fileName);
          setExpandedFiles(newExpanded);
        }
      } catch (err) {
        console.error("Failed to read file:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorDisplay title="Failed to load memory" message={error} />
        <Button onClick={loadMemory} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No memory files found
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Agent Memory{" "}
          <Badge variant="secondary" className="ml-2">
            {files.length} files
          </Badge>
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={loadMemory}
          className="gap-2"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {files.map((file) => (
          <Card key={file.name} className="bg-card-tint-1">
            <CardContent className="pt-4">
              <button
                onClick={() => toggleFileExpand(file.name)}
                className="w-full text-left flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {expandedFiles.has(file.name) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    {file.size !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        {Math.round(file.size / 1024) || 1} KB •{" "}
                        {file.modified}
                      </p>
                    )}
                  </div>
                </div>
              </button>

              {expandedFiles.has(file.name) && file.content && (
                <div className="mt-3 pt-3 border-t border-border/30">
                  <pre className="text-xs overflow-auto max-h-64 p-3 rounded bg-muted/50 font-mono whitespace-pre-wrap break-words">
                    {file.content}
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
