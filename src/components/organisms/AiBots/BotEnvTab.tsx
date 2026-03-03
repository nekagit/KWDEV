"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerApiUrl } from "@/lib/server-api-url";
import { parseDotEnv } from "@/lib/zeroclaw-parser";
import { KeyRound, Plus, Trash2, Save, RefreshCw, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

const SECRETS_FILE = "secrets/.env";

function isSensitiveKey(key: string): boolean {
  return /(_KEY|_SECRET|_TOKEN|PASSWORD|_PASSWORD|USERNAME|_USER)$/i.test(key);
}

export function BotEnvTab({
  sessionId,
  botPath,
}: {
  sessionId: string;
  botPath: string;
}) {
  const [entries, setEntries] = useState<{ key: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);

  const isAgentPath = botPath.includes("/agents/") || botPath.includes("/agent/");

  const loadSecrets = useCallback(async () => {
    setLoading(true);
    try {
      const url = getServerApiUrl(
        `/api/ai-bots/files/read?sessionId=${encodeURIComponent(sessionId)}&botPath=${encodeURIComponent(botPath)}&file=${encodeURIComponent(SECRETS_FILE)}`
      );
      const res = await fetch(url);
      const data = await res.json();
      const text = (
        typeof data?.content === "string"
          ? data.content
          : data?.content != null
            ? String(data.content)
            : ""
      ).trim();
      const parsed = parseDotEnv(text || "");
      const list =
        Object.keys(parsed).length > 0
          ? Object.entries(parsed).map(([key, value]) => ({ key, value }))
          : [{ key: "", value: "" }];
      setEntries(list);
    } catch {
      setEntries([{ key: "", value: "" }]);
      toast.error("Could not load secrets");
    } finally {
      setLoading(false);
    }
  }, [sessionId, botPath]);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const updateEntry = (index: number, field: "key" | "value", value: string) => {
    setEntries((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addEntry = () => {
    setEntries((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const buildEnvContent = (): string => {
    return entries
      .filter((e) => e.key.trim() !== "")
      .map((e) => {
        const k = e.key.trim();
        const v = e.value.trim();
        if (v.includes(" ") || v.includes("#") || v.includes('"') || v.includes("\n")) {
          return `${k}="${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
        }
        return `${k}=${v}`;
      })
      .join("\n");
  };

  const handleCopyFromAiFolder = async () => {
    setCopying(true);
    try {
      const res = await fetch(getServerApiUrl("/api/ai-bots/env/copy-from-base"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, botPath }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Copied .env from AI folder");
        await loadSecrets();
      } else {
        toast.error(data?.error || "Failed to copy");
      }
    } catch (err) {
      toast.error((err as Error).message || "Failed to copy");
    } finally {
      setCopying(false);
    }
  };

  const handleSave = async () => {
    const valid = entries.filter((e) => e.key.trim() !== "");
    if (valid.length === 0) {
      toast.error("Add at least one key");
      return;
    }
    setSaving(true);
    try {
      const content = buildEnvContent();
      const res = await fetch(getServerApiUrl("/api/ai-bots/config"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, botPath, file: SECRETS_FILE, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to save secrets");
        return;
      }
      toast.success("Secrets saved");
      await loadSecrets();
    } catch (err) {
      toast.error((err as Error).message || "Failed to save secrets");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              Secrets (Env)
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {isAgentPath && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyFromAiFolder}
                  disabled={copying}
                  className="gap-2"
                  title="Copy .env from AI folder (e.g. /var/www/ai) into this agent's secrets"
                >
                  {copying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy from AI folder
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={loadSecrets} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Store secrets here (e.g. Telegram, API keys). They are saved in{" "}
            <code className="text-xs bg-muted px-1 rounded">secrets/.env</code> under this agent folder. For Basic/Advanced/Premium, values from the AI folder{" "}
            <code className="text-xs bg-muted px-1 rounded">.env</code> are merged in when loading (agent overrides). Use “Copy from AI folder” to copy that .env into this agent’s secrets.
          </p>

          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div className="flex-1 min-w-0 space-y-1">
                  <Label className="text-xs text-muted-foreground">Key</Label>
                  <Input
                    placeholder="e.g. INSTAGRAM_USER"
                    value={entry.key}
                    onChange={(e) => updateEntry(index, "key", e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex-[2] min-w-0 space-y-1">
                  <Label className="text-xs text-muted-foreground">Value</Label>
                  {isSensitiveKey(entry.key) ? (
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={entry.value}
                      onChange={(e) => updateEntry(index, "value", e.target.value)}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <Input
                      placeholder="value"
                      value={entry.value}
                      onChange={(e) => updateEntry(index, "value", e.target.value)}
                      className="font-mono text-sm"
                    />
                  )}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeEntry(index)}
                  aria-label="Remove entry"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addEntry} className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              Add secret
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
