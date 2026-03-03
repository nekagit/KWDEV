"use client";

/** Configuration Page Content component. */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  isValidUIThemeId,
  applyUITheme,
  type UIThemeId,
} from "@/data/ui-theme-templates";
import { useUITheme } from "@/context/ui-theme";
import { useRunState } from "@/context/run-state";
import { useQuickActions } from "@/context/quick-actions-context";
import { Palette, Keyboard, Copy, FileText, FileJson, RefreshCw, Loader2, FolderOpen, ClipboardList, Check, XCircle, ExternalLink, Mic, Video } from "lucide-react";
import { PrintButton } from "@/components/molecules/Buttons/PrintButton";
import { Breadcrumb } from "@/components/molecules/Navigation/Breadcrumb";
import { getOrganismClasses } from "./organism-classes";

const c = getOrganismClasses("ConfigurationPageContent.tsx");
import { ThemeSelector } from "@/components/organisms/Utilities/ThemeSelector";
import { SingleContentPage } from "@/components/organisms/SingleContentPage";
import { Button } from "@/components/ui/button";
import { getAppVersion } from "@/lib/app-version";
import { getApiHealth } from "@/lib/api-health";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { invoke, isTauri } from "@/lib/tauri";
import { copyAppDataFolderPath } from "@/lib/copy-app-data-folder-path";
import { copyAppInfoToClipboard } from "@/lib/copy-app-info";
import {
  downloadAppInfoAsMarkdown,
  copyAppInfoAsMarkdownToClipboard,
} from "@/lib/download-app-info-md";
import { copyAppInfoAsJsonToClipboard, downloadAppInfoAsJson } from "@/lib/download-app-info-json";
import { openAppDataFolderInFileManager } from "@/lib/open-app-data-folder";
import { getAppRepositoryUrl } from "@/lib/app-repository";
import { toast } from "sonner";

export function ConfigurationPageContent() {
  const isMounted = useRef(true);
  useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);
  const { error, refreshData } = useRunState();
  const { theme: uiTheme, setTheme: setUITheme } = useUITheme();
  const { openShortcutsModal } = useQuickActions();
  const [version, setVersion] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [apiHealthOk, setApiHealthOk] = useState<boolean | null>(null);
  const [apiHealthChecking, setApiHealthChecking] = useState(false);
  const [dataDir, setDataDir] = useState<string | null>(null);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [permRequesting, setPermRequesting] = useState<"microphone" | "camera" | "all" | null>(null);

  useEffect(() => {
    setRepoUrl(getAppRepositoryUrl());
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAppVersion()
      .then((v) => { if (!cancelled) setVersion(v); })
      .catch(() => { if (!cancelled) setVersion("—"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isTauri) {
      setDataDir("—");
      return;
    }
    invoke<string>("get_data_dir")
      .then((p) => { if (!cancelled) setDataDir(p?.trim() ?? "—"); })
      .catch(() => { if (!cancelled) setDataDir("—"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (isTauri) return () => { cancelled = true; };
    getApiHealth()
      .then((data) => { if (!cancelled) setApiHealthOk(data.ok === true); })
      .catch(() => { if (!cancelled) setApiHealthOk(false); });
    return () => { cancelled = true; };
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
      getAppVersion().then((v) => { if (isMounted.current) setVersion(v); }).catch(() => { if (isMounted.current) setVersion("—"); });
      toast.success("Data refreshed");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  const handleThemeSelect = useCallback(
    (id: UIThemeId) => {
      applyUITheme(id);
      setUITheme(id);
    },
    [setUITheme]
  );

  const handleCheckApiHealth = useCallback(async () => {
    if (isTauri) return;
    setApiHealthChecking(true);
    try {
      const data = await getApiHealth();
      setApiHealthOk(data.ok === true);
      if (data.ok) {
        toast.success(data.version ? `API health: OK (${data.version})` : "API health: OK");
      } else {
        toast.error("API health: Unavailable");
      }
    } catch {
      setApiHealthOk(false);
      toast.error("API health: Unavailable");
    } finally {
      setApiHealthChecking(false);
    }
  }, []);

  /** Request native macOS permission first (so WebView getUserMedia works), then getUserMedia. */
  const requestNativeMacOSPermission = useCallback(async (kind: "microphone" | "camera") => {
    if (!isTauri) return;
    try {
      const api = await import("tauri-plugin-macos-permissions-api");
      if (kind === "microphone") {
        await api.requestMicrophonePermission();
      } else {
        await api.requestCameraPermission();
      }
    } catch {
      // Plugin not available (e.g. non-macOS) or invoke failed; continue to getUserMedia
    }
  }, []);

  const requestMediaPermission = useCallback(
    async (kind: "audio" | "video") => {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Media API not available in this environment");
        return;
      }
      setPermRequesting(kind === "audio" ? "microphone" : "camera");
      try {
        await requestNativeMacOSPermission(kind === "audio" ? "microphone" : "camera");
        const stream = await navigator.mediaDevices.getUserMedia(
          kind === "audio" ? { audio: true } : { video: true }
        );
        stream.getTracks().forEach((t) => t.stop());
        toast.success(
          kind === "audio"
            ? "Microphone permission requested. Check System Settings → Privacy if you need to allow access."
            : "Camera permission requested. Check System Settings → Privacy if you need to allow access."
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Permission request failed";
        toast.error(msg);
      } finally {
        setPermRequesting(null);
      }
    },
    [requestNativeMacOSPermission]
  );

  const requestAllPermissions = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Media API not available in this environment");
      return;
    }
    setPermRequesting("all");
    try {
      await requestNativeMacOSPermission("microphone");
      await requestNativeMacOSPermission("camera");
      const streamAudio = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamAudio.getTracks().forEach((t) => t.stop());
      const streamVideo = await navigator.mediaDevices.getUserMedia({ video: true });
      streamVideo.getTracks().forEach((t) => t.stop());
      toast.success(
        "Microphone and camera permission requested. Check System Settings → Privacy if you need to allow access."
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Permission request failed";
      toast.error(msg);
    } finally {
      setPermRequesting(null);
    }
  }, [requestNativeMacOSPermission]);

  const effectiveTheme = isValidUIThemeId(uiTheme) ? uiTheme : "light";

  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 pb-12">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Configuration" },
        ]}
      />
      <div className="flex flex-wrap items-center justify-end gap-3">
        <PrintButton
          title="Print configuration page (⌘P)"
          variant="outline"
          size="sm"
          className="h-9 gap-2"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={handleRefresh}
          className="h-9 gap-2"
          aria-label="Refresh data"
        >
          {refreshing ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4 shrink-0" aria-hidden />
          )}
          Refresh
        </Button>
      </div>
      <SingleContentPage
        title="Design templates"
        description="Choose a theme to change the app background, accents, and UI component colors. Your choice is saved and applied on next load."
        icon={<Palette className={c["0"]} />}
        layout="card"
        error={error}
      >
        <div className="space-y-8">
          <ThemeSelector onThemeSelect={handleThemeSelect} effectiveTheme={effectiveTheme} />
          <div className="pt-6 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={openShortcutsModal}
              className="h-9 gap-2"
              aria-label="Open keyboard shortcuts help"
            >
              <Keyboard className="size-4 shrink-0" aria-hidden />
              Keyboard shortcuts
            </Button>
          </div>
          {isTauri && (
            <div className="pt-6 border-t border-border/60">
              <p className="text-sm font-medium text-muted-foreground mb-2">System permissions</p>
              <p className="text-xs text-muted-foreground mb-3">
                Request access to microphone and camera so macOS shows the permission dialogs. You can then allow KWCode in System Settings → Privacy &amp; Security. If a feature (e.g. Live Captions) still says microphone denied after you allowed it, click &quot;Request microphone&quot; here, then fully quit and reopen KWCode.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={permRequesting !== null}
                  onClick={() => requestMediaPermission("audio")}
                  className="h-9 gap-2"
                  aria-label="Request microphone access"
                >
                  {permRequesting === "microphone" || permRequesting === "all" ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <Mic className="size-4 shrink-0" aria-hidden />
                  )}
                  Request microphone
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={permRequesting !== null}
                  onClick={() => requestMediaPermission("video")}
                  className="h-9 gap-2"
                  aria-label="Request camera access"
                >
                  {permRequesting === "camera" || permRequesting === "all" ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <Video className="size-4 shrink-0" aria-hidden />
                  )}
                  Request camera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={permRequesting !== null}
                  onClick={() => requestAllPermissions()}
                  className="h-9 gap-2"
                  aria-label="Request microphone and camera access"
                >
                  {permRequesting === "all" ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  ) : null}
                  Request all
                </Button>
              </div>
            </div>
          )}
          <div className="pt-6 border-t border-border/60">
            <p className="text-sm font-medium text-muted-foreground mb-3">Data</p>
            {dataDir !== null && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs text-muted-foreground">Data directory:</span>
                <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded break-all">
                  {dataDir}
                </code>
                {isTauri && dataDir !== "—" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                    onClick={() => void copyAppDataFolderPath()}
                    aria-label="Copy data directory path to clipboard"
                  >
                    <Copy className="size-3.5 shrink-0" aria-hidden />
                    Copy path
                  </Button>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => openAppDataFolderInFileManager()}
                className="h-9 gap-2"
                aria-label="Open app data folder in file manager"
              >
                <FolderOpen className="size-4 shrink-0" aria-hidden />
                Open data folder
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  copyAppInfoToClipboard({
                    version: version ?? "—",
                    theme: effectiveTheme,
                  })
                }
                className="h-9 gap-2"
                aria-label="Copy app info to clipboard"
              >
                <ClipboardList className="size-4 shrink-0" aria-hidden />
                Copy app info
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void copyAppInfoAsMarkdownToClipboard({
                    version: version ?? "—",
                    theme: effectiveTheme,
                  })
                }
                className="h-9 gap-2"
                aria-label="Copy app info as Markdown to clipboard"
                title="Copy as Markdown (same content as Download as Markdown)"
              >
                <Copy className="size-4 shrink-0" aria-hidden />
                Copy as Markdown
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  downloadAppInfoAsMarkdown({
                    version: version ?? "—",
                    theme: effectiveTheme,
                  })
                }
                className="h-9 gap-2"
                aria-label="Download app info as Markdown"
                title="Download app info as Markdown (same data as Copy app info)"
              >
                <FileText className="size-4 shrink-0" aria-hidden />
                Download as Markdown
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  copyAppInfoAsJsonToClipboard({
                    version: version ?? "—",
                    theme: effectiveTheme,
                  })
                }
                className="h-9 gap-2"
                aria-label="Copy app info as JSON to clipboard"
                title="Copy as JSON (same data as Download as JSON)"
              >
                <Copy className="size-4 shrink-0" aria-hidden />
                Copy as JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  downloadAppInfoAsJson({
                    version: version ?? "—",
                    theme: effectiveTheme,
                  })
                }
                className="h-9 gap-2"
                aria-label="Download app info as JSON"
                title="Download app info as JSON (same data as Copy app info)"
              >
                <FileJson className="size-4 shrink-0" aria-hidden />
                Download as JSON
              </Button>
            </div>
          </div>
          {version !== null && (
            <div className="pt-6 border-t border-border/60 flex flex-wrap items-center gap-4 sm:gap-6">
              <p className="text-sm text-muted-foreground" aria-label="App version">
                Version {version}
              </p>
              {version !== "—" && version.trim() !== "" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-2 text-muted-foreground hover:text-foreground"
                  onClick={() => copyTextToClipboard(version)}
                  aria-label="Copy app version to clipboard"
                >
                  <Copy className="size-4 shrink-0" aria-hidden />
                  Copy version
                </Button>
              )}
              {repoUrl && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-2 text-muted-foreground hover:text-foreground"
                    onClick={async () => {
                      const ok = await copyTextToClipboard(repoUrl);
                      if (ok) toast.success("Repository URL copied to clipboard");
                    }}
                    aria-label="Copy repository URL to clipboard"
                    title="Copy repository URL"
                  >
                    <Copy className="size-4 shrink-0" aria-hidden />
                    Copy repository URL
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2"
                    onClick={() => window.open(repoUrl, "_blank", "noopener,noreferrer")}
                    aria-label="Open app repository in browser"
                    title={repoUrl}
                  >
                    <ExternalLink className="size-4 shrink-0" aria-hidden />
                    View source
                  </Button>
                </>
              )}
              {!isTauri && (
                <div className="flex flex-wrap items-center gap-2">
                  {apiHealthOk !== null && (
                    <p
                      className="text-sm text-muted-foreground flex items-center gap-2"
                      aria-label="API health status"
                    >
                      {apiHealthOk ? (
                        <>
                          <Check className="size-4 shrink-0 text-sky-600 dark:text-sky-500" aria-hidden />
                          API health: OK
                        </>
                      ) : (
                        <>
                          <XCircle className="size-4 shrink-0 text-destructive" aria-hidden />
                          API health: Unavailable
                        </>
                      )}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={apiHealthChecking}
                    onClick={() => void handleCheckApiHealth()}
                    className="h-8 gap-1.5"
                    aria-label="Check API health"
                    title="Re-check API health (browser mode)"
                  >
                    {apiHealthChecking ? (
                      <RefreshCw className="size-3.5 shrink-0 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="size-3.5 shrink-0" aria-hidden />
                    )}
                    Check API health
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SingleContentPage>
    </div>
  );
}
