/** layout component. */
import type { Metadata } from "next";
import "@/app/globals.css";
import { RootLoadingOverlay } from "@/components/molecules/VisualEffects/RootLoadingOverlay";
import { RunStoreHydration } from "@/store/run-store-hydration";
import { AppShell } from "@/components/templates/AppShell";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UIThemeProvider } from "@/context/ui-theme";
import { QuickActionsProvider } from "@/context/quick-actions-context";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });


export const metadata: Metadata = {
  title: "KWDEV",
  description: "KWDEV – development workflow and prompts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <html lang="en" style={{ background: "hsl(var(--background, 0 0% 98%))" }} suppressHydrationWarning>
      <head>
        {/* In dev, base href ensures Tauri webview resolves relative asset URLs (e.g. /_next/static) against the dev server. */}
        {isDev && <base href="http://127.0.0.1:4000/" />}
        {/* Apply stored UI theme before paint so first paint and loading overlay match Configuration choice */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("app-ui-theme");var v=["light","dark","ocean","forest","warm","red","violet","rose","slate","terminal"];var themeToApply=t&&v.indexOf(t)!==-1?t:"dark";document.documentElement.setAttribute("data-theme",themeToApply);if(themeToApply==="dark"||themeToApply==="terminal"){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}})();`,
          }}
        />
        {/* Critical CSS: variables + base so Tauri webview has styles even if main stylesheet is delayed or blocked */}
        <style dangerouslySetInnerHTML={{
          __html: `
          :root {
            --background: 0 0% 100%;
            --foreground: 240 10% 3.9%;
            --card: 0 0% 100%;
            --card-foreground: 240 10% 3.9%;
            --muted: 240 4.8% 95.9%;
            --muted-foreground: 240 3.8% 46.1%;
            --border: 240 5.9% 90%;
            --primary: 240 5.9% 10%;
            --primary-foreground: 0 0% 98%;
            --secondary: 240 4.8% 95.9%;
            --secondary-foreground: 240 5.9% 10%;
            --accent: 240 4.8% 95.9%;
            --ring: 240 5.9% 10%;
            --radius: 0.5rem;
          }
          *,*::before,*::after { box-sizing: border-box; }
          * { border-color: hsl(var(--border)); }
          html, body { margin: 0; min-height: 100%; background: hsl(var(--background)); color: hsl(var(--foreground)); -webkit-font-smoothing: antialiased; }
          #root-loading { position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;z-index:9999; }
          #root-loading[data-loaded=true] { opacity:0;pointer-events:none;transition:opacity .5s ease-out; }
          @keyframes root-loading-spin { to { transform: rotate(360deg); } }
          @keyframes root-loading-pulse { 0%,100% { opacity: 0.4; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1); } }
        `}} />
      </head>
      <body suppressHydrationWarning className={`${inter.variable} font-sans min-h-screen antialiased bg-background text-foreground`} style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
        {/* If React never hydrates (e.g. chunk load failed), hide overlay after 15s so user sees the page or can refresh */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){setTimeout(function(){var el=document.getElementById("root-loading");if(el&&!el.getAttribute("data-loaded"))el.setAttribute("data-loaded","true");},15000);})();`,
          }}
        />
        <RootLoadingOverlay />
        <RunStoreHydration />
        <UIThemeProvider>
          <TooltipProvider>
            <QuickActionsProvider>
              <Toaster richColors position="top-center" />
              <AppShell>{children}</AppShell>
            </QuickActionsProvider>
          </TooltipProvider>
        </UIThemeProvider>
      </body>
    </html>
  );
}
