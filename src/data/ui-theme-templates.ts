/**
 * UI theme templates for the app. Used by the Configuration page to let users
 * change colors, accents, and background. Stored in localStorage and applied
 * via data-theme attribute; CSS in globals.css defines [data-theme="..."] overrides.
 */

export const UI_THEME_STORAGE_KEY = "app-ui-theme";

export type UIThemeId =
  | "light"
  | "dark"
  | "ocean"
  | "forest"
  | "warm"
  | "red"
  | "violet"
  | "rose"
  | "slate"
  | "terminal"
  | "oled"
  | "cyber"
  | "agency"
  | "midnight";

/** Unified schema: every theme uses this exact set of CSS variable values (HSL: "H S% L%"). */
export interface UIThemeVariables {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
  border: string;
  input: string;
  ring: string;
  radius: string;
}

export interface UIThemeTemplate {
  id: UIThemeId;
  name: string;
  description: string;
  /** HSL values for CSS vars (e.g. "0 0% 100%"). Keys match --var names in kebab-case. */
  variables: UIThemeVariables;
  /** Hex fallback for loading overlay / first paint (optional; CSS vars used when available). */
  fallbackBackground?: string;
  fallbackForeground?: string;
}

const varKeys = [
  "background",
  "foreground",
  "card",
  "cardForeground",
  "popover",
  "popoverForeground",
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "muted",
  "mutedForeground",
  "accent",
  "accentForeground",
  "destructive",
  "destructiveForeground",
  "success",
  "successForeground",
  "warning",
  "warningForeground",
  "info",
  "infoForeground",
  "border",
  "input",
  "ring",
  "radius",
] as const;

function toCssVarKey(key: string): string {
  return key.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
}

export function themeVariablesToCss(variables: UIThemeVariables): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of varKeys) {
    const v = variables[k as keyof UIThemeVariables];
    if (v != null) out[`--${toCssVarKey(k)}`] = v;
  }
  return out;
}

export const UI_THEME_TEMPLATES: UIThemeTemplate[] = [
  {
    id: "light",
    name: "Light default",
    description: "Clean neutral base. Sharp corners (0.5rem), high contrast, minimal accent.",
    fallbackBackground: "#fcfcfc",
    fallbackForeground: "#171717",
    variables: {
      background: "0 0% 99%",
      foreground: "0 0% 9%",
      card: "0 0% 100%",
      cardForeground: "0 0% 9%",
      popover: "0 0% 100%",
      popoverForeground: "0 0% 9%",
      primary: "243 75% 59%",
      primaryForeground: "0 0% 100%",
      secondary: "0 0% 97%",
      secondaryForeground: "0 0% 9%",
      muted: "0 0% 96%",
      mutedForeground: "240 4% 46%",
      accent: "0 0% 96%",
      accentForeground: "0 0% 9%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "0 0% 98%",
      success: "199 89% 48%",
      successForeground: "0 0% 100%",
      warning: "38 92% 50%",
      warningForeground: "0 0% 100%",
      info: "217 91% 60%",
      infoForeground: "0 0% 100%",
      border: "240 6% 90%",
      input: "240 6% 90%",
      ring: "243 75% 59%",
      radius: "0.5rem",
    },
  },
  {
    id: "dark",
    name: "Dark",
    description: "Deep OLED-inspired dark with sharp high-contrast details and glass-style elevation (1rem radius).",
    fallbackBackground: "#050505",
    fallbackForeground: "#fafafa",
    variables: {
      background: "0 0% 2%",
      foreground: "0 0% 98%",
      card: "0 0% 4%",
      cardForeground: "0 0% 98%",
      popover: "0 0% 4%",
      popoverForeground: "0 0% 98%",
      primary: "239 84% 67%",
      primaryForeground: "0 0% 98%",
      secondary: "0 0% 10%",
      secondaryForeground: "0 0% 98%",
      muted: "0 0% 10%",
      mutedForeground: "240 5% 65%",
      accent: "0 0% 12%",
      accentForeground: "0 0% 98%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "0 0% 98%",
      success: "199 89% 50%",
      successForeground: "144 70% 5%",
      warning: "38 92% 50%",
      warningForeground: "38 92% 5%",
      info: "217 91% 60%",
      infoForeground: "217 91% 5%",
      border: "0 0% 12%",
      input: "0 0% 12%",
      ring: "239 84% 67%",
      radius: "1rem",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Cool blue palette, soft cards and sidebar tint, medium radius (1rem).",
    fallbackBackground: "#f0f4f9",
    fallbackForeground: "#1a2332",
    variables: {
      background: "210 20% 98%",
      foreground: "220 20% 12%",
      card: "0 0% 100%",
      cardForeground: "220 20% 12%",
      popover: "0 0% 100%",
      popoverForeground: "220 20% 12%",
      primary: "217 91% 60%",
      primaryForeground: "0 0% 100%",
      secondary: "210 30% 92%",
      secondaryForeground: "220 20% 20%",
      muted: "210 25% 93%",
      mutedForeground: "220 15% 45%",
      accent: "217 70% 92%",
      accentForeground: "217 91% 40%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "0 0% 98%",
      success: "199 89% 45%",
      successForeground: "0 0% 100%",
      warning: "38 92% 48%",
      warningForeground: "0 0% 100%",
      info: "217 91% 60%",
      infoForeground: "0 0% 100%",
      border: "214 25% 88%",
      input: "214 25% 88%",
      ring: "217 91% 60%",
      radius: "1rem",
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Green primary and accents, warm grey text, generous radius (1.25rem).",
    fallbackBackground: "#f2f8f4",
    fallbackForeground: "#1a2620",
    variables: {
      background: "140 25% 98%",
      foreground: "140 20% 12%",
      card: "0 0% 100%",
      cardForeground: "140 20% 12%",
      popover: "0 0% 100%",
      popoverForeground: "140 20% 12%",
      primary: "199 89% 48%",
      primaryForeground: "0 0% 100%",
      secondary: "140 25% 92%",
      secondaryForeground: "140 20% 20%",
      muted: "140 20% 93%",
      mutedForeground: "140 15% 45%",
      accent: "142 55% 90%",
      accentForeground: "199 89% 35%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "0 0% 98%",
      success: "199 89% 48%",
      successForeground: "0 0% 100%",
      warning: "38 92% 48%",
      warningForeground: "0 0% 100%",
      info: "217 91% 55%",
      infoForeground: "0 0% 100%",
      border: "140 20% 88%",
      input: "140 20% 88%",
      ring: "199 89% 48%",
      radius: "1.25rem",
    },
  },
  {
    id: "warm",
    name: "Warm",
    description: "Amber and cream, cozy surfaces, pill-friendly radius (1.5rem).",
    fallbackBackground: "#faf8f5",
    fallbackForeground: "#1f1b17",
    variables: {
      background: "40 33% 98%",
      foreground: "25 25% 12%",
      card: "0 0% 100%",
      cardForeground: "25 25% 12%",
      popover: "0 0% 100%",
      popoverForeground: "25 25% 12%",
      primary: "25 95% 53%",
      primaryForeground: "0 0% 100%",
      secondary: "38 30% 92%",
      secondaryForeground: "25 25% 20%",
      muted: "38 25% 93%",
      mutedForeground: "25 15% 45%",
      accent: "38 70% 90%",
      accentForeground: "25 95% 40%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "0 0% 98%",
      success: "199 89% 45%",
      successForeground: "0 0% 100%",
      warning: "25 95% 53%",
      warningForeground: "0 0% 100%",
      info: "217 91% 55%",
      infoForeground: "0 0% 100%",
      border: "35 25% 88%",
      input: "35 25% 88%",
      ring: "25 95% 53%",
      radius: "1.5rem",
    },
  },
  {
    id: "red",
    name: "Red",
    description: "Bold red canvas, white primary, high-impact radius (2rem).",
    fallbackBackground: "#ef4444",
    fallbackForeground: "#ffffff",
    variables: {
      background: "0 100% 50%",
      foreground: "0 0% 100%",
      card: "0 0% 100%",
      cardForeground: "240 10% 3.9%",
      popover: "0 0% 100%",
      popoverForeground: "240 10% 3.9%",
      primary: "0 0% 100%",
      primaryForeground: "0 100% 40%",
      secondary: "0 80% 60%",
      secondaryForeground: "0 0% 100%",
      muted: "0 70% 55%",
      mutedForeground: "0 0% 95%",
      accent: "0 90% 55%",
      accentForeground: "0 0% 100%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "0 0% 98%",
      success: "199 89% 48%",
      successForeground: "0 0% 100%",
      warning: "38 92% 55%",
      warningForeground: "0 0% 100%",
      info: "217 91% 65%",
      infoForeground: "0 0% 100%",
      border: "0 60% 65%",
      input: "0 60% 65%",
      ring: "0 0% 100%",
      radius: "2rem",
    },
  },
  {
    id: "violet",
    name: "Violet",
    description: "Purple primary and accents, light lavender surfaces, soft radius (1rem).",
    fallbackBackground: "#f5f3ff",
    fallbackForeground: "#2e1065",
    variables: {
      background: "270 20% 98%",
      foreground: "270 50% 15%",
      card: "0 0% 100%",
      cardForeground: "270 40% 12%",
      popover: "0 0% 100%",
      popoverForeground: "270 40% 12%",
      primary: "263 70% 50%",
      primaryForeground: "0 0% 100%",
      secondary: "270 25% 93%",
      secondaryForeground: "270 30% 25%",
      muted: "270 20% 94%",
      mutedForeground: "270 15% 45%",
      accent: "263 60% 92%",
      accentForeground: "263 70% 40%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "0 0% 98%",
      success: "199 89% 45%",
      successForeground: "0 0% 100%",
      warning: "38 92% 48%",
      warningForeground: "0 0% 100%",
      info: "217 91% 55%",
      infoForeground: "0 0% 100%",
      border: "270 20% 88%",
      input: "270 20% 88%",
      ring: "263 70% 50%",
      radius: "1rem",
    },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Pink and rose accents, warm white base, rounded corners (1.25rem).",
    fallbackBackground: "#fff1f2",
    fallbackForeground: "#4c0519",
    variables: {
      background: "350 25% 98%",
      foreground: "350 60% 15%",
      card: "0 0% 100%",
      cardForeground: "350 45% 12%",
      popover: "0 0% 100%",
      popoverForeground: "350 45% 12%",
      primary: "346 77% 50%",
      primaryForeground: "0 0% 100%",
      secondary: "350 30% 93%",
      secondaryForeground: "350 35% 22%",
      muted: "350 20% 94%",
      mutedForeground: "350 15% 45%",
      accent: "346 65% 92%",
      accentForeground: "346 77% 38%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "0 0% 98%",
      success: "199 89% 45%",
      successForeground: "0 0% 100%",
      warning: "38 92% 48%",
      warningForeground: "0 0% 100%",
      info: "217 91% 55%",
      infoForeground: "0 0% 100%",
      border: "350 25% 88%",
      input: "350 25% 88%",
      ring: "346 77% 50%",
      radius: "1.25rem",
    },
  },
  {
    id: "slate",
    name: "Slate",
    description: "Cool grey palette, blue-grey borders and cards, sharp-professional (0.6rem).",
    fallbackBackground: "#f8fafc",
    fallbackForeground: "#0f172a",
    variables: {
      background: "210 40% 98%",
      foreground: "215 50% 12%",
      card: "0 0% 100%",
      cardForeground: "215 45% 12%",
      popover: "0 0% 100%",
      popoverForeground: "215 45% 12%",
      primary: "215 45% 32%",
      primaryForeground: "210 40% 98%",
      secondary: "214 32% 91%",
      secondaryForeground: "215 35% 22%",
      muted: "214 28% 93%",
      mutedForeground: "215 20% 42%",
      accent: "214 35% 90%",
      accentForeground: "215 45% 28%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "0 0% 98%",
      success: "199 89% 45%",
      successForeground: "0 0% 100%",
      warning: "38 92% 48%",
      warningForeground: "0 0% 100%",
      info: "217 91% 55%",
      infoForeground: "0 0% 100%",
      border: "214 32% 86%",
      input: "214 32% 86%",
      ring: "215 45% 32%",
      radius: "0.6rem",
    },
  },
  {
    id: "terminal",
    name: "Terminal",
    description: "Dark background, sky-on-black style, monospace feel, tight radius (0.4rem).",
    fallbackBackground: "#0d1117",
    fallbackForeground: "#7ee787",
    variables: {
      background: "150 15% 6%",
      foreground: "140 70% 55%",
      card: "150 12% 8%",
      cardForeground: "140 60% 60%",
      popover: "150 12% 8%",
      popoverForeground: "140 60% 60%",
      primary: "140 70% 45%",
      primaryForeground: "150 15% 6%",
      secondary: "150 10% 14%",
      secondaryForeground: "140 50% 65%",
      muted: "150 10% 12%",
      mutedForeground: "140 25% 45%",
      accent: "140 30% 18%",
      accentForeground: "140 70% 55%",
      destructive: "0 65% 45%",
      destructiveForeground: "0 0% 98%",
      success: "140 70% 45%",
      successForeground: "150 15% 6%",
      warning: "45 93% 47%",
      warningForeground: "150 15% 6%",
      info: "199 89% 48%",
      infoForeground: "0 0% 100%",
      border: "140 15% 18%",
      input: "140 15% 18%",
      ring: "140 70% 45%",
      radius: "0.4rem",
    },
  },
  {
    id: "oled",
    name: "OLED Pitch",
    description: "Perfect black for OLED screens with high-contrast sharp white foregrounds.",
    fallbackBackground: "#000000",
    fallbackForeground: "#ffffff",
    variables: {
      background: "0 0% 0%",
      foreground: "0 0% 98%",
      card: "0 0% 3%",
      cardForeground: "0 0% 98%",
      popover: "0 0% 4%",
      popoverForeground: "0 0% 98%",
      primary: "0 0% 98%",
      primaryForeground: "0 0% 0%",
      secondary: "0 0% 9%",
      secondaryForeground: "0 0% 98%",
      muted: "0 0% 12%",
      mutedForeground: "0 0% 63%",
      accent: "0 0% 12%",
      accentForeground: "0 0% 98%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "0 0% 98%",
      success: "140 70% 50%",
      successForeground: "0 0% 0%",
      warning: "40 90% 50%",
      warningForeground: "0 0% 0%",
      info: "210 100% 50%",
      infoForeground: "0 0% 98%",
      border: "0 0% 15%",
      input: "0 0% 15%",
      ring: "0 0% 98%",
      radius: "0.25rem",
    },
  },
  {
    id: "cyber",
    name: "Cyber Neon",
    description: "Vibrant neon pinks and cyans over deep midnight indigo for a cyberpunk vibe.",
    fallbackBackground: "#0b0c10",
    fallbackForeground: "#66fcf1",
    variables: {
      background: "230 20% 5%",
      foreground: "180 100% 85%",
      card: "230 25% 8%",
      cardForeground: "180 100% 85%",
      popover: "230 25% 8%",
      popoverForeground: "180 100% 85%",
      primary: "320 100% 60%",
      primaryForeground: "0 0% 100%",
      secondary: "180 100% 40%",
      secondaryForeground: "230 20% 5%",
      muted: "230 30% 15%",
      mutedForeground: "180 50% 60%",
      accent: "320 80% 40%",
      accentForeground: "0 0% 100%",
      destructive: "0 100% 60%",
      destructiveForeground: "0 0% 100%",
      success: "120 100% 60%",
      successForeground: "230 20% 5%",
      warning: "60 100% 50%",
      warningForeground: "230 20% 5%",
      info: "180 100% 60%",
      infoForeground: "230 20% 5%",
      border: "320 100% 60%",
      input: "230 40% 20%",
      ring: "180 100% 60%",
      radius: "0rem",
    },
  },
  {
    id: "agency",
    name: "Awwwards Agency",
    description: "A premium, sophisticated look with deep typography, massive contrast, and restrained accents.",
    fallbackBackground: "#f4f4f0",
    fallbackForeground: "#111111",
    variables: {
      background: "60 10% 96%",
      foreground: "0 0% 7%",
      card: "0 0% 100%",
      cardForeground: "0 0% 7%",
      popover: "0 0% 100%",
      popoverForeground: "0 0% 7%",
      primary: "250 90% 60%",
      primaryForeground: "0 0% 100%",
      secondary: "0 0% 90%",
      secondaryForeground: "0 0% 7%",
      muted: "60 5% 90%",
      mutedForeground: "0 0% 40%",
      accent: "60 10% 85%",
      accentForeground: "250 90% 60%",
      destructive: "0 80% 50%",
      destructiveForeground: "0 0% 100%",
      success: "150 60% 40%",
      successForeground: "0 0% 100%",
      warning: "40 90% 50%",
      warningForeground: "0 0% 7%",
      info: "210 90% 50%",
      infoForeground: "0 0% 100%",
      border: "0 0% 85%",
      input: "0 0% 85%",
      ring: "250 90% 60%",
      radius: "1.5rem",
    },
  },
  {
    id: "midnight",
    name: "Midnight Silk",
    description: "Rich dark blues with a sleek glassmorphism feel and vibrant electric accents.",
    fallbackBackground: "#050B14",
    fallbackForeground: "#E2E8F0",
    variables: {
      background: "215 60% 5%",
      foreground: "210 20% 90%",
      card: "215 50% 8%",
      cardForeground: "210 20% 90%",
      popover: "215 50% 8%",
      popoverForeground: "210 20% 90%",
      primary: "220 90% 65%",
      primaryForeground: "215 60% 5%",
      secondary: "215 40% 15%",
      secondaryForeground: "210 20% 90%",
      muted: "215 30% 12%",
      mutedForeground: "215 20% 65%",
      accent: "215 40% 20%",
      accentForeground: "220 90% 65%",
      destructive: "350 80% 60%",
      destructiveForeground: "0 0% 100%",
      success: "160 70% 50%",
      successForeground: "0 0% 100%",
      warning: "40 85% 55%",
      warningForeground: "215 60% 5%",
      info: "200 90% 60%",
      infoForeground: "0 0% 100%",
      border: "215 40% 15%",
      input: "215 40% 15%",
      ring: "220 90% 65%",
      radius: "1rem",
    },
  }
];

const themeIds: UIThemeId[] = ["light", "dark", "ocean", "forest", "warm", "red", "violet", "rose", "slate", "terminal", "oled", "cyber", "agency", "midnight"];

export function isValidUIThemeId(value: string): value is UIThemeId {
  return themeIds.includes(value as UIThemeId);
}

export function getUIThemeById(id: UIThemeId): UIThemeTemplate | undefined {
  return UI_THEME_TEMPLATES.find((t) => t.id === id);
}

/** Apply theme to document (set data-theme and localStorage). Call from client. */
export function applyUITheme(themeId: UIThemeId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(UI_THEME_STORAGE_KEY, themeId);
  document.documentElement.setAttribute("data-theme", themeId);
  if (themeId === "dark" || themeId === "terminal") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

/** Read current theme id from localStorage. Returns undefined if not set or invalid. */
export function getStoredUITheme(): UIThemeId | undefined {
  if (typeof window === "undefined") return undefined;
  const stored = window.localStorage.getItem(UI_THEME_STORAGE_KEY);
  return stored && isValidUIThemeId(stored) ? (stored as UIThemeId) : undefined;
}
