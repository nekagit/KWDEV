/** Terminal Status Badge component. */
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Terminal } from "lucide-react";
import { type Run } from "@/types/run";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("Display/TerminalStatusBadge.tsx");

type TerminalStatusBadgeProps = {
  runningRuns: Run[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function TerminalStatusBadge({
  runningRuns,
  onOpenChange,
  open,
}: TerminalStatusBadgeProps) {
  const runningCount = runningRuns.filter((r) => r.status === "running").length;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={classes[0]}
        >
          <Terminal className={classes[1]} />
          <Badge variant="secondary" className={classes[2]}>
            {runningCount} running
          </Badge>
        </button>
      </PopoverTrigger>
    </Popover>
  );
}
