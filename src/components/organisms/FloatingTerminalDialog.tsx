"use client";

/** Floating Terminal Dialog component. */
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
    Minus,
    X,
    Maximize2,
    Square,
    GripHorizontal,
    Terminal,
} from "lucide-react";
import { useRunStore } from "@/store/run-store";
import { TerminalSlot, type TerminalRunData } from "@/components/molecules/Display/TerminalSlot";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════════
   FloatingTerminalDialog
   A draggable, minimizable floating terminal that shows live
   output from setup-prompt runs (or any run). Persists across
   tab/page changes because it's rendered in the app shell.
   ═══════════════════════════════════════════════════════════════ */

const DEFAULT_WIDTH = 780;
const DEFAULT_HEIGHT = 520;

export function FloatingTerminalDialog() {
    const floatingRunId = useRunStore((s) => s.floatingTerminalRunId);
    const minimized = useRunStore((s) => s.floatingTerminalMinimized);
    const setFloatingTerminalMinimized = useRunStore((s) => s.setFloatingTerminalMinimized);
    const clearFloatingTerminal = useRunStore((s) => s.clearFloatingTerminal);
    const stopRun = useRunStore((s) => s.stopRun);
    const runningRuns = useRunStore((s) => s.runningRuns);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
    const didDragRef = useRef(false);
    const dialogRef = useRef<HTMLDivElement>(null);

    const DRAG_THRESHOLD_PX = 5;

    // Find the run data
    const run = floatingRunId
        ? runningRuns.find((r) => r.runId === floatingRunId) ?? null
        : null;

    // Convert RunInfo → TerminalRunData
    const terminalRun: TerminalRunData | null = run
        ? {
            runId: run.runId,
            label: run.label,
            logLines: run.logLines,
            status: run.status as "running" | "done",
            startedAt: run.startedAt,
            doneAt: run.doneAt,
            localUrl: run.localUrl,
        }
        : null;

    // Init position to bottom-right on first open
    useEffect(() => {
        if (floatingRunId && !position) {
            const x = Math.max(window.innerWidth - DEFAULT_WIDTH - 32, 32);
            const y = Math.max(window.innerHeight - DEFAULT_HEIGHT - 32, 32);
            setPosition({ x, y });
        }
    }, [floatingRunId, position]);

    // Reset minimized state when switching to a different run
    useEffect(() => {
        if (floatingRunId) setFloatingTerminalMinimized(false);
    }, [floatingRunId, setFloatingTerminalMinimized]);

    /* ─── Drag handling ─── */
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
                if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
                    didDragRef.current = true;
                }
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
        if (run?.status === "running") {
            stopRun(run.runId).catch(() => { });
            toast.info("Stopped prompt run and closed terminal.");
        }
        clearFloatingTerminal();
        setPosition(null);
    }, [run, stopRun, clearFloatingTerminal]);

    const handleStopRun = useCallback(() => {
        if (run?.status === "running") {
            stopRun(run.runId).catch(() => { });
            toast.info("Prompt run stopped.");
        }
    }, [run, stopRun]);

    if (!floatingRunId) return null;

    const running = run?.status === "running";
    const label = run?.label ?? "Terminal";

    /* ─── Minimized pill ─── */
    if (minimized) {
        return (
            <div
                ref={dialogRef}
                style={{
                    position: "fixed",
                    left: position?.x ?? 32,
                    top: position?.y ?? 32,
                    zIndex: 50,
                }}
                className="select-none"
            >
                <button
                    onClick={(e) => {
                        if (didDragRef.current) {
                            didDragRef.current = false;
                            e.preventDefault();
                            e.stopPropagation();
                            return;
                        }
                        setFloatingTerminalMinimized(false);
                    }}
                    onMouseDown={handleMouseDown}
                    className={cn(
                        "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium shadow-xl border backdrop-blur-lg transition-all duration-300 cursor-grab active:cursor-grabbing",
                        running
                            ? "bg-sky-950/80 border-sky-500/30 text-sky-300 shadow-sky-500/20"
                            : "bg-slate-950/80 border-sky-500/20 text-sky-300 shadow-sky-500/10"
                    )}
                >
                    <Terminal className="size-3.5" />
                    <span className="max-w-[160px] truncate">{label}</span>
                    {running && (
                        <span className="flex size-2 rounded-full bg-sky-400 animate-pulse" />
                    )}
                    {!running && run && (
                        <span className="flex size-2 rounded-full bg-sky-400" />
                    )}
                </button>
            </div>
        );
    }

    /* ─── Full dialog ─── */
    return (
        <div
            ref={dialogRef}
            style={{
                position: "fixed",
                left: position?.x ?? 32,
                top: position?.y ?? 32,
                width: DEFAULT_WIDTH,
                height: DEFAULT_HEIGHT,
                zIndex: 50,
            }}
            className="flex flex-col rounded-xl border border-border/50 bg-card/95 shadow-2xl shadow-black/30 backdrop-blur-xl overflow-hidden select-none"
        >
            {/* ─── Title bar (draggable) ─── */}
            <div
                onMouseDown={handleMouseDown}
                className={cn(
                    "flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing border-b border-border/40",
                    running
                        ? "bg-gradient-to-r from-sky-500/10 to-transparent"
                        : "bg-gradient-to-r from-sky-500/10 to-transparent"
                )}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <GripHorizontal className="size-3.5 text-muted-foreground/50 shrink-0" />
                    <Terminal className={cn(
                        "size-3.5 shrink-0",
                        running ? "text-sky-400" : "text-sky-400"
                    )} />
                    <span className="text-[11px] font-medium text-foreground truncate max-w-[260px]">
                        {label}
                    </span>
                    {running && (
                        <span className="flex size-1.5 rounded-full bg-sky-400 animate-pulse shrink-0" />
                    )}
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                    {running && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleStopRun}
                            className="size-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Stop run"
                        >
                            <Square className="size-3" />
                        </Button>
                    )}
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

            {/* ─── Terminal content ─── */}
            <div className="flex-1 min-h-0">
                <TerminalSlot
                    run={terminalRun}
                    slotIndex={0}
                    heightClass="h-full"
                    showDots={false}
                />
            </div>
        </div>
    );
}
