"use client";

/** root-loading-overlay component. */
import { useCallback, useEffect, useRef, useState } from "react";
import { RainEffect } from "@/components/molecules/VisualEffects/RainEffect";
import { CursorLightGlow } from "@/components/molecules/VisualEffects/CursorLightGlow";
import { StarField } from "@/components/molecules/VisualEffects/StarField";
import { MoonGraphic } from "@/components/molecules/VisualEffects/MoonGraphic";
import { KwcodeBranding } from "@/components/molecules/Display/KwcodeBranding";
import { debugIngest } from "@/lib/debug-ingest";

/**
 * Root loading overlay: shown until the client has mounted, then fades out.
 * Branded kwcode screen with raindrops, mouse-reactive glow, flying stars, and moon.
 */
function debugSessionLog(location: string, message: string, data: Record<string, unknown>, hypothesisId: string) {
  debugIngest(
    { sessionId: "8a3da1", location, message, data, timestamp: Date.now(), hypothesisId },
    { "X-Debug-Session-Id": "8a3da1" }
  );
}

export function RootLoadingOverlay() {
  const [loaded, setLoaded] = useState(false);
  const [mouse, setMouse] = useState({ x: -1000, y: -1000 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // #region agent log
  useEffect(() => {
    debugSessionLog("root-loading-overlay.tsx", "overlay_mounted", {}, "H1");
  }, []);
  useEffect(() => {
    const el = document.getElementById("root-loading");
    debugSessionLog("root-loading-overlay.tsx", "overlay_dom_state", { dataLoaded: el?.getAttribute("data-loaded") ?? "missing", loadedState: loaded }, "H5");
  }, [loaded]);
  // #endregion

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setMouse({ x: e.clientX, y: e.clientY });
  }, []);

  const onMouseLeave = useCallback(() => {
    setMouse({ x: -1000, y: -1000 });
  }, []);

  useEffect(() => {
    debugSessionLog("root-loading-overlay.tsx", "overlay_setLoaded_true", {}, "H1");
    setLoaded(true);
  }, []);

  return (
    <div
      ref={overlayRef}
      id="root-loading"
      className="fixed inset-0 flex items-center justify-center z-[9999] transition-opacity duration-500 ease-out data-[loaded=true]:opacity-0 data-[loaded=true]:pointer-events-none"
      style={{ background: "#000" }}
      data-loaded={loaded ? "true" : undefined}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      suppressHydrationWarning
    >
      <RainEffect />
      <CursorLightGlow x={mouse.x} y={mouse.y} />
      <StarField />
      <MoonGraphic />
      <KwcodeBranding />
    </div>
  );
}
