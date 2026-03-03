"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { Download, Pause, Play, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function BotLogsTab({
  sessionId,
  botPath,
}: {
  sessionId: string;
  botPath: string;
}) {
  const [logLines, setLogLines] = useState<string[]>([]);
  const [filteredLines, setFilteredLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [levelFilter, setLevelFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadLogs = async () => {
    try {
      const res = await fetch(
        `/api/ai-bots/logs?sessionId=${encodeURIComponent(sessionId)}&botPath=${encodeURIComponent(
          botPath
        )}&lines=100`
      );
      const data = await res.json();
      if (!paused) {
        setLogLines(data.lines || []);
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 3000);
    return () => clearInterval(interval);
  }, [sessionId, botPath]);

  // Filter logs
  useEffect(() => {
    let filtered = logLines;

    if (levelFilter !== "all") {
      filtered = filtered.filter((line) => line.includes(levelFilter.toUpperCase()));
    }

    if (searchQuery) {
      filtered = filtered.filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    setFilteredLines(filtered);
  }, [logLines, levelFilter, searchQuery]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLines, paused]);

  const getLogColor = (line: string) => {
    if (line.includes("ERROR")) return "text-destructive";
    if (line.includes("WARN")) return "text-warning";
    if (line.includes("SUCCESS")) return "text-success";
    return "text-muted-foreground";
  };

  const handleDownload = () => {
    const content = logLines.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bot-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-6" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="text-xs font-medium block mb-1">Search</label>
          <Input
            placeholder="Filter logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm"
          />
        </div>

        <div className="w-full md:w-40">
          <label className="text-xs font-medium block mb-1">Level</label>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">ERROR</SelectItem>
              <SelectItem value="warn">WARNING</SelectItem>
              <SelectItem value="info">INFO</SelectItem>
              <SelectItem value="success">SUCCESS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </Button>
          <Button size="sm" variant="outline" onClick={loadLogs}>
            <RotateCw className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Log Viewer */}
      <Card className="bg-black/30 border-border/50">
        <ScrollArea
          ref={scrollRef as any}
          className="h-[500px] rounded-lg bg-black/50 p-4 font-mono text-xs"
        >
          {filteredLines.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No logs to display</p>
          ) : (
            <div className="space-y-1">
              {filteredLines.map((line, i) => (
                <div key={i} className={cn("whitespace-pre-wrap break-words", getLogColor(line))}>
                  {line}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Card className="bg-card-tint-1">
          <CardContent className="p-3">
            <p className="text-muted-foreground text-xs">Total Lines</p>
            <p className="font-semibold">{logLines.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card-tint-2">
          <CardContent className="p-3">
            <p className="text-muted-foreground text-xs">Filtered</p>
            <p className="font-semibold">{filteredLines.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card-tint-3">
          <CardContent className="p-3">
            <p className="text-muted-foreground text-xs">Errors</p>
            <p className="font-semibold text-destructive">{logLines.filter((l) => l.includes("ERROR")).length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card-tint-4">
          <CardContent className="p-3">
            <p className="text-muted-foreground text-xs">Status</p>
            <p className="font-semibold">{paused ? "Paused" : "Live"}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
