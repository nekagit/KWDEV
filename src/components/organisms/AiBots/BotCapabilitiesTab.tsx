"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { CheckCircle2, XCircle, Plus, Code2 } from "lucide-react";

export interface BotCapability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

/** Extract tools/capabilities from zeroclaw.config.js raw text. */
function parseCapabilitiesFromZeroclawConfig(raw: string): BotCapability[] {
  if (!raw || !raw.trim()) return [];
  const out: BotCapability[] = [];
  // tools: [ { name: "x", description: "y" }, ... ] or tools: [ "id1", "id2" ]
  const toolsArrayMatch = raw.match(/(?:tools|capabilities)\s*:\s*\[([\s\S]*?)\]/);
  if (toolsArrayMatch) {
    const inner = toolsArrayMatch[1];
    const objectBlocks = inner.matchAll(/\{\s*name\s*:\s*["']([^"']+)["']\s*,?\s*description\s*:\s*["']([^"']*)["']/g);
    for (const m of objectBlocks) {
      out.push({ id: m[1].toLowerCase().replace(/\s+/g, "-"), name: m[1], description: m[2] || "", enabled: true });
    }
    if (out.length === 0) {
      const stringIds = inner.matchAll(/["']([^"']+)["']/g);
      for (const m of stringIds) {
        const id = m[1];
        if (id !== "name" && id !== "description") {
          out.push({ id, name: id, description: "", enabled: true });
        }
      }
    }
  }
  return out;
}

export function BotCapabilitiesTab({
  sessionId,
  botPath,
}: {
  sessionId: string;
  botPath: string;
}) {
  const [capabilities, setCapabilities] = useState<BotCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCapabilities = async () => {
    try {
      const res = await fetch(
        `/api/ai-bots/config?sessionId=${encodeURIComponent(sessionId)}&botPath=${encodeURIComponent(botPath)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load config");
      }
      const raw = (data.zeroclawConfig as string) || "";
      const list = parseCapabilitiesFromZeroclawConfig(raw);
      setCapabilities(list);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCapabilities();
  }, [sessionId, botPath]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay title="Failed to load capabilities" message={error} />;
  }

  return (
    <div className="space-y-4">
      {capabilities.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No capabilities defined</p>
      ) : (
        <>
          {capabilities.map((cap) => (
            <Card key={cap.id} className="bg-card-tint-1">
              <CardContent className="pt-6 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Code2 className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold text-sm">{cap.name}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">{cap.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {cap.enabled ? (
                    <Badge className="bg-success/20 text-success border-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Enabled
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <XCircle className="w-3 h-3 mr-1" />
                      Disabled
                    </Badge>
                  )}
                  <Button size="sm" variant="outline">
                    {cap.enabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Capability
          </Button>
        </>
      )}
    </div>
  );
}
