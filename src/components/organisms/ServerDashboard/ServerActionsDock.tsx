"use client";

import { useState } from "react";
import { Sparkles, Terminal, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { getServerApiUrl } from "@/lib/server-api-url";
import { dispatchServerTerminalRanAndOpenFloating } from "@/components/organisms/ServerDashboard/ServerTerminalScrollButton";

async function injectIntoTerminal(
    sessionId: string,
    type: "agent" | "command",
    payload: { prompt?: string; command?: string }
) {
    const res = await fetch(getServerApiUrl("/api/server/terminal/inject"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, type, ...payload }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Inject failed");
    }
}

const QUICK_COMMANDS: { label: string; command: string; icon: typeof RefreshCw }[] = [
    {
        label: "Check updates",
        command: "hash apt 2>/dev/null && sudo apt update -y && sudo apt list --upgradable || (sudo yum check-update 2>/dev/null || true)",
        icon: RefreshCw,
    },
    {
        label: "Firewall status",
        command: "hash ufw 2>/dev/null && sudo ufw status || sudo iptables -L",
        icon: Shield,
    },
];

/**
 * Floating dock at bottom-left on Server page when connected.
 * Run agent (prompt), Custom command, and optional quick commands that run in the server terminal.
 */
export function ServerActionsDock({ sessionId }: { sessionId: string }) {
    const [agentPrompt, setAgentPrompt] = useState("");
    const [agentOpen, setAgentOpen] = useState(false);
    const [command, setCommand] = useState("");
    const [commandOpen, setCommandOpen] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);

    const runAgent = async () => {
        const p = agentPrompt.trim();
        if (!p) return;
        setLoading("agent");
        try {
            await injectIntoTerminal(sessionId, "agent", { prompt: p });
            dispatchServerTerminalRanAndOpenFloating(sessionId);
            toast.success("Running on server terminal…");
            setAgentPrompt("");
            setAgentOpen(false);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to run agent");
        } finally {
            setLoading(null);
        }
    };

    const runCommand = async () => {
        const c = command.trim();
        if (!c) return;
        setLoading("command");
        try {
            await injectIntoTerminal(sessionId, "command", { command: c });
            dispatchServerTerminalRanAndOpenFloating(sessionId);
            toast.success("Running in terminal…");
            setCommand("");
            setCommandOpen(false);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to run command");
        } finally {
            setLoading(null);
        }
    };

    const runQuick = async (cmd: string) => {
        setLoading("quick");
        try {
            await injectIntoTerminal(sessionId, "command", { command: cmd });
            dispatchServerTerminalRanAndOpenFloating(sessionId);
            toast.success("Running in terminal…");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
        } finally {
            setLoading(null);
        }
    };

    return (
        <TooltipProvider delayDuration={300}>
            <div
                className="fixed bottom-6 left-6 z-[99998] flex flex-wrap items-center gap-2 pointer-events-none"
                aria-label="Server actions dock"
            >
                <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/95 shadow-lg px-2 py-2 backdrop-blur-sm">
                    <Popover open={agentOpen} onOpenChange={setAgentOpen}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-9 gap-1.5 text-xs"
                                        disabled={loading !== null}
                                    >
                                        <Sparkles className="size-3.5 text-indigo-400" />
                                        Run agent
                                    </Button>
                                </PopoverTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                Run Cursor CLI on server (output in terminal)
                            </TooltipContent>
                        </Tooltip>
                        <PopoverContent className="w-[300px]" align="start" side="right">
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Agent prompt</label>
                                <Textarea
                                    placeholder="e.g. List running processes"
                                    value={agentPrompt}
                                    onChange={(e) => setAgentPrompt(e.target.value)}
                                    className="min-h-[72px] text-xs resize-none"
                                    onKeyDown={(e) =>
                                        e.key === "Enter" && !e.shiftKey && (e.preventDefault(), runAgent())
                                    }
                                />
                                <Button
                                    size="sm"
                                    className="w-full"
                                    onClick={runAgent}
                                    disabled={!agentPrompt.trim() || loading !== null}
                                >
                                    {loading === "agent" ? "Running…" : "Run in terminal"}
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Popover open={commandOpen} onOpenChange={setCommandOpen}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-9 gap-1.5 text-xs"
                                        disabled={loading !== null}
                                    >
                                        <Terminal className="size-3.5" />
                                        Command
                                    </Button>
                                </PopoverTrigger>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                Run a custom command in server terminal
                            </TooltipContent>
                        </Tooltip>
                        <PopoverContent className="w-[300px]" align="start" side="right">
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Custom command</label>
                                <Input
                                    placeholder="e.g. ls -la"
                                    value={command}
                                    onChange={(e) => setCommand(e.target.value)}
                                    className="font-mono text-xs"
                                    onKeyDown={(e) =>
                                        e.key === "Enter" && (e.preventDefault(), runCommand())
                                    }
                                />
                                <Button
                                    size="sm"
                                    className="w-full"
                                    onClick={runCommand}
                                    disabled={!command.trim() || loading !== null}
                                >
                                    {loading === "command" ? "Running…" : "Run in terminal"}
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {QUICK_COMMANDS.map(({ label, command: cmd, icon: Icon }) => (
                        <Tooltip key={label}>
                            <TooltipTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                                    disabled={loading !== null}
                                    onClick={() => runQuick(cmd)}
                                >
                                    <Icon className="size-3.5" />
                                    {label}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                Run in server terminal
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </div>
        </TooltipProvider>
    );
}
