"use client";

/** Print button: triggers browser print. Used in toolbar and command palette. */
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerPrint } from "@/lib/print-page";

export interface PrintButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  iconClassName?: string;
  /** Optional class for the "Print" label (e.g. "hidden sm:inline" for icon-only on small screens). */
  labelClassName?: string;
  title?: string;
}

/**
 * Shared "Print" button that calls window.print(). Used on content pages
 * (Configuration, Documentation, Ideas, Loading screen, Prompts, Run tab)
 * for parity with ⌘P and the command palette "Print current page".
 */
export function PrintButton({
  variant = "outline",
  size = "sm",
  className,
  iconClassName,
  labelClassName,
  title = "Print current page (⌘P)",
}: PrintButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => triggerPrint()}
      aria-label="Print current page"
      title={title}
      className={className}
    >
      <Printer className={cn("size-4 shrink-0", iconClassName)} aria-hidden />
      <span className={labelClassName}>Print</span>
    </Button>
  );
}
