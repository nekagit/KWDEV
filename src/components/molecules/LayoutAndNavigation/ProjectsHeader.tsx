"use client";

/** Projects Header component. */
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/molecules/LayoutAndNavigation/PageHeader";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("LayoutAndNavigation/ProjectsHeader.tsx");

export function ProjectsHeader() {
  return (
    <div className={classes[0]}>
      <PageHeader
        title="Projects"
        description={
          "Each project is a page that aggregates design, ideas, tickets, and prompts. Open a project to see all its data."
        }
      />
      <ButtonGroup alignment="right">
        <Button asChild>
          <Link href="/projects/new">
            <Plus className={classes[2]} />
            New project
          </Link>
        </Button>
      </ButtonGroup>
    </div>
  );
}
