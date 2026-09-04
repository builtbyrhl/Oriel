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

function storageKey(
  tmdbId: number,
  type: MediaType,
  season?: number,
  episode?: number,
) {
  return `oriel:player:last:${type}:${tmdbId}:${season ?? 1}:${episode ?? 1}`;
}

export default function PlayerOverlay({
  tmdbId,
  type,
  title,
  season = 1,
  episode = 1,
  onClose,
}: PlayerOverlayProps) {
  const stream = useMemo(
    () => getStream({ tmdbId, type, season, episode }),
    [tmdbId, type, season, episode]
  );

  const [activeSourceIndex, setActiveSourceIndex] = useState(() => {
    if (stream.sources.length <= 1) return 0;
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(
            storageKey(tmdbId, type, season, episode),
          )
        : null;
    const parsed = saved ? Number(saved) : NaN;
    return Number.isFinite(parsed) && parsed >= 0 && parsed < stream.sources.length
      ? parsed
      : 0;
  });

  const active = stream.sources[activeSourceIndex];

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

  const onSelect = (index: number) => {
    setActiveSourceIndex(index);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        storageKey(tmdbId, type, season, episode),
        String(index),
      );
    }
  };

  const onNext = () => {
    if (stream.sources.length <= 1) return;
    onSelect((activeSourceIndex + 1) % stream.sources.length);
  };

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
          {stream.sources.length > 1 && active?.url ? (
            <button
              onClick={onNext}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/75 opacity-75 transition hover:opacity-100 hover:bg-white/15"
              title="Source not working? Try the next one"
            >
              ↻ Next source
            </button>
          ) : null}
          <select
            value={activeSourceIndex}
            onChange={(e) => onSelect(Number(e.target.value))}
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-white/40"
            aria-label="Switch source"
            disabled={stream.sources.length === 0}
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
        {active?.url ? (
          <VideoPlayer key={active.url} src={active.url} title={title} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-white/40">
            No playable sources for this title.
          </div>
        )}
      </div>
    </div>
  );
}
