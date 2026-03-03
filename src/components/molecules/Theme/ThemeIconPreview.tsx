/** Theme Icon Preview component. */
import React from 'react';
import type { UIThemeTemplate } from "@/data/ui-theme-templates";
import { Check, AlertTriangle, Trash2, Info, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ThemeIconPreviewProps {
  theme: UIThemeTemplate;
  hsl: (val: string) => string;
  /** When app is dark and preview theme is light, use dark text. */
  overrideFg?: string;
  overrideMutedFg?: string;
}

export const ThemeIconPreview: React.FC<ThemeIconPreviewProps> = ({
  theme,
  hsl,
  overrideFg,
  overrideMutedFg,
}) => {
  const v = theme.variables;
  const fg = overrideFg != null ? hsl(overrideFg) : hsl(v.cardForeground);
  const mutedFg = overrideMutedFg != null ? hsl(overrideMutedFg) : hsl(v.mutedForeground);
  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      style={{ color: fg }}
    >
      <Badge
        className="text-[10px] font-medium uppercase tracking-wide w-full"
        style={{ color: mutedFg }}
        variant="outline"
      >
        Icons
      </Badge>
      <div className="flex gap-2">
        <Check className="h-4 w-4" style={{ color: hsl(v.primary) }} />
        <Check className="h-4 w-4" style={{ color: hsl(v.success) }} />
        <AlertTriangle className="h-4 w-4" style={{ color: hsl(v.warning) }} />
        <Info className="h-4 w-4" style={{ color: hsl(v.info) }} />
        <Trash2 className="h-4 w-4" style={{ color: hsl(v.destructive) }} />
        <Sparkles className="h-4 w-4" style={{ color: hsl(v.accent) }} />
      </div>
    </div>
  );
};
