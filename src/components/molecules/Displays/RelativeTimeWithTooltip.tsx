"use client";

/** Relative Time With Tooltip component. */
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { formatTimestampFull } from "@/lib/format-timestamp";
import { cn } from "@/lib/utils";

function toMs(timestamp: number | string): number | null {
  if (typeof timestamp === "number") {
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  const ms = new Date(timestamp).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export interface RelativeTimeWithTooltipProps {
  /** Timestamp in milliseconds or ISO date string */
  timestamp: number | string;
  /** Optional class for the trigger span */
  className?: string;
}

/**
 * Renders relative time (e.g. "2 h ago") with a tooltip showing the full absolute date/time.
 * Uses existing formatRelativeTime and formatTimestampFull. Invalid timestamps render as "—".
 */
export function RelativeTimeWithTooltip({
  timestamp,
  className,
}: RelativeTimeWithTooltipProps) {
  const ms = toMs(timestamp);
  if (ms == null) {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }
  const iso = new Date(ms).toISOString();
  const relative = formatRelativeTime(ms);
  const absolute = formatTimestampFull(iso);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn("cursor-default underline decoration-dotted underline-offset-1", className)}
            tabIndex={0}
          >
            {relative}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="start">
          {absolute}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
