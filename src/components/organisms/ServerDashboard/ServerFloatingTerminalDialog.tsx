"use client";

/**
 * Small floating server terminal (worker-style). Shown when user clicks the
 * "running" button on the Server page; streams the same server terminal output
 * without using the in-page Interactive Terminal.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
    Minus,
    X,
    Square,
    Copy,
    GripHorizontal,
    Terminal as TerminalIcon,
} from "lucide-react";
import { useServerConnectionStore } from "@/store/server-connection-store";
import { getServerApiUrl } from "@/lib/server-api-url";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { getXtermBufferText } from "@/lib/xterm-utils";

const DEFAULT_WIDTH = 520;
const DEFAULT_HEIGHT = 360;
const DRAG_THRESHOLD_PX = 5;

async function sendStopToTerminal(sessionId: string) {
    const res = await fetch(getServerApiUrl("/api/server/terminal/input"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, input: "\x03" }),
    });
    if (!res.ok) throw new Error("Failed to send stop");
}

export function ServerFloatingTerminalDialog() {
    const sessionId = useServerConnectionStore((s) => s.floatingTerminalSessionId);
    const minimized = useServerConnectionStore((s) => s.floatingTerminalMinimized);
    const setFloatingTerminalMinimized = useServerConnectionStore(
        (s) => s.setFloatingTerminalMinimized
    );
    const setFloatingTerminalSessionId = useServerConnectionStore(
        (s) => s.setFloatingTerminalSessionId
    );

    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
    const didDragRef = useRef(false);
    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<Terminal | null>(null);

    useEffect(() => {
        if (sessionId && !position) {
            setPosition({
                x: Math.max(window.innerWidth - DEFAULT_WIDTH - 32, 32),
                y: Math.max(window.innerHeight - DEFAULT_HEIGHT - 32, 32),
            });
        }
    }, [sessionId, position]);

    useEffect(() => {
        if (sessionId) setFloatingTerminalMinimized(false);
    }, [sessionId, setFloatingTerminalMinimized]);

    useEffect(() => {
        if (!sessionId || !terminalRef.current) return;

        const term = new Terminal({
            cursorBlink: true,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 12,
            theme: { background: "#0c0c0c", foreground: "#cccccc" },
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();
        xtermRef.current = term;

        const sse = new EventSource(
            getServerApiUrl(`/api/server/terminal/stream?sessionId=${encodeURIComponent(sessionId)}`)
        );
        sse.onmessage = (event) => {
            if (event.data === "heartbeat") return;
            try {
                term.write(JSON.parse(event.data));
            } catch {
                term.write(event.data);
            }
        };
        sse.onerror = () => sse.close();

        term.onData((data) => {
            fetch(getServerApiUrl("/api/server/terminal/input"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, input: data }),
            }).catch(() => {});
        });

        const handleResize = () => {
            fitAddon.fit();
            const dims = fitAddon.proposeDimensions();
            if (dims) {
                fetch(getServerApiUrl("/api/server/terminal/input"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId, resize: { rows: dims.rows, cols: dims.cols } }),
                }).catch(() => {});
            }
        };
        const t = setTimeout(handleResize, 80);
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            clearTimeout(t);
            sse.close();
            term.dispose();
            xtermRef.current = null;
        };
    }, [sessionId]);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (!position) return;
            e.preventDefault();
            didDragRef.current = false;
            dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                origX: position.x,
                origY: position.y,
            };
            const handleMove = (ev: MouseEvent) => {
                if (!dragRef.current) return;
                const dx = ev.clientX - dragRef.current.startX;
                const dy = ev.clientY - dragRef.current.startY;
                if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) didDragRef.current = true;
                setPosition({
                    x: Math.max(0, dragRef.current.origX + dx),
                    y: Math.max(0, dragRef.current.origY + dy),
                });
            };
            const handleUp = () => {
                dragRef.current = null;
                window.removeEventListener("mousemove", handleMove);
                window.removeEventListener("mouseup", handleUp);
            };
            window.addEventListener("mousemove", handleMove);
            window.addEventListener("mouseup", handleUp);
        },
        [position]
    );

    const handleClose = useCallback(() => {
        setFloatingTerminalSessionId(null);
        setPosition(null);
    }, [setFloatingTerminalSessionId]);

    const handleStop = useCallback(async () => {
        if (!sessionId) return;
        try {
            await sendStopToTerminal(sessionId);
        } catch {
            // ignore
        }
    }, [sessionId]);

    const handleCopy = useCallback(() => {
        const term = xtermRef.current;
        if (!term) return;
        const text = getXtermBufferText(term);
        copyTextToClipboard(text);
    }, []);

    const handleMinimizedClick = useCallback(
        (e: React.MouseEvent) => {
            if (didDragRef.current) {
                didDragRef.current = false;
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            setFloatingTerminalMinimized(false);
        },
        [setFloatingTerminalMinimized]
    );

    if (!sessionId) return null;

    if (minimized) {
        return (
            <div
                style={{
                    position: "fixed",
                    left: position?.x ?? 32,
                    top: position?.y ?? 32,
                    zIndex: 99997,
                }}
                className="select-none"
            >
                <button
                    type="button"
                    onClick={handleMinimizedClick}
                    onMouseDown={handleMouseDown}
                    className={cn(
                        "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium shadow-xl border backdrop-blur-lg transition-all duration-300 cursor-grab active:cursor-grabbing",
                        "bg-sky-950/80 border-sky-500/30 text-sky-300 shadow-sky-500/20"
                    )}
                >
                    <TerminalIcon className="size-3.5" />
                    <span className="max-w-[160px] truncate">Server terminal</span>
                    <span className="flex size-2 rounded-full bg-sky-400 animate-pulse" />
                </button>
            </div>
        );
    }

    return (
        <div
            style={{
                position: "fixed",
                left: position?.x ?? 32,
                top: position?.y ?? 32,
                width: DEFAULT_WIDTH,
                height: DEFAULT_HEIGHT,
                zIndex: 99997,
            }}
            className="flex flex-col rounded-xl border border-border/50 bg-card/95 shadow-2xl shadow-black/30 backdrop-blur-xl overflow-hidden select-none"
        >
            <div
                onMouseDown={handleMouseDown}
                className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing border-b border-border/40 bg-gradient-to-r from-sky-500/10 to-transparent"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <GripHorizontal className="size-3.5 text-muted-foreground/50 shrink-0" />
                    <TerminalIcon className="size-3.5 shrink-0 text-sky-400" />
                    <span className="text-[11px] font-medium text-foreground truncate max-w-[260px]">
                        Server terminal
                    </span>
                    <span className="flex size-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopy}
                        className="size-6 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        title="Copy full logs"
                    >
                        <Copy className="size-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleStop}
                        className="size-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Stop (Ctrl+C)"
                    >
                        <Square className="size-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFloatingTerminalMinimized(true)}
                        className="size-6 text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        title="Minimize"
                    >
                        <Minus className="size-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="size-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Close"
                    >
                        <X className="size-3" />
                    </Button>
                </div>
            </div>
            <div className="flex-1 min-h-0 bg-[#0c0c0c] relative">
                <div ref={terminalRef} className="absolute inset-2 overflow-hidden" />
            </div>
        </div>
    );
}
