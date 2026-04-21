"use client";

/** Home Page Content — simple landing (no dashboard). */
import Link from "next/link";
import { getOrganismClasses } from "./organism-classes";

const c = getOrganismClasses("HomePageContent.tsx");

export function HomePageContent() {
  return (
    <div className={c["0"]} data-testid="home-page">
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-2xl font-semibold text-foreground mb-4">Welcome</h1>
        <p className="text-muted-foreground mb-6">
          Use the sidebar to open Projects and Configuration.
        </p>
        <nav className="flex flex-wrap gap-3">
          <Link href="/projects" className="text-primary hover:underline">
            Projects
          </Link>
          <Link href="/github" className="text-primary hover:underline">
            GitHub
          </Link>
          <Link href="/configuration" className="text-primary hover:underline">
            Configuration
          </Link>
        </nav>
      </div>
    </div>
  );
}
