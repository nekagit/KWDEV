"use client";

/** Theme Selector component. */
import { useCallback } from "react";
import {
  UI_THEME_TEMPLATES,
  isValidUIThemeId,
  applyUITheme,
  type UIThemeId,
} from "@/data/ui-theme-templates";
import { getClasses } from "@/components/molecules/tailwind-molecules";
import { useUITheme } from "@/context/ui-theme";
import { ThemePreviewCard } from "@/components/molecules/CardsAndDisplay/ThemePreviewCard.tsx";

const classes = getClasses("UtilitiesAndHelpers/ThemeSelector.tsx");

interface ThemeSelectorProps {
  onThemeSelect: (id: UIThemeId) => void;
  effectiveTheme: UIThemeId;
}

export function ThemeSelector({ onThemeSelect, effectiveTheme }: ThemeSelectorProps) {
  return (
    <div className={classes[0]}>
      {UI_THEME_TEMPLATES.map((theme) => (
        <ThemePreviewCard
          key={theme.id}
          theme={theme}
          isSelected={effectiveTheme === theme.id}
          onSelect={() => onThemeSelect(theme.id)}
        />
      ))}
    </div>
  );
}
