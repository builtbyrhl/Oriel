"use client";

import { useEffect, useMemo, useState } from "react";
import { getStream } from "@/lib/streaming/manager";
import type { MediaType } from "@/lib/streaming/types";
import VideoPlayer from "./VideoPlayer";

interface PlayerOverlayProps {
  tmdbId: number;
  type: MediaType;
  title?: string;
  season?: number;
  episode?: number;
  onClose: () => void;
}

export default function PlayerOverlay({
  tmdbId,
  type,
  title,
  season = 1,
  episode = 1,
  onClose,
}: PlayerOverlayProps) {
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const stream = useMemo(
    () => getStream({ tmdbId, type, season, episode }),
    [tmdbId, type, season, episode]
  );

  const active = stream.sources[activeSourceIndex];

  useEffect(() => {
    setLoaded(false);
    const t = setTimeout(() => setLoaded(true), 1800);
    return () => clearTimeout(t);
  }, [activeSourceIndex, tmdbId, type, season, episode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm">
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium text-white sm:text-base">
            {title ?? "Now Playing"}
          </h2>
          {type === "tv" && (
            <p className="text-xs text-white/50">
              S{String(season).padStart(2, "0")} · E{String(episode).padStart(2, "0")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeSourceIndex}
            onChange={(e) => setActiveSourceIndex(Number(e.target.value))}
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-white/40"
            aria-label="Switch source"
          >
            {stream.sources.map((s, i) => (
              <option key={s.provider} value={i} className="bg-zinc-900">
                {s.label}
              </option>
            ))}
          </select>

          <button
            onClick={onClose}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15"
          >
            Close
          </button>
        </div>
      </header>

      <div className="relative flex-1">
        {!loaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-3">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              <p className="text-xs text-white/60">Loading {active.label}…</p>
            </div>
          </div>
        )}
        <VideoPlayer key={active.url} src={active.url} title={title} />
      </div>
    </div>
  );
}
