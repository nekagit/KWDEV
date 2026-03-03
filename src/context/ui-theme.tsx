"use client";

/**
 * UI theme context: light/dark and custom themes from ui-theme-templates.
 * Persists selection and applies theme variables to the document.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyUITheme,
  getStoredUITheme,
  getUIThemeById,
  isValidUIThemeId,
  themeVariablesToCss,
  type UIThemeId,
} from "@/data/ui-theme-templates";

const THEME_STYLE_ID = "app-theme-vars";

type UIThemeContextValue = {
  theme: UIThemeId;
  setTheme: (id: UIThemeId) => void;
};

const UIThemeContext = createContext<UIThemeContextValue | null>(null);

/** Injects a <style> tag that sets :root CSS variables from the current theme. Works even when data-theme is stripped (e.g. Tauri webview / React reconciliation). */
function ThemeStyleInjector({ theme }: { theme: UIThemeId }) {
  useEffect(() => {
    const template = getUIThemeById(theme);
    if (!template) return;

    const vars = themeVariablesToCss(template.variables);
    const decls = Object.entries(vars)
      .map(([k, v]) => `${k}: ${v};`)
      .join(" ");
    const css = `:root { ${decls} }`;

    let el = document.getElementById(THEME_STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = THEME_STYLE_ID;
      el.setAttribute("data-theme-source", "context");
      document.head.appendChild(el);
    }
    el.textContent = css;
  }, [theme]);
  return null;
}

/** Syncs theme to localStorage and data-theme (for first-paint script and any CSS that uses [data-theme]). */
function ThemeSync({ theme }: { theme: UIThemeId }) {
  useEffect(() => {
    applyUITheme(theme);
    const rafId = requestAnimationFrame(() => applyUITheme(theme));
    return () => cancelAnimationFrame(rafId);
  }, [theme]);
  return null;
}

export function UIThemeProvider({ children }: { children: ReactNode }) {
  // Always start with "light" so server and client match (avoids hydration mismatch).
  // Stored theme is applied in useEffect after mount.
  const [theme, setThemeState] = useState<UIThemeId>("light");

  useEffect(() => {
    const stored = getStoredUITheme();
    if (stored && isValidUIThemeId(stored)) setThemeState(stored);
  }, []);

  const setTheme = useCallback((id: UIThemeId) => {
    setThemeState(id);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme }),
    [theme, setTheme]
  );

  return (
    <UIThemeContext.Provider value={value}>
      <ThemeStyleInjector theme={theme} />
      <ThemeSync theme={theme} />
      {children}
    </UIThemeContext.Provider>
  );
}

export function useUITheme(): UIThemeContextValue {
  const ctx = useContext(UIThemeContext);
  if (!ctx) {
    throw new Error("useUITheme must be used within UIThemeProvider");
  }
  return ctx;
}
