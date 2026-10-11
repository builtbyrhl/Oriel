"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Clock3, ExternalLink, Play } from "lucide-react";
import type { MediaType } from "@/lib/streaming/types";
import {
  getLastWatchedPosition,
  type LastWatchedPosition,
} from "@/lib/continueWatching";
import PlayerOverlay from "@/components/player/PlayerOverlay";

interface MovieActionsProps {
  tmdbId: number;
  type?: MediaType;
  title?: string;
  season?: number;
  episode?: number;
  /** YouTube trailer — opens in a new tab (in-site embeds are not possible). */
  trailerUrl?: string;
}

export default function MovieActions({
  tmdbId,
  type = "movie",
  title,
  season = 1,
  episode = 1,
  trailerUrl,
}: MovieActionsProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [openPos, setOpenPos] = useState({ season, episode });
  const [lastPos, setLastPos] = useState<LastWatchedPosition | null>(null);

  // Read the position on a frame boundary: no hydration mismatch, and the
  // callback (not the effect body) performs the setState.
  useEffect(() => {
    if (type !== "tv") return;
    const raf = requestAnimationFrame(() =>
      setLastPos(getLastWatchedPosition("tv", tmdbId)),
    );
    return () => cancelAnimationFrame(raf);
  }, [tmdbId, type]);

  // Adopt whatever the address bar says right now (a fresh link, or the
  // URL updated by the resume badge) so the overlay opens in the right spot.
  const openWatch = () => {
    const params = new URLSearchParams(window.location.search);
    const s = Number(params.get("s"));
    const e = Number(params.get("e"));
    setOpenPos({
      season: Number.isInteger(s) && s >= 1 ? s : season,
      episode: Number.isInteger(e) && e >= 1 ? e : episode,
    });
    setOpen(true);
  };

  const resume = () => {
    if (!lastPos) return;
    const params = new URLSearchParams(window.location.search);
    params.set("s", String(lastPos.season));
    params.set("e", String(lastPos.episode));
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <>
      <div className="flex flex-col items-start gap-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={openWatch}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.98]"
          >
            <Play size={16} fill="currentColor" />
            Watch
          </button>

          {trailerUrl && (
            <a
              href={trailerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/85 transition hover:border-white/30 hover:bg-white/10"
            >
              Trailer
              <ExternalLink size={14} className="text-white/50" />
            </a>
          )}
        </div>

        {type === "tv" && lastPos && (
          <button
            onClick={resume}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-white/55 transition hover:border-white/25 hover:text-white/85"
          >
            <Clock3 size={12} />
            Left at S{lastPos.season}E{lastPos.episode} — resume
          </button>
        )}
      </div>

      {open && (
        <PlayerOverlay
          tmdbId={tmdbId}
          type={type}
          title={title}
          season={openPos.season}
          episode={openPos.episode}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
