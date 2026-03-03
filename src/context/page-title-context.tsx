"use client";

/**
 * Page title context: syncs document title with pathname and optional search params.
 * Used by the root layout to set "Page — KWDEV" per route.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  Suspense,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

const APP_TITLE = "KWDEV";

/** Pathname to default page title (without " — KWDEV"). */
const PATHNAME_TITLE_MAP: Record<string, string> = {
  "/": "Dashboard",
  "/shortcuts": "Shortcuts",
  "/planner": "Planner",
  "/versioning": "Versioning",
  "/design": "Design",
  "/architecture": "Architecture",
  "/projects": "Projects",
  "/projects/new": "New project",
  "/prompts": "Prompts",
  "/app-analyzer": "Analyzer",
  "/integrations": "Integrations",
  "/github": "GitHub",
  "/configuration": "Configuration",
  "/loading-screen": "Loading",
};

/** Dashboard (/) tab param → document title and breadcrumb label. Used when pathname is "/". Exported for breadcrumb in HomePageContent. */
export const DASHBOARD_TAB_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  projects: "Projects",
  prompts: "Prompts",
  all: "Database",
  data: "Data",
};

function getTitleFromPathname(pathname: string | null): string {
  if (!pathname) return APP_TITLE;
  return PATHNAME_TITLE_MAP[pathname] ?? APP_TITLE;
}

type PageTitleContextValue = {
  setPageTitle: (title: string | null) => void;
};

const PageTitleContext = createContext<PageTitleContextValue | null>(null);

export function useSetPageTitle(): (title: string | null) => void {
  const ctx = useContext(PageTitleContext);
  return ctx?.setPageTitle ?? (() => {});
}

/**
 * Syncs document title when on Dashboard (/). Dashboard has no tabs; title is always "Dashboard".
 * Must run inside PageTitleProvider; useSearchParams requires Suspense.
 */
function DashboardTitleSync() {
  const pathname = usePathname();
  const setPageTitle = useSetPageTitle();
  useEffect(() => {
    if (pathname !== "/") {
      setPageTitle(null);
      return;
    }
    setPageTitle("Dashboard");
  }, [pathname, setPageTitle]);
  return null;
}

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [overrideTitle, setOverrideTitle] = useState<string | null>(null);

  const setPageTitle = useCallback((title: string | null) => {
    setOverrideTitle(title);
  }, []);

  const value = useMemo(
    () => ({ setPageTitle }),
    [setPageTitle]
  );

  const effectiveTitle = overrideTitle ?? getTitleFromPathname(pathname);

  useEffect(() => {
    const fullTitle =
      effectiveTitle === APP_TITLE ? APP_TITLE : `${effectiveTitle} — ${APP_TITLE}`;
    document.title = fullTitle;
  }, [effectiveTitle]);

  return (
    <PageTitleContext.Provider value={value}>
      <Suspense fallback={null}>
        <DashboardTitleSync />
      </Suspense>
      {children}
    </PageTitleContext.Provider>
  );
}
