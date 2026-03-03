"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Terminal, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useServerConnectionStore } from "@/store/server-connection-store";

export const SERVER_TERMINAL_RAN_EVENT = "server-terminal-ran";
const SERVER_TERMINAL_ID = "server-terminal";

export function dispatchServerTerminalRan() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(SERVER_TERMINAL_RAN_EVENT));
    }
}

/**
 * Dispatches the terminal-ran event and opens the floating server terminal so it persists
 * when the user switches pages. Call this when any action runs in the server terminal.
 */
export function dispatchServerTerminalRanAndOpenFloating(sessionId: string | null) {
    if (typeof window === "undefined") return;
    if (sessionId) {
        const { setFloatingTerminalSessionId, setFloatingTerminalMinimized } =
            useServerConnectionStore.getState();
        setFloatingTerminalSessionId(sessionId);
        setFloatingTerminalMinimized(false);
    }
    window.dispatchEvent(new CustomEvent(SERVER_TERMINAL_RAN_EVENT));
}

/** Scroll the server terminal into view. Use from any tab so "View terminal" goes to the same terminal. */
export function scrollToServerTerminal() {
    if (typeof document !== "undefined") {
        document.getElementById(SERVER_TERMINAL_ID)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    dispatchServerTerminalRan();
}

const AUTO_HIDE_MS = 15000;

/**
 * Shows a draggable terminal button in the bottom-right when something was run in the server terminal
 * (quick action, script, prompt, cron, or agent). Click: opens the small floating server terminal
 * (worker-style) when sessionId is provided; otherwise switches to Overview and scrolls to in-page terminal.
 */
export function ServerTerminalScrollButton({
    sessionId,
    onBeforeScroll,
}: {
    /** When provided, click opens the small floating terminal instead of scrolling. */
    sessionId?: string | null;
    /** Called before scrolling when sessionId is not used (e.g. switch to Overview tab). */
    onBeforeScroll?: () => void;
} = {}) {
    const [show, setShow] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
    const setFloatingTerminalSessionId = useServerConnectionStore((s) => s.setFloatingTerminalSessionId);
    const setFloatingTerminalMinimized = useServerConnectionStore((s) => s.setFloatingTerminalMinimized);

    useEffect(() => {
        const handle = () => {
            setShow(true);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            hideTimerRef.current = setTimeout(() => setShow(false), AUTO_HIDE_MS);
        };
        window.addEventListener(SERVER_TERMINAL_RAN_EVENT, handle);
        return () => {
            window.removeEventListener(SERVER_TERMINAL_RAN_EVENT, handle);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, []);

    const handleClick = useCallback(() => {
        if (sessionId) {
            setFloatingTerminalSessionId(sessionId);
            setFloatingTerminalMinimized(false);
        } else {
            onBeforeScroll?.();
            requestAnimationFrame(() => scrollToServerTerminal());
        }
    }, [sessionId, onBeforeScroll, setFloatingTerminalSessionId, setFloatingTerminalMinimized]);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            const el = e.currentTarget.closest("[data-terminal-scroll-wrapper]");
            const rect = el?.getBoundingClientRect();
            const pos = position ?? (rect
                ? { x: rect.left, y: rect.top }
                : {
                    x: typeof window !== "undefined" ? window.innerWidth - 80 : 0,
                    y: typeof window !== "undefined" ? window.innerHeight - 120 : 0,
                });
            if (!position) setPosition(pos);
            dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                origX: pos.x,
                origY: pos.y,
            };
            const handleMove = (ev: MouseEvent) => {
                if (!dragRef.current) return;
                const dx = ev.clientX - dragRef.current.startX;
                const dy = ev.clientY - dragRef.current.startY;
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

    if (!show) return null;

    const isDragged = position !== null;
    const wrapperStyle = isDragged && position
        ? { position: "fixed" as const, left: position.x, top: position.y }
        : undefined;
    const wrapperClass = isDragged
        ? "z-[99997] flex flex-col items-end"
        : "fixed bottom-24 right-20 z-[99997] flex flex-col items-end";

    const content = (
        <div
            data-terminal-scroll-wrapper
            className={wrapperClass}
            style={wrapperStyle}
            aria-label="View server terminal"
        >
            <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center rounded-full border border-border bg-card shadow-lg overflow-hidden">
                            <div
                                onMouseDown={handleMouseDown}
                                className="flex items-center justify-center w-7 h-10 cursor-grab active:cursor-grabbing border-r border-border/60 text-muted-foreground hover:text-foreground"
                                title="Drag to move"
                            >
                                <GripHorizontal className="size-3.5" />
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-10 w-10 rounded-none hover:bg-muted/50"
                                onClick={handleClick}
                                aria-label="Scroll to server terminal"
                                title="View active terminal"
                            >
                                <Terminal className="h-5 w-5 text-emerald-500" />
                            </Button>
                        </div>
                    </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[200px]">
                        <p className="text-xs font-medium">View active terminal</p>
                        <p className="text-[10px] text-muted-foreground">Drag the handle to move. Click to open small terminal.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );

    return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}

export { SERVER_TERMINAL_ID };
