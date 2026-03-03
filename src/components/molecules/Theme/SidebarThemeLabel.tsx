"use client";

/** Sidebar Theme Label component. */
import { useEffect, useState } from "react";
import { useUITheme } from "@/context/ui-theme";
import { getUIThemeById, isValidUIThemeId } from "@/data/ui-theme-templates";

export type SidebarThemeLabelProps = {
  /** When true (sidebar collapsed), label is hidden. */
  collapsed: boolean;
};

/**
 * Displays the current UI theme name in the sidebar footer (e.g. "Light", "Dark", "Ocean").
 * Hidden when sidebar is collapsed. Defers to client-only after mount to avoid hydration mismatch (theme from localStorage).
 */
export function SidebarThemeLabel({ collapsed }: SidebarThemeLabelProps) {
  const [mounted, setMounted] = useState(false);
  const { theme } = useUITheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (collapsed) return null;

  const effectiveId = isValidUIThemeId(theme) ? theme : "light";
  const template = getUIThemeById(effectiveId);
  const displayName = template?.name ?? effectiveId;

  return (
    <div
      className="px-2 py-0.5 text-center"
      aria-label={mounted ? `Current theme: ${displayName}` : "Current theme"}
      suppressHydrationWarning
    >
      <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
        {mounted ? displayName : "\u00a0"}
      </span>
    </div>
  );
}
