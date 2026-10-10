"use client";

import { Play } from "lucide-react";

export interface SeasonDef {
  season: number;
  episodes: number; // 0/unknown => fall back to numeric inputs
  name?: string;
}

export interface EpisodeDef {
  number: number;
  name: string;
  img: string | null;
  date: string;
  overview: string;
}

interface Props {
  seasons: SeasonDef[];
  season: number;
  episode: number;
  /** Loaded episode details for the active season (null while loading). */
  episodes?: EpisodeDef[] | null;
  /** True when the episode-details load for the active season failed. */
  failed?: boolean;
  onChange: (next: { season: number; episode: number }) => void;
}

function formatDate(date: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Season + episode selector. Seasons appear as chips (same language as the
 * source picker); episodes appear as thumbnail cards with their real names,
 * synopses and air dates. Numbered tiles remain only as a graceful fallback
 * when episode details can't be loaded.
 *
 * Episode data is owned by the parent (PlaybackPlayer) so the same list can
 * power the "Next episode" control in the player bar.
 */
export default function SeasonEpisodePicker({
  seasons,
  season,
  episode,
  episodes,
  failed = false,
  onChange,
}: Props) {
  const seasonDefs = (seasons ?? []).filter((s) => s.season >= 1);
  const active = seasonDefs.find((s) => s.season === season) ?? seasonDefs[0];

  const activeSeason = active?.season;
  const activeCount = active?.episodes ?? 0;

  if (!active || activeCount === 0) {
    return (
      <div className="flex flex-wrap items-end gap-5 border-b border-white/10 p-6">
        <label className="flex flex-col gap-2 text-xs text-white/50">
          Season
          <input
            type="number"
            min={1}
            value={season}
            onChange={(e) => onChange({ season: Number(e.target.value) || 1, episode })}
            className="w-28 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs text-white/50">
          Episode
          <input
            type="number"
            min={1}
            value={episode}
            onChange={(e) =>
              onChange({ season, episode: Number(e.target.value) || 1 })
            }
            className="w-28 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white"
          />
        </label>
      </div>
    );
  }

  const seasonEpisodes = activeSeason ? episodes ?? undefined : undefined;
  const loadFailed = Boolean(failed);

  const seasonChip = (def: SeasonDef, isActive: boolean): string =>
    [
      "inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-200",
      isActive
        ? "border-white/35 bg-white/15 text-white shadow-[0_0_16px_rgba(255,255,255,0.08)]"
        : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/85",
    ].join(" ");

  const seasonLabel = (def: SeasonDef): string =>
    def.name && def.name.toLowerCase() !== `season ${def.season}`.toLowerCase()
      ? def.name
      : `Season ${def.season}`;

  return (
    <div className="flex flex-col gap-5 border-b border-white/10 p-6">
      <div>
        <p className="mb-2.5 text-xs uppercase tracking-widest text-white/45">
          Season
        </p>
        <div
          role="radiogroup"
          aria-label="Season"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
        >
          {seasonDefs.map((def) => {
            const isActive = def.season === active.season;
            return (
              <button
                key={def.season}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => onChange({ season: def.season, episode: 1 })}
                className={seasonChip(def, isActive)}
              >
                {seasonLabel(def)}
                {def.episodes > 0 && (
                  <span className={isActive ? "text-white/50" : "text-white/30"}>
                    {def.episodes}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-xs uppercase tracking-widest text-white/45">
          Episode
        </p>

        {seasonEpisodes ? (
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
            role="radiogroup"
            aria-label="Episode"
          >
            {seasonEpisodes.map((ep) => {
              const selected = ep.number === episode;
              return (
                <button
                  key={ep.number}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ season: active.season, episode: ep.number })}
                  className={[
                    "group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-200",
                    selected
                      ? "border-white/60 ring-1 ring-white/40"
                      : "border-white/10 hover:border-white/30",
                  ].join(" ")}
                >
                  <div className="relative aspect-video bg-black/60">
                    {ep.img ? (
                      <img
                        src={ep.img}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-light text-white/25">
                        {ep.number}
                      </div>
                    )}

                    <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur">
                      E{ep.number}
                    </span>

                    {selected && (
                      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-black">
                        <Play size={9} fill="currentColor" />
                        Playing
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-2.5">
                    <p className="line-clamp-2 text-xs font-medium text-white/85">
                      {ep.name}
                    </p>
                    {ep.overview ? (
                      <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-white/40">
                        {ep.overview}
                      </p>
                    ) : null}
                    {formatDate(ep.date) && (
                      <p className="mt-auto pt-1.5 text-[10px] text-white/35">
                        {formatDate(ep.date)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : loadFailed && activeCount > 0 ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {Array.from({ length: active.episodes }, (_, i) => {
              const ep = i + 1;
              const selected = ep === episode;
              return (
                <button
                  type="button"
                  key={ep}
                  onClick={() => onChange({ season: active.season, episode: ep })}
                  className={[
                    "aspect-[2/3] rounded-xl border text-xs font-medium transition",
                    selected
                      ? "border-white bg-white text-black"
                      : "border-white/15 bg-black/40 text-white/60 hover:border-white/40 hover:text-white/90",
                  ].join(" ")}
                  title={`Episode ${ep}`}
                >
                  E{ep}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="overflow-hidden rounded-xl">
                <div className="aspect-video animate-pulse bg-white/5" />
                <div className="space-y-1.5 p-2.5">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-white/5" />
                  <div className="h-2 w-1/3 animate-pulse rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
