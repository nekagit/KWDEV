/**
 * Design types: page templates, sections, colors, typography, and layout config.
 */
/** Page type templates for web product design */
export type PageTemplateId =
  | "landing"
  | "contact"
  | "about"
  | "pricing"
  | "blog"
  | "dashboard"
  | "auth"
  | "docs"
  | "product"
  | "custom";

/** Section definition for outline/structure */
export type SectionKind =
  | "hero"
  | "features"
  | "testimonials"
  | "cta"
  | "pricing"
  | "faq"
  | "team"
  | "contact-form"
  | "footer"
  | "nav"
  | "content"
  | "sidebar"
  | "custom";

export interface DesignSection {
  id: string;
  kind: SectionKind;
  title: string;
  description?: string;
  order: number;
  enabled: boolean;
  /** Optional custom placeholder copy */
  copy?: string;
}

export interface DesignColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
}

export interface DesignTypography {
  headingFont: string;
  bodyFont: string;
  baseSize: string;
  scale: string;
}

export interface DesignLayout {
  maxWidth: string;
  spacing: string;
  borderRadius: string;
  navStyle: "minimal" | "centered" | "full" | "sidebar";
}

export interface DesignConfig {
  projectName: string;
  templateId: PageTemplateId;
  pageTitle: string;
  colors: DesignColors;
  typography: DesignTypography;
  layout: DesignLayout;
  sections: DesignSection[];
  /** Optional meta for AI-generated or custom notes */
  notes?: string;
}

export interface PageTemplate {
  id: PageTemplateId;
  name: string;
  description: string;
  defaultSections: { kind: SectionKind; title: string; order: number }[];
}

export interface DesignRecord {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  created_at?: string;
  updated_at?: string;
  /** Full design spec (colors, typography, layout, sections). Present when design was generated or created with config. */
  config?: DesignConfig;
}