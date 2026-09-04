"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface SeasonDef {
  season: number;
  episodes: number; // 0/unknown => fall back to numeric inputs
}

interface Props {
  seasons: SeasonDef[];
  season: number;
  episode: number;
  onChange: (next: { season: number; episode: number }) => void;
}

export default function SeasonEpisodePicker({ seasons, season, episode, onChange }: Props) {
  if (!seasons || seasons.length === 0) return null;

  const seasonDefs = seasons.filter((s) => s.season >= 1);
  const active = seasonDefs.find((s) => s.season === season) ?? seasonDefs[0];
  const epCount = active?.episodes ?? 0;

  const seasonIndex = seasonDefs.indexOf(active);
  const canPrev = seasonIndex > 0;
  const canNext = seasonIndex < seasonDefs.length - 1;

  const goToSeason = (idx: number) => {
    const s = seasonDefs[idx];
    onChange({ season: s.season, episode: 1 });
  };

  const onSelectEpisode = (ep: number) => onChange({ season: active.season, episode: ep });

  if (epCount > 0) {
    return (
      <div className="flex flex-col gap-4 border-b border-white/10 p-6">
        <label className="text-xs uppercase tracking-widest text-white/45">Season &amp; Episode</label>

        <div className="flex items-center justify-between gap-2">
          {canPrev && (
            <button
              onClick={() => goToSeason(seasonIndex - 1)}
              aria-label="Previous season"
              className="rounded-xl border border-white/15 bg-black/40 p-1.5 text-white/70 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <div className="flex items-baseline justify-center gap-1.5 truncate px-1 text-sm">
            <span className="text-white/80">Season {active.season}</span>
            <span className="text-white/20">•</span>
            <span className="text-white/40">{epCount} episode{epCount === 1 ? "" : "s"}</span>
          </div>

          {canNext && (
            <button
              onClick={() => goToSeason(seasonIndex + 1)}
              aria-label="Next season"
              className="rounded-xl border border-white/15 bg-black/40 p-1.5 text-white/70 hover:text-white hover:bg-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: epCount }, (_, i) => {
            const ep = i + 1;
            const selected = ep === episode;
            return (
              <button
                type="button"
                key={ep}
                onClick={() => onSelectEpisode(ep)}
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
      </div>
    );
  }

  // Graceful fallback when episode counts are unavailable: keep numeric inputs.
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
