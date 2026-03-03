"use client";

/** Terminal Slot component. */
import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, Circle, Terminal, ExternalLink, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { downloadRunOutput } from "@/lib/download-run-output";
import { toast } from "sonner";
import { formatElapsed } from "@/lib/run-helpers";
import type { RunInfo } from "@/types/run";

/* ═══════════════════════════════════════════════════════════════
   RunData — shape of a single run for the terminal display
   ═══════════════════════════════════════════════════════════════ */

export interface TerminalRunData {
    runId: string;
    label: string;
    logLines: string[];
    status: "running" | "done";
    startedAt?: number;
    doneAt?: number;
    /** Script exit code when done (0 = success, non-zero = failure). */
    exitCode?: number;
    /** First localhost URL detected from output (e.g. http://localhost:3000) for "Open app" link. */
    localUrl?: string;
}

/* ═══════════════════════════════════════════════════════════════
   TerminalSlot — a single terminal card with live log output
   Shared between ProjectRunTab and ProjectTicketsTab.
   ═══════════════════════════════════════════════════════════════ */

interface TerminalSlotProps {
    run: (TerminalRunData | RunInfo) | null;
    slotIndex: number;
    /** Height class for the ScrollArea. Default: "h-[280px]" */
    heightClass?: string;
    /** Enable macOS-style traffic light dots. Default: true */
    showDots?: boolean;
}

export function TerminalSlot({
    run,
    slotIndex,
    heightClass = "h-[280px]",
    showDots = true,
}: TerminalSlotProps) {
    const displayLogLines = run?.logLines ?? [];
    const running = run?.status === "running";
    const done = run?.status === "done";
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!run || run.startedAt == null) return;
        const startedAt = run.startedAt;
        if (run.status === "done" && run.doneAt != null) {
            setElapsedSeconds((run.doneAt - startedAt) / 1000);
            return;
        }
        const tick = () =>
            setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [run?.runId, run?.status, run?.startedAt, run?.doneAt]);

    // Auto-scroll to bottom on new log lines
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [displayLogLines.length]);

    // Treat as success when exit code is 0, or when output shows agent exited 0 (fallback for Cursor CLI reporting 1 despite success)
    const outputText = (run?.logLines ?? []).join("\n");
    const outputSaysAgentExitedZero = /Agent exited with code 0\b/.test(outputText);
    const exitIndicatesFailure = run?.exitCode !== undefined && run.exitCode !== 0;
    const failed = done && run && exitIndicatesFailure && !outputSaysAgentExitedZero;
    const statusColor = running ? "sky-running" : failed ? "rose" : done ? "sky-done" : "muted";

    const doneDurationSeconds =
        run?.doneAt != null && run?.startedAt != null
            ? (run.doneAt - run.startedAt) / 1000
            : null;
    const durationPart =
        doneDurationSeconds != null
            ? ` in ${doneDurationSeconds < 1 ? "<1s" : formatElapsed(doneDurationSeconds)}`
            : "";
    const statusLabel = run
        ? running
            ? `Running — ${formatElapsed(elapsedSeconds)}`
            : failed
                ? `Failed (exit ${run.exitCode})`
                : `Done${durationPart}`
        : "Idle";

    const borderColor = {
        "sky-running": "border-sky-500/30",
        "sky-done": "border-sky-500/20",
        rose: "border-rose-500/30",
        muted: "border-border/40",
    }[statusColor];

    const headerBg = {
        "sky-running": "bg-sky-500/10",
        "sky-done": "bg-sky-500/10",
        rose: "bg-rose-500/10",
        muted: "bg-muted/40",
    }[statusColor];

    return (
        <div
            className={cn(
                "flex flex-col rounded-xl border overflow-hidden transition-all duration-300 min-h-0",
                heightClass === "h-full" && "h-full",
                borderColor,
                running && "shadow-lg shadow-sky-500/5"
            )}
        >
            {/* Terminal Header */}
            <div
                className={cn(
                    "flex items-center justify-between px-3.5 py-2.5",
                    headerBg
                )}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {/* Terminal dots */}
                    {showDots && (
                        <div className="flex items-center gap-1 shrink-0">
                            <div
                                className={cn(
                                    "size-2 rounded-full transition-colors duration-300",
                                    running
                                        ? "bg-sky-400 animate-pulse"
                                        : done
                                            ? "bg-sky-400"
                                            : "bg-muted-foreground/30"
                                )}
                            />
                            <div className="size-2 rounded-full bg-muted-foreground/20" />
                            <div className="size-2 rounded-full bg-muted-foreground/20" />
                        </div>
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-medium text-muted-foreground leading-none">
                            Terminal {slotIndex + 1}
                        </span>
                        {run?.label && (
                            <span
                                className="text-[10px] text-muted-foreground/55 truncate leading-none mt-0.5"
                                title={run.label}
                            >
                                {run.label}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => copyTextToClipboard(displayLogLines.join("\n"))}
                        title="Copy output to clipboard"
                    >
                        <Copy className="size-3" />
                        Copy
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                            const text = displayLogLines.join("\n");
                            if (!text.trim()) {
                                toast.info("No output to download.");
                                return;
                            }
                            const label = run?.label?.trim() || `Terminal ${slotIndex + 1}`;
                            downloadRunOutput(text, label);
                        }}
                        title="Download output as file"
                    >
                        <Download className="size-3" />
                        Download
                    </Button>
                    {run?.localUrl && (
                        <a
                            href={run.localUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                        >
                            <ExternalLink className="size-3" />
                            Open app
                        </a>
                    )}
                    {/* Status badge */}
                    <div
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums",
                            statusColor === "sky-running" && "bg-sky-500/15 text-sky-400",
                            statusColor === "sky-done" && "bg-sky-500/15 text-sky-400",
                            statusColor === "rose" && "bg-rose-500/15 text-rose-400",
                            statusColor === "muted" && "bg-muted/40 text-muted-foreground"
                        )}
                    >
                        {running && <Loader2 className="size-2.5 animate-spin" />}
                        {done && <CheckCircle2 className="size-2.5" />}
                        {!run && <Circle className="size-2.5" />}
                        <span>{statusLabel}</span>
                    </div>
                </div>
            </div>

            {/* Terminal body — native overflow so scrollbar is always visible and works */}
            <div
                className={cn(
                    "flex-1 min-h-0 bg-zinc-950 flex flex-col overflow-hidden",
                    heightClass === "h-full" ? "min-h-[200px]" : ""
                )}
            >
                <div
                    ref={scrollRef}
                    className={cn(
                        "overflow-y-auto overflow-x-auto w-full custom-scrollbar",
                        heightClass === "h-full" ? "flex-1 min-h-0" : heightClass
                    )}
                >
                    <div className="p-3 font-mono text-xs leading-[1.65]">
                        {displayLogLines.length === 0 && !running && (
                            <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-center">
                                <Terminal className="size-8 text-muted-foreground/20" />
                                <p className="text-[11px] text-muted-foreground/50 normal-case">
                                    No output yet — waiting for agent to start
                                </p>
                            </div>
                        )}
                        {displayLogLines.length === 0 && running && (
                            <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-center">
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-full bg-sky-500/20 blur-xl animate-pulse" />
                                    <Loader2 className="relative size-6 animate-spin text-sky-400" />
                                </div>
                                <p className="text-[11px] text-muted-foreground normal-case">
                                    Waiting for output…
                                </p>
                            </div>
                        )}
                        {displayLogLines.map((line, i) => (
                            <div
                                key={i}
                                className="py-0.5 pr-2 text-muted-foreground/90 whitespace-pre break-words hover:text-foreground hover:bg-muted/20 rounded-sm transition-colors duration-150"
                            >
                                {line}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
