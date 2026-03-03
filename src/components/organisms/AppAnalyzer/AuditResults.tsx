"use client";

/** AuditResults: display list of audit checks (pass/fail/warn) with messages. */
import React from "react";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { AuditResult as AuditResultType } from "@/types/app-analyzer";
import { cn } from "@/lib/utils";

export interface AuditResultsProps {
  results: AuditResultType[] | null;
  loading: boolean;
  error: string | null;
}

const statusConfig = {
  pass: { icon: CheckCircle2, label: "Pass", className: "text-sky-600 dark:text-sky-400" },
  fail: { icon: XCircle, label: "Fail", className: "text-destructive" },
  warn: { icon: AlertCircle, label: "Warning", className: "text-amber-600 dark:text-amber-400" },
} as const;

function CheckRow({
  id,
  name,
  status,
  message,
  detail,
}: {
  id: string;
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  detail?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <div
      className="flex gap-3 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 text-sm"
      data-check-id={id}
    >
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", config.className)} aria-hidden />
      <div className="min-w-0 flex-1">
        <span className="font-medium text-foreground">{name}</span>
        <span className={cn("ml-2 text-muted-foreground")}>— {message}</span>
        {detail && (
          <p className="mt-1 text-xs text-muted-foreground truncate max-w-full" title={detail}>
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

const auditTypeLabels: Record<string, string> = {
  apptype: "App Type Detection",
  architecture: "Architecture & Hosting",
  techstack: "Tech Stack",
  performance: "Performance",
  security: "Security Headers",
  seo: "SEO",
  legal: "Legal / Compliance",
};

export function AuditResults({ results, loading, error }: AuditResultsProps) {
  if (loading) {
    return (
      <div className="mt-4 rounded-xl border border-border/40 bg-card/60 p-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          Running audit…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-4 text-sm text-muted-foreground">
        Run an audit to see results.
      </div>
    );
  }

  // Find app type result for prominent display
  const appTypeResult = results.find((r) => r.auditType === "apptype");
  const detectedType = appTypeResult?.metadata?.detectedType || "Unknown";

  return (
    <div className="mt-6 space-y-6">
      {/* Detected App Type Card */}
      {appTypeResult && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2.5 mt-0.5">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Detected Application Type</h3>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">{detectedType}</p>
              <div className="mt-3 space-y-1">
                {appTypeResult.checks
                  .filter((c) => c.status === "pass")
                  .slice(0, 3)
                  .map((check) => (
                    <p key={check.id} className="text-xs text-muted-foreground">
                      ✓ {check.message}
                    </p>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Results Grouped by Category */}
      <div className="space-y-6">
        {results.map((result) => {
          const label = auditTypeLabels[result.auditType] || result.auditType;
          // Skip apptype since we already showed it
          if (result.auditType === "apptype") return null;

          return (
            <div key={result.auditType} className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                {label}
                <span className="text-xs text-muted-foreground ml-auto">
                  {result.checks.filter((c) => c.status === "pass").length}/{result.checks.length} passing
                </span>
              </h3>
              <div className="space-y-2">
                {result.checks.map((check) => (
                  <CheckRow
                    key={check.id}
                    id={check.id}
                    name={check.name}
                    status={check.status}
                    message={check.message}
                    detail={check.detail}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
