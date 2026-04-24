"use client";

/** Theme Selector component. */
import {
  UI_THEME_TEMPLATES,
  type UIThemeId,
  type UIThemeTemplate,
} from "@/data/ui-theme-templates";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const bg = `hsl(${theme.variables.background})`;
  const fg = `hsl(${theme.variables.foreground})`;
  const card = `hsl(${theme.variables.card})`;
  const primary = `hsl(${theme.variables.primary})`;
  const muted = `hsl(${theme.variables.muted})`;
  const border = `hsl(${theme.variables.border})`;
  const radius = theme.variables.radius;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col items-start gap-4 p-4 rounded-xl border text-left transition-all duration-300",
        isSelected
          ? "border-primary bg-card shadow-md scale-[1.02] ring-1 ring-primary"
          : "border-border bg-card/50 hover:bg-card hover:border-black/20 dark:hover:border-white/20 hover:shadow-lg"
      )}
    >
      <div 
        className="w-full aspect-[4/3] rounded-md overflow-hidden border shadow-inner flex flex-col relative"
        style={{ backgroundColor: bg, borderColor: border, borderRadius: radius }}
      >
        <div className="h-6 w-full border-b flex items-center px-2 space-x-1" style={{ borderColor: border, backgroundColor: card }}>
          <div className="w-2 h-2 rounded-full bg-red-500/80" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/80" />
          <div className="w-2 h-2 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 flex p-2 gap-2">
          {/* Sidebar mock */}
          <div className="w-1/3 h-full rounded-sm opacity-80" style={{ backgroundColor: muted, borderRadius: radius }} />
          {/* Main mock */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="w-3/4 h-2 rounded-full opacity-60" style={{ backgroundColor: fg }} />
            <div className="w-1/2 h-2 rounded-full opacity-40" style={{ backgroundColor: fg }} />
            <div className="mt-auto self-end w-1/2 h-6 rounded-sm flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: primary, color: `hsl(${theme.variables.primaryForeground})`, borderRadius: radius }}>
              A
            </div>
          </div>
        </div>
        
        {isSelected && (
          <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground shadow-sm">
            <Check className="w-3 h-3" />
          </div>
        )}
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{theme.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{theme.description}</p>
      </div>
    </button>
  );
}

export function ThemeSelector({ onThemeSelect, effectiveTheme }: ThemeSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
