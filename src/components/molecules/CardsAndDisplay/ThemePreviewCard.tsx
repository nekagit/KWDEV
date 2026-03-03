"use client";

/** Theme Preview Card component. */
import type { UIThemeTemplate } from "@/data/ui-theme-templates";
import { useUITheme } from "@/context/ui-theme";
import ThemeNameHeader from "@/components/molecules/Headers/ThemeNameHeader";
import { ThemeColorSwatches } from "@/components/molecules/Theme/ThemeColorSwatches";
import { ThemeIconPreview } from "@/components/molecules/Theme/ThemeIconPreview";
import { ThemeButtonPreview } from "@/components/molecules/Theme/ThemeButtonPreview";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("CardsAndDisplay/ThemePreviewCard.tsx");

/** Parse HSL string "H S% L%" or "H S% L% / A" and return lightness 0–100. */
function parseHslLightness(hsl: string): number {
  const match = hsl.match(/(\d+(?:\.\d+)?)\s*%(?:\s*\/\s*[\d.]+)?\s*$/);
  return match ? Number(match[1]) : 50;
}

/** Grey card and light text when app is dark and preview theme is light (no white cards in dark config). */
const DARK_CARD_GREY = "240 8% 14%";
const DARK_CARD_FG = "220 8% 96%";
const DARK_MUTED = "230 6% 20%";
const DARK_MUTED_FG = "235 8% 58%";

export function ThemePreviewCard({
  theme,
  isSelected,
  onSelect,
}: {
  theme: UIThemeTemplate;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { theme: appTheme } = useUITheme();
  const v = theme.variables;
  const hsl = (val: string) => `hsl(${val})`;

  const cardLightness = parseHslLightness(v.card);
  const isAppDarkWithLightCard = appTheme === "dark" && cardLightness >= 90;

  const contentBg = isAppDarkWithLightCard ? `hsl(${DARK_CARD_GREY})` : hsl(v.card);
  const contentFg = isAppDarkWithLightCard ? `hsl(${DARK_CARD_FG})` : hsl(v.cardForeground);
  const mutedBg = isAppDarkWithLightCard ? `hsl(${DARK_MUTED})` : hsl(v.muted);
  const mutedFg = isAppDarkWithLightCard ? `hsl(${DARK_MUTED_FG})` : hsl(v.mutedForeground);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={
        isSelected
          ? "ring-2 ring-primary border-primary shadow-lg scale-[1.02] flex flex-col rounded-xl border-2 overflow-hidden text-left transition-all hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
          : "border-border flex flex-col rounded-xl border-2 overflow-hidden text-left transition-all hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
      }
      style={{
        background: isAppDarkWithLightCard ? `hsl(${DARK_CARD_GREY})` : hsl(v.background),
        color: isAppDarkWithLightCard ? `hsl(${DARK_CARD_FG})` : hsl(v.foreground),
        borderColor: isSelected ? undefined : hsl(v.border),
      }}
    >
      <div className={classes[0]}>
        <ThemeNameHeader themeName={theme.name} />
      </div>

      <div
        className={classes[1]}
        style={{
          background: contentBg,
          color: contentFg,
        }}
      >
        <ThemeColorSwatches
          theme={theme}
          hsl={hsl}
          overrideCardBg={isAppDarkWithLightCard ? DARK_CARD_GREY : undefined}
          overrideCardFg={isAppDarkWithLightCard ? DARK_CARD_FG : undefined}
          overrideMutedFg={isAppDarkWithLightCard ? DARK_MUTED_FG : undefined}
        />

        <ThemeIconPreview
          theme={theme}
          hsl={hsl}
          overrideFg={isAppDarkWithLightCard ? DARK_CARD_FG : undefined}
          overrideMutedFg={isAppDarkWithLightCard ? DARK_MUTED_FG : undefined}
        />

        <ThemeButtonPreview theme={theme} hsl={hsl} />
      </div>

      <span
        className={classes[2]}
        style={{ color: mutedFg, background: mutedBg }}
      >
        {theme.description}
      </span>
    </div>
  );
}
