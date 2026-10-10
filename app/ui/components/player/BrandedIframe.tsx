"use client";

import { useState } from "react";

interface BrandedIframeProps {
  src: string;
  title: string;
  className?: string;
}

/**
 * Iframe wrapped in a branded loading veil. A third-party embed goes from
 * "nothing" to "someone else's player" — the veil closes that gap with a
 * moment of Oriel: deep cinematic gradient, wordmark, spinner. It fades out
 * the instant the embed fires `load`; if the source is down it simply stays,
 * which doubles as a live "source is stalled" signal for the parent's
 * next-source control.
 *
 * Parents must key this by `src` so the veil resets on every source change.
 */
export default function BrandedIframe({
  src,
  title,
  className = "h-full w-full",
}: BrandedIframeProps) {
  const [loaded, setLoaded] = useState(false);

  if (!src) return null;

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-[#050814] via-[#04070f] to-black transition-opacity duration-700 ${
          loaded ? "opacity-0" : "opacity-100"
        }`}
      >
        <span className="text-[11px] font-extralight uppercase tracking-[0.45em] text-white/50">
          Oriel
        </span>
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <p className="text-xs tracking-wide text-white/45">
          Connecting to source…
        </p>
      </div>

      <iframe
        src={src}
        title={title}
        className="h-full w-full border-0"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-read; clipboard-write"
        allowFullScreen
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
