"use client";

/** index component. */
import type { DesignConfig } from "@/types/design";
import { DesignColorPalette } from "./DesignColorPalette";
import { DesignTypographyChart } from "./DesignTypographyChart";
import { DesignSectionFlow } from "./DesignSectionFlow";
import { DesignSamplePreview } from "./DesignSamplePreview";
import { DesignVisualizationFallback } from "./DesignVisualizationFallback";

export interface DesignVisualizationProps {
  /** When provided, full charts and sample UI are shown. When missing, a fallback placeholder is shown. */
  config?: DesignConfig | null;
  designName?: string;
  /** Include the sample HTML preview iframe (default true when config is present). */
  showSamplePreview?: boolean;
  samplePreviewHeight?: number;
  className?: string;
}

export function DesignVisualization({
  config,
  designName,
  showSamplePreview = true,
  samplePreviewHeight = 280,
  className = "",
}: DesignVisualizationProps) {
  if (!config) {
    return (
      <div className={className}>
        <DesignVisualizationFallback designName={designName} />
      </div>
    );
  }

  const { colors, typography, sections, layout } = config;

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <DesignColorPalette colors={colors} />
        <DesignTypographyChart typography={typography} />
        <DesignSectionFlow sections={sections} />
      </div>
      {showSamplePreview && (
        <DesignSamplePreview config={config} height={samplePreviewHeight} />
      )}
      {layout && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Layout: max-width {layout.maxWidth}, spacing {layout.spacing}, nav: {layout.navStyle}
        </p>
      )}
    </div>
  );
}
