"use client";

/**
 * Shared card layout for Vibing sub-sections: Asking, Planning, Fast, Debugging.
 * Same layout and Textarea for all; only purpose and data differ.
 */
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export interface WorkerAgentCardProps {
  /** Card background color class, e.g. "bg-sky-500/[0.06]" */
  bgColor: string;
  /** Icon background class, e.g. "bg-sky-500/10" */
  iconBg: string;
  /** Icon color class, e.g. "text-sky-400" */
  iconColor: string;
  /** Lucide icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Card title */
  title: string;
  /** Card description */
  description: string;
  /** Input value */
  value: string;
  /** Input change handler */
  onChange: (value: string) => void;
  /** Input placeholder */
  placeholder: string;
  /** Button label */
  buttonLabel: string;
  /** Button tooltip */
  buttonTitle: string;
  /** Submit handler */
  onSubmit: () => void;
  /** Loading state */
  loading: boolean;
  /** Whether the button is disabled (beyond loading) */
  disabled?: boolean;
  /** Optional extra content rendered below the input row */
  children?: React.ReactNode;
}

const TEXTAREA_CLASS =
  "flex-1 min-w-0 min-h-[140px] resize-y rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/40 transition-colors px-4 py-3 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-background disabled:cursor-not-allowed disabled:opacity-50";

export function WorkerAgentCard({
  bgColor,
  iconBg,
  iconColor,
  icon: Icon,
  title,
  description,
  value,
  onChange,
  placeholder,
  buttonLabel,
  buttonTitle,
  onSubmit,
  loading,
  disabled = false,
  children,
}: WorkerAgentCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={cn("rounded-xl border border-border/60 overflow-hidden transition-all duration-200", bgColor)}>
      <div className="flex items-center gap-4 px-6 pt-6 pb-5">
        <div className={cn("flex items-center justify-center size-10 rounded-xl", iconBg)}>
          <Icon className={cn("size-5", iconColor)} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground normal-case mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-6 pb-6 space-y-4">
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={TEXTAREA_CLASS}
            rows={5}
            disabled={loading}
          />
          <Button
            variant="default"
            size="icon"
            onClick={onSubmit}
            disabled={loading || disabled}
            className="h-12 w-12 rounded-xl shrink-0 bg-foreground text-background hover:bg-foreground/90"
            title={buttonTitle}
            aria-label={buttonLabel}
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
