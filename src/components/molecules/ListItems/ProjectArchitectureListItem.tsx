"use client";

/** List item for a project architecture. */
import React from "react";
import { Card } from "@/components/molecules/CardsAndDisplay/Card";
import { Button } from "@/components/ui/button";
import { Hash } from "lucide-react";
import { toast } from "sonner";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";

interface ProjectArchitectureListItemProps {
  architecture: { id: string; name: string; description?: string };
  projectId: string;
}

export const ProjectArchitectureListItem: React.FC<ProjectArchitectureListItemProps> = ({
  architecture,
}) => {
  const name = architecture.name ?? architecture.id;

  const handleCopyId = async () => {
    if (architecture.id == null || architecture.id === "") {
      toast.error("No architecture ID to copy");
      return;
    }
    try {
      await copyTextToClipboard(architecture.id);
      toast.success("Architecture ID copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <li key={architecture.id}>
      <Card
        className="flex justify-between items-center bg-muted/30"
        title={name}
        subtitle={architecture.description ?? ""}
        footerButtons={
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyId}
            title="Copy ID"
            aria-label="Copy architecture ID"
          >
            <Hash className="size-4" />
            Copy ID
          </Button>
        }
      >
        <div />
      </Card>
    </li>
  );
};
