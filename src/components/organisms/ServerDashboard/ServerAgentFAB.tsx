"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Square, GripHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getServerApiUrl } from "@/lib/server-api-url";
import { useServerConnectionStore } from "@/store/server-connection-store";

const AGENT_MODAL_WIDTH = 420;
const AGENT_MODAL_HEIGHT = 320;
const SERVER_AGENT_MODAL_Z = 100000;

const AUTO_CLEAR_RUNNING_MS = 5 * 60 * 1000; // 5 minutes

async function injectAgent(sessionId: string, prompt: string) {
    const res = await fetch(getServerApiUrl("/api/server/terminal/inject"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, type: "agent", prompt }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Inject failed");
    }
}

async function sendStopToTerminal(sessionId: string) {
    const res = await fetch(getServerApiUrl("/api/server/terminal/input"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, input: "\x03" }),
    });
    if (!res.ok) throw new Error("Failed to send stop");
}

/**
 * KWCode agent FAB: bottom-right floating button on Server page when connected.
 * Idle: click opens modal to run agent; Running: round button with pulsing dot (Worker-style), click to open small floating terminal, Stop to interrupt.
 */
export function ServerAgentFAB({ sessionId }: { sessionId: string }) {
    const setFloatingTerminalSessionId = useServerConnectionStore((s) => s.setFloatingTerminalSessionId);
    const setFloatingTerminalMinimized = useServerConnectionStore((s) => s.setFloatingTerminalMinimized);
    const [open, setOpen] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [isAgentRunning, setIsAgentRunning] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const autoClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dragRef = useRef<{
        startX: number;
        startY: number;
        origX: number;
        origY: number;
        lastOffsetX: number;
        lastOffsetY: number;
    } | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isAgentRunning) return;
        autoClearRef.current = setTimeout(() => {
            setIsAgentRunning(false);
        }, AUTO_CLEAR_RUNNING_MS);
        return () => {
            if (autoClearRef.current) clearTimeout(autoClearRef.current);
        };
    }, [isAgentRunning]);

    // Initial position for draggable modal (above FAB, bottom-right)
    useEffect(() => {
        if (open && !position) {
            const x = Math.max(32, window.innerWidth - AGENT_MODAL_WIDTH - 32);
            const y = Math.max(32, window.innerHeight - AGENT_MODAL_HEIGHT - 120);
            setPosition({ x, y });
        }
        if (!open) setPosition(null);
    }, [open, position]);

    useEffect(() => {
        if (!open) return;
        const onEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onEscape);
        return () => window.removeEventListener("keydown", onEscape);
    }, [open]);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (!position) return;
            e.preventDefault();
            dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                origX: position.x,
                origY: position.y,
                lastOffsetX: 0,
                lastOffsetY: 0,
            };
            let rafId: number | null = null;
            const handleMove = (ev: MouseEvent) => {
                if (!dragRef.current || !modalRef.current) return;
                const dx = ev.clientX - dragRef.current.startX;
                const dy = ev.clientY - dragRef.current.startY;
                const clampedX = Math.max(0, dragRef.current.origX + dx);
                const clampedY = Math.max(0, dragRef.current.origY + dy);
                const offsetX = clampedX - dragRef.current.origX;
                const offsetY = clampedY - dragRef.current.origY;
                if (rafId !== null) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    rafId = null;
                    if (dragRef.current && modalRef.current) {
                        dragRef.current.lastOffsetX = offsetX;
                        dragRef.current.lastOffsetY = offsetY;
                        modalRef.current.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
                    }
                });
            };
            const handleUp = () => {
                if (rafId !== null) cancelAnimationFrame(rafId);
                if (dragRef.current && modalRef.current) {
                    setPosition({
                        x: Math.max(0, dragRef.current.origX + dragRef.current.lastOffsetX),
                        y: Math.max(0, dragRef.current.origY + dragRef.current.lastOffsetY),
                    });
                    modalRef.current.style.transform = "";
                }
                dragRef.current = null;
                window.removeEventListener("mousemove", handleMove);
                window.removeEventListener("mouseup", handleUp);
            };
            window.addEventListener("mousemove", handleMove);
            window.addEventListener("mouseup", handleUp);
        },
        [position]
    );

    const handleSubmit = async () => {
        const p = prompt.trim();
        if (!p) return;
        setLoading(true);
        try {
            await injectAgent(sessionId, p);
            toast.success("Running on server terminal…");
            setPrompt("");
            setOpen(false);
            setIsAgentRunning(true);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to run agent");
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        try {
            await sendStopToTerminal(sessionId);
            setIsAgentRunning(false);
            toast.success("Stop sent to server terminal");
        } catch {
            toast.error("Failed to send stop");
        }
    };

    const handleViewTerminal = () => {
        setFloatingTerminalSessionId(sessionId);
        setFloatingTerminalMinimized(false);
    };

    const fabContent = (
        <div
            className="fixed bottom-24 right-6 z-[99998] flex flex-col items-end pointer-events-none"
            aria-label="KWCode agent (run on server)"
        >
            <div className="pointer-events-auto flex items-center gap-1.5">
                {isAgentRunning ? (
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        "flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
                                        "border-primary bg-primary/20 shadow-lg shadow-primary/20",
                                        "ring-2 ring-sky-400/50 ring-offset-2 ring-offset-background"
                                    )}
                                    aria-label="Agent running on server – click to view terminal"
                                    onClick={handleViewTerminal}
                                >
                                    <span className="size-2.5 rounded-full bg-sky-400 animate-pulse" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[220px]">
                                <p className="text-xs font-medium">Agent running on server</p>
                                <p className="text-[10px] text-muted-foreground">
                                    Click to view terminal. Use Stop to interrupt.
                                </p>
                            </TooltipContent>
                        </Tooltip>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/20"
                            onClick={handleStop}
                            aria-label="Stop agent"
                            title="Stop agent (sends Ctrl+C to terminal)"
                        >
                            <Square className="size-3" strokeWidth={3} />
                        </Button>
                    </TooltipProvider>
                ) : (
                    <Button
                        size="icon"
                        className="h-12 w-12 rounded-full shadow-lg border border-border bg-card hover:bg-card/90 text-foreground"
                        onClick={() => setOpen(true)}
                        aria-label="Run agent on server"
                        title="Run agent on server (Cursor CLI in terminal)"
                    >
                        <Sparkles className="h-5 w-5 text-indigo-400" />
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <>
            {typeof document !== "undefined" && createPortal(fabContent, document.body)}
            {open && typeof document !== "undefined" && createPortal(
                <>
                    <div
                        role="presentation"
                        className="fixed inset-0 bg-black/50 animate-in fade-in-0"
                        style={{ zIndex: SERVER_AGENT_MODAL_Z }}
                        onClick={() => setOpen(false)}
                    />
                    <div
                        ref={modalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="server-agent-modal-title"
                        aria-describedby="server-agent-modal-desc"
                        className="flex flex-col rounded-xl border border-border/50 bg-card shadow-2xl overflow-hidden select-none animate-in zoom-in-95 fade-in-0 will-change-transform"
                        style={{
                            position: "fixed",
                            left: position?.x ?? 32,
                            top: position?.y ?? 32,
                            width: AGENT_MODAL_WIDTH,
                            minHeight: AGENT_MODAL_HEIGHT,
                            zIndex: SERVER_AGENT_MODAL_Z + 1,
                        }}
                    >
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/30">
                            <div
                                onMouseDown={handleMouseDown}
                                className="flex items-center gap-2 min-w-0 cursor-grab active:cursor-grabbing"
                            >
                                <GripHorizontal className="size-3.5 text-muted-foreground/50 shrink-0 pointer-events-none" />
                                <Sparkles className="size-4 text-indigo-400 shrink-0" />
                                <span id="server-agent-modal-title" className="text-sm font-semibold truncate">
                                    Run agent on server
                                </span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 shrink-0 rounded-md"
                                onClick={() => setOpen(false)}
                                aria-label="Close"
                            >
                                <X className="size-3.5" />
                            </Button>
                        </div>
                        <div className="p-4 space-y-3 flex-1">
                            <p id="server-agent-modal-desc" className="text-xs text-muted-foreground">
                                Sends your prompt to the Cursor CLI (agent) on the server. Output appears in the server terminal.
                            </p>
                            <Textarea
                                placeholder="e.g. In /var/www/domains create folder X and add this code…"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="min-h-[100px] resize-none"
                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSubmit())}
                            />
                            <Button className="w-full" onClick={handleSubmit} disabled={!prompt.trim() || loading}>
                                {loading ? "Running…" : "Run in terminal"}
                            </Button>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
