"use client";

/**
 * Root app shell: sidebar, main content, terminal dock, command palette, and layout providers.
 */
import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import { TerminalStatusBadge } from "@/components/molecules/Display/TerminalStatusBadge";
import { SidebarNavigation } from "@/components/organisms/SidebarNavigation";
import { SidebarToggle } from "@/components/molecules/ControlsAndButtons/SidebarToggle";
import { useRunState } from "@/context/run-state";
import { PageTitleProvider } from "@/context/page-title-context";
import { ErrorBoundary } from "@/components/organisms/ErrorBoundary";
import { FloatingTerminalDialog } from "@/components/organisms/FloatingTerminalDialog";
import { TerminalRunDock } from "@/components/organisms/TerminalRunDock";
import { CommandPalette } from "@/components/organisms/CommandPalette";
import { SkipToMainContent } from "@/components/molecules/Accessible/SkipToMainContent";
import { RunStatusAnnouncer } from "@/components/molecules/Accessible/RunStatusAnnouncer";
import { BackToTop } from "@/components/molecules/Buttons/BackToTop";
import { SidebarVersion } from "@/components/molecules/Displays/SidebarVersion";
import { SidebarThemeLabel } from "@/components/molecules/Theme/SidebarThemeLabel";
import { SIDEBAR_TOGGLE_EVENT } from "@/lib/sidebar-toggle-event";

const SIDEBAR_STORAGE_KEY = "kwcode-sidebar-width";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "kwcode-sidebar-collapsed";
const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 400;
const SIDEBAR_DEFAULT = 192; // w-48
const SIDEBAR_COLLAPSED = 52; // 3.25rem

function getStoredSidebarWidth(): number {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT;
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored == null) return SIDEBAR_DEFAULT;
  const n = parseInt(stored, 10);
  return Number.isFinite(n) ? Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, n)) : SIDEBAR_DEFAULT;
}

function getStoredSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
  return stored === "true";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  useEffect(() => {
    setSidebarWidth(getStoredSidebarWidth());
  }, []);
  useEffect(() => {
    setSidebarCollapsed(getStoredSidebarCollapsed());
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(sidebarCollapsed));
    } catch (_) {}
  }, [sidebarCollapsed]);

  // Command palette (and others) can request sidebar toggle via custom event
  useEffect(() => {
    const handler = () => setSidebarCollapsed((prev) => !prev);
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handler);
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handler);
  }, []);

  // Scroll main content to top on route change (fresh-page experience; instant scroll for reduced-motion)
  useEffect(() => {
    const main = document.getElementById("main-content");
    if (main) main.scrollTop = 0;
  }, [pathname]);

  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(SIDEBAR_DEFAULT);
  const lastWidthRef = useRef(SIDEBAR_DEFAULT);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    if (!isResizing) return;
    document.body.classList.add("select-none", "cursor-col-resize");
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, resizeStartWidth.current + delta));
      lastWidthRef.current = next;
      setSidebarWidth(next);
    };
    const onUp = () => {
      setIsResizing(false);
      document.body.classList.remove("select-none", "cursor-col-resize");
      const toStore = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, lastWidthRef.current));
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(toStore));
      } catch (_) { }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      document.body.classList.remove("select-none", "cursor-col-resize");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isResizing]);

  // Toggle sidebar: ⌘B (Mac) / Ctrl+B (Windows/Linux); skip when focus in input/textarea/select
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const toggleSidebar =
        isMac ? e.metaKey && e.key === "b" : e.ctrlKey && e.key === "b";
      if (toggleSidebar) {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Scroll main content to top: ⌘ Home (Mac) / Ctrl+Home (Windows/Linux); skip when focus in input/textarea/select
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key !== "Home") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const scrollToTop = isMac ? e.metaKey : e.ctrlKey;
      if (scrollToTop) {
        e.preventDefault();
        const main = document.getElementById("main-content");
        if (main) main.scrollTop = 0;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Print current page: ⌘P (Mac) / Ctrl+P (Windows/Linux); skip when focus in input/textarea/select
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key !== "p" && e.key !== "P") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const printShortcut = isMac ? e.metaKey && !e.shiftKey : e.ctrlKey && !e.altKey;
      if (printShortcut) {
        e.preventDefault();
        window.print();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Scroll main content to bottom: ⌘ End (Mac) / Ctrl+End (Windows/Linux); skip when focus in input/textarea/select
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key !== "End") return;
      const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const scrollToBottom = isMac ? e.metaKey : e.ctrlKey;
      if (scrollToBottom) {
        e.preventDefault();
        const main = document.getElementById("main-content");
        if (main) main.scrollTop = main.scrollHeight - main.clientHeight;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const currentWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED : sidebarWidth;

  const {
    runningRuns,
    setSelectedRunId,
    stopRun,
    isTauriEnv,
  } = useRunState();

  return (
    <PageTitleProvider>
    <div className="app-shell flex h-screen overflow-hidden relative bg-transparent">
      <SkipToMainContent />
      <RunStatusAnnouncer />
      {/* Sidebar: expandable and resizable. useSearchParams only inside Suspense so shell never suspends. */}
      <aside
        className="flex shrink-0 flex-col border-r border-border/60 bg-sidebar h-screen overflow-hidden relative"
        style={{
          width: `${currentWidth}px`,
          transition: isResizing ? "none" : "width 200ms ease-in-out",
        }}
        suppressHydrationWarning
      >
        {/* Branded header */}
        <div
          className={`sidebar-brand-underline shrink-0 overflow-hidden transition-all duration-200 ${sidebarCollapsed ? "px-2 py-3" : "px-4 pt-5 pb-4"
            }`}
        >
          {!sidebarCollapsed ? (
            <h1 className="text-lg font-extrabold whitespace-nowrap tracking-wide text-foreground/90">
              <span className="text-primary">KW</span>Code
            </h1>
          ) : (
            <h1 className="text-sm font-extrabold text-center text-primary">
              KW
            </h1>
          )}
        </div>

        {/* Scrollable nav area */}
        <div className="flex-1 min-h-0 overflow-y-auto sidebar-nav-scroll">
          <SidebarNavigation sidebarCollapsed={sidebarCollapsed} />
        </div>

        {/* Version + Toggle footer */}
        <div className={`shrink-0 border-t border-border/40 ${sidebarCollapsed ? "flex flex-col items-center px-2 py-2" : "px-2 py-2"
          }`}>
          <SidebarThemeLabel collapsed={sidebarCollapsed} />
          <SidebarVersion collapsed={sidebarCollapsed} />
          <SidebarToggle
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
          />
        </div>

        {/* Resize handle */}
        {!sidebarCollapsed && (
          <div
            role="separator"
            aria-label="Resize sidebar"
            onMouseDown={startResize}
            className="absolute top-0 right-0 w-0.5 h-full cursor-col-resize hover:w-1 hover:bg-primary/25 active:bg-primary/40 rounded-full transition-[width,background] duration-150 shrink-0 z-10"
          />
        )}
      </aside>

      {/* Main content: scrollable, subtle depth; id + tabIndex for skip-link target */}
      <main id="main-content" tabIndex={-1} className="main-content-area flex-1 flex flex-col min-w-0 min-h-0 overflow-auto p-6 md:p-8 lg:p-10 xl:p-12 shadow-[inset_1px_0_0_0_hsl(var(--border)/0.25)]">
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex items-center justify-center" aria-hidden>
              <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
            </div>
          }
        >
          <ErrorBoundary fallbackTitle="Page error">
            <div className="flex flex-col min-h-0 flex-1">
              {children}
            </div>
          </ErrorBoundary>
        </Suspense>
      </main>

      {/* Back to top: visible when main content is scrolled down; click scrolls to top */}
      <BackToTop />
      {/* Run circles dock (bottom-right): one circle per run; click opens floating terminal */}
      <TerminalRunDock />
      {/* Floating terminal dialog: shows output for the selected run */}
      <FloatingTerminalDialog />
      {/* Global command palette: ⌘K / Ctrl+K */}
      <CommandPalette />
    </div>
    </PageTitleProvider>
  );
}
