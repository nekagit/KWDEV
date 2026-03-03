/** Folder Tree Item component. */
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("Navigation/FolderTreeItem.tsx");

type FolderTreeItemProps = {
  nodeName: string;
  nodePath: string;
  isExpanded: boolean;
  depth: number;
  onToggle: (path: string) => void;
};

export function FolderTreeItem({
  nodeName,
  nodePath,
  isExpanded,
  depth,
  onToggle,
}: FolderTreeItemProps) {
  const indent = depth * 16;

  return (
    <div className={classes[0]}>
      <button
        type="button"
        onClick={() => onToggle(nodePath)}
        className={classes[1]}
        style={{ paddingLeft: 8 + indent }}
      >
        <span className={classes[2]}>
          {isExpanded ? (
            <ChevronDown className={classes[3]} />
          ) : (
            <ChevronRight className={classes[3]} />
          )}
        </span>
        <span className={classes[2]}>
          {isExpanded ? (
            <FolderOpen className={classes[3]} />
          ) : (
            <Folder className={classes[3]} />
          )}
        </span>
        <span className={classes[8]} title={nodePath}>
          {nodeName}
        </span>
      </button>
    </div>
  );
}
