/** Cursor Light Glow component. */
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("VisualEffects/CursorLightGlow.tsx");
type CursorLightGlowProps = {
  x: number;
  y: number;
};

export function CursorLightGlow({ x, y }: CursorLightGlowProps) {
  return (
    <div
      className={classes[0]}
      aria-hidden
      style={{
        background: `radial-gradient(
          circle 140px at ${x}px ${y}px,
          rgba(147, 197, 253, 0.35) 0%,
          rgba(59, 130, 246, 0.12) 35%,
          transparent 70%
        )`,
      }}
    />
  );
}
