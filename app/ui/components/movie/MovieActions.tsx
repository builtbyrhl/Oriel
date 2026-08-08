"use client";

import { useState } from "react";
import type { MediaType } from "@/lib/streaming/types";
import PlayerOverlay from "@/components/player/PlayerOverlay";

interface MovieActionsProps {
  tmdbId: number;
  type?: MediaType;
  title?: string;
  season?: number;
  episode?: number;
}

export default function MovieActions({
  tmdbId,
  type = "movie",
  title,
  season = 1,
  episode = 1,
}: MovieActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.98]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        Watch
      </button>

      {open && (
        <PlayerOverlay
          tmdbId={tmdbId}
          type={type}
          title={title}
          season={season}
          episode={episode}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
