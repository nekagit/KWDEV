/**
 * App Analyzer audit logic: run SEO and Legal/Impressum checks on fetched HTML and headers.
 * Pure functions; no backend. Used after fetchUrlForAudit().
 */
import type { AuditResult, AuditCheck, AuditCheckStatus, AuditType, FetchUrlResult } from "@/types/app-analyzer";

function addCheck(
  checks: AuditCheck[],
  id: string,
  name: string,
  status: AuditCheckStatus,
  message: string,
  detail?: string
) {
  checks.push({ id, name, status, message, detail });
}

/** Extract text content of first match for a regex that captures one group. */
function extractFirst(html: string, regex: RegExp): string | null {
  const m = html.match(regex);
  return m?.[1]?.trim() ?? null;
}

/** Run SEO audit on HTML (and optional headers). */
export function runSeoAudit(html: string, _headers?: Record<string, string>): AuditResult {
  const checks: AuditCheck[] = [];
  const lower = html.toLowerCase();

  // Title
  const title = extractFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title && title.length > 0) {
    if (title.length >= 30 && title.length <= 60) {
      addCheck(checks, "seo-title-length", "Title length", "pass", `Title length is good (${title.length} chars).`, title);
    } else if (title.length > 0) {
      addCheck(
        checks,
        "seo-title-length",
        "Title length",
        "warn",
        `Title is ${title.length} chars; 30–60 is often recommended.`,
        title
      );
    } else {
      addCheck(checks, "seo-title", "Title", "fail", "Title is empty.");
    }
  } else {
    addCheck(checks, "seo-title", "Title", "fail", "No <title> tag found.");
  }

  // Meta description
  const metaDesc = extractFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    ?? extractFirst(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  if (metaDesc && metaDesc.length > 0) {
    if (metaDesc.length >= 120 && metaDesc.length <= 160) {
      addCheck(checks, "seo-meta-desc", "Meta description", "pass", `Meta description length is good (${metaDesc.length} chars).`);
    } else {
      addCheck(
        checks,
        "seo-meta-desc",
        "Meta description",
        "warn",
        `Meta description is ${metaDesc.length} chars; 120–160 is often recommended.`
      );
    }
  } else {
    addCheck(checks, "seo-meta-desc", "Meta description", "fail", "No meta description found.");
  }

  // og:title / og:description
  const ogTitle = extractFirst(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i)
    ?? extractFirst(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i);
  const ogDesc = extractFirst(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)
    ?? extractFirst(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
  if (ogTitle && ogTitle.length > 0) {
    addCheck(checks, "seo-og-title", "Open Graph title", "pass", "og:title is present.");
  } else {
    addCheck(checks, "seo-og-title", "Open Graph title", "warn", "og:title is missing (helps social sharing).");
  }
  if (ogDesc && ogDesc.length > 0) {
    addCheck(checks, "seo-og-desc", "Open Graph description", "pass", "og:description is present.");
  } else {
    addCheck(checks, "seo-og-desc", "Open Graph description", "warn", "og:description is missing (helps social sharing).");
  }

  // Single H1
  const h1Matches = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi);
  const h1Count = h1Matches?.length ?? 0;
  if (h1Count === 0) {
    addCheck(checks, "seo-h1", "Single H1", "fail", "No <h1> tag found.");
  } else if (h1Count === 1) {
    addCheck(checks, "seo-h1", "Single H1", "pass", "Exactly one <h1> found (good for SEO).");
  } else {
    addCheck(checks, "seo-h1", "Single H1", "warn", `Found ${h1Count} <h1> tags; one is usually recommended.`);
  }

  return { auditType: "seo", checks };
}

/** Detect application type (Website, SPA, Next.js, SaaS, PWA, CMS, E-commerce, Mobile-first). */
export function runAppTypeAudit(html: string, _headers?: Record<string, string>): AuditResult {
  const checks: AuditCheck[] = [];
  const lower = html.toLowerCase();

  // Framework and app type detection
  const hasNextData = /__NEXT_DATA__/.test(html);
  const hasReactRoot = /data-reactroot|data-react-root/.test(html);
  const hasVueApp = /__vue_app__|data-v-|nuxt-|__NUXT__/.test(html);
  const hasAngular = /ng-version|ng-app|ng-controller/.test(html);
  const hasSvelte = /__svelte|svelte-component/.test(html);
  const hasAstro = /astro-island|astro-component/.test(html);

  // SPA indicators
  const hasManifest = /<link[^>]+rel=["']manifest["']/.test(html);
  const hasServiceWorker = /serviceWorker|navigator\.serviceWorker/.test(html);
  const isPWA = hasManifest || hasServiceWorker;

  // App type indicators
  const hasLoginForm = /<form[^>]*>[\s\S]*?<input[^>]*type=["\']password/.test(html) || /login|sign.?in|password|auth/i.test(lower);
  const hasDashboard = /dashboard|account|profile|settings|admin/.test(lower);
  const isSaaS = hasLoginForm && hasDashboard;

  // CMS indicators
  const isWordPress = /wp-content|wp-includes|wp-json|wordpress/.test(html);
  const isGhost = /ghost-url|ghost-api-key/.test(html);
  const isDrupal = /drupal|sites\/default/.test(html);
  const isCMS = isWordPress || isGhost || isDrupal;

  // E-commerce indicators
  const isEcommerce = /cart|checkout|product|price|\$|add.?to.?cart|buy|shop/i.test(lower);

  // Mobile-first indicators
  const hasMobileViewport = /viewport[^>]*width\s*=\s*device-width/.test(html);
  const hasTouchEvents = /touchstart|touchend|ontouchstart/.test(html);
  const isMobileFirst = hasMobileViewport || hasTouchEvents;

  // Static site indicators
  const scriptCount = (html.match(/<script[^>]*>/gi) || []).length;
  const htmlSize = html.length;
  const isStatic = scriptCount < 3 && !hasReactRoot && !hasVueApp && !hasAngular;

  // Determine primary type
  let detectedType = "Website";
  let metadata: Record<string, string> = {};

  if (hasNextData) {
    detectedType = "Next.js Application";
    metadata.framework = "Next.js";
    addCheck(checks, "apptype-nextjs", "Framework Detected", "pass", "Next.js application detected from __NEXT_DATA__");
  } else if (hasReactRoot) {
    detectedType = "React SPA";
    metadata.framework = "React";
    addCheck(checks, "apptype-react", "Framework Detected", "pass", "React application detected");
  } else if (hasVueApp) {
    detectedType = "Vue Application";
    metadata.framework = "Vue";
    addCheck(checks, "apptype-vue", "Framework Detected", "pass", "Vue/Nuxt application detected");
  } else if (hasAngular) {
    detectedType = "Angular Application";
    metadata.framework = "Angular";
    addCheck(checks, "apptype-angular", "Framework Detected", "pass", "Angular application detected");
  } else if (hasAstro) {
    detectedType = "Astro Website";
    metadata.framework = "Astro";
    addCheck(checks, "apptype-astro", "Framework Detected", "pass", "Astro application detected");
  } else if (hasSvelte) {
    detectedType = "Svelte Application";
    metadata.framework = "Svelte";
    addCheck(checks, "apptype-svelte", "Framework Detected", "pass", "Svelte application detected");
  } else if (isWordPress) {
    detectedType = "WordPress Site";
    metadata.cms = "WordPress";
    addCheck(checks, "apptype-wordpress", "CMS Detected", "pass", "WordPress CMS detected");
  } else if (isGhost) {
    detectedType = "Ghost Blog";
    metadata.cms = "Ghost";
    addCheck(checks, "apptype-ghost", "CMS Detected", "pass", "Ghost blog platform detected");
  } else if (isDrupal) {
    detectedType = "Drupal Site";
    metadata.cms = "Drupal";
    addCheck(checks, "apptype-drupal", "CMS Detected", "pass", "Drupal CMS detected");
  } else if (isStatic) {
    detectedType = "Static Website";
    addCheck(checks, "apptype-static", "Type Detected", "pass", "Static or low-JavaScript website");
  }

  if (isSaaS) {
    detectedType = "SaaS Platform";
    addCheck(checks, "apptype-saas", "Type Detected", "pass", "SaaS application with authentication detected");
  }

  if (isPWA) {
    detectedType += " (PWA)";
    addCheck(checks, "apptype-pwa", "PWA Capabilities", "pass", "Progressive Web App indicators detected");
  }

  if (isEcommerce) {
    detectedType = "E-commerce Platform";
    addCheck(checks, "apptype-ecommerce", "Type Detected", "pass", "E-commerce website detected from product/cart keywords");
  }

  if (isMobileFirst) {
    metadata.mobileFirst = "true";
    addCheck(checks, "apptype-mobile-first", "Mobile-first Design", "pass", "Mobile-first responsive design detected");
  }

  metadata.detectedType = detectedType;

  return { auditType: "apptype", checks, metadata };
}

/** Detect frontend framework and hosting/server architecture. */
export function runArchitectureAudit(html: string, headers?: Record<string, string>): AuditResult {
  const checks: AuditCheck[] = [];
  const lowerHtml = html.toLowerCase();
  const lowerHeaders = headers ? Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]) : [];

  const metadata: Record<string, string> = {};

  // Frontend frameworks
  const frameworks: [string, RegExp][] = [
    ["Next.js", /__NEXT_DATA__|_next\/static/],
    ["Nuxt", /__NUXT__|.nuxt\/]/],
    ["Gatsby", /___gatsby|gatsby-image/],
    ["Astro", /astro-island|astro-component/],
    ["SvelteKit", /sveltekit/],
    ["React", /data-reactroot|react-dom/],
    ["Vue", /__vue_app__|data-v-/],
    ["Angular", /ng-version|ng-app/],
  ];

  let detectedFramework = "";
  for (const [name, pattern] of frameworks) {
    if (pattern.test(html)) {
      detectedFramework = name;
      metadata.frontendFramework = name;
      addCheck(checks, `arch-${name.toLowerCase().replace(".", "")}`, name, "pass", `${name} framework detected`);
      break;
    }
  }

  // Server/Runtime from headers
  const serverHeader = lowerHeaders.find(([k]) => k === "server")?.[1];
  const poweredByHeader = lowerHeaders.find(([k]) => k === "x-powered-by")?.[1];

  if (serverHeader) {
    metadata.server = serverHeader;
    addCheck(checks, "arch-server", "Server Runtime", "pass", `Server: ${serverHeader}`);
  }

  if (poweredByHeader) {
    metadata.poweredBy = poweredByHeader;
    addCheck(checks, "arch-powered-by", "Technology", "pass", `Powered by: ${poweredByHeader}`);
  }

  // Hosting/CDN detection from headers
  const cdnDetections: [string, string][] = [
    ["Vercel", "vercel"],
    ["Netlify", "netlify"],
    ["Cloudflare", "cloudflare"],
    ["AWS CloudFront", "cloudfront"],
    ["Fastly", "fastly"],
  ];

  for (const [name, headerKey] of cdnDetections) {
    if (lowerHeaders.some(([k, v]) => k.includes(headerKey) || v?.toLowerCase().includes(headerKey))) {
      metadata.hosting = name;
      addCheck(checks, `arch-${name.toLowerCase().replace(" ", "-")}`, "Hosting/CDN", "pass", `Hosted on ${name}`);
      break;
    }
  }

  if (!detectedFramework && !serverHeader && !poweredByHeader) {
    addCheck(checks, "arch-unknown", "Architecture", "warn", "Unable to detect specific framework or server technology");
  }

  return { auditType: "architecture", checks, metadata };
}

/** Detect third-party libraries and services. */
export function runTechStackAudit(html: string, _headers?: Record<string, string>): AuditResult {
  const checks: AuditCheck[] = [];
  const lower = html.toLowerCase();

  const detections: [string, string, RegExp][] = [
    ["Google Analytics", "analytics", /google-analytics|gtag|ga\(|_gat\.|google\.analytics/],
    ["Plausible Analytics", "analytics", /plausible\.io|window\.plausible/],
    ["Hotjar", "analytics", /heatmap|hotjar|hjid/],
    ["Intercom", "support", /intercom\.io|window\.intercomSettings/],
    ["Zendesk", "support", /zendesk|zendeskEmbeddedMessenging/],
    ["Bootstrap CSS", "ui-framework", /bootstrap\..*\.css|bootstrap\.min|bootstrap\/dist/],
    ["Tailwind CSS", "ui-framework", /tailwind|_next\/static.*css/],
    ["Font Awesome", "icons", /font-awesome|fa-|fontawesome/],
    ["Google Fonts", "fonts", /fonts\.googleapis|fonts\.gstatic/],
    ["Leaflet Maps", "mapping", /leaflet|L\.map\(|leaflet\.css/],
    ["Google Maps", "mapping", /maps\.googleapis|google\.com\/maps|Maps JavaScript API/],
    ["Stripe", "payments", /stripe\.com|stripe\.js|Stripe\(/],
    ["PayPal", "payments", /paypal|checkout\.paypal/],
    ["Three.js", "3d-graphics", /three\.js|three\.min\.js/],
    ["D3.js", "data-visualization", /d3\.js|d3\.min\.js|d3\.v[0-9]/],
    ["Chart.js", "data-visualization", /chart\.js|Chart\(/],
  ];

  const detectedLibs = new Set<string>();

  for (const [name, category, pattern] of detections) {
    if (pattern.test(lower) && !detectedLibs.has(name)) {
      detectedLibs.add(name);
      addCheck(checks, `tech-${name.toLowerCase().replace(/[\s.]/g, "-")}`, name, "pass", `${name} (${category}) detected`);
    }
  }

  // Meta generator tag
  const generatorMatch = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']*)["']/i);
  if (generatorMatch) {
    const generator = generatorMatch[1];
    addCheck(checks, "tech-generator", "Site Generator", "pass", `Generated with: ${generator}`);
  }

  if (detectedLibs.size === 0 && !generatorMatch) {
    addCheck(checks, "tech-none-detected", "Tech Stack", "warn", "No common third-party libraries detected");
  }

  return { auditType: "techstack", checks };
}

/** Analyze performance indicators. */
export function runPerformanceAudit(html: string, _headers?: Record<string, string>): AuditResult {
  const checks: AuditCheck[] = [];

  // HTTPS check (inferred from document if available)
  if (html.includes("https://")) {
    addCheck(checks, "perf-https", "HTTPS Usage", "pass", "Page uses HTTPS links");
  }

  // Render-blocking scripts
  const scripts = html.match(/<script[^>]*(?!async)(?!defer)[^>]*>/gi) || [];
  if (scripts.length === 0) {
    addCheck(checks, "perf-render-blocking", "Render-Blocking Scripts", "pass", "No render-blocking scripts detected");
  } else {
    addCheck(
      checks,
      "perf-render-blocking",
      "Render-Blocking Scripts",
      "warn",
      `Found ${scripts.length} script(s) without async/defer. Consider deferring non-critical scripts.`
    );
  }

  // Inline styles
  const inlineStyles = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  if (inlineStyles.length > 0) {
    addCheck(
      checks,
      "perf-inline-styles",
      "Inline Styles",
      "warn",
      `Found ${inlineStyles.length} inline style block(s). Consider external stylesheets.`
    );
  } else {
    addCheck(checks, "perf-inline-styles", "Inline Styles", "pass", "No inline styles found");
  }

  // Lazy loading
  if (/loading=["']?lazy["']?|IntersectionObserver|lazysizes|lozad/.test(html)) {
    addCheck(checks, "perf-lazy-loading", "Image Lazy Loading", "pass", "Lazy loading implemented");
  } else {
    addCheck(checks, "perf-lazy-loading", "Image Lazy Loading", "warn", "No lazy loading detected");
  }

  // Large inline scripts
  const inlineScripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
  const totalInlineSize = inlineScripts.reduce((sum, script) => sum + script.length, 0);
  if (totalInlineSize > 50000) {
    addCheck(
      checks,
      "perf-large-inline",
      "Large Inline Code",
      "warn",
      `Large amount of inline JavaScript detected (${Math.round(totalInlineSize / 1000)}KB). Consider external files.`
    );
  }

  return { auditType: "performance", checks };
}

/** Check for security headers. */
export function runSecurityAudit(html: string, headers?: Record<string, string>): AuditResult {
  const checks: AuditCheck[] = [];

  if (!headers) {
    addCheck(checks, "sec-headers-unavailable", "Security Headers", "warn", "Response headers not available for analysis");
    return { auditType: "security", checks };
  }

  const lowerHeaders = Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]);

  const securityHeaders: [string, string, string][] = [
    ["X-Content-Type-Options", "x-content-type-options", "MIME type sniffing protection"],
    ["X-Frame-Options", "x-frame-options", "Clickjacking protection"],
    ["Strict-Transport-Security", "strict-transport-security", "HTTPS enforcement"],
    ["Content-Security-Policy", "content-security-policy", "XSS and injection protection"],
    ["Referrer-Policy", "referrer-policy", "Referrer information control"],
    ["Permissions-Policy", "permissions-policy", "Feature delegation control"],
  ];

  for (const [name, headerKey, description] of securityHeaders) {
    const header = lowerHeaders.find(([k]) => k === headerKey);
    if (header) {
      addCheck(checks, `sec-${headerKey}`, name, "pass", description + " is configured");
    } else {
      addCheck(checks, `sec-${headerKey}`, name, "warn", description + " is not configured");
    }
  }

  return { auditType: "security", checks };
}

/** Heuristic: page or linked pages suggest legal/Impressum presence. */
export function runLegalAudit(html: string, _headers?: Record<string, string>): AuditResult {
  const checks: AuditCheck[] = [];
  const lower = html.toLowerCase();

  // Look for common legal link texts or hrefs
  const hasImpressumLink =
    /href=["'][^"']*impressum["']/i.test(html) ||
    /<a[^>]+>[\s\S]*?impressum[\s\S]*?<\/a>/i.test(lower) ||
    lower.includes("impressum");
  const hasPrivacyLink =
    /href=["'][^"']*privacy["']/i.test(html) ||
    /href=["'][^"']*datenschutz["']/i.test(html) ||
    /<a[^>]+>[\s\S]*?(privacy|datenschutz)[\s\S]*?<\/a>/i.test(lower) ||
    lower.includes("privacy policy") ||
    lower.includes("datenschutz");
  const hasLegalOrTerms =
    /href=["'][^"']*legal["']/i.test(html) ||
    /href=["'][^"']*terms["']/i.test(html) ||
    /<a[^>]+>[\s\S]*?(legal|terms|terms of service|nutzungsbedingungen)[\s\S]*?<\/a>/i.test(lower) ||
    lower.includes("terms of service") ||
    lower.includes("legal notice");

  if (hasImpressumLink) {
    addCheck(checks, "legal-impressum", "Impressum / Legal notice", "pass", "Impressum or legal link/text found.");
  } else {
    addCheck(
      checks,
      "legal-impressum",
      "Impressum / Legal notice",
      "fail",
      "No Impressum or legal notice link found (required in many jurisdictions)."
    );
  }

  if (hasPrivacyLink) {
    addCheck(checks, "legal-privacy", "Privacy policy", "pass", "Privacy or Datenschutz link/text found.");
  } else {
    addCheck(
      checks,
      "legal-privacy",
      "Privacy policy",
      "fail",
      "No privacy policy link found (required for GDPR etc.)."
    );
  }

  if (hasLegalOrTerms) {
    addCheck(checks, "legal-terms", "Terms of service", "pass", "Terms or legal link/text found.");
  } else {
    addCheck(checks, "legal-terms", "Terms of service", "warn", "No terms of service link found (recommended for SaaS).");
  }

  return { auditType: "legal", checks };
}

/** Run all audit types on fetch result; returns combined results. */
export function runAudits(fetchResult: FetchUrlResult): AuditResult[] {
  const { body, headers } = fetchResult;
  const results: AuditResult[] = [];

  // Always run all audits in this order: apptype, architecture, techstack, performance, security, then standard audits
  results.push(runAppTypeAudit(body, headers));
  results.push(runArchitectureAudit(body, headers));
  results.push(runTechStackAudit(body, headers));
  results.push(runPerformanceAudit(body, headers));
  results.push(runSecurityAudit(body, headers));
  results.push(runSeoAudit(body, headers));
  results.push(runLegalAudit(body, headers));

  return results;
}
