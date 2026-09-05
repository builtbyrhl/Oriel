"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  Play,
  ShieldCheck,
} from "lucide-react";

import { getPlaybackProviders } from "@/lib/playback/providers";
import { buildPlaybackUrl } from "@/lib/playback/url";
import type { PlaybackContentType } from "@/lib/playback/types";
import type { SeasonDef } from "@/components/movie/SeasonEpisodePicker";
import SeasonEpisodePicker from "@/components/movie/SeasonEpisodePicker";

type Props = {
  tmdbId: number;
  title: string;
  contentType: PlaybackContentType;
  /** Per-season episode counts (series only). */
  seasons?: SeasonDef[];
};

const STORAGE_KEY = (tmdbId: number, contentType: PlaybackContentType) =>
  `oriel:playback:last:${contentType}:${tmdbId}`;

export default function PlaybackPlayer({
  tmdbId,
  title,
  contentType,
  seasons,
}: Props) {
  const providers = useMemo(
    () => getPlaybackProviders(contentType),
    [contentType],
  );

  const [selectedProviderId, setSelectedProviderId] = useState(() => {
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY(tmdbId, contentType))
        : null;
    if (stored && providers.some((p) => p.id === stored)) {
      return stored;
    }
    return providers[0]?.id ?? "";
  });

  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);

  const selectedProvider =
    providers.find((provider) => provider.id === selectedProviderId) ??
    providers[0];

  const sourceUrl = selectedProvider
    ? buildPlaybackUrl({
        provider: selectedProvider,
        contentType,
        tmdbId,
        season,
        episode,
      })
    : null;

  useEffect(() => {
    if (selectedProviderId) {
      window.localStorage.setItem(
        STORAGE_KEY(tmdbId, contentType),
        selectedProviderId,
      );
    }
  }, [selectedProviderId, tmdbId, contentType]);

  if (providers.length === 0) {
    return (
      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white">
        <AlertTriangle className="mx-auto mb-4 h-7 w-7 text-yellow-300" />
        <h2 className="text-xl font-medium">
          No playback sources configured
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-white/50">
          Add an authorized HTTPS source in:
        </p>
        <code className="mt-3 inline-block rounded bg-white/10 px-3 py-2 text-sm text-white/80">
          lib/playback/providers.ts
        </code>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="flex flex-col gap-5 border-b border-white/10 p-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-white/45">
            <ShieldCheck className="h-4 w-4" />
            <span>Authorized playback</span>
          </div>
          <h2 className="text-2xl font-light">
            Watch {title}
          </h2>
          <p className="mt-2 text-sm text-white/50">
            {contentType === "movie"
              ? "Select a configured playback source."
              : "Choose a season and episode, then pick a playback source."}
          </p>
        </div>

        <label className="flex flex-col gap-2 text-xs text-white/50">
          Playback source
          <select
            value={selectedProvider?.id ?? ""}
            onChange={(event) => setSelectedProviderId(event.target.value)}
            className="w-full min-w-[200px] rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white"
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {contentType === "series" && (
        <SeasonEpisodePicker
          seasons={seasons ?? []}
          season={season}
          episode={episode}
          onChange={(next) => {
            setSeason(next.season);
            setEpisode(next.episode);
          }}
        />
      )}

      {sourceUrl ? (
        <>
          <div className="aspect-video bg-black">
            <iframe
              key={sourceUrl}
              src={sourceUrl}
              title={`${title} player`}
              className="h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-read; clipboard-write"
              allowFullScreen
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col gap-4 p-6 text-sm text-white/50 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-white/70" />
              <span>{selectedProvider?.description}</span>
            </div>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-white/75 hover:bg-white/10"
            >
              Open source
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </>
      ) : (
        <div className="p-10 text-center text-sm text-white/50">
          The selected source does not have a valid URL for this content.
        </div>
      )}
    </section>
  );
}
