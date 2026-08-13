"use client";

import { ChevronDown } from "lucide-react";
import type { DiscoveryQuery } from "@/lib/oriel/discovery-client";

const GENRES = [
  "Action",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Science Fiction",
  "Thriller",
  "War",
  "Western",
];

const MOODS = [
  "dark",
  "tense",
  "gritty",
  "funny",
  "light",
  "hopeful",
  "warm",
  "epic",
  "emotional",
  "thoughtful",
];

type Props = {
  value: DiscoveryQuery;
  onChange: (next: DiscoveryQuery) => void;
};

/**
 * The Spin to Explore section — a reserved boundary where the future Spin
 * physics will live. The Genre and Mood dropdowns sit beside the heading and
 * stay independently interactive; the selection is editorialized below as
 * `[GENRE] ✦ [MOOD]` (never a literal "+"). No spin physics here yet.
 */
export default function SpinToExplore({ value, onChange }: Props) {
  const genre = value.genre?.trim();
  const mood = value.mood?.trim();
  const both = genre && mood;

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/8 bg-gradient-to-b from-white/[0.03] to-transparent px-6 py-10 md:px-10">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <span aria-hidden className="text-lg text-white/25">
            ✦
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.4em] text-white/50">
              Spin to Explore
            </p>
            <p className="mt-1.5 text-sm font-light text-white/40">
              Set a genre, a mood, or both — then let the spin decide.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <SelectField
            label="Genre"
            value={genre}
            placeholder="All genres"
            options={GENRES}
            onChange={(g) => onChange({ ...value, genre: g })}
          />
          <SelectField
            label="Mood"
            value={mood}
            placeholder="Any mood"
            options={MOODS}
            onChange={(m) => onChange({ ...value, mood: m })}
          />
        </div>
      </div>

      {/* Reserved boundary for the future Spin wheel. */}
      <div className="my-12 flex justify-center">
        <div className="relative flex h-48 w-48 items-center justify-center rounded-full border border-dashed border-white/15 md:h-56 md:w-56">
          <div className="absolute inset-5 rounded-full border border-white/[0.05]" />
          <div className="text-center">
            <span aria-hidden className="text-2xl text-white/20">
              ✦
            </span>
            <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.3em] text-white/30">
              Your spin lands here
            </p>
          </div>
        </div>
      </div>

      {/* Editorialized selection — never a literal "+". */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {both ? (
          <>
            <SelectionPill>{genre}</SelectionPill>
            <span aria-hidden className="text-sm text-white/25">
              ✦
            </span>
            <SelectionPill>{mood}</SelectionPill>
          </>
        ) : genre ? (
          <SelectionPill>{genre}</SelectionPill>
        ) : mood ? (
          <SelectionPill>{mood}</SelectionPill>
        ) : (
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
            Explore Freely
          </span>
        )}
      </div>
    </section>
  );
}

function SelectField({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  placeholder: string;
  options: string[];
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">
        {label}
      </span>
      <span className="relative block">
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="w-full cursor-pointer appearance-none rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 pr-10 text-sm text-white outline-none transition focus:border-white/40 sm:w-auto"
        >
          <option value="" className="bg-neutral-900 text-white/60">
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option} value={option} className="bg-neutral-900 text-white">
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
      </span>
    </label>
  );
}

function SelectionPill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-1.5 text-sm font-medium uppercase tracking-[0.2em] text-white">
      {children}
    </span>
  );
}
