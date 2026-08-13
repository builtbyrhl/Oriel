"use client";

import { ChevronDown } from "lucide-react";
import SectionHead from "@/components/browse/SectionHead";
import OrielOrbit from "@/components/browse/OrielOrbit";
import type { Movie } from "@/components/movies/MovieCard";
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
  movies: Movie[];
};

/**
 * The Spin to Explore section. Genre and Mood sit beside the heading as
 * independent dropdowns; the orbit is the selection surface. The centre card
 * is the current pick, and its metadata + synopsis render below the ring.
 */
export default function SpinToExplore({ value, onChange, movies }: Props) {
  return (
    <section className="pt-[74px]">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="lg:pr-8">
          <SectionHead
            eyebrow="02 · Oriel Orbit"
            title="Spin to Explore"
            sub="Drag to rotate the rail — the centre is your current pick. Discovery stays in one place, never spread across the page."
          />
        </div>

        <div className="flex flex-wrap items-end gap-3 lg:pb-1">
          <SelectField
            label="Genre"
            value={value.genre?.trim()}
            placeholder="All genres"
            options={GENRES}
            onChange={(genre) => onChange({ ...value, genre })}
          />
          <SelectField
            label="Mood"
            value={value.mood?.trim()}
            placeholder="Any mood"
            options={MOODS}
            onChange={(mood) => onChange({ ...value, mood })}
          />
        </div>
      </div>

      <div className="mt-10">
        <OrielOrbit movies={movies} />
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
          className="w-full cursor-pointer appearance-none rounded-full border border-white/15 bg-white/[0.05] px-5 py-2.5 pr-10 text-sm text-[#f3f0e9] outline-none transition focus:border-white/40 sm:w-auto"
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
