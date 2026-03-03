/** File Tree Item component. */
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import { type CursorFileEntry } from "@/types/file-tree";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("Navigation/FileTreeItem.tsx");

type FileTreeItemProps = {
  nodeName: string;
  nodePath: string;
  depth: number;
  /** When false, file row is read-only (no Add to spec button). Used e.g. in Versioning tab. */
  showAddToSpec?: boolean;
  inSpec?: boolean;
  specFilesSaving?: boolean;
  onAddToSpec?: (file: CursorFileEntry) => void;
};

export function FileTreeItem({
  nodeName,
  nodePath,
  depth,
  showAddToSpec = true,
  inSpec = false,
  specFilesSaving = false,
  onAddToSpec,
}: FileTreeItemProps) {
  const indent = depth * 16;

  return (
    <div
      className={classes[0]}
      style={{ paddingLeft: 8 + indent + 24 }}
    >
      <FileText className={classes[1]} />
      <span className={classes[2]} title={nodePath}>
        {nodeName}
      </span>
      {showAddToSpec && onAddToSpec && (
        <Button
          variant="outline"
          size="sm"
          className={classes[3]}
          onClick={() => onAddToSpec({ name: nodeName, path: nodePath })}
          disabled={inSpec || specFilesSaving}
          title={inSpec ? "Already in project spec" : "Add to project spec"}
        >
          {inSpec ? (
            "Added"
          ) : (
            <>
              <Plus className={classes[4]} />
              Add
            </>
          )}
        </Button>
      )}
    </div>
  );
}
