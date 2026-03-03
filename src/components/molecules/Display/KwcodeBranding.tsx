/** Kwcode Branding component. */
import { LoadingPulseDot } from "@/components/molecules/VisualEffects/LoadingPulseDot";
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("Display/KwcodeBranding.tsx");

export function KwcodeBranding() {
  return (
    <div className={classes[0]} aria-label="Loading">
      <span
        className={classes[1]}
        style={{ fontFamily: "system-ui, -apple-system, sans-serif", letterSpacing: "-0.02em" }}
      >
        kwcode
      </span>
      <div className={classes[2]}>
        {[0, 1, 2].map((i) => (
          <LoadingPulseDot key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
