"use client";

/** Sidebar Version component. */
import { useEffect, useState } from "react";
import { getAppVersion } from "@/lib/app-version";

export type SidebarVersionProps = {
  /** When true (sidebar collapsed), version text is hidden. */
  collapsed: boolean;
};

/**
 * Displays the app version in the sidebar footer (e.g. "v0.1.0").
 * Hidden when sidebar is collapsed. Uses getAppVersion (Tauri or /api/version).
 */
export function SidebarVersion({ collapsed }: SidebarVersionProps) {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAppVersion()
      .then((v) => { if (!cancelled) setVersion(v ?? "—"); })
      .catch(() => { if (!cancelled) setVersion("—"); });
    return () => { cancelled = true; };
  }, []);

  if (collapsed || version === null) return null;

  return (
    <div
      className="px-2 py-1 text-center"
      aria-label={`App version ${version}`}
    >
      <span className="text-[10px] text-muted-foreground tabular-nums">
        v{version}
      </span>
    </div>
  );
}
