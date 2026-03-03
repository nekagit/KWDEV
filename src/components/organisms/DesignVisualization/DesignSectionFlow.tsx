"use client";

/** Design Section Flow component. */
import type { DesignSection } from "@/types/design";
import { ChevronDown } from "lucide-react";

interface DesignSectionFlowProps {
  sections: DesignSection[];
  className?: string;
}

export function DesignSectionFlow({ sections, className = "" }: DesignSectionFlowProps) {
  const sorted = [...sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  if (sorted.length === 0) return null;

  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground mb-2">Page structure</p>
      <div className="flex flex-col gap-0.5">
        {sorted.map((section, i) => (
          <div key={section.id} className="flex flex-col gap-0.5">
            {i > 0 && (
              <div className="flex justify-center">
                <ChevronDown className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              </div>
            )}
            <div
              className="min-w-0 rounded border border-border/50 bg-muted/20 px-2 py-1.5 flex items-center justify-between gap-2"
              title={section.description || section.kind}
            >
              <span className="text-xs font-medium truncate">{section.title}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{section.kind}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
