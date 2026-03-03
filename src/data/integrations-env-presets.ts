/**
 * Preset environment variable keys for common integrations.
 * Used on the Integrations page to prefill a single .env template.
 * Covers many n8n-style services: payments, auth, email, messaging, DBs, CRM, productivity, AI, dev tools.
 */

export type IntegrationGroup =
  | "stripe"
  | "google"
  | "meta"
  | "github"
  | "openai"
  | "anthropic"
  | "sendgrid"
  | "resend"
  | "twilio"
  | "slack"
  | "telegram"
  | "discord"
  | "notion"
  | "airtable"
  | "hubspot"
  | "salesforce"
  | "pipedrive"
  | "mailchimp"
  | "postgres"
  | "mysql"
  | "redis"
  | "supabase"
  | "vercel"
  | "aws"
  | "linear"
  | "trello"
  | "asana"
  | "shopify"
  | "dropbox"
  | "zoom"
  | "figma"
  | "linkedin"
  | "x_twitter"
  | "cloudflare"
  | "datadog"
  | "sentry"
  | "custom";

export const INTEGRATION_GROUP_LABELS: Record<IntegrationGroup, string> = {
  stripe: "Stripe",
  google: "Google",
  meta: "Meta (Facebook / Instagram)",
  github: "GitHub",
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  sendgrid: "SendGrid",
  resend: "Resend",
  twilio: "Twilio",
  slack: "Slack",
  telegram: "Telegram",
  discord: "Discord",
  notion: "Notion",
  airtable: "Airtable",
  hubspot: "HubSpot",
  salesforce: "Salesforce",
  pipedrive: "Pipedrive",
  mailchimp: "Mailchimp",
  postgres: "PostgreSQL",
  mysql: "MySQL",
  redis: "Redis",
  supabase: "Supabase",
  vercel: "Vercel",
  aws: "AWS",
  linear: "Linear",
  trello: "Trello",
  asana: "Asana",
  shopify: "Shopify",
  dropbox: "Dropbox",
  zoom: "Zoom",
  figma: "Figma",
  linkedin: "LinkedIn",
  x_twitter: "X (Twitter)",
  cloudflare: "Cloudflare",
  datadog: "Datadog",
  sentry: "Sentry",
  custom: "Custom",
};

export interface EnvEntry {
  key: string;
  value: string;
  group: IntegrationGroup;
}

const presetEntries: EnvEntry[] = [
  { key: "STRIPE_SECRET_KEY", value: "", group: "stripe" },
  { key: "STRIPE_PUBLISHABLE_KEY", value: "", group: "stripe" },
  { key: "STRIPE_WEBHOOK_SECRET", value: "", group: "stripe" },
  { key: "GOOGLE_CLIENT_ID", value: "", group: "google" },
  { key: "GOOGLE_CLIENT_SECRET", value: "", group: "google" },
  { key: "META_APP_ID", value: "", group: "meta" },
  { key: "META_APP_SECRET", value: "", group: "meta" },
  { key: "GITHUB_CLIENT_ID", value: "", group: "github" },
  { key: "GITHUB_CLIENT_SECRET", value: "", group: "github" },
  { key: "GITHUB_TOKEN", value: "", group: "github" },
  { key: "OPENAI_API_KEY", value: "", group: "openai" },
  { key: "ANTHROPIC_API_KEY", value: "", group: "anthropic" },
  { key: "SENDGRID_API_KEY", value: "", group: "sendgrid" },
  { key: "RESEND_API_KEY", value: "", group: "resend" },
  { key: "TWILIO_ACCOUNT_SID", value: "", group: "twilio" },
  { key: "TWILIO_AUTH_TOKEN", value: "", group: "twilio" },
  { key: "SLACK_BOT_TOKEN", value: "", group: "slack" },
  { key: "SLACK_SIGNING_SECRET", value: "", group: "slack" },
  { key: "TELEGRAM_BOT_TOKEN", value: "", group: "telegram" },
  { key: "TELEGRAM_CHAT_ID", value: "", group: "telegram" },
  { key: "DISCORD_BOT_TOKEN", value: "", group: "discord" },
  { key: "DISCORD_CLIENT_ID", value: "", group: "discord" },
  { key: "NOTION_API_KEY", value: "", group: "notion" },
  { key: "NOTION_INTERNAL_INTEGRATION_SECRET", value: "", group: "notion" },
  { key: "AIRTABLE_API_KEY", value: "", group: "airtable" },
  { key: "AIRTABLE_BASE_ID", value: "", group: "airtable" },
  { key: "HUBSPOT_ACCESS_TOKEN", value: "", group: "hubspot" },
  { key: "HUBSPOT_CLIENT_ID", value: "", group: "hubspot" },
  { key: "HUBSPOT_CLIENT_SECRET", value: "", group: "hubspot" },
  { key: "SALESFORCE_CLIENT_ID", value: "", group: "salesforce" },
  { key: "SALESFORCE_CLIENT_SECRET", value: "", group: "salesforce" },
  { key: "PIPEDRIVE_API_TOKEN", value: "", group: "pipedrive" },
  { key: "MAILCHIMP_API_KEY", value: "", group: "mailchimp" },
  { key: "DATABASE_URL", value: "", group: "postgres" },
  { key: "POSTGRES_URL", value: "", group: "postgres" },
  { key: "MYSQL_HOST", value: "", group: "mysql" },
  { key: "MYSQL_USER", value: "", group: "mysql" },
  { key: "MYSQL_PASSWORD", value: "", group: "mysql" },
  { key: "REDIS_URL", value: "", group: "redis" },
  { key: "SUPABASE_URL", value: "", group: "supabase" },
  { key: "SUPABASE_ANON_KEY", value: "", group: "supabase" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", value: "", group: "supabase" },
  { key: "VERCEL_TOKEN", value: "", group: "vercel" },
  { key: "AWS_ACCESS_KEY_ID", value: "", group: "aws" },
  { key: "AWS_SECRET_ACCESS_KEY", value: "", group: "aws" },
  { key: "AWS_REGION", value: "", group: "aws" },
  { key: "LINEAR_API_KEY", value: "", group: "linear" },
  { key: "TRELLO_API_KEY", value: "", group: "trello" },
  { key: "TRELLO_TOKEN", value: "", group: "trello" },
  { key: "ASANA_ACCESS_TOKEN", value: "", group: "asana" },
  { key: "SHOPIFY_STORE_URL", value: "", group: "shopify" },
  { key: "SHOPIFY_ACCESS_TOKEN", value: "", group: "shopify" },
  { key: "DROPBOX_ACCESS_TOKEN", value: "", group: "dropbox" },
  { key: "ZOOM_CLIENT_ID", value: "", group: "zoom" },
  { key: "ZOOM_CLIENT_SECRET", value: "", group: "zoom" },
  { key: "FIGMA_ACCESS_TOKEN", value: "", group: "figma" },
  { key: "LINKEDIN_CLIENT_ID", value: "", group: "linkedin" },
  { key: "LINKEDIN_CLIENT_SECRET", value: "", group: "linkedin" },
  { key: "TWITTER_BEARER_TOKEN", value: "", group: "x_twitter" },
  { key: "X_API_KEY", value: "", group: "x_twitter" },
  { key: "CLOUDFLARE_API_TOKEN", value: "", group: "cloudflare" },
  { key: "DATADOG_API_KEY", value: "", group: "datadog" },
  { key: "DATADOG_APP_KEY", value: "", group: "datadog" },
  { key: "SENTRY_DSN", value: "", group: "sentry" },
  { key: "SENTRY_AUTH_TOKEN", value: "", group: "sentry" },
];

export function getDefaultIntegrationsEnvEntries(): EnvEntry[] {
  return presetEntries.map((e) => ({ ...e, value: "" }));
}

/** Order of groups in the UI (accordions). */
export const INTEGRATION_ORDERED_GROUPS: IntegrationGroup[] = [
  "stripe",
  "google",
  "meta",
  "github",
  "openai",
  "anthropic",
  "sendgrid",
  "resend",
  "twilio",
  "slack",
  "telegram",
  "discord",
  "notion",
  "airtable",
  "hubspot",
  "salesforce",
  "pipedrive",
  "mailchimp",
  "postgres",
  "mysql",
  "redis",
  "supabase",
  "vercel",
  "aws",
  "linear",
  "trello",
  "asana",
  "shopify",
  "dropbox",
  "zoom",
  "figma",
  "linkedin",
  "x_twitter",
  "cloudflare",
  "datadog",
  "sentry",
  "custom",
];
