"use client";

type Props = {
  progress: number;
  collapsed?: boolean;
};

export default function Timeline({
  progress,
  collapsed = false,
}: Props) {
  if (collapsed) {
    const total = 56;
    const dashOffset = total * (1 - progress);

    return (
      <div className="flex w-full justify-center">
        <svg
          width="48"
          height="28"
          viewBox="0 0 48 28"
          fill="none"
          className="transition-all duration-200 ease-out"
        >
          <path
            d="M8 22 L24 8 L40 22"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M8 22 L24 8 L40 22"
            pathLength="56"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="56"
            strokeDashoffset={dashOffset}
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="relative h-[3px] overflow-hidden rounded-full bg-white/15">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-white transition-all duration-200 ease-out"
          style={{
            width: `${progress * 100}%`,
          }}
        />

        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.6)] transition-all duration-200 ease-out"
          style={{
            left: `${progress * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
