"use client";

/** App Analyzer page: Comprehensive URL/project analyzer for websites, webapps, and more. */
import React from "react";
import { ScanSearch } from "lucide-react";
import { Breadcrumb } from "@/components/molecules/Navigation/Breadcrumb";
import { SingleContentPage } from "@/components/organisms/SingleContentPage";
import { AppAnalyzerPanel } from "@/components/organisms/AppAnalyzer/AppAnalyzerCategoryPanel";

export function AppAnalyzerPageContent() {
  return (
    <div className="space-y-0">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/" },
          { label: "App Analyzer" },
        ]}
        className="mb-3"
      />
      <SingleContentPage
        title="App Analyzer"
        description="Analyze any URL or linked project to detect app type, architecture, tech stack, SEO, security headers, and performance metrics."
        icon={<ScanSearch className="h-5 w-5 text-muted-foreground" aria-hidden />}
        layout="simple"
      >
        <div className="mt-4">
          <AppAnalyzerPanel />
        </div>
      </SingleContentPage>
    </div>
  );
}
