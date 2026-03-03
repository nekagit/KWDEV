/** Flying Star Item component. */
import { scatter } from "@/lib/utils";

type FlyingStarItemProps = {
  index: number;
};

export function FlyingStarItem({ index }: FlyingStarItemProps) {
  const startX = scatter(index, 17, 100);
  const startY = scatter(index, 23, 100);
  const duration = 2.5 + scatter(index, 37, 31) * 2;
  const delay = scatter(index, 43, 17) * 8;
  const size = 2 + Math.floor(scatter(index, 7, 5)) * 2;
  const dx = (scatter(index, 53, 3) - 0.5) * 200;
  const dy = (scatter(index, 59, 3) - 0.8) * 120;
  const starDx = `${dx}vw`;
  const starDy = `${dy}vh`;

  return (
    <div
      key={index}
      className="kwcode-flying-star absolute rounded-full bg-white"
      style={{
        width: size,
        height: size,
        left: `${startX * 100}%`,
        top: `${startY * 100}%`,
        animation: `kwcode-star-fly ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        ["--star-dx" as string]: starDx,
        ["--star-dy" as string]: starDy,
        boxShadow: "0 0 6px 2px rgba(255,255,255,0.8)",
      }}
    />
  );
}
