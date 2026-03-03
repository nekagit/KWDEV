"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Server, Save, Trash2, PowerOff, Power } from "lucide-react";
import { toast } from "sonner";
import { ServerProfileRow } from "@/lib/db";
import { getServerApiUrl } from "@/lib/server-api-url";

export function ServerConnectionPanel({
    onConnect,
    onDisconnect,
    isConnected,
    currentSessionId,
    connectedLabel,
}: {
    onConnect: (sessionId: string) => void;
    onDisconnect: () => void;
    isConnected: boolean;
    currentSessionId: string | null;
    /** When connected via SSH config sidebar, this is the config host alias. */
    connectedLabel?: string | null;
}) {
    const [profiles, setProfiles] = useState<ServerProfileRow[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>("new");

    const [name, setName] = useState("");
    const [host, setHost] = useState("");
    const [port, setPort] = useState("22");
    const [username, setUsername] = useState("root");
    const [authType, setAuthType] = useState<"password" | "key">("password");
    const [authData, setAuthData] = useState("");

    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            const res = await fetch(getServerApiUrl("/api/server/profiles"));
            if (res.ok) {
                const data = await res.json();
                setProfiles(data.profiles || []);
            }
        } catch (e) {
            console.error("Failed to fetch profiles:", e);
        }
    };

    const handleProfileSelect = (id: string) => {
        setSelectedProfileId(id);
        if (id === "new") {
            setName("");
            setHost("");
            setPort("22");
            setUsername("root");
            setAuthType("password");
            setAuthData("");
        } else {
            const p = profiles.find((x) => x.id === id);
            if (p) {
                setName(p.name);
                setHost(p.host);
                setPort(p.port.toString());
                setUsername(p.username);
                setAuthType(p.auth_type as any);
                setAuthData(p.auth_data || "");
            }
        }
    };

    const handleSaveProfile = async () => {
        if (!name || !host || !username) return toast.error("Name, host, and username are required");
        try {
            const payload = {
                id: selectedProfileId === "new" ? undefined : selectedProfileId,
                name,
                host,
                port: parseInt(port, 10) || 22,
                username,
                auth_type: authType,
                auth_data: authData,
            };
            const res = await fetch(getServerApiUrl("/api/server/profiles"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                toast.success("Profile saved");
                await fetchProfiles();
                const data = await res.json();
                if (selectedProfileId === "new") setSelectedProfileId(data.id);
            } else {
                const e = await res.json();
                toast.error(e.error || "Failed to save");
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleDeleteProfile = async () => {
        if (selectedProfileId === "new") return;
        try {
            const res = await fetch(getServerApiUrl(`/api/server/profiles?id=${selectedProfileId}`), { method: "DELETE" });
            if (res.ok) {
                toast.success("Profile deleted");
                setSelectedProfileId("new");
                handleProfileSelect("new");
                await fetchProfiles();
            }
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const handleConnect = async () => {
        if (!host || !username || !authData) {
            return toast.error("Host, username, and password/key are required to connect");
        }
        setConnecting(true);
        try {
            const payload: any = { host, port: parseInt(port, 10) || 22, username };
            if (authType === "password") payload.password = authData;
            else payload.privateKey = authData;

            const res = await fetch(getServerApiUrl("/api/server/connect"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success("Connected via SSH");
                onConnect(data.sessionId);
            } else {
                const e = await res.json();
                toast.error(e.error || "Connection failed");
            }
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!currentSessionId) return;
        try {
            await fetch(getServerApiUrl("/api/server/disconnect"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId: currentSessionId }),
            });
            toast.success("Disconnected");
        } catch (e) {
            console.error("Failed to disconnect:", e);
        }
        onDisconnect();
    };

    const displayHost = connectedLabel ?? host;
    const displaySubline = host ? `${username}@${host}:${port || 22}` : (connectedLabel ? `SSH config: ${connectedLabel}` : null);

    if (isConnected) {
        return (
            <Card className="border-emerald-500/20 shadow-emerald-500/10">
                <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                        <div>
                            <p className="text-sm font-medium">Connected to {displayHost}</p>
                            {displaySubline && (
                                <p className="text-xs text-muted-foreground">{displaySubline}</p>
                            )}
                        </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleDisconnect} className="gap-2">
                        <PowerOff className="size-4" /> Disconnect
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Server className="size-5 text-indigo-400" />
                    SSH Connection
                </CardTitle>
                <CardDescription>Select a profile or enter credentials to connect to a remote server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1">
                        <Label>Profile</Label>
                        <Select value={selectedProfileId} onValueChange={handleProfileSelect}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a profile" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">-- New Profile --</SelectItem>
                                {profiles.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name} ({p.host})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedProfileId !== "new" && (
                        <Button variant="outline" size="icon" className="mt-5text-red-400 hover:text-red-500" onClick={handleDeleteProfile}>
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>

                <div className="space-y-1">
                    <Label>Profile Name</Label>
                    <Input placeholder="e.g. Production Web DB" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-3 space-y-1">
                        <Label>Host / IP</Label>
                        <Input placeholder="192.168.1.10" value={host} onChange={(e) => setHost(e.target.value)} />
                    </div>
                    <div className="col-span-1 space-y-1">
                        <Label>Port</Label>
                        <Input placeholder="22" value={port} onChange={(e) => setPort(e.target.value)} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label>Username</Label>
                        <Input placeholder="root" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                        <Label>Auth Type</Label>
                        <Select value={authType} onValueChange={(v: any) => setAuthType(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="password">Password</SelectItem>
                                <SelectItem value="key">Private Key</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-1">
                    <Label>{authType === "password" ? "Password" : "Private Key"}</Label>
                    {authType === "password" ? (
                        <Input type="password" placeholder="Password" value={authData} onChange={(e) => setAuthData(e.target.value)} />
                    ) : (
                        <textarea
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                            placeholder="-----BEGIN RSA PRIVATE KEY-----..."
                            value={authData}
                            onChange={(e) => setAuthData(e.target.value)}
                        />
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleSaveProfile} className="gap-2">
                    <Save className="size-4" /> Save Profile
                </Button>
                <Button onClick={handleConnect} disabled={connecting} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Power className="size-4" /> {connecting ? "Connecting..." : "Connect"}
                </Button>
            </CardFooter>
        </Card>
    );
}
