"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plug2, Save, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPresets, savePreset, deletePreset, createPreset } from "@/lib/ai-bots-presets";
import { getServerApiUrl } from "@/lib/server-api-url";
import { getDefaultSshHost } from "@/lib/default-ssh-host";

/** Prefix for dropdown ids that refer to SSH config hosts (value after prefix = Host alias). */
const SSH_CONFIG_ID_PREFIX = "ssh:";

interface ServerProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
}

/** Unified server option: either a saved profile or an SSH config host. */
interface ServerOption {
  id: string;
  name: string;
  host: string;
  isSshConfig: boolean;
}

export function BotServerSelector({
  onConnect,
  onDisconnect,
  isConnected,
}: {
  onConnect: (sessionId: string, botPath: string, botName: string, serverLabel?: string) => void;
  onDisconnect: () => void;
  isConnected: boolean;
}) {
  const [serverOptions, setServerOptions] = useState<ServerOption[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [botPath, setBotPath] = useState<string>("/root/zeroclaw");
  const [botName, setBotName] = useState<string>("zeroclaw");
  const [connecting, setConnecting] = useState(false);
  const [presets, setPresets] = useState<any[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [showPresetName, setShowPresetName] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  // Load servers: saved profiles + SSH config hosts; pre-select default host from .env if present
  useEffect(() => {
    const defaultHost = getDefaultSshHost();
    const loadServers = async () => {
      try {
        const [profilesRes, sshRes] = await Promise.all([
          fetch(getServerApiUrl("/api/server/profiles")),
          fetch(getServerApiUrl("/api/server/ssh-config")),
        ]);
        const profilesData = await profilesRes.json();
        const sshData = await sshRes.json();
        const profiles: ServerProfile[] = Array.isArray(profilesData?.profiles) ? profilesData.profiles : [];
        const sshHosts = Array.isArray(sshData?.hosts) ? sshData.hosts : [];
        const options: ServerOption[] = [
          ...profiles.map((p) => ({ id: p.id, name: p.name, host: p.host, isSshConfig: false })),
          ...sshHosts.map((h: { host: string; hostName?: string }) => ({
            id: SSH_CONFIG_ID_PREFIX + h.host,
            name: h.host,
            host: h.hostName ?? h.host,
            isSshConfig: true,
          })),
        ];
        setServerOptions(options);
        if (options.length > 0 && !selectedServerId) {
          const preferred = defaultHost ? options.find((s) => s.name === defaultHost) : null;
          if (preferred) {
            setSelectedServerId(preferred.id);
            setBotPath("/var/www/ai/zero");
            setBotName("zero");
          } else {
            setSelectedServerId(options[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load servers:", err);
      }
    };

    loadServers();
    setPresets(getPresets());
  }, []);

  const handleConnect = async () => {
    if (!selectedServerId || !botPath.trim()) {
      alert("Please select a server and bot path");
      return;
    }

    setConnecting(true);
    try {
      const isSshConfig = selectedServerId.startsWith(SSH_CONFIG_ID_PREFIX);
      const body = isSshConfig
        ? { sshConfigHost: selectedServerId.slice(SSH_CONFIG_ID_PREFIX.length) }
        : { serverId: selectedServerId };
      const connectRes = await fetch(getServerApiUrl("/api/server/connect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await connectRes.json();
      if (!connectRes.ok) {
        alert(data?.error ?? "Connection failed");
        return;
      }
      if (data.sessionId) {
        const serverLabel = selectedServer?.name ?? undefined;
        onConnect(data.sessionId, botPath, botName, serverLabel);
      }
    } catch (err) {
      alert(`Connection failed: ${err}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setSelectedServerId(preset.serverId);
      setBotPath(preset.path);
      setSelectedPresetId(presetId);
    }
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      alert("Please enter a preset name");
      return;
    }

    const preset = createPreset(newPresetName, selectedServerId, botPath);
    setPresets(getPresets());
    setSelectedPresetId(preset.id);
    setNewPresetName("");
    setShowPresetName(false);
  };

  const handleDeletePreset = (presetId: string) => {
    if (confirm("Delete this preset?")) {
      deletePreset(presetId);
      setPresets(getPresets());
      if (selectedPresetId === presetId) {
        setSelectedPresetId("");
      }
    }
  };

  const selectedServer = serverOptions.find((s) => s.id === selectedServerId);
  const defaultHost = getDefaultSshHost();
  const isDefaultHost = defaultHost !== null && selectedServer?.name === defaultHost;

  // When user selects the default host (from .env), default bot path to /var/www/ai if still on /root/zeroclaw
  useEffect(() => {
    if (!selectedServerId || !serverOptions.length || !defaultHost) return;
    const server = serverOptions.find((s) => s.id === selectedServerId);
    if (server?.name !== defaultHost) return;
    setBotPath((prev) => (prev === "/root/zeroclaw" ? "/var/www/ai" : prev));
  }, [selectedServerId, serverOptions, defaultHost]);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug2 className="w-5 h-5" />
          Connect to Bot Instance
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Server Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Server</label>
            <Select value={selectedServerId} onValueChange={setSelectedServerId} disabled={isConnected}>
              <SelectTrigger>
                <SelectValue placeholder="Select server..." />
              </SelectTrigger>
              <SelectContent>
                {serverOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.isSshConfig ? " (SSH config)" : ` (${s.host})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Bot Path Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Bot Path</label>
            <Input
              type="text"
              placeholder="/root/zeroclaw"
              value={botPath}
              onChange={(e) => setBotPath(e.target.value)}
              disabled={isConnected}
              className="font-mono text-sm"
            />
            {isDefaultHost && (
              <p className="text-xs text-muted-foreground">Common path for this server: /var/www/ai</p>
            )}
          </div>

          {/* Bot Name Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Bot Name</label>
            <Input
              type="text"
              placeholder="zeroclaw"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              disabled={isConnected}
              className="font-mono text-sm"
            />
          </div>

          {/* Connect Button */}
          <div className="flex flex-col gap-2 justify-end">
            {!isConnected ? (
              <Button onClick={handleConnect} disabled={connecting || !selectedServerId}>
                {connecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plug2 className="w-4 h-4 mr-2" />}
                {connecting ? "Connecting..." : "Connect"}
              </Button>
            ) : (
              <Button onClick={onDisconnect} variant="destructive">
                Disconnect
              </Button>
            )}
          </div>
        </div>

        {/* Presets Section */}
        {presets.length > 0 && (
          <div className="pt-4 border-t border-border/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium">Saved Presets:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm transition-all cursor-pointer",
                    selectedPresetId === preset.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/40 border-border/50 hover:border-border"
                  )}
                >
                  <span onClick={() => handleLoadPreset(preset.id)} className="flex-1">
                    {preset.name}
                  </span>
                  <button onClick={() => handleDeletePreset(preset.id)} className="p-0.5 hover:bg-destructive/20 rounded">
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Preset */}
        {selectedServerId && botPath && (
          <div className="flex gap-2">
            {!showPresetName ? (
              <Button size="sm" variant="outline" onClick={() => setShowPresetName(true)}>
                <Plus className="w-3 h-3 mr-1" />
                Save as Preset
              </Button>
            ) : (
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="Preset name (e.g. Production Bot)"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleSavePreset}>
                  <Save className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowPresetName(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Status Indicator */}
        {isConnected && selectedServer && (
          <div className="mt-4 p-3 rounded-lg bg-success/10 border border-success/20 text-sm">
            ✓ Connected to <strong>{selectedServer.name}</strong> at <code className="font-mono">{botPath}</code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
