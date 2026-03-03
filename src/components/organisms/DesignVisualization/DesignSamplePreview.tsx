"use client";

/** Design Sample Preview component. */
import { useMemo } from "react";
import { designConfigToSampleHtml } from "@/lib/design-config-to-html";
import type { DesignConfig } from "@/types/design";

interface DesignSamplePreviewProps {
  config: DesignConfig;
  className?: string;
  /** Height of the iframe in px (default 280). */
  height?: number;
}

export function DesignSamplePreview({ config, className = "", height = 280 }: DesignSamplePreviewProps) {
  const html = useMemo(() => designConfigToSampleHtml(config), [config]);

  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground mb-2">Sample UI preview</p>
      <div className="rounded-lg border border-border/50 overflow-hidden bg-muted/10">
        <iframe
          title={`Preview: ${config.projectName}`}
          srcDoc={html}
          className="w-full border-0 bg-white dark:bg-slate-900"
          style={{ height: `${height}px`, minHeight: 120 }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
