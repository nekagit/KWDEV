"use client";

/** Theme Selector component. */
import {
  UI_THEME_TEMPLATES,
  type UIThemeId,
  type UIThemeTemplate,
} from "@/data/ui-theme-templates";
import { getClasses } from "@/components/molecules/tailwind-molecules";

const classes = getClasses("UtilitiesAndHelpers/ThemeSelector.tsx");

interface ThemeSelectorProps {
  onThemeSelect: (id: UIThemeId) => void;
  effectiveTheme: UIThemeId;
}

function ThemePreviewCard({
  theme,
  isSelected,
  onSelect,
}: {
  theme: UIThemeTemplate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        isSelected
          ? "rounded-lg border-2 border-primary bg-card p-3 text-left font-medium shadow-sm"
          : "rounded-lg border border-border bg-card p-3 text-left font-medium opacity-80 hover:opacity-100"
      }
    >
      <span className="text-sm text-foreground">{theme.name}</span>
    </button>
  );
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
