"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import SectionHead from "@/components/browse/SectionHead";
import SpinOrbit from "@/components/browse/SpinOrbit";
import { useSpinViewportLayout } from "@/components/browse/useSpinViewportLayout";
import { fetchSpin, type SpinUiCandidate } from "@/lib/oriel/spin-client";
import type { DiscoveryQuery } from "@/lib/oriel/discovery-client";
import { cardLayout, formatSpinMetadata } from "@/lib/oriel/spin-geometry";
import {
  DEFAULT_SPIN_INTENT,
  buildSpinQuery,
} from "@/lib/oriel/browse-query";

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
  mediaType: "movie" | "tv";
};

// The skeleton mirrors the ring's exact slots so the layout never shifts when
// real data arrives. Which slots to show (no skeleton for cards 3 and 4 —
// they sit lowest and darkest) stays fixed.
const SKELETON_INDEXES = [0, 1, 6, 2, 5];

function subscribePrefersReducedMotion(onStoreChange: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

/**
 * The Spin to Explore section — the real mechanism wired to /api/oriel/spin.
 *
 * Genre and Mood sit beside the heading as compact editorial selects (both
 * values are forwarded as-is; the engine owns semantic matching — the UI
 * never maps mood to genre). The SpinOrbit is a borderless cinematic poster
 * orbit; the centre pick drives the title / metadata / synopsis below it. All
 * recommendation logic stays in the engine: this component only fetches,
 * arranges and animates what buildSpinSet already decided.
 *
 * The section owns its exploration intent (genre + mood) locally — it never
 * reaches the rest of the page. It always lands on a valid curated intent
 * (DEFAULT_SPIN_INTENT) so the ring starts well-formed and the engine never
 * sees an invalid request. Only if the user deliberately clears every
 * dimension does the section show a quiet editorial invitation instead of
 * fetching an invalid request.
 */
export default function SpinToExplore({ mediaType }: Props) {
  const [intent, setIntent] = useState<DiscoveryQuery>(DEFAULT_SPIN_INTENT);
  const [candidates, setCandidates] = useState<SpinUiCandidate[] | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const reducedMotion = useSyncExternalStore(
    subscribePrefersReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );

  const dimensions = [intent.genre, intent.mood].filter(
    (d): d is string => Boolean(d?.trim())
  );
  const intentEmpty = dimensions.length === 0;

  useEffect(() => {
    if (intentEmpty) return;

    let cancelled = false;

    fetchSpin(buildSpinQuery(intent, mediaType))
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
  }, [intentEmpty, intent, mediaType, retryKey]);

  const status = intentEmpty
    ? "invite"
    : fetchFailed
      ? "error"
      : candidates === null
        ? "loading"
        : candidates.length === 0
          ? "empty"
          : "ready";

  const active = candidates?.[activeIndex] ?? null;
  const metadata = active
    ? [
        active.mediaType === "tv" ? "Series" : "Movie",
        formatSpinMetadata(active.year, active.runtime, active.rating),
      ]
        .filter((part): part is string => Boolean(part))
        .join(" · ")
    : null;

  const infoTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.35, ease: "easeOut" as const };

  return (
    <section className="pt-24 pb-20 md:pt-32 md:pb-28">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="lg:pr-8">
          <SectionHead
            eyebrow="01 · SPIN"
            title="Spin to Explore"
            sub="A slower way to discover something unexpected."
          />
        </div>

        <div className="flex flex-wrap items-end gap-3 lg:pb-1">
          <SelectField
            label="Genre"
            value={intent.genre?.trim()}
            placeholder="All genres"
            options={GENRES}
            onChange={(genre) => setIntent({ ...intent, genre })}
          />
          <SelectField
            label="Mood"
            value={intent.mood?.trim()}
            placeholder="Any mood"
            options={MOODS}
            onChange={(mood) => setIntent({ ...intent, mood })}
          />
        </div>
      </div>

      {dimensions.length > 0 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <span className="h-px w-10 bg-white/10" />
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-[#b5aa9a]">
            {dimensions.join(" · ")}
          </p>
          <span className="h-px w-10 bg-white/10" />
        </div>
      )}

      <div className="mt-12">
        {status === "ready" ? (
          <>
            <SpinOrbit
              candidates={candidates ?? []}
              reducedMotion={reducedMotion}
              onPickChange={setActiveIndex}
            />

            <p className="mt-6 text-center text-[10px] font-medium uppercase tracking-[0.3em] text-white/25">
              Drag the ring to spin it
            </p>

            <div className="mx-auto mt-10 max-w-2xl text-center" aria-live="polite">
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
                      Now in focus
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
        ) : status === "error" ? (
          <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />
        ) : (
          <InvitationState />
        )}
      </div>
    </section>
  );
}

function SpinSkeleton() {
  const { ref, layout } = useSpinViewportLayout();
  const slots = SKELETON_INDEXES.map((index) =>
    cardLayout(index, 7, 0, layout.geometry)
  );

  return (
    <div>
      <div
        ref={ref}
        className="relative w-full overflow-hidden"
        style={{ height: layout.canvasHeight }}
      >
        {slots.map((slot, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${slot.x}%`,
              top: `${slot.y}%`,
              width: layout.posterWidth,
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
      </div>
    </div>
  );
}

function InvitationState() {
  return (
    <div className="mx-auto max-w-md py-24 text-center md:py-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/25">
        Spin to Explore
      </p>
      <p className="mt-4 text-sm font-light leading-relaxed text-white/35">
        Choose a genre or mood to set the machine in motion.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-md py-24 text-center md:py-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/25">
        No discoveries here yet
      </p>
      <p className="mt-4 text-sm font-light leading-relaxed text-white/35">
        The quality floor keeps weak matches out. Try another genre or mood.
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-md py-24 text-center md:py-28">
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/25">
        Unable to load this selection
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 text-xs tracking-wide text-white/50 underline decoration-white/25 underline-offset-4 transition hover:text-white"
      >
        Try again
      </button>
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
          className="w-full cursor-pointer appearance-none rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 pr-9 text-sm text-[#f3f0e9] outline-none transition focus:border-white/40 sm:w-auto"
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
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
      </span>
    </label>
  );
}
