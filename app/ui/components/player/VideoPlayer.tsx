"use client";

import { useState } from "react";

interface VideoPlayerProps {
  src: string;
  title?: string;
}

/**
 * Borderless iframe player. Shows a short spinner until the embedded player
 * fires `onLoad`, then reveals the iframe. Because a broken/unreachable embed
 * won't fire `load`, a stall here means the source is down — the parent's
 * "Try next source" control should advance to the next ranked provider.
 */
export default function VideoPlayer({ src, title }: VideoPlayerProps) {
  const [ready, setReady] = useState(false);

  if (!src) return null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {!ready && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-xs text-white/60">
              Loading {title ? title : "source"}…
            </p>
          </div>
        </div>
      )}
      <iframe
        key={src}
        src={src}
        title={title ?? "Player"}
        className="h-full w-full border-0"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="origin"
        onLoad={() => setReady(true)}
      />
    </div>
  );
}
