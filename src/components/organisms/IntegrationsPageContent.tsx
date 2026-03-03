"use client";

/** Integrations page: define one .env with variables for Stripe, Google, Slack, DBs, etc., and download it. */
import { useCallback, useEffect, useState } from "react";
import {
  Plug2,
  Download,
  Plus,
  Trash2,
  CreditCard,
  Mail,
  Share2,
  MessageSquare,
  Bot,
  Send,
  Phone,
  MessageCircle,
  FileText,
  Table,
  Building2,
  Cloud,
  Database,
  Box,
  ListTodo,
  LayoutList,
  Calendar,
  ShoppingCart,
  FolderOpen,
  Video,
  Palette,
  Linkedin,
  Twitter,
  Shield,
  Activity,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { Breadcrumb } from "@/components/molecules/Navigation/Breadcrumb";
import { SingleContentPage } from "@/components/organisms/SingleContentPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getDefaultIntegrationsEnvEntries,
  INTEGRATION_GROUP_LABELS,
  INTEGRATION_ORDERED_GROUPS,
  type EnvEntry,
  type IntegrationGroup,
} from "@/data/integrations-env-presets";
import { downloadIntegrationsEnv } from "@/lib/download-integrations-env";
import { getOrganismClasses } from "./organism-classes";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const c = getOrganismClasses("IntegrationsPageContent.tsx");

const STORAGE_KEY = "integrations-env-entries";

function loadStored(): EnvEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (e): e is EnvEntry =>
        e != null &&
        typeof e === "object" &&
        typeof (e as EnvEntry).key === "string" &&
        typeof (e as EnvEntry).value === "string" &&
        typeof (e as EnvEntry).group === "string"
    );
  } catch {
    return null;
  }
}

function saveStored(entries: EnvEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

const INTEGRATION_ICONS: Record<IntegrationGroup, LucideIcon> = {
  stripe: CreditCard,
  google: Mail,
  meta: Share2,
  github: MessageSquare,
  openai: Bot,
  anthropic: Bot,
  sendgrid: Send,
  resend: Send,
  twilio: Phone,
  slack: MessageSquare,
  telegram: MessageCircle,
  discord: MessageCircle,
  notion: FileText,
  airtable: Table,
  hubspot: Building2,
  salesforce: Cloud,
  pipedrive: Building2,
  mailchimp: Mail,
  postgres: Database,
  mysql: Database,
  redis: Database,
  supabase: Database,
  vercel: Box,
  aws: Cloud,
  linear: ListTodo,
  trello: LayoutList,
  asana: Calendar,
  shopify: ShoppingCart,
  dropbox: FolderOpen,
  zoom: Video,
  figma: Palette,
  linkedin: Linkedin,
  x_twitter: Twitter,
  cloudflare: Shield,
  datadog: Activity,
  sentry: AlertTriangle,
  custom: Plug2,
};

export function IntegrationsPageContent() {
  const [entries, setEntries] = useState<EnvEntry[]>(() => {
    const stored = loadStored();
    return stored ?? getDefaultIntegrationsEnvEntries();
  });

  useEffect(() => {
    saveStored(entries);
  }, [entries]);

  const updateEntry = useCallback((index: number, patch: Partial<EnvEntry>) => {
    setEntries((prev) => {
      const next = [...prev];
      if (index < 0 || index >= next.length) return prev;
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const removeEntry = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addCustom = useCallback(() => {
    setEntries((prev) => [...prev, { key: "", value: "", group: "custom" }]);
  }, []);

  const handleDownload = useCallback(() => {
    downloadIntegrationsEnv(entries);
    toast.success("Downloaded .env");
  }, [entries]);

  const byGroup = INTEGRATION_ORDERED_GROUPS.map((group) => ({
    group,
    label: INTEGRATION_GROUP_LABELS[group],
    icon: INTEGRATION_ICONS[group],
    items: entries
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6 pb-12">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Integrations" },
        ]}
      />
      <SingleContentPage
        title="Integrations"
        description="Define environment variables for Stripe, Google, Slack, databases, and more. Download a single .env file. Data is stored locally in this app only."
        icon={<Plug2 className={c["0"]} />}
        layout="card"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              onClick={handleDownload}
              className="gap-2"
              aria-label="Download .env file"
            >
              <Download className="size-4 shrink-0" aria-hidden />
              Download .env
            </Button>
          </div>

          <Accordion type="multiple" className="w-full space-y-2" defaultValue={byGroup.slice(0, 5).map((g) => g.group)}>
            {byGroup.map(({ group, label, icon: Icon, items }) => (
              <AccordionItem
                key={group}
                value={group}
                className="rounded-xl border border-border/60 bg-muted/10 overflow-hidden data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20 [&[data-state=open]]:border-b [&[data-state=open]]:border-border/40">
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-background border border-border/60 text-muted-foreground">
                      <Icon className="size-4 shrink-0" aria-hidden />
                    </span>
                    <span className="font-semibold text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      ({items.length} {items.length === 1 ? "variable" : "variables"})
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-2">
                    {items.map(({ e, i }) => (
                      <div
                        key={`${i}-${e.key}`}
                        className="flex flex-wrap items-center gap-2 sm:gap-3"
                      >
                        <div className="flex-1 min-w-[140px] space-y-1">
                          <Label htmlFor={`key-${i}`} className="text-xs">
                            Key
                          </Label>
                          <Input
                            id={`key-${i}`}
                            value={e.key}
                            onChange={(ev) => updateEntry(i, { key: ev.target.value })}
                            placeholder="e.g. STRIPE_SECRET_KEY"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="flex-[2] min-w-[180px] space-y-1">
                          <Label htmlFor={`value-${i}`} className="text-xs">
                            Value
                          </Label>
                          <Input
                            id={`value-${i}`}
                            type="password"
                            autoComplete="off"
                            value={e.value}
                            onChange={(ev) => updateEntry(i, { value: ev.target.value })}
                            placeholder="(optional)"
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="flex items-end pb-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                            onClick={() => removeEntry(i)}
                            aria-label="Remove this variable"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustom}
              className="gap-2"
              aria-label="Add custom variable"
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              Add custom variable
            </Button>
          </div>
        </div>
      </SingleContentPage>
    </div>
  );
}
