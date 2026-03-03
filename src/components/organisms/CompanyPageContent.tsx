"use client";

/** Company page content — Karaweiss & KWCode. */
import React from "react";
import { Building2, ExternalLink, Code2, Globe } from "lucide-react";
import { Breadcrumb } from "@/components/molecules/Navigation/Breadcrumb";
import { SingleContentPage } from "@/components/organisms/SingleContentPage";

const SITE_URL = "https://karaweiss.org";
const APP_ID = "com.kwdev.app";

export function CompanyPageContent() {
  return (
    <div className="space-y-0">
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Company" },
        ]}
        className="mb-3"
      />
      <SingleContentPage
        title="Company"
        description="Karaweiss and KWCode product information."
        icon={<Building2 className="h-5 w-5 text-muted-foreground" aria-hidden />}
        layout="simple"
      >
        <div className="mt-4 space-y-6 text-muted-foreground">
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-base font-medium text-foreground">
              <Globe className="h-4 w-4" />
              Karaweiss
            </h2>
            <p className="text-sm">
              Karaweiss is the organization behind KWCode. For more information, visit the company site.
            </p>
            <a
              href={SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              karaweiss.org
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </section>

          <section>
            <h2 className="mb-2 flex items-center gap-2 text-base font-medium text-foreground">
              <Code2 className="h-4 w-4" />
              This product — KWCode
            </h2>
            <p className="text-sm">
              KWCode is a desktop and web app for managing projects, ideas, prompts, and execution. It connects to servers, AI bots, and GitHub.
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              <li><strong>App identifier:</strong> {APP_ID}</li>
              <li><strong>Features:</strong> Projects & ideas, prompts & agents, tickets & milestones, designs & architectures, AI bots (cron, skills, Telegram), server dashboard (SSH, terminals, cron, services), GitHub integration, configuration.</li>
              <li><strong>Stack:</strong> Next.js, Tauri (desktop), SQLite, Tailwind.</li>
            </ul>
          </section>
        </div>
      </SingleContentPage>
    </div>
  );
}
