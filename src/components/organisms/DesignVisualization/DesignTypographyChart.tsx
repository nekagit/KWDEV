"use client";

/** Design Typography Chart component. */
import type { DesignTypography } from "@/types/design";

interface DesignTypographyChartProps {
  typography: DesignTypography;
  className?: string;
}

export function DesignTypographyChart({ typography, className = "" }: DesignTypographyChartProps) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground mb-2">Typography</p>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Heading</span>
          <span className="font-medium truncate max-w-[140px]" title={typography.headingFont}>
            {typography.headingFont}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Body</span>
          <span className="truncate max-w-[140px]" title={typography.bodyFont}>
            {typography.bodyFont}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Base size</span>
          <span>{typography.baseSize}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Scale</span>
          <span>{typography.scale}</span>
        </div>
      </div>
    </div>
  );
}
