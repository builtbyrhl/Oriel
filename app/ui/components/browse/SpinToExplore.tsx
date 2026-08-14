"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import SectionHead from "@/components/browse/SectionHead";
import SpinOrbit from "@/components/browse/SpinOrbit";
import { fetchSpin, type SpinUiCandidate } from "@/lib/oriel/spin-client";
import type { DiscoveryQuery } from "@/lib/oriel/discovery-client";
import { cardLayout, formatSpinMetadata } from "@/lib/oriel/spin-geometry";

const SPIN_LIMIT = 20;

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
  mediaType: "movie" | "tv";
};

// Skeleton poster slots, matching the ring's geometry so the layout never
// shifts when real data arrives.
const SKELETON_SLOTS = [0, 1, 6, 2, 5].map((index) =>
  cardLayout(index, 7, 0)
);

function subscribePrefersReducedMotion(onStoreChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

/**
 * The Spin to Explore section — the real mechanism wired to /api/oriel/spin.
 *
 * Genre and Mood sit beside the heading as independent dropdowns (both values
 * are forwarded as-is; the engine owns semantic matching — the UI never maps
 * mood to genre). The SpinOrbit is the rotating selection surface; the centre
 * pick drives the title / metadata / synopsis below it. All recommendation
 * logic stays in the engine: this component only fetches, arranges and
 * animates what buildSpinSet already decided.
 */
export default function SpinToExplore({ value, onChange, mediaType }: Props) {
  const [candidates, setCandidates] = useState<SpinUiCandidate[] | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const reducedMotion = useSyncExternalStore(
    subscribePrefersReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );

  useEffect(() => {
    let cancelled = false;

    fetchSpin({
      genre: value.genre,
      mood: value.mood,
      mediaType,
      limit: SPIN_LIMIT,
    })
      .then((list) => {
        if (cancelled) return;
        setFetchFailed(false);
        setCandidates(list);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchFailed(true);
        setCandidates([]);
      });

    return () => {
      cancelled = true;
    };
  }, [value.genre, value.mood, mediaType, retryKey]);

  const dimensions = [value.genre, value.mood].filter(
    (d): d is string => Boolean(d?.trim())
  );

  const status = fetchFailed
    ? "error"
    : candidates === null
      ? "loading"
      : candidates.length === 0
        ? "empty"
        : "ready";

  const active = candidates?.[activeIndex] ?? null;
  const metadata = active
    ? formatSpinMetadata(active.year, active.runtime, active.rating)
    : null;

  const infoTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.35, ease: "easeOut" as const };

  return (
    <section className="pt-24 pb-20 md:pt-32 md:pb-28">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="lg:pr-8">
          <SectionHead
            eyebrow="01 · Spin"
            title="Spin to Explore"
            sub="A slow-turning ring of strong, meaningfully different picks. Tap a poster to bring it into focus — the centre is your current pick."
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

      {dimensions.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-5">
          {dimensions.map((dimension) => (
            <span
              key={dimension}
              className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#b5aa9a]"
            >
              [{dimension}]
            </span>
          ))}
        </div>
      )}

      <div className="mt-10">
        {status === "ready" ? (
          <>
            <SpinOrbit
              candidates={candidates ?? []}
              reducedMotion={reducedMotion}
              onPickChange={setActiveIndex}
            />

            <div className="mx-auto mt-12 max-w-2xl text-center" aria-live="polite">
              <AnimatePresence mode="wait">
                {active && (
                  <motion.div
                    key={`${active.mediaType}-${active.id}`}
                    initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={infoTransition}
                  >
                    <p className="flex items-center justify-center gap-3 text-[10px] font-medium uppercase tracking-[0.3em] text-[#b5aa9a]">
                      Now in focus · Oriel Pick
                      <span className="h-px w-6 bg-[#817767]" />
                    </p>

                    <h3 className="mt-4 font-serif text-3xl font-normal tracking-tight text-[#f3f0e9] md:text-5xl">
                      {active.title}
                    </h3>

                    {metadata && (
                      <p className="mt-4 text-xs font-light uppercase tracking-[0.2em] text-white/50">
                        {metadata}
                      </p>
                    )}

                    {active.overview ? (
                      <p className="mx-auto mt-6 max-w-xl text-sm font-light leading-relaxed text-white/40">
                        {active.overview}
                      </p>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : status === "loading" ? (
          <SpinSkeleton />
        ) : status === "empty" ? (
          <EmptyState />
        ) : (
          <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />
        )}
      </div>
    </section>
  );
}

function SpinSkeleton() {
  return (
    <div>
      <div className="relative h-[320px] overflow-hidden rounded-[30px] border border-white/10 bg-[#0a0a0a] sm:h-[360px] md:h-[440px]">
        {SKELETON_SLOTS.map((slot, i) => (
          <div
            key={i}
            className="absolute w-24 sm:w-28 md:w-36"
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              opacity: slot.opacity,
              transform: `translate(-50%,-50%) scale(${slot.scale})`,
            }}
          >
            <div className="oriel-shimmer aspect-[2/3] w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 max-w-2xl space-y-4 text-center">
        <div className="mx-auto h-2.5 w-28 oriel-shimmer rounded-full" />
        <div className="mx-auto h-8 w-2/3 oriel-shimmer rounded-full" />
        <div className="mx-auto h-3 w-40 oriel-shimmer rounded-full" />
        <div className="mx-auto h-3 w-1/2 oriel-shimmer rounded-full" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grid h-[320px] place-items-center rounded-[30px] border border-white/10 bg-[#0a0a0a] sm:h-[360px] md:h-[440px]">
      <div className="max-w-xs px-6 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/25">
          No discoveries here yet
        </p>
        <p className="mt-4 text-xs font-light leading-relaxed text-white/35">
          The quality floor keeps weak matches out. Try another genre or mood.
        </p>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid h-[320px] place-items-center rounded-[30px] border border-white/10 bg-[#0a0a0a] sm:h-[360px] md:h-[440px]">
      <div className="max-w-xs px-6 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/30">
          Couldn&apos;t load the Spin set
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 rounded-full border border-white/15 bg-white/5 px-6 py-2 text-xs tracking-wide text-white/70 transition hover:border-white/30 hover:text-white"
        >
          Try again
        </button>
      </div>
    </div>
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
