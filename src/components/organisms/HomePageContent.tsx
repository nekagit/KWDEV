"use client";

/** Home Page Content component. Renders the general dashboard only (no tabs). */
import { useRunState } from "@/context/run-state";
import { DashboardTabContent } from "@/components/organisms/Tabs/DashboardTabContent";
import { getOrganismClasses } from "./organism-classes";

const c = getOrganismClasses("HomePageContent.tsx");

export function HomePageContent() {
  return (
    <div className={c["0"]} data-testid="home-page">
      <DashboardTabContent />
    </div>
  );
}
