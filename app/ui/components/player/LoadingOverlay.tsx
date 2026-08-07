"use client";

type Props = {
  provider?: string;
};

export default function LoadingOverlay({
  provider = "Premium Node",
}: Props) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-[#050814] via-[#04070f] to-black">
      <h1 className="text-3xl font-light tracking-[0.35em] text-[#d4af37]">
        ORIEL
      </h1>

      <p className="mt-4 text-sm tracking-[0.25em] text-white/60 uppercase">
        Connecting to {provider}
      </p>

      <div className="mt-8 h-[3px] w-64 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-[#d4af37]" />
      </div>

      <p className="mt-6 text-xs tracking-[0.3em] text-white/40 uppercase">
        Establishing Secure Stream...
      </p>
    </div>
  );
}
