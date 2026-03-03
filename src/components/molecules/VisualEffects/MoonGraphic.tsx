/** Moon Graphic component. */
import { getClasses } from "@/components/molecules/tailwind-molecules";
const classes = getClasses("VisualEffects/MoonGraphic.tsx");
export function MoonGraphic() {
  return (
    <div
      className={classes[0]}
      aria-hidden
    >
      <div
        className={classes[1]}
        style={{
          boxShadow: "0 0 40px 20px rgba(254,249,195,0.4), 0 0 80px 30px rgba(254,249,195,0.2)",
        }}
      />
      <div
        className={classes[2]}
        style={{
          width: "28%",
          height: "28%",
          top: "18%",
          left: "22%",
        }}
      />
    </div>
  );
}
