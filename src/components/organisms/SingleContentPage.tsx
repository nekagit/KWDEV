"use client";

/** Single Content Page component. */
import React from "react";
import { Card } from "@/components/molecules/CardsAndDisplay/Card";
import { ErrorDisplay } from "@/components/molecules/Display/ErrorDisplay";
import { AlertCircle } from "lucide-react";
import { PageWithHeader } from "@/components/molecules/LayoutAndNavigation/PageWithHeader";
import { getOrganismClasses } from "./organism-classes";

const c = getOrganismClasses("SingleContentPage.tsx");

export type SingleContentPageLayout = "simple" | "card";

interface SingleContentPageProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  backLink?: string;
  layout: SingleContentPageLayout;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}

export function SingleContentPage({
  title,
  description,
  icon,
  backLink,
  layout,
  error,
  children,
  className,
}: SingleContentPageProps) {
  if (layout === "simple") {
    return (
      <div className={className ?? c["1"]}>
        <PageWithHeader title={title} description={description} icon={icon} backLink={backLink}>
          {children}
        </PageWithHeader>
      </div>
    );
  }

  return (
    <div className={className ?? c["1"]}>
      {error && (
        <ErrorDisplay
          message={error}
          variant="destructive"
          icon={<AlertCircle className={c["0"]} />}
        />
      )}
      <Card
        tint={1}
        title={
          <>
            {icon}
            {title}
          </>
        }
        subtitle={description}
      >
        {children}
      </Card>
    </div>
  );
}
