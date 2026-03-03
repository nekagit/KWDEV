/** Theme Color Swatches component. */
import React from 'react';
import type { UIThemeTemplate } from "@/data/ui-theme-templates";
import { Badge } from "@/components/ui/badge";

interface ThemeColorSwatchesProps {
  theme: UIThemeTemplate;
  hsl: (val: string) => string;
  /** When app is dark and preview theme is light, use dimmer white + dark text. */
  overrideCardBg?: string;
  overrideCardFg?: string;
  overrideMutedFg?: string;
}

export const ThemeColorSwatches: React.FC<ThemeColorSwatchesProps> = ({
  theme,
  hsl,
  overrideCardBg,
  overrideCardFg,
  overrideMutedFg,
}) => {
  const v = theme.variables;
  const cardBg = overrideCardBg != null ? hsl(overrideCardBg) : hsl(v.card);
  const cardFg = overrideCardFg != null ? hsl(overrideCardFg) : hsl(v.cardForeground);
  const mutedFg = overrideMutedFg != null ? hsl(overrideMutedFg) : hsl(v.mutedForeground);
  return (
    <div
      className="rounded-md p-3 min-h-[48px] border"
      style={{
        background: cardBg,
        borderColor: hsl(v.border),
        color: cardFg,
      }}
    >
      <Badge
        className="text-[10px] font-medium uppercase tracking-wide mb-2"
        style={{ color: mutedFg }}
        variant="outline"
      >
        Card
      </Badge>
      <div className="flex flex-wrap gap-1.5">
        {[
          { label: "Bg", val: v.background },
          { label: "Card", val: v.card },
          { label: "Pri", val: v.primary },
          { label: "Sec", val: v.secondary },
          { label: "Acc", val: v.accent },
          { label: "Muted", val: v.muted },
          { label: "Dest", val: v.destructive },
          { label: "Ok", val: v.success },
          { label: "Warn", val: v.warning },
          { label: "Info", val: v.info },
          { label: "Border", val: v.border },
        ].map(({ label, val }) => (
          <div
            key={label}
            className="rounded h-5 w-5 border shrink-0"
            style={{
              background: hsl(val),
              borderColor: hsl(v.border),
            }}
            title={label}
          />
        ))}
      </div>
    </div>
  );
};
