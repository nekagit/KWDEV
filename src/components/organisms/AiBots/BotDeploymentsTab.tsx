"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { GitBranch, ExternalLink, RotateCcw } from "lucide-react";

interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export function BotDeploymentsTab({
  sessionId,
  botPath,
}: {
  sessionId: string;
  botPath: string;
}) {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [version, setVersion] = useState("unknown");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);

  const loadDeployments = async () => {
    try {
      const res = await fetch(
        `/api/ai-bots/git?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}`
      );
      const data = await res.json();
      setCommits(data.commits || []);
      setTags(data.tags || []);
      setVersion(data.currentVersion || "unknown");
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeployments();
  }, [sessionId, botPath]);

  const handleRollback = async (ref: string) => {
    if (!confirm(`Rollback to ${ref}?`)) return;

    setRolling(true);
    try {
      await fetch("/api/ai-bots/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, botPath, ref }),
      });

      await loadDeployments();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRolling(false);
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
    return <ErrorDisplay title="Failed to load deployments" message={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Current Version */}
      <Card className="bg-gradient-to-r from-primary/10 to-transparent">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Current Version
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-2xl font-bold font-mono">{version}</p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deployment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deployment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {commits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commit history available</p>
          ) : (
            commits.map((commit) => (
              <div key={commit.hash} className="p-3 rounded-lg bg-muted/40">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <code className="text-xs font-mono text-primary">{commit.hash}</code>
                    <p className="text-sm font-medium mt-1">{commit.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {commit.author} • {new Date(commit.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRollback(commit.hash)}
                    disabled={rolling}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Rollback
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recent Tags */}
      {tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Version Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tags.map((tag) => (
                <div key={tag} className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <code className="text-sm font-mono">{tag}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRollback(tag)}
                    disabled={rolling}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Deploy
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
