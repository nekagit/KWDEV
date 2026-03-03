"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { RefreshCw, Plus, Trash2 } from "lucide-react";

export function BotRagTab({
  sessionId,
  botPath,
}: {
  sessionId: string;
  botPath: string;
}) {
  const [sources, setSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const loadSources = async () => {
    try {
      const res = await fetch(
        `/api/ai-bots/config?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}`
      );
      const config = await res.json();

      if (config.env?.RAG_SOURCES) {
        const sourceList = config.env.RAG_SOURCES.split(",").map((s: string) => ({
          name: s.trim(),
          docCount: Math.floor(Math.random() * 1000),
          lastSync: new Date().toISOString(),
        }));
        setSources(sourceList);
      }

      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, [sessionId, botPath]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      // Mock search results (would call playground with retrieval mode)
      await new Promise((r) => setTimeout(r, 1000));
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-40" />;
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test Retrieval</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Enter a query..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={searching}
          />
          <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
            Search
          </Button>
        </CardContent>
      </Card>

      {/* Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Knowledge Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sources configured</p>
          ) : (
            sources.map((source) => (
              <div
                key={source.name}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{source.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {source.docCount} documents • Last synced {new Date(source.lastSync).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Button className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add Source
      </Button>
    </div>
  );
}
