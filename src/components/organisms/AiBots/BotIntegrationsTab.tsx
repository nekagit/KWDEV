"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { CheckCircle2, AlertCircle, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function BotIntegrationsTab({
  sessionId,
  botPath,
}: {
  sessionId: string;
  botPath: string;
}) {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    method: "POST",
    schedule: "*/5 * * * *", // Default: every 5 minutes
  });
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  const loadIntegrations = async () => {
    try {
      const res = await fetch(
        `/api/ai-bots/config?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}`
      );
      const config = await res.json();

      // Group env vars by prefix to find integrations
      const integrationsMap = new Map<string, any>();
      if (config.env) {
        for (const [key, value] of Object.entries(config.env)) {
          const prefix = key.match(/^(\w+)_/)?.[1];
          if (prefix && ["SLACK", "DISCORD", "TELEGRAM", "WEBHOOK", "API"].includes(prefix)) {
            if (!integrationsMap.has(prefix)) {
              integrationsMap.set(prefix, { name: prefix, keys: [] });
            }
            integrationsMap.get(prefix)!.keys.push({ key, configured: !!value });
          }
        }
      }

      setIntegrations(Array.from(integrationsMap.values()));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadWebhooks = async () => {
    setLoadingWebhooks(true);
    try {
      const res = await fetch(
        `/api/ai-bots/jobs?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}`
      );
      const data = await res.json();

      // Filter jobs that are webhook-type (handler contains curl or starts with webhook:)
      const webhookJobs = (data.jobs || []).filter((job: any) =>
        job.handler?.includes("curl") || job.handler?.startsWith("webhook:")
      );

      setWebhooks(webhookJobs);
    } catch (err) {
      console.error("Failed to load webhooks:", err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
    loadWebhooks();
  }, [sessionId, botPath]);

  const handleCreateWebhook = async () => {
    if (!webhookForm.name.trim() || !webhookForm.url.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setCreatingWebhook(true);
    try {
      // Build curl command as handler
      const handler = `curl -X ${webhookForm.method} "${webhookForm.url}" || true`;

      const res = await fetch(
        `/api/ai-bots/jobs?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            name: webhookForm.name,
            schedule: webhookForm.schedule,
            handler: handler,
            enabled: true,
          }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Failed to create webhook");
        return;
      }

      toast.success("Webhook trigger created");
      setWebhookForm({ name: "", url: "", method: "POST", schedule: "*/5 * * * *" });
      setShowWebhookForm(false);
      loadWebhooks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create webhook");
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: number) => {
    if (!confirm("Delete this webhook trigger?")) return;

    try {
      const res = await fetch(
        `/api/ai-bots/jobs?sessionId=${sessionId}&botPath=${encodeURIComponent(botPath)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete",
            id: webhookId,
          }),
        }
      );

      if (!res.ok) {
        toast.error("Failed to delete webhook");
        return;
      }

      toast.success("Webhook deleted");
      loadWebhooks();
    } catch (err) {
      toast.error("Failed to delete webhook");
    }
  };

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
    return <ErrorDisplay title="Failed to load integrations" message={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Environment-based Integrations */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-3">Environment Integrations</h3>
        </div>
        {integrations.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground text-sm">No integrations configured</p>
            </CardContent>
          </Card>
        ) : (
          integrations.map((integration) => (
            <Card key={integration.name} className="bg-card-tint-1">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{integration.name}</CardTitle>
                <Badge variant={integration.keys.some((k: any) => k.configured) ? "default" : "secondary"}>
                  {integration.keys.some((k: any) => k.configured) ? "Connected" : "Not Connected"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {integration.keys.map((key: any) => (
                    <div key={key.key} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs">{key.key}</span>
                      {key.configured ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-warning" />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline">
                    Test
                  </Button>
                  <Button size="sm" variant="outline">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <Button className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {/* Webhook Triggers */}
      <div className="space-y-4 pt-4 border-t border-border/30">
        <div>
          <h3 className="text-sm font-semibold mb-3">Webhook Triggers</h3>
        </div>

        {loadingWebhooks ? (
          <Skeleton className="h-20" />
        ) : webhooks.length === 0 ? (
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground text-sm">No webhook triggers configured</p>
            </CardContent>
          </Card>
        ) : (
          webhooks.map((webhook) => (
            <Card key={webhook.id} className="bg-blue-500/5 border-blue-200/20">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base">{webhook.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Schedule: {webhook.schedule}</p>
                </div>
                <Badge variant={webhook.enabled ? "default" : "secondary"}>
                  {webhook.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-mono text-muted-foreground mb-3 break-all">{webhook.handler}</p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteWebhook(webhook.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {!showWebhookForm ? (
          <Button onClick={() => setShowWebhookForm(true)} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Webhook Trigger
          </Button>
        ) : (
          <Card className="bg-blue-500/5 border-blue-200/20">
            <CardHeader>
              <CardTitle className="text-base">Create Webhook Trigger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-name">Trigger Name</Label>
                <Input
                  id="webhook-name"
                  placeholder="e.g., Send Daily Report"
                  value={webhookForm.name}
                  onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://example.com/webhook"
                  value={webhookForm.url}
                  onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-method">HTTP Method</Label>
                  <Select value={webhookForm.method} onValueChange={(value) => setWebhookForm({ ...webhookForm, method: value })}>
                    <SelectTrigger id="webhook-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook-schedule">Cron Schedule</Label>
                  <Input
                    id="webhook-schedule"
                    placeholder="*/5 * * * *"
                    value={webhookForm.schedule}
                    onChange={(e) => setWebhookForm({ ...webhookForm, schedule: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Cron format: minute hour day month weekday (e.g., <code>0 9 * * MON</code> = 9 AM every Monday)
              </p>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleCreateWebhook} disabled={creatingWebhook} className="flex-1">
                  {creatingWebhook ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create Trigger
                </Button>
                <Button onClick={() => setShowWebhookForm(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
