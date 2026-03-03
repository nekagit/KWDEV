"use client";

/** Project Design List Item component. */
import React from "react";
import { Card } from "@/components/molecules/CardsAndDisplay/Card";
import { Button } from "@/components/ui/button";
import { Download, Copy, Hash, FileJson } from "lucide-react";
import { DesignVisualization } from "@/components/organisms/DesignVisualization";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { downloadDesignRecord, copyDesignRecordToClipboard } from "@/lib/download-design-record";
import { downloadDesignRecordAsJson } from "@/lib/download-design-record-json";
import type { DesignRecord } from "@/types/design";

interface ProjectDesignListItemProps {
  design: DesignRecord;
  projectId: string;
}

export const ProjectDesignListItem: React.FC<ProjectDesignListItemProps> = ({
  design,
}) => {
  return (
    <li key={design.id}>
      <Card
        title={design.name}
        subtitle={design.description}
        className="flex flex-col bg-muted/30"
        footerButtons={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyTextToClipboard(design.id)}
              title="Copy ID"
            >
              <Hash className="size-4" />
              Copy ID
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyDesignRecordToClipboard(design)}
              title="Copy as Markdown"
            >
              <Copy className="size-4" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadDesignRecord(design)}
              title="Download as Markdown"
            >
              <Download className="size-4" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadDesignRecordAsJson(design)}
              title="Download as JSON"
            >
              <FileJson className="size-4" />
              Download as JSON
            </Button>
          </>
        }
      >
        <DesignVisualization
          config={design.config ?? null}
          designName={design.name}
          showSamplePreview={true}
          samplePreviewHeight={260}
        />
      </Card>
    </li>
  );
};
