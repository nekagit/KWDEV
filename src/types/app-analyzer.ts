/** Types for App Analyzer: URL fetch result and audit results. */

/** Result of fetching a URL (Tauri command or API route). */
export interface FetchUrlResult {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

/** Status of a single audit check. */
export type AuditCheckStatus = "pass" | "fail" | "warn";

/** A single audit check. */
export interface AuditCheck {
  id: string;
  name: string;
  status: AuditCheckStatus;
  message: string;
  detail?: string;
}

/** Result of running one audit type (e.g. SEO or Legal). */
export interface AuditResult {
  auditType: AuditType;
  checks: AuditCheck[];
  metadata?: Record<string, string>; // e.g. { detectedType: "Next.js SPA", framework: "React" }
}

/** Supported audit types. */
export type AuditType = "seo" | "legal" | "apptype" | "architecture" | "techstack" | "performance" | "security";

/** App analyzer category (tab). */
export type AppAnalyzerCategory = "website" | "webapp" | "saas" | "paas";
