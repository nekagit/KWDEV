/**
 * Unit tests for design-config-to-html: sample HTML preview from DesignConfig.
 */
import { describe, it, expect } from "vitest";
import { designConfigToSampleHtml } from "../design-config-to-html";
import type { DesignConfig, DesignSection } from "@/types/design";

function minimalConfig(overrides: Partial<DesignConfig> = {}): DesignConfig {
  return {
    projectName: "Test Project",
    templateId: "landing",
    pageTitle: "Home",
    colors: {
      primary: "#0f172a",
      secondary: "#64748b",
      accent: "#3b82f6",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#0f172a",
      textMuted: "#64748b",
    },
    typography: {
      headingFont: "Inter, system-ui, sans-serif",
      bodyFont: "Inter, system-ui, sans-serif",
      baseSize: "16px",
      scale: "1.25",
    },
    layout: {
      maxWidth: "1200px",
      spacing: "1.5rem",
      borderRadius: "0.5rem",
      navStyle: "minimal",
    },
    sections: [
      { id: "s1", kind: "hero", title: "Hero", order: 0, enabled: true },
      { id: "s2", kind: "footer", title: "Footer", order: 1, enabled: true },
    ],
    ...overrides,
  };
}

describe("designConfigToSampleHtml", () => {
  it("starts with DOCTYPE and html lang", () => {
    const html = designConfigToSampleHtml(minimalConfig());
    expect(html).toMatch(/^<!DOCTYPE html>\n/);
    expect(html).toContain("<html lang=\"en\">");
  });

  it("includes page title and project name in <title>", () => {
    const html = designConfigToSampleHtml(
      minimalConfig({ pageTitle: "Pricing", projectName: "Acme Inc" })
    );
    expect(html).toContain("<title>Pricing — Acme Inc</title>");
  });

  it("includes CSS variables for colors", () => {
    const config = minimalConfig({
      colors: {
        primary: "#111",
        secondary: "#222",
        accent: "#333",
        background: "#fff",
        surface: "#eee",
        text: "#000",
        textMuted: "#666",
      },
    });
    const html = designConfigToSampleHtml(config);
    expect(html).toContain("--color-primary: #111");
    expect(html).toContain("--color-secondary: #222");
    expect(html).toContain("--color-accent: #333");
    expect(html).toContain("--color-background: #fff");
    expect(html).toContain("--color-surface: #eee");
    expect(html).toContain("--color-text: #000");
    expect(html).toContain("--color-text-muted: #666");
  });

  it("includes CSS variables for typography", () => {
    const config = minimalConfig({
      typography: {
        headingFont: "Georgia, serif",
        bodyFont: "Arial, sans-serif",
        baseSize: "18px",
        scale: "1.5",
      },
    });
    const html = designConfigToSampleHtml(config);
    expect(html).toContain("--font-heading: Georgia, serif");
    expect(html).toContain("--font-body: Arial, sans-serif");
    expect(html).toContain("--size-base: 18px");
  });

  it("includes CSS variables for layout", () => {
    const config = minimalConfig({
      layout: {
        maxWidth: "900px",
        spacing: "2rem",
        borderRadius: "0.25rem",
        navStyle: "minimal",
      },
    });
    const html = designConfigToSampleHtml(config);
    expect(html).toContain("--layout-max-width: 900px");
    expect(html).toContain("--layout-spacing: 2rem");
    expect(html).toContain("--layout-radius: 0.25rem");
  });

  it("renders only enabled sections in order", () => {
    const config = minimalConfig({
      sections: [
        { id: "a", kind: "hero", title: "First", order: 2, enabled: true },
        { id: "b", kind: "footer", title: "Second", order: 0, enabled: false },
        { id: "c", kind: "cta", title: "Third", order: 1, enabled: true },
      ] as DesignSection[],
    });
    const html = designConfigToSampleHtml(config);
    const heroIdx = html.indexOf("First");
    const ctaIdx = html.indexOf("Third");
    const footerSecond = html.indexOf("Second");
    expect(heroIdx).toBeGreaterThan(-1);
    expect(ctaIdx).toBeGreaterThan(-1);
    expect(footerSecond).toBe(-1);
    expect(ctaIdx).toBeLessThan(heroIdx);
  });

  it("escapes HTML in project name", () => {
    const html = designConfigToSampleHtml(
      minimalConfig({ projectName: "Acme <script>alert(1)</script>" })
    );
    expect(html).toContain("Acme &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("escapes HTML in page title", () => {
    const html = designConfigToSampleHtml(
      minimalConfig({ pageTitle: "Say \"Hi\" & bye" })
    );
    expect(html).toContain("Say &quot;Hi&quot; &amp; bye");
  });

  it("escapes HTML in section titles", () => {
    const config = minimalConfig({
      sections: [
        { id: "x", kind: "hero", title: "Title <b>bold</b>", order: 0, enabled: true },
      ] as DesignSection[],
    });
    const html = designConfigToSampleHtml(config);
    expect(html).toContain("Title &lt;b&gt;bold&lt;/b&gt;");
    expect(html).not.toContain("<b>bold</b>");
  });

  it("uses minimal nav style by default", () => {
    const html = designConfigToSampleHtml(
      minimalConfig({
        layout: { ...minimalConfig().layout, navStyle: "minimal" },
        sections: [
          { id: "n", kind: "nav", title: "Nav", order: 0, enabled: true },
          { id: "h", kind: "hero", title: "Hero", order: 1, enabled: true },
        ],
      })
    );
    expect(html).toContain("sample-nav-minimal");
    expect(html).toContain("justify-content: flex-start");
  });

  it("uses centered nav style when set", () => {
    const html = designConfigToSampleHtml(
      minimalConfig({
        layout: { ...minimalConfig().layout, navStyle: "centered" },
        sections: [
          { id: "n", kind: "nav", title: "Nav", order: 0, enabled: true },
          { id: "h", kind: "hero", title: "Hero", order: 1, enabled: true },
        ],
      })
    );
    expect(html).toContain("sample-nav-centered");
    expect(html).toContain("justify-content: center");
  });

  it("uses full nav style when set", () => {
    const html = designConfigToSampleHtml(
      minimalConfig({
        layout: { ...minimalConfig().layout, navStyle: "full" },
        sections: [
          { id: "n", kind: "nav", title: "Nav", order: 0, enabled: true },
          { id: "h", kind: "hero", title: "Hero", order: 1, enabled: true },
        ],
      })
    );
    expect(html).toContain("sample-nav-full");
    expect(html).toContain("justify-content: space-between");
  });

  it("uses sidebar layout when navStyle is sidebar", () => {
    const config = minimalConfig({
      layout: { ...minimalConfig().layout, navStyle: "sidebar" },
      sections: [
        { id: "nav", kind: "nav", title: "Nav", order: 0, enabled: true },
        { id: "hero", kind: "hero", title: "Hero", order: 1, enabled: true },
      ] as DesignSection[],
    });
    const html = designConfigToSampleHtml(config);
    expect(html).toContain("sample-layout-sidebar");
    expect(html).toContain("sample-nav-sidebar");
    expect(html).toContain("<main class=\"sample-main\"");
  });

  it("renders hero section with expected structure", () => {
    const config = minimalConfig({
      sections: [
        { id: "h", kind: "hero", title: "Welcome", order: 0, enabled: true },
      ] as DesignSection[],
    });
    const html = designConfigToSampleHtml(config);
    expect(html).toContain("sample-section sample-hero");
    expect(html).toContain("Welcome");
    expect(html).toContain("Get started");
  });

  it("renders footer section with expected structure", () => {
    const config = minimalConfig({
      sections: [
        { id: "f", kind: "footer", title: "Footer", order: 0, enabled: true },
      ] as DesignSection[],
    });
    const html = designConfigToSampleHtml(config);
    expect(html).toContain("sample-section sample-footer");
    expect(html).toContain("Privacy");
    expect(html).toContain("Terms");
  });

  it("renders cta section with expected structure", () => {
    const config = minimalConfig({
      sections: [
        { id: "c", kind: "cta", title: "Sign up", order: 0, enabled: true },
      ] as DesignSection[],
    });
    const html = designConfigToSampleHtml(config);
    expect(html).toContain("sample-section sample-cta");
    expect(html).toContain("Sign up");
    expect(html).toContain("Sign up</a>");
  });

  it("renders generic section kind with title and copy", () => {
    const config = minimalConfig({
      sections: [
        { id: "g", kind: "content", title: "About Us", order: 0, enabled: true },
      ] as DesignSection[],
    });
    const html = designConfigToSampleHtml(config);
    expect(html).toContain("sample-section sample-content");
    expect(html).toContain("About Us");
  });

  it("produces deterministic output for same config", () => {
    const config = minimalConfig();
    const a = designConfigToSampleHtml(config);
    const b = designConfigToSampleHtml(config);
    expect(a).toBe(b);
  });
});
