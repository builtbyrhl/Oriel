"use client";

import BrandedIframe from "./BrandedIframe";

interface VideoPlayerProps {
  src: string;
  title?: string;
}

/**
 * Borderless iframe player for the fullscreen overlay. The branded veil and
 * its "stalled source" semantics live in BrandedIframe — the parent keys this
 * by URL, which resets the veil on every source change.
 */
export default function VideoPlayer({ src, title }: VideoPlayerProps) {
  if (!src) return null;

  return (
    <div className="h-full w-full">
      <BrandedIframe src={src} title={title ?? "Player"} />
    </div>
  );
}
