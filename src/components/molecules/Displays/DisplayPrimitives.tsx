/** Display Primitives component. */
import React from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   SectionCard — glassmorphism card with hover accent glow
   Used on the project details page and potentially elsewhere.
   ═══════════════════════════════════════════════════════════════ */

export type SectionCardTint = 1 | 2 | 3 | 4 | 5;

const ACCENT_STYLES = {
    violet:
        "hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5",
    amber:
        "hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5",
    blue: "hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5",
    sky:
        "hover:border-sky-500/30 hover:shadow-lg hover:shadow-sky-500/5",
    teal: "hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5",
    rose: "hover:border-rose-500/30 hover:shadow-lg hover:shadow-rose-500/5",
    cyan: "hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/5",
    orange:
        "hover:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/5",
} as const;

export type AccentColor = keyof typeof ACCENT_STYLES;

interface SectionCardProps {
    children: React.ReactNode;
    accentColor: AccentColor;
    /** Slight background tint (1–5) to differentiate adjacent cards. */
    tint?: SectionCardTint;
    className?: string;
}

export function SectionCard({
    children,
    accentColor,
    tint,
    className,
}: SectionCardProps) {
    return (
        <div
            className={cn(
                "rounded-xl border border-border/40 backdrop-blur-sm p-6 transition-all duration-300",
                tint != null ? `bg-card-tint-${tint}` : "bg-card/60",
                ACCENT_STYLES[accentColor],
                className
            )}
        >
            {children}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   MetadataBadge — small pill for metadata (path, date, etc.)
   ═══════════════════════════════════════════════════════════════ */

interface MetadataBadgeProps {
    icon: React.ReactNode;
    /** Tailwind color classes, e.g. "bg-primary/10 border-primary/20 text-primary" */
    color: string;
    children: React.ReactNode;
    className?: string;
}

export function MetadataBadge({
    icon,
    color,
    children,
    className,
}: MetadataBadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                color,
                className
            )}
        >
            {icon}
            {children}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   CountBadge — numeric badge with a count + label (e.g. "5 tickets")
   ═══════════════════════════════════════════════════════════════ */

interface CountBadgeProps {
    icon?: React.ReactNode;
    count: number;
    label: string;
    /** Tailwind color classes */
    color: string;
    className?: string;
}

export function CountBadge({
    icon,
    count,
    label,
    color,
    className,
}: CountBadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium tabular-nums",
                color,
                className
            )}
        >
            {icon}
            {count} {label}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   StatusPill — compact status indicator used in status bars
   ═══════════════════════════════════════════════════════════════ */

const STATUS_PILL_COLORS = {
    sky: "bg-sky-500/10 border-sky-500/25 text-sky-400",
    blue: "bg-blue-500/10 border-blue-500/25 text-blue-400",
    amber: "bg-amber-500/10 border-amber-500/25 text-amber-400",
    violet: "bg-violet-500/10 border-violet-500/25 text-violet-400",
    rose: "bg-rose-500/10 border-rose-500/25 text-rose-400",
    muted: "bg-muted/30 border-border/50 text-muted-foreground",
} as const;

export type PillColor = keyof typeof STATUS_PILL_COLORS;

interface StatusPillProps {
    icon: React.ReactNode;
    label: string;
    count: number;
    color: PillColor;
    pulse?: boolean;
    className?: string;
}

export function StatusPill({
    icon,
    label,
    count,
    color,
    pulse,
    className,
}: StatusPillProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium tabular-nums transition-all duration-300",
                STATUS_PILL_COLORS[color],
                pulse && "animate-pulse",
                className
            )}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
            <span className="font-semibold">{count}</span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════
   SummaryStatPill — stat with a large number + tiny label
   ═══════════════════════════════════════════════════════════════ */

interface SummaryStatPillProps {
    label: string;
    value: number;
    /** Text color class, e.g. "text-blue-400" */
    color: string;
    className?: string;
}

export function SummaryStatPill({
    label,
    value,
    color,
    className,
}: SummaryStatPillProps) {
    return (
        <div className={cn("flex items-center gap-1.5", className)}>
            <span className={cn("text-lg font-bold tabular-nums", color)}>
                {value}
            </span>
            <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
                {label}
            </span>
        </div>
    );
}
