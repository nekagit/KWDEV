/** Project Category Header component. */
import React from "react";
import sharedClasses from '../../shared/shared-classes';
import type { Project } from "@/types/project";
import { PageHeader } from "@/components/molecules/LayoutAndNavigation/PageHeader";

interface ProjectCategoryHeaderProps {
  title: string | React.ReactNode;
  icon: React.ReactNode;
  project: Project;
}

export function ProjectCategoryHeader({
  title,
  icon,
  project,
}: ProjectCategoryHeaderProps) {
  return (
    <div data-shared-ui className={sharedClasses.ProjectCategoryHeader.root}>
      <div className={sharedClasses.ProjectCategoryHeader.inner}>
        <PageHeader title={title} icon={icon} description={project.description} />
      </div>
    </div>
  );
}
