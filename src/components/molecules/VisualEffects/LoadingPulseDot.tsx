/** Loading Pulse Dot component. */
type LoadingPulseDotProps = {
  index: number;
};

export function LoadingPulseDot({ index }: LoadingPulseDotProps) {
  return (
    <div
      key={index}
      className="h-1.5 w-1.5 rounded-full bg-white/70"
      style={{
        animation: "kwcode-loading-pulse 1s ease-in-out infinite",
        animationDelay: `${index * 0.2}s`,
      }}
    />
  );
}
