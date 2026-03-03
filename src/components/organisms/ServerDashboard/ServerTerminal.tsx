"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Terminal as TerminalIcon, Copy } from "lucide-react";
import { toast } from "sonner";
import { getServerApiUrl } from "@/lib/server-api-url";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { getXtermBufferText } from "@/lib/xterm-utils";
import { dispatchServerTerminalRanAndOpenFloating } from "@/components/organisms/ServerDashboard/ServerTerminalScrollButton";

async function injectIntoTerminal(sessionId: string, type: "agent" | "command", payload: { prompt?: string; command?: string }) {
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

export function ServerTerminal({ sessionId }: { sessionId: string }) {
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);
    const [agentPrompt, setAgentPrompt] = useState("");
    const [agentOpen, setAgentOpen] = useState(false);
    const [terminalCommand, setTerminalCommand] = useState("");
    const [streamError, setStreamError] = useState<string | null>(null);

    useEffect(() => {
        if (!terminalRef.current) return;

        // Initialize Xterm
        const term = new Terminal({
            cursorBlink: true,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 13,
            theme: {
                background: "#0c0c0c",
                foreground: "#cccccc",
            }
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(terminalRef.current);
        fitAddon.fit();
        xtermRef.current = term;

        const handleResize = () => {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims) {
                fetch(getServerApiUrl("/api/server/terminal/input"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId, resize: { rows: dims.rows, cols: dims.cols } }),
                }).catch(() => { });
            }
        };
        window.addEventListener("resize", handleResize);

        // Propose initial resize
        setTimeout(handleResize, 100);

        // Setup EventSource for SSE output
        setStreamError(null);
        const sse = new EventSource(getServerApiUrl(`/api/server/terminal/stream?sessionId=${encodeURIComponent(sessionId)}`));

        sse.onmessage = (event) => {
            setStreamError(null); // clear error once we receive data
            if (event.data === "heartbeat") return;
            try {
                const text = JSON.parse(event.data);
                term.write(text);
            } catch (e) {
                term.write(event.data);
            }
        };

        sse.onerror = () => {
            setStreamError("Not connected. Disconnect and connect again to use the terminal.");
            sse.close();
        };

        term.onData((data) => {
            fetch(getServerApiUrl("/api/server/terminal/input"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, input: data }),
            }).catch(() => { });
        });

        return () => {
            window.removeEventListener("resize", handleResize);
            sse.close();
            term.dispose();
        };
    }, [sessionId]);

    const handleRunAgent = async () => {
        const p = agentPrompt.trim();
        if (!p) return;
        try {
            await injectIntoTerminal(sessionId, "agent", { prompt: p });
            dispatchServerTerminalRanAndOpenFloating(sessionId);
            toast.success("Running on server terminal…");
            setAgentPrompt("");
            setAgentOpen(false);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to run agent");
        }
    };

    const handleRunCommand = async () => {
        const cmd = terminalCommand.trim();
        if (!cmd) return;
        try {
            await injectIntoTerminal(sessionId, "command", { command: cmd });
            dispatchServerTerminalRanAndOpenFloating(sessionId);
            toast.success("Running in terminal…");
            setTerminalCommand("");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to run command");
        }
    };

    const handleCopy = () => {
        const term = xtermRef.current;
        if (!term) return;
        const text = getXtermBufferText(term);
        copyTextToClipboard(text);
    };

    return (
        <Card className="h-[600px] border-border/40 bg-[#0c0c0c] rounded-md overflow-hidden flex flex-col pt-1">
            <div className="flex flex-col gap-1 mx-1 mt-0.5">
                <div className="flex bg-[#2d2d2d] text-muted-foreground text-[10px] items-center px-4 py-1 rounded-t-md">
                    Interactive Terminal
                </div>
                <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 rounded-b-md bg-[#252525] border border-t-0 border-border/40">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                        onClick={handleCopy}
                        title="Copy full terminal logs"
                    >
                        <Copy className="size-3.5" />
                        Copy
                    </Button>
                    <Popover open={agentOpen} onOpenChange={setAgentOpen}>
                        <PopoverTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                                <Sparkles className="size-3.5 text-indigo-400" />
                                Run agent
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px]" align="start">
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Agent prompt (runs Cursor CLI on server)</label>
                                <Textarea
                                    placeholder="e.g. List running processes and suggest optimizations"
                                    value={agentPrompt}
                                    onChange={(e) => setAgentPrompt(e.target.value)}
                                    className="min-h-[80px] text-xs resize-none"
                                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleRunAgent())}
                                />
                                <Button size="sm" className="w-full" onClick={handleRunAgent} disabled={!agentPrompt.trim()}>
                                    Run in terminal
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                        <Input
                            placeholder="Custom command…"
                            value={terminalCommand}
                            onChange={(e) => setTerminalCommand(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleRunCommand()}
                            className="h-8 text-xs font-mono flex-1 min-w-0 bg-[#1a1a1a] border-border/50 text-white placeholder:text-gray-400 focus-visible:ring-ring"
                        />
                        <Button size="sm" variant="secondary" className="h-8 shrink-0" onClick={handleRunCommand} disabled={!terminalCommand.trim()}>
                            <TerminalIcon className="size-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
            <CardContent className="flex-1 p-0 custom-scrollbar relative">
                {streamError && (
                    <div className="absolute inset-x-2 top-2 z-10 px-3 py-2 rounded-md bg-amber-500/20 border border-amber-500/50 text-amber-200 text-sm flex items-center gap-2 shadow-lg">
                        <span className="font-medium">Terminal:</span>
                        {streamError}
                    </div>
                )}
                <div ref={terminalRef} className="absolute inset-x-2 inset-y-2 overflow-hidden" />
            </CardContent>
        </Card>
    );
}
