/** Raindrop Circle component. */
import { scatter } from "@/lib/utils";

type RaindropCircleProps = {
  index: number;
};

export function RaindropCircle({ index }: RaindropCircleProps) {
  const size = 2 + scatter(index, 11, 97) * 6;
  const left = scatter(index, 31, 101) * 100;
  const topStart = -15 - scatter(index, 7, 53) * 25;
  const duration = 1.4 + scatter(index, 13, 89) * 2;
  const delay = scatter(index, 19, 71) * 5;
  const driftPx = -18 + scatter(index, 41, 73) * 36;

  return (
    <div
      key={index}
      className="kwcode-load-drop absolute rounded-full bg-[rgba(59,130,246,0.4)]"
      style={{
        width: size,
        height: size,
        left: `${left}%`,
        top: `${topStart}%`,
        animation: `kwcode-rain-fall ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        ["--drift-x" as string]: `${driftPx}px`,
      }}
    />
  );
}
