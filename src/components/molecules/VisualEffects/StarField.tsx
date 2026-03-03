/** Star Field component. */
import { FlyingStarItem } from "@/components/molecules/VisualEffects/FlyingStarItem";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("VisualEffects/StarField.tsx");

const STAR_COUNT = 12;

export function StarField() {
  return (
    <div className={classes[0]} aria-hidden>
      {Array.from({ length: STAR_COUNT }, (_, i) => (
        <FlyingStarItem key={i} index={i} />
      ))}
    </div>
  );
}
