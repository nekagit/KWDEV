"use client";

/** Design Color Palette component. */
import type { DesignColors } from "@/types/design";

const COLOR_ENTRIES: { key: keyof DesignColors; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
  { key: "textMuted", label: "Text muted" },
];

interface DesignColorPaletteProps {
  colors: DesignColors;
  className?: string;
}

export function DesignColorPalette({ colors, className = "" }: DesignColorPaletteProps) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground mb-2">Color palette</p>
      <div className="flex flex-wrap gap-2">
        {COLOR_ENTRIES.map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-col items-center gap-1"
            title={`${label}: ${colors[key]}`}
          >
            <div
              className="h-9 w-9 rounded-lg border border-border/60 shadow-sm"
              style={{ backgroundColor: colors[key] }}
            />
            <span className="text-[10px] text-muted-foreground max-w-[52px] truncate" title={colors[key]}>
              {colors[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
