"use client";

import { useEffect, useMemo, useState } from "react";
import { getStream } from "@/lib/streaming/manager";
import type { MediaType } from "@/lib/streaming/types";
import SourcePicker from "./SourcePicker";
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

  const sources = stream.sources;

  const [activeProvider, setActiveProvider] = useState<string>(() => {
    if (stream.sources.length === 0) return "";
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(storageKey(tmdbId, type, season, episode))
        : null;
    const parsed = saved ? Number(saved) : NaN;
    const idx =
      Number.isFinite(parsed) && parsed >= 0 && parsed < stream.sources.length
        ? parsed
        : 0;
    return stream.sources[idx]?.provider ?? "";
  });

  // Content identity changed (title/episode) — snap back to the default
  // source. Render-phase state adjustment: React re-renders immediately,
  // so no effect (and no cascading setState) is involved.
  const contentKey = storageKey(tmdbId, type, season, episode);
  const [trackedKey, setTrackedKey] = useState(contentKey);
  if (trackedKey !== contentKey) {
    setTrackedKey(contentKey);
    setActiveProvider(sources[0]?.provider ?? "");
  }

  const active =
    sources.find((s) => s.provider === activeProvider) ?? sources[0];

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

  const onSelect = (name: string) => {
    setActiveProvider(name);
    const full = stream.sources.findIndex((s) => s.provider === name);
    if (typeof window !== "undefined" && full >= 0) {
      window.localStorage.setItem(storageKey(tmdbId, type, season, episode), String(full));
    }
  };

  const onNext = () => {
    if (sources.length <= 1) return;
    const cur = sources.findIndex((s) => s.provider === active?.provider);
    onSelect(sources[(cur + 1) % sources.length]!.provider);
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
          {sources.length > 1 && active?.url ? (
            <button
              onClick={onNext}
              className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/75 opacity-75 transition hover:opacity-100 hover:bg-white/15"
              title="Source not working? Try the next one"
            >
              ↻ Next source
            </button>
          ) : null}

          <button
            onClick={onClose}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15"
          >
            Close
          </button>
        </div>
      </header>

      {sources.length > 1 ? (
        <div className="border-b border-white/10 bg-black/40 py-2">
          <SourcePicker
            variant="overlay"
            items={sources.map((s) => ({ id: s.provider, label: s.label }))}
            activeId={active?.provider ?? ""}
            onSelect={onSelect}
          />
        </div>
      ) : null}

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
