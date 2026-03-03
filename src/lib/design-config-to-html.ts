/**
 * Renders design config (sections, colors, typography) to HTML for preview and export.
 */
import type { DesignConfig, DesignSection } from "@/types/design";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Sample copy for section kinds */
function sampleCopy(section: DesignSection): string {
  if (section.copy) return section.copy;
  switch (section.kind) {
    case "nav":
      return "Home · Features · Pricing · Contact";
    case "hero":
      return "Headline and short value proposition. One line CTA below.";
    case "features":
      return "Three feature cards with icon, title, and short description.";
    case "testimonials":
      return "Quote, author name, and optional role or company.";
    case "cta":
      return "Final call to action with primary button.";
    case "pricing":
      return "Plan name, price, feature list, and CTA button.";
    case "faq":
      return "Question and expandable answer.";
    case "team":
      return "Photo, name, role, and short bio.";
    case "contact-form":
      return "Name, email, message fields and submit button.";
    case "footer":
      return "Links, copyright, social icons.";
    case "content":
      return "Main body text and optional sidebar.";
    case "sidebar":
      return "Navigation or secondary content links.";
    default:
      return section.description || `${section.title} content area.`;
  }
}

/** Generate a full sample HTML document from design config for preview. */
export function designConfigToSampleHtml(config: DesignConfig): string {
  const { colors, typography, layout, sections, projectName, pageTitle } = config;
  const sorted = [...sections]
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const navStyle = layout.navStyle;
  const isSidebarLayout = navStyle === "sidebar";

  const cssVars = `
    --color-primary: ${colors.primary};
    --color-secondary: ${colors.secondary};
    --color-accent: ${colors.accent};
    --color-background: ${colors.background};
    --color-surface: ${colors.surface};
    --color-text: ${colors.text};
    --color-text-muted: ${colors.textMuted};
    --font-heading: ${typography.headingFont};
    --font-body: ${typography.bodyFont};
    --size-base: ${typography.baseSize};
    --layout-max-width: ${layout.maxWidth};
    --layout-spacing: ${layout.spacing};
    --layout-radius: ${layout.borderRadius};
  `.replace(/\n\s+/g, " ");

  const renderSection = (s: DesignSection): string => {
      const copy = escapeHtml(sampleCopy(s));
      const title = escapeHtml(s.title);
      const kind = s.kind;

      if (kind === "nav") {
        const isCentered = navStyle === "centered";
        const isFull = navStyle === "full";
        const isSidebar = navStyle === "sidebar";
        if (isSidebar) {
          return `
          <nav class="sample-nav sample-nav-sidebar" aria-label="Navigation" style="background: var(--color-surface);">
            <div class="sample-nav-brand">${escapeHtml(projectName)}</div>
            <ul class="sample-nav-links">
              <li><a href="#">Home</a></li>
              <li><a href="#">Features</a></li>
              <li><a href="#">Pricing</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </nav>`;
        }
        return `
          <header class="sample-nav sample-nav-${navStyle}" style="background: var(--color-surface); border-bottom: 1px solid var(--color-text-muted);">
            <div class="sample-nav-inner" style="max-width: var(--layout-max-width); margin: 0 auto; padding: var(--layout-spacing); display: flex; align-items: center; justify-content: ${isCentered ? "center" : isFull ? "space-between" : "flex-start"}; gap: 1rem;">
              <span class="sample-nav-brand" style="font-family: var(--font-heading); font-weight: 600;">${escapeHtml(projectName)}</span>
              <nav style="display: flex; gap: 1.5rem;">
                <a href="#" style="color: var(--color-text);">Home</a>
                <a href="#" style="color: var(--color-text);">Features</a>
                <a href="#" style="color: var(--color-text);">Pricing</a>
                <a href="#" style="color: var(--color-text);">Contact</a>
              </nav>
            </div>
          </header>`;
      }

      if (kind === "hero") {
        return `
          <section class="sample-section sample-hero" style="background: var(--color-background); padding: calc(var(--layout-spacing) * 2); text-align: center;">
            <div class="sample-inner" style="max-width: var(--layout-max-width); margin: 0 auto;">
              <h1 style="font-family: var(--font-heading); font-size: 2.5rem; color: var(--color-primary); margin-bottom: 0.5rem;">${title}</h1>
              <p style="color: var(--color-text-muted); font-size: 1.25rem; margin-bottom: 1.5rem;">${copy}</p>
              <a href="#" class="sample-cta" style="display: inline-block; padding: 0.75rem 1.5rem; background: var(--color-accent); color: white; border-radius: var(--layout-radius); text-decoration: none;">Get started</a>
            </div>
          </section>`;
      }

      if (kind === "footer") {
        return `
          <footer class="sample-section sample-footer" style="background: var(--color-surface); padding: var(--layout-spacing); border-top: 1px solid var(--color-text-muted);">
            <div class="sample-inner" style="max-width: var(--layout-max-width); margin: 0 auto; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
              <span style="color: var(--color-text-muted);">© ${new Date().getFullYear()} ${escapeHtml(projectName)}</span>
              <nav style="display: flex; gap: 1rem;">
                <a href="#" style="color: var(--color-text-muted);">Privacy</a>
                <a href="#" style="color: var(--color-text-muted);">Terms</a>
              </nav>
            </div>
          </footer>`;
      }

      const bg = kind === "cta" ? "var(--color-primary)" : "var(--color-background)";
      const textColor = kind === "cta" ? "white" : "var(--color-text)";
      return `
        <section class="sample-section sample-${kind}" style="background: ${bg}; color: ${textColor}; padding: var(--layout-spacing);">
          <div class="sample-inner" style="max-width: var(--layout-max-width); margin: 0 auto;">
            <h2 style="font-family: var(--font-heading); font-size: 1.5rem; margin-bottom: 0.5rem;">${title}</h2>
            <p style="color: ${kind === "cta" ? "rgba(255,255,255,0.9)" : "var(--color-text-muted)"}; font-size: var(--size-base);">${copy}</p>
            ${kind === "cta" ? '<a href="#" style="display: inline-block; margin-top: 1rem; padding: 0.5rem 1rem; background: white; color: var(--color-primary); border-radius: var(--layout-radius); text-decoration: none;">Sign up</a>' : ""}
          </div>
        </section>`;
  };

  const navSection = sorted.find((s) => s.kind === "nav");
  const mainSections = sorted.filter((s) => s.kind !== "nav");
  let bodyContent: string;
  if (isSidebarLayout && navSection) {
    bodyContent = `
    ${renderSection(navSection)}
    <main class="sample-main" style="flex: 1; padding: var(--layout-spacing);">
      ${mainSections.map(renderSection).join("\n")}
    </main>`;
  } else {
    bodyContent = sorted.map(renderSection).join("\n");
  }
  const layoutClass = isSidebarLayout ? "sample-layout-sidebar" : "sample-layout-single";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(pageTitle)} — ${escapeHtml(projectName)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--font-body);
      font-size: var(--size-base);
      color: var(--color-text);
      background: var(--color-background);
    }
    .sample-layout-sidebar { display: flex; min-height: 100vh; }
    .sample-layout-sidebar .sample-nav-sidebar {
      width: 220px;
      flex-shrink: 0;
      padding: var(--layout-spacing);
      border-right: 1px solid var(--color-text-muted);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .sample-layout-sidebar .sample-nav-sidebar .sample-nav-brand {
      font-family: var(--font-heading);
      font-weight: 600;
      margin-bottom: 1rem;
    }
    .sample-layout-sidebar .sample-nav-sidebar .sample-nav-links { list-style: none; margin: 0; padding: 0; }
    .sample-layout-sidebar .sample-nav-sidebar .sample-nav-links a { color: var(--color-text); text-decoration: none; }
    .sample-layout-sidebar main { flex: 1; padding: var(--layout-spacing); }
    a { color: var(--color-accent); }
  </style>
</head>
<body style="${cssVars}">
  <div class="${layoutClass}">
    ${bodyContent}
  </div>
</body>
</html>`;
}
