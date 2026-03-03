"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { AlertCircle, Save, RotateCcw, FileText, ChevronDown, ChevronUp } from "lucide-react";

const CONFIG_FILE_PATTERNS = [
  (name: string) => name === ".env",
  (name: string) => name.startsWith(".env."),
  (name: string) => name === "package.json",
  (name: string) => name === "zeroclaw.config.js",
  (name: string) => name === "ecosystem.config.js",
  (name: string) => name === "tsconfig.json",
  (name: string) => name.endsWith(".config.js") && !name.includes("/"),
];

function isConfigFile(name: string): boolean {
  return CONFIG_FILE_PATTERNS.some((fn) => fn(name));
}

interface FileEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
}

export function BotConfigTab({
  sessionId,
  botPath,
}: {
  sessionId: string;
  botPath: string;
}) {
  const [config, setConfig] = useState<Record<string, any> | null>(null);
  const [editedConfig, setEditedConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [configFiles, setConfigFiles] = useState<FileEntry[]>([]);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [viewContent, setViewContent] = useState<string | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const loadConfig = async () => {
    try {
      const res = await fetch(
        `/api/ai-bots/config?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}`
      );
      const data = await res.json();
      setConfig(data);
      if (data.env) {
        setEditedConfig(data.env);
      }
      setError(null);
      setHasChanges(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadConfigFiles = async () => {
    try {
      const res = await fetch(
        `/api/ai-bots/files?sessionId=${sessionId}&path=${encodeURIComponent(botPath)}`
      );
      const data = await res.json();
      const list: FileEntry[] = (data.files || []).filter(
        (e: FileEntry) => e.type === "file" && isConfigFile(e.name)
      );
      setConfigFiles(list);
    } catch {
      setConfigFiles([]);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [sessionId, botPath]);

  useEffect(() => {
    if (!sessionId || !botPath) return;
    loadConfigFiles();
  }, [sessionId, botPath]);

  const handleFieldChange = (key: string, value: string) => {
    setEditedConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleViewFile = async (filename: string) => {
    if (viewingFile === filename) {
      setViewingFile(null);
      setViewContent(null);
      return;
    }
    setViewingFile(filename);
    setViewLoading(true);
    setViewContent(null);
    try {
      if (filename === ".env" && config?.env) {
        const text = Object.entries(config.env)
          .map(([k, v]) => `${k}=${v}`)
          .join("\n");
        setViewContent(text);
      } else if (filename === "package.json" && config?.packageJson) {
        setViewContent(JSON.stringify(config.packageJson, null, 2));
      } else if (filename === "zeroclaw.config.js" && config?.zeroclawConfig) {
        setViewContent(config.zeroclawConfig);
      } else {
        const res = await fetch(
          `/api/ai-bots/files/read?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}&file=${encodeURIComponent(filename)}`
        );
        const data = await res.json();
        setViewContent(data.content ?? "");
      }
    } catch {
      setViewContent("(failed to load)");
    } finally {
      setViewLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Write .env file
      const envLines = Object.entries(editedConfig).map(([k, v]) => `${k}=${v}`);
      const envContent = envLines.join("\n");

      const res = await fetch("/api/ai-bots/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          botPath,
          file: ".env",
          content: envContent,
        }),
      });

      if (res.ok) {
        setHasChanges(false);
        setError(null);
      } else {
        setError("Failed to save config");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorDisplay title="Failed to load config" message={error} />;
  }

  const isSensitiveKey = (key: string) => /(_KEY|_SECRET|_TOKEN|PASSWORD)$/i.test(key);

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      {hasChanges && (
        <div className="flex gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">You have unsaved changes</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => loadConfig()}>
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-3 h-3 mr-1" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Config files list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Config files</CardTitle>
        </CardHeader>
        <CardContent>
          {configFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No config files found in this directory.</p>
          ) : (
            <div className="space-y-1">
              {configFiles.map((entry) => (
                <div
                  key={entry.name}
                  className="flex items-center justify-between gap-2 py-2 px-3 rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-mono text-sm truncate">{entry.name}</span>
                    {entry.size != null && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {entry.size} B
                      </span>
                    )}
                    {entry.modified && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {entry.modified}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleViewFile(entry.name)}
                    className="flex-shrink-0"
                  >
                    {viewingFile === entry.name ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        View
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
          {viewingFile && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">{viewingFile}</p>
              {viewLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <pre className="p-3 rounded-md bg-muted/50 text-xs font-mono overflow-auto max-h-80 border border-border/50">
                  {viewContent ?? ""}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* .env Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">.env Variables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(editedConfig).map(([key, value]) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase">{key}</label>
              {isSensitiveKey(key) ? (
                <Input
                  type="password"
                  value={value}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className="font-mono text-sm"
                />
              ) : (
                <Input
                  value={value}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className="font-mono text-sm"
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* System Prompt Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">System Prompt</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            >
              {showSystemPrompt ? "Hide" : "Show"}
            </Button>
          </div>
        </CardHeader>
        {showSystemPrompt && (
          <CardContent>
            <Textarea
              value={editedConfig["SYSTEM_PROMPT"] || ""}
              onChange={(e) => handleFieldChange("SYSTEM_PROMPT", e.target.value)}
              className="font-mono text-sm min-h-[200px]"
              placeholder="Enter system prompt..."
            />
          </CardContent>
        )}
      </Card>

      {/* package.json Info */}
      {config?.packageJson && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Package Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version:</span>
                <code className="font-mono">{config.packageJson.version || "—"}</code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Main:</span>
                <code className="font-mono">{config.packageJson.main || "—"}</code>
              </div>
              {config.packageJson.repository && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Repository:</span>
                  <code className="font-mono text-xs">
                    {typeof config.packageJson.repository === "string"
                      ? config.packageJson.repository
                      : config.packageJson.repository.url}
                  </code>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
