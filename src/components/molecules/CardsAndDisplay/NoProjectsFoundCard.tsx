"use client";

/** No Projects Found Card component. */
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Folders, Plus } from "lucide-react";
import { Card } from "@/components/molecules/CardsAndDisplay/Card";
import { EmptyState } from "@/components/molecules/Display/EmptyState";
import { ButtonGroup } from "@/components/molecules/ControlsAndButtons/ButtonGroup";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("CardsAndDisplay/NoProjectsFoundCard.tsx");

export function NoProjectsFoundCard() {
  return (
    <Card
      footerButtons={
        <ButtonGroup alignment="right">
          <Button asChild>
            <Link href="/projects/new">
              <Plus className={classes[1]} />
              New project
            </Link>
          </Button>
        </ButtonGroup>
      }
    >
      <EmptyState
        icon={Folders}
        message="No projects yet"
        action="Create a project to group design, ideas, tickets, and prompts in one place."
      />
    </Card>
  );
}
