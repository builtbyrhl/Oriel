"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Play,
  ShieldCheck,
} from "lucide-react";

import { getPlaybackProviders } from "@/lib/playback/providers";
import { buildPlaybackUrl } from "@/lib/playback/url";
import type { PlaybackContentType } from "@/lib/playback/types";
import BrandedIframe from "@/components/player/BrandedIframe";
import SourcePicker from "@/components/player/SourcePicker";
import type {
  EpisodeDef,
  SeasonDef,
} from "@/components/movie/SeasonEpisodePicker";
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

type Position = { season: number; episode: number };

/** Read the playback position from the URL (?s=2&e=5); ignore invalid values. */
function readPosition(
  params: { get: (name: string) => string | null } | null,
): Position | null {
  if (!params) return null;
  const s = Number(params.get("s"));
  const e = Number(params.get("e"));
  if (!Number.isInteger(s) || !Number.isInteger(e) || s < 1 || e < 1) {
    return null;
  }
  return { season: s, episode: e };
}

/** Clamp a position to what this title actually has. */
function clampPosition(
  position: Position,
  seasons: SeasonDef[] | undefined,
): Position {
  const valid = (seasons ?? []).filter((s) => s.season >= 1);
  if (valid.length === 0) return position;
  const season = valid.some((s) => s.season === position.season)
    ? position.season
    : valid[0]!.season;
  const def = valid.find((s) => s.season === season)!;
  const episode =
    def.episodes > 0 && position.episode > def.episodes
      ? def.episodes
      : position.episode;
  return { season, episode };
}

export default function PlaybackPlayer({
  tmdbId,
  title,
  contentType,
  seasons,
}: Props) {
  const searchParams = useSearchParams();
  const isSeries = contentType === "series";

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

  // Playback position — initialized from the URL so shared links and
  // refreshes land on the exact episode, then kept in sync when the URL
  // changes (back/forward). Render-phase adjustment: React re-renders
  // immediately, so no effect is involved.
  const initialPosition = isSeries
    ? clampPosition(
        readPosition(searchParams) ?? { season: 1, episode: 1 },
        seasons,
      )
    : { season: 1, episode: 1 };

  const [season, setSeason] = useState(initialPosition.season);
  const [episode, setEpisode] = useState(initialPosition.episode);
  const sectionRef = useRef<HTMLElement>(null);
  const pendingScroll = useRef(false);

  const urlPosition = isSeries
    ? clampPosition(
        readPosition(searchParams) ?? { season: 1, episode: 1 },
        seasons,
      )
    : null;
  const positionKey = isSeries
    ? `${urlPosition!.season}:${urlPosition!.episode}`
    : "movie";
  const [trackedPosition, setTrackedPosition] = useState(positionKey);
  if (trackedPosition !== positionKey) {
    setTrackedPosition(positionKey);
    if (urlPosition) {
      setSeason(urlPosition.season);
      setEpisode(urlPosition.episode);
    }
  }

  // Reflect the position in the address bar (same URL, no history spam),
  // so the page is shareable at the exact episode being watched.
  const writePosition = (next: Position) => {
    if (!isSeries || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("s", String(next.season));
    url.searchParams.set("e", String(next.episode));
    window.history.replaceState(window.history.state, "", url);
  };

  const selectPosition = (next: Position) => {
    const episodeChanged = next.episode !== episode;
    setSeason(next.season);
    setEpisode(next.episode);
    writePosition(next);
    if (episodeChanged) {
      pendingScroll.current = true;
    }
  };

  // After the viewer picks an episode deep in the list, glide the player back
  // into view so playback starts where their eyes are.
  useEffect(() => {
    if (pendingScroll.current) {
      pendingScroll.current = false;
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [season, episode]);

  // Episode details for the active season — owned here so the picker and the
  // "Next episode" control share one fetch per season.
  const [episodeCache, setEpisodeCache] = useState<Record<number, EpisodeDef[]>>({});
  const [episodeFailed, setEpisodeFailed] = useState<Record<number, boolean>>({});

  const activeDef = (seasons ?? []).find((s) => s.season === season);
  const activeCount = activeDef?.episodes ?? 0;

  useEffect(() => {
    if (!isSeries || activeCount === 0) return;
    if (episodeCache[season] || episodeFailed[season]) return;

    let alive = true;

    fetch(`/api/tmdb/tv-season?id=${tmdbId}&season=${season}`)
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(String(res.status))),
      )
      .then((data: { episodes?: EpisodeDef[] }) => {
        if (!alive) return;
        setEpisodeCache((prev) => ({
          ...prev,
          [season]: data.episodes ?? [],
        }));
      })
      .catch(() => {
        if (!alive) return;
        setEpisodeFailed((prev) => ({ ...prev, [season]: true }));
      });

    return () => {
      alive = false;
    };
  }, [isSeries, tmdbId, season, activeCount, episodeCache, episodeFailed]);

  const activeEpisodes = isSeries ? episodeCache[season] : undefined;
  const nextEpisode = (() => {
    if (!activeEpisodes) return undefined;
    const index = activeEpisodes.findIndex((e) => e.number === episode);
    return index >= 0 ? activeEpisodes[index + 1] : undefined;
  })();

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

  const showNext =
    isSeries &&
    Boolean(sourceUrl) &&
    (Boolean(nextEpisode) || episode < activeCount);

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
    <section
      ref={sectionRef}
      className="scroll-mt-24 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]"
    >
      <div className="border-b border-white/10 p-6">
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-widest text-white/45">
          <ShieldCheck className="h-4 w-4" />
          <span>Authorized playback</span>
        </div>
        <h2 className="text-2xl font-light">
          Watch {title}
        </h2>
        <p className="mt-2 text-sm text-white/50">
          {contentType === "movie"
            ? "Pick a source — every source below can play this title."
            : "Choose a season and episode, then pick a source."}
        </p>
      </div>

      <div className="border-b border-white/10 px-6 py-4">
        <SourcePicker
          variant="page"
          items={providers.map((p) => ({ id: p.id, label: p.name }))}
          activeId={selectedProviderId}
          onSelect={setSelectedProviderId}
        />
      </div>

      {isSeries && (
        <SeasonEpisodePicker
          seasons={seasons ?? []}
          season={season}
          episode={episode}
          episodes={activeEpisodes ?? null}
          failed={Boolean(episodeFailed[season])}
          onChange={selectPosition}
        />
      )}

      {sourceUrl ? (
        <>
          <div className="aspect-video bg-black">
            <BrandedIframe
              key={sourceUrl}
              src={sourceUrl}
              title={`${title} player`}
            />
          </div>
          <div className="flex flex-col gap-4 p-6 text-sm text-white/50 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-white/70" />
              <span>{selectedProvider?.description}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {showNext && (
                <button
                  type="button"
                  onClick={() => {
                    if (nextEpisode) {
                      selectPosition({
                        season,
                        episode: nextEpisode.number,
                      });
                    }
                  }}
                  className="inline-flex max-w-[260px] items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-white/75 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
                >
                  <span className="truncate">
                    {nextEpisode
                      ? `Next: E${nextEpisode.number} · ${nextEpisode.name}`
                      : "Next episode"}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </button>
              )}
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
