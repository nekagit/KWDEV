/** Project Loading State component. */
import { Loader2 } from "lucide-react";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("UtilitiesAndHelpers/ProjectLoadingState.tsx");

export function ProjectLoadingState() {
  return (
    <div className={classes[0]}>
      <Loader2 className={classes[1]} />
    </div>
  );
}
