"use client";

/**
 * Quick-actions context: config and shortcuts modals, add-prompt action.
 * Provides openConfigModal, openShortcutsModal, and add-prompt handling for the app shell.
 */
import React, { createContext, useCallback, useContext, useState, useEffect, Suspense } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Settings, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ConfigurationPage from "@/app/configuration/page";
import { ShortcutsHelpDialog } from "@/components/organisms/Utilities/ShortcutsHelpDialog";

type QuickModal = "config" | null;

interface QuickActionsContextValue {
  openConfigModal: () => void;
  openShortcutsModal: () => void;
}

const QuickActionsContext = createContext<QuickActionsContextValue | null>(null);

export function useQuickActions() {
  const ctx = useContext(QuickActionsContext);
  if (!ctx) throw new Error("useQuickActions must be used within QuickActionsProvider");
  return ctx;
}

const FAB_ACTIONS = [
  { id: "config" as const, label: "Configuration", icon: Settings, iconClassName: "text-success/90" },
] as const;

/** Flutter-style FAB: always-visible main button bottom-right; hover reveals Configuration action. Portaled to body so it is never clipped by overflow-hidden on AppShell. */
export function QuickActionsFAB() {
  const { openConfigModal } = useQuickActions();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fabContent = (
    <div
      className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end gap-3 pointer-events-none"
      aria-label="Quick actions (Configuration)"
    >
      <div className="pointer-events-auto flex flex-col items-end gap-3">
        <div className="group flex flex-col items-end gap-3">
          {FAB_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              aria-label={action.label}
              title={action.label}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-card-foreground shadow-md border border-border transition-all duration-200 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              style={{
                boxShadow:
                  "0 2px 4px -1px rgba(0,0,0,0.06), 0 4px 6px -1px rgba(0,0,0,0.1), 0 6px 12px -2px rgba(0,0,0,0.08)",
              }}
              onClick={() => {
                if (action.id === "config") openConfigModal();
              }}
            >
              <action.icon className={cn("h-5 w-5", action.iconClassName)} />
            </button>
          ))}
          <div
            className="flex h-14 w-14 min-w-[3.5rem] min-h-[3.5rem] items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-primary/20 transition-all duration-200 group-hover:shadow-[0_8px_16px_-2px_rgba(0,0,0,0.2),0_12px_24px_-4px_rgba(0,0,0,0.15)] group-hover:scale-105 cursor-pointer border-0"
            style={{
              boxShadow:
                "0 4px 6px -1px rgba(0,0,0,0.1), 0 6px 12px -2px rgba(0,0,0,0.08), 0 10px 20px -4px rgba(0,0,0,0.12)",
            }}
            role="button"
            tabIndex={0}
            aria-label="Open quick actions (Configuration)"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                (e.currentTarget.parentElement?.querySelector("button") as HTMLElement)?.focus();
              }
            }}
          >
            <Plus className="h-7 w-7 shrink-0" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted || typeof document === "undefined") return null;
  return createPortal(fabContent, document.body);
}

/** When URL has openShortcuts=1 (e.g. from /shortcuts redirect), open shortcuts modal and clear param. Wrapped in Suspense because useSearchParams can suspend. */
function OpenShortcutsFromQuery() {
  const searchParams = useSearchParams();
  const { openShortcutsModal } = useQuickActions();
  useEffect(() => {
    if (searchParams.get("openShortcuts") === "1") {
      openShortcutsModal();
      const url = new URL(window.location.href);
      url.searchParams.delete("openShortcuts");
      const replace = url.search ? `${url.pathname}${url.search}` : url.pathname;
      window.history.replaceState({}, "", replace);
    }
  }, [searchParams, openShortcutsModal]);
  return null;
}

export function QuickActionsProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<QuickModal>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const openConfigModal = useCallback(() => setModal("config"), []);
  const openShortcutsModal = useCallback(() => setShortcutsOpen(true), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "?") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setShortcutsOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const value: QuickActionsContextValue = {
    openConfigModal,
    openShortcutsModal,
  };

  const closeModal = useCallback(() => setModal(null), []);

  return (
    <QuickActionsContext.Provider value={value}>
      <Suspense fallback={null}>
        <OpenShortcutsFromQuery />
      </Suspense>
      {children}

      <Dialog open={modal === "config"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <ScrollArea className="max-h-[85vh]">
            <div className="p-6">
              <ConfigurationPage />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ShortcutsHelpDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </QuickActionsContext.Provider>
  );
}
