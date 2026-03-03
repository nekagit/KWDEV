"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Activity, HardDrive, Cpu, Network, Users, AlertCircle, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getServerApiUrl } from "@/lib/server-api-url";
import { hasValidSessionId } from "@/lib/server-session";

export function ServerStatsGrid({ sessionId }: { sessionId: string | null | undefined }) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        if (!hasValidSessionId(sessionId)) {
            setLoading(false);
            return;
        }
        setError(null);
        try {
            const url = getServerApiUrl(`/api/server/stats?sessionId=${encodeURIComponent(sessionId)}`);
            const res = await fetch(url);
            const data = await res.json().catch(() => ({}));
            const validStats =
                res.ok &&
                data != null &&
                typeof data === "object" &&
                !("error" in data && data.error) &&
                data.memory != null &&
                typeof data.memory === "object";
            if (validStats) {
                setStats(data);
            } else {
                setStats(null);
                setError(
                    (typeof data === "object" && data !== null && "error" in data && data.error) ||
                        `Request failed (${res.status})`
                );
            }
        } catch (err) {
            setStats(null);
            setError(err instanceof Error ? err.message : "Failed to fetch statistics");
        } finally {
            setLoading(false);
        }
    }, [sessionId]);

    useEffect(() => {
        if (!hasValidSessionId(sessionId)) {
            setLoading(false);
            setError("Session is required. Please disconnect and connect again.");
            setStats(null);
            return;
        }
        setError(null);
        fetchStats();
        const interval = setInterval(fetchStats, 30000); // 30s
        return () => clearInterval(interval);
    }, [sessionId, fetchStats]);

    if (!hasValidSessionId(sessionId)) {
        return (
            <Card className="flex items-center justify-center p-12 min-h-[300px]">
                <div className="flex flex-col items-center gap-4 text-muted-foreground max-w-md text-center">
                    <AlertCircle className="size-10 text-amber-500" />
                    <p className="font-medium text-foreground">Session is required</p>
                    <p className="text-sm">Disconnect and connect again to load server statistics.</p>
                </div>
            </Card>
        );
    }

    if (loading && !stats && !error) {
        return (
            <Card className="flex items-center justify-center p-12 min-h-[300px]">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Loader2 className="size-8 animate-spin" />
                    <p>Fetching server statistics...</p>
                </div>
            </Card>
        );
    }

    if (error && !stats) {
        const isSessionRequired = /sessionId is required/i.test(error);
        return (
            <Card className="flex items-center justify-center p-12 min-h-[300px]">
                <div className="flex flex-col items-center gap-4 text-muted-foreground max-w-md text-center">
                    <AlertCircle className="size-10 text-amber-500" />
                    <div>
                        <p className="font-medium text-foreground">
                            {isSessionRequired ? "Session is required" : "Could not load server statistics"}
                        </p>
                        <p className="text-sm mt-1">
                            {isSessionRequired
                                ? "Disconnect and connect again so the server session is set correctly."
                                : error}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); fetchStats(); }}>
                        <RotateCw className="size-4 mr-2" />
                        Retry
                    </Button>
                </div>
            </Card>
        );
    }

    if (!stats || typeof stats !== "object" || !stats.memory) {
        return (
            <Card className="flex items-center justify-center p-12 min-h-[300px]">
                <div className="flex flex-col items-center gap-4 text-muted-foreground max-w-md text-center">
                    <AlertCircle className="size-10 text-amber-500" />
                    <p className="font-medium text-foreground">Could not load server statistics</p>
                    <p className="text-sm">Invalid or missing stats data. Please try again.</p>
                    <Button variant="outline" size="sm" onClick={() => { setLoading(true); setError(null); fetchStats(); }}>
                        <RotateCw className="size-4 mr-2" />
                        Retry
                    </Button>
                </div>
            </Card>
        );
    }

    const memPercent = stats.memory?.total ? (stats.memory.used / stats.memory.total) * 100 : 0;
    const swapPercent = stats.memory?.swapTotal ? (stats.memory.swapUsed / stats.memory.swapTotal) * 100 : 0;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">

                {/* System Info */}
                <Card className="col-span-1 md:col-span-2 lg:col-span-1 border-indigo-500/10 hover:border-indigo-500/30 transition-colors min-w-0 overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Activity className="size-4 text-indigo-400 shrink-0" /> System
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 min-w-0">
                        <div className="text-base font-bold truncate" title={stats.system?.hostname || "Unknown"}>{stats.system?.hostname || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground space-y-1 min-w-0">
                            <p className="truncate"><span className="font-medium text-foreground">OS:</span> {stats.system?.os}</p>
                            <p className="truncate"><span className="font-medium text-foreground">Kernel:</span> {stats.system?.kernel}</p>
                            <p className="truncate"><span className="font-medium text-foreground">Uptime:</span> {stats.system?.uptime} up</p>
                        </div>
                    </CardContent>
                </Card>

                {/* CPU */}
                <Card className="col-span-1 border-rose-500/10 hover:border-rose-500/30 transition-colors min-w-0 overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Cpu className="size-4 text-rose-400 shrink-0" /> CPU ({stats.cpu?.cores} Cores)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 min-w-0">
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs mb-1">
                                <span>Usage</span>
                                <span className="font-bold">{stats.cpu?.usage}%</span>
                            </div>
                            <Progress value={parseFloat(stats.cpu?.usage)} className="h-2" />
                        </div>
                        <div className="text-xs text-muted-foreground">
                            <p className="mb-1"><span className="font-medium text-foreground">Load Average</span></p>
                            <div className="flex gap-2">
                                <span className="bg-muted px-2 py-0.5 rounded">{stats.cpu?.load?.[0]} (1m)</span>
                                <span className="bg-muted px-2 py-0.5 rounded">{stats.cpu?.load?.[1]} (5m)</span>
                                <span className="bg-muted px-2 py-0.5 rounded">{stats.cpu?.load?.[2]} (15m)</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Memory */}
                <Card className="col-span-1 border-emerald-500/10 hover:border-emerald-500/30 transition-colors min-w-0 overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <HardDrive className="size-4 text-emerald-400 shrink-0" /> Memory
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 min-w-0">
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs mb-1">
                                <span>RAM</span>
                                <span className="font-bold">{(stats.memory?.used / 1024).toFixed(1)} / {(stats.memory?.total / 1024).toFixed(1)} GB</span>
                            </div>
                            <Progress value={memPercent} className="h-2" />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs mb-1">
                                <span>Swap</span>
                                <span className="font-bold">{(stats.memory?.swapUsed / 1024).toFixed(1)} / {(stats.memory?.swapTotal / 1024).toFixed(1)} GB</span>
                            </div>
                            <Progress value={swapPercent} className="h-2 opacity-50" />
                        </div>
                    </CardContent>
                </Card>

                {/* Users */}
                <Card className="col-span-1 border-amber-500/10 hover:border-amber-500/30 transition-colors min-w-0 overflow-hidden flex flex-col min-h-0">
                    <CardHeader className="pb-2 shrink-0">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="size-4 text-amber-400 shrink-0" /> Logged In Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="min-h-0 flex-1 min-w-0 overflow-hidden">
                        {stats.users?.length > 0 ? (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {stats.users.map((u: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-xs border-b border-border/50 pb-2 last:border-0 gap-2 min-w-0">
                                        <div className="font-medium text-amber-500 flex items-center gap-2 min-w-0 truncate">
                                            <div className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                                            <span className="truncate">{u.user}</span>
                                        </div>
                                        <div className="text-right shrink-0 text-muted-foreground">
                                            <div className="text-[10px] truncate" title={u.ip}>{u.ip}</div>
                                            <div className="text-[10px] text-muted-foreground/60">{u.tty} • {u.date}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground">No active users.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
                {/* Disks array */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2 border-b border-border/50 mb-3">
                        <CardTitle className="text-sm font-medium">Disk Partitions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {stats.disk?.map((d: any, i: number) => {
                            const p = parseFloat(d.percent);
                            return (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium">{d.mount}</span>
                                        <span className="font-mono text-muted-foreground">{(d.used / 1024).toFixed(1)} / {(d.total / 1024).toFixed(1)} GB ({d.percent})</span>
                                    </div>
                                    <Progress value={p} className={cn("h-1.5", p > 85 ? "[&>div]:bg-rose-500" : "")} />
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Top Processes */}
                <Card className="col-span-1">
                    <CardHeader className="pb-2 border-b border-border/50 mb-3">
                        <CardTitle className="text-sm font-medium">Top Processes by CPU</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        <table className="w-full text-xs text-left">
                            <thead>
                                <tr className="text-muted-foreground">
                                    <th className="pb-2 font-medium">PID</th>
                                    <th className="pb-2 font-medium">User</th>
                                    <th className="pb-2 font-medium text-right">CPU%</th>
                                    <th className="pb-2 font-medium text-right">MEM%</th>
                                    <th className="pb-2 font-medium pl-4">Command</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 font-mono">
                                {stats.processes?.map((p: any, i: number) => (
                                    <tr key={i} className="hover:bg-muted/30">
                                        <td className="py-1.5">{p.pid}</td>
                                        <td className="py-1.5 text-muted-foreground truncate max-w-[60px]">{p.user}</td>
                                        <td className="py-1.5 text-right font-medium text-rose-400">{p.cpu}</td>
                                        <td className="py-1.5 text-right font-medium text-emerald-400">{p.mem}</td>
                                        <td className="py-1.5 pl-4 truncate max-w-[150px]" title={p.command}>{p.command}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


