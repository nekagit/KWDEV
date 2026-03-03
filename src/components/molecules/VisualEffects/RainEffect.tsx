/** Rain Effect component. */
import { RaindropCircle } from "@/components/molecules/VisualEffects/RaindropCircle";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("VisualEffects/RainEffect.tsx");

const RAIN_COUNT = 80;

export function RainEffect() {
  return (
    <div className={classes[0]} aria-hidden>
      {Array.from({ length: RAIN_COUNT }, (_, i) => (
        <RaindropCircle key={i} index={i} />
      ))}
    </div>
  );
}
