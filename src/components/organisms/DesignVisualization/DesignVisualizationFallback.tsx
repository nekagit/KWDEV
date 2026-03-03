"use client";

/** Design Visualization Fallback component. */
import { LayoutTemplate, Palette, Type } from "lucide-react";

interface DesignVisualizationFallbackProps {
  designName?: string;
  className?: string;
}

/** Shown when design has no config (e.g. only name/description from DB). */
export function DesignVisualizationFallback({ designName, className = "" }: DesignVisualizationFallbackProps) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground mb-2">Design overview</p>
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 flex flex-col items-center justify-center gap-3 min-h-[120px]">
        <div className="flex gap-4 text-muted-foreground/80">
          <div className="flex flex-col items-center gap-1" title="Color palette">
            <Palette className="h-6 w-6" />
            <span className="text-[10px]">Colors</span>
          </div>
          <div className="flex flex-col items-center gap-1" title="Typography">
            <Type className="h-6 w-6" />
            <span className="text-[10px]">Type</span>
          </div>
          <div className="flex flex-col items-center gap-1" title="Page structure">
            <LayoutTemplate className="h-6 w-6" />
            <span className="text-[10px]">Sections</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center max-w-[240px]">
          {designName
            ? `"${designName}" has no design config. Add a generated design or design spec to see charts and sample UI.`
            : "No design config. Generate a project from an idea or add a design with full spec to see visualizations."}
        </p>
      </div>
    </div>
  );
}
