"use client";

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

function Pill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-1.5 text-sm tracking-wide transition-all duration-300 ${
        active
          ? "border-white/40 bg-white/20 text-white"
          : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export default function ExploreBar({ value, onChange }: Props) {
  return (
    <div className="mb-8 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-widest text-white/40">
          Genre
        </span>
        <Pill
          active={!value.genre}
          onClick={() => onChange({ ...value, genre: undefined })}
        >
          All
        </Pill>
        {GENRES.map((genre) => (
          <Pill
            key={genre}
            active={value.genre === genre}
            onClick={() => onChange({ ...value, genre })}
          >
            {genre}
          </Pill>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-widest text-white/40">
          Mood
        </span>
        <Pill
          active={!value.mood}
          onClick={() => onChange({ ...value, mood: undefined })}
        >
          Any
        </Pill>
        {MOODS.map((mood) => (
          <Pill
            key={mood}
            active={value.mood === mood}
            onClick={() => onChange({ ...value, mood })}
          >
            {mood}
          </Pill>
        ))}
      </div>
    </div>
  );
}
