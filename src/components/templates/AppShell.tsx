"use client";

/**
 * Root app shell: top navbar, main content, terminal dock, command palette, and layout providers.
 * No app sidebar; project details page renders its own left sidebar in place.
 */
import { useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSidebarNavItemsFlat } from "@/lib/sidebar-nav-config";
import { cn } from "@/lib/utils";
import { useRunState } from "@/context/run-state";
import { PageTitleProvider } from "@/context/page-title-context";
import { ErrorBoundary } from "@/components/organisms/ErrorBoundary";
import { FloatingTerminalDialog } from "@/components/organisms/FloatingTerminalDialog";
import { TerminalRunDock } from "@/components/organisms/TerminalRunDock";
import { CommandPalette } from "@/components/organisms/CommandPalette";
import { SkipToMainContent } from "@/components/molecules/Accessible/SkipToMainContent";
import { RunStatusAnnouncer } from "@/components/molecules/Accessible/RunStatusAnnouncer";
import { BackToTop } from "@/components/molecules/Buttons/BackToTop";
import {
  TOP_NAV_ACTIVE_CLASSNAME,
  TOP_NAV_BASE_LINK_CLASSNAME,
  TOP_NAV_INACTIVE_CLASSNAME,
} from "@/lib/top-nav-style";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Scroll main content to top on route change (fresh-page experience; instant scroll for reduced-motion)
  useEffect(() => {
    const main = document.getElementById("main-content");
    if (main) main.scrollTop = 0;
  }, [pathname]);

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

  /** On project details (/projects/[id]), main has no padding so the project page left sidebar is edge-to-edge. */
  const isProjectDetailsPage =
    typeof pathname === "string" &&
    /^\/projects\/[^/]+$/.test(pathname) &&
    pathname !== "/projects/new";

  const {
    runningRuns,
    setSelectedRunId,
    stopRun,
    isTauriEnv,
  } = useRunState();

  const appNavItems = getSidebarNavItemsFlat();

  return (
    <PageTitleProvider>
    <div className="app-shell flex flex-col h-screen overflow-hidden relative bg-transparent">
      <SkipToMainContent />
      <RunStatusAnnouncer />
      {/* Top navbar: app-wide, full width, does not scroll away */}
      <header
        className="shrink-0 h-12 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex items-center px-4 gap-x-1"
        aria-label="App navigation"
      >
        {appNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && typeof pathname === "string" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                TOP_NAV_BASE_LINK_CLASSNAME,
                isActive
                  ? TOP_NAV_ACTIVE_CLASSNAME
                  : TOP_NAV_INACTIVE_CLASSNAME
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  item.iconColor ?? "text-sky-400",
                  !isActive && "opacity-90"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </header>

      {/* Main content: no app sidebar on any page; project details page renders its own left sidebar in place. */}
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "main-content-area flex-1 flex flex-col min-w-0 min-h-0 overflow-auto shadow-[inset_1px_0_0_0_hsl(var(--border)/0.25)]",
          isProjectDetailsPage ? "p-0" : "p-6 md:p-8 lg:p-10 xl:p-12"
        )}
      >
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
