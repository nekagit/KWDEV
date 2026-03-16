"use client";

/** Loading Screen Page Content component. */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { RainEffect } from "@/components/molecules/VisualEffects/RainEffect";
import { CursorLightGlow } from "@/components/molecules/VisualEffects/CursorLightGlow";
import { StarField } from "@/components/molecules/VisualEffects/StarField";
import { MoonGraphic } from "@/components/molecules/VisualEffects/MoonGraphic";
import { KwcodeBranding } from "@/components/molecules/Display/KwcodeBranding";
import { PrintButton } from "@/components/molecules/Buttons/PrintButton";
import { Breadcrumb } from "@/components/molecules/Navigation/Breadcrumb";
import { getOrganismClasses } from "./organism-classes";
import { getAppVersion } from "@/lib/app-version";
import { getAppRepositoryUrl } from "@/lib/app-repository";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const c = getOrganismClasses("LoadingScreenPageContent.tsx");

/** Classes so breadcrumb is visible on the dark background */
const BREADCRUMB_DARK_CLASS =
  "text-white/90 [&_ol]:text-white/90 [&_a]:text-white/80 [&_a:hover]:text-white [&_span]:text-white [&_svg]:text-white/70";

/**
 * Full-page Loading Screen (moon and stars): same look as the root loading overlay,
 * with a go-back arrow at the top left to leave. Shows app version and View source link in footer.
 */
export function LoadingScreenPageContent() {
  const [mouse, setMouse] = useState({ x: -1000, y: -1000 });
  const [version, setVersion] = useState<string | null>(null);
  const repoUrl = getAppRepositoryUrl();

  useEffect(() => {
    let cancelled = false;
    getAppVersion()
      .then((v) => { if (!cancelled) setVersion(v); })
      .catch(() => { if (!cancelled) setVersion("—"); });
    return () => { cancelled = true; };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setMouse({ x: e.clientX, y: e.clientY });
  }, []);

  const onMouseLeave = useCallback(() => {
    setMouse({ x: -1000, y: -1000 });
  }, []);

  const handleCopyVersion = useCallback(async () => {
    if (version == null || version === "—") return;
    const text = `v${version}`;
    const ok = await copyTextToClipboard(text);
    if (ok) toast.success("Version copied to clipboard");
    else toast.error("Failed to copy");
  }, [version]);

  const handleCopyRepositoryUrl = useCallback(async () => {
    if (!repoUrl) return;
    const ok = await copyTextToClipboard(repoUrl);
    if (ok) toast.success("Repository URL copied to clipboard");
    else toast.error("Failed to copy");
  }, [repoUrl]);

  return (
    <div
      className={c["0"]}
      style={{ background: "#000" }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <RainEffect />
      <CursorLightGlow x={mouse.x} y={mouse.y} />
      <StarField />
      <MoonGraphic />
      <KwcodeBranding />

      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
        <Breadcrumb
          items={[{ label: "Home", href: "/" }, { label: "Loading" }]}
          className={BREADCRUMB_DARK_CLASS}
        />
        <Link
          href="/"
          className="flex items-center justify-center size-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all duration-200"
          aria-label="Go back"
        >
          <ArrowLeft className={c["2"]} />
        </Link>
      </div>

      <footer className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-center gap-4 text-xs text-white/60">
        <PrintButton
          title="Print loading screen (⌘P)"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-white/60 hover:text-white hover:bg-white/10 border border-white/30 hover:border-white/50"
          iconClassName="size-3.5 mr-1.5"
        />
        {version != null && (
          <span className="flex items-center gap-2">
            <span className="font-mono" aria-label="App version">
              {version === "—" ? "—" : `v${version}`}
            </span>
            {version !== "—" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-white/60 hover:text-white hover:bg-white/10 border border-white/30 hover:border-white/50"
                onClick={handleCopyVersion}
                aria-label="Copy app version to clipboard"
                title="Copy version"
              >
                <Copy className="size-3.5" aria-hidden />
              </Button>
            )}
          </span>
        )}
        {repoUrl && (
          <span className="inline-flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-white/60 hover:text-white hover:bg-white/10 border border-white/30 hover:border-white/50"
              onClick={handleCopyRepositoryUrl}
              aria-label="Copy repository URL to clipboard"
              title="Copy repository URL"
            >
              <Copy className="size-3.5" aria-hidden />
              Copy repository URL
            </Button>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-white/60 hover:text-white/90 transition-colors"
              aria-label="View source (opens in new tab)"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              View source
            </a>
          </span>
        )}
      </footer>
    </div>
  );
}
