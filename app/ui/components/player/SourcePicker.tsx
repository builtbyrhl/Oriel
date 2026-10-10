"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import type { SourceHealth } from "@/hooks/useSourceHealth";

type PickerItem = {
  id: string;
  label: string;
};

type HealthMap = Record<string, SourceHealth>;

type Props = {
  items: PickerItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /**
   * "page" — wrapped row under the detail-page player header, with the
   * extended catalog tucked behind a "+N more" drawer.
   * "overlay" — compact scrollable strip in the fullscreen player header
   * (primary + secondary in one strip).
   */
  variant: "page" | "overlay";
  /** Extended catalog (secondary tier). Omitted = single-tier picker. */
  secondaryItems?: PickerItem[];
  /** Live reachability from /api/streaming/status. */
  health?: HealthMap;
};

function dotClass(id: string, health: HealthMap | undefined): string {
  const h = health?.[id];
  if (!h) return "bg-white/20"; // unknown — probe not in (yet)
  if (!h.ok) return "bg-red-400/80";
  return h.ms <= 1200 ? "bg-emerald-400/90" : "bg-amber-400/90";
}

/**
 * Healthy > slow > unknown > down, rank order preserved inside each group.
 */
function sortWithHealth(
  items: PickerItem[],
  health: HealthMap | undefined,
): PickerItem[] {
  const weight = (id: string): number => {
    const h = health?.[id];
    if (!h) return 2;
    if (!h.ok) return 3;
    return h.ms <= 1200 ? 0 : 1;
  };
  return [...items].sort(
    (a, b) => weight(a.id) - weight(b.id) || a.id.localeCompare(b.id),
  );
}

/**
 * Source switcher as pill chips — never a native <select>. The extended
 * catalog sits behind "+N more" so depth never means overwhelm; each
 * secondary source wears a live status dot (green = reachable now,
 * amber = slow, red = down, dim = unprobed).
 */
export default function SourcePicker({
  items,
  activeId,
  onSelect,
  variant,
  secondaryItems,
  health,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const chip = (active: boolean, small: boolean): string =>
    [
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border text-xs font-medium transition-all duration-200",
      small ? "px-3 py-1.5" : "px-3.5 py-2",
      active
        ? "border-white/35 bg-white/15 text-white shadow-[0_0_16px_rgba(255,255,255,0.08)]"
        : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/85",
    ].join(" ");

  const dot = (id: string) => (
    <span
      aria-hidden
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass(id, health)}`}
    />
  );

  const withDot = (item: PickerItem) => {
    const active = item.id === activeId;
    return (
      <button
        key={item.id}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onSelect(item.id)}
        className={chip(active, variant === "overlay")}
      >
        {dot(item.id)}
        {item.label}
      </button>
    );
  };

  const sortedSecondary = sortWithHealth(
    secondaryItems ?? [],
    health,
  );

  // ——— Overlay: everything in one slim scrollable strip ———
  if (variant === "overlay") {
    return (
      <div
        role="radiogroup"
        aria-label="Playback source"
        className="flex items-center gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:px-6"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={item.id === activeId}
            onClick={() => onSelect(item.id)}
            className={chip(item.id === activeId, true)}
          >
            {item.label}
          </button>
        ))}
        {sortedSecondary.length > 0 && (
          <span
            aria-hidden
            className="mx-1 h-4 w-px shrink-0 bg-white/10"
          />
        )}
        {sortedSecondary.map(withDot)}
      </div>
    );
  }

  // A short backup shelf stays inline (no hunting); a long one folds behind
  // "All N sources" so depth never becomes noise.
  const drawerThreshold = 3;
  const useDrawer = sortedSecondary.length > drawerThreshold;

  // ——— Page: curated row (+ inline or folded backup shelf) ———
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-widest text-white/45">
          Source
        </p>
        {useDrawer && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] text-white/35 transition hover:text-white/70"
          >
            {expanded ? "Hide" : "All"} {sortedSecondary.length} sources
            <ChevronDown
              size={12}
              className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      <div
        role="radiogroup"
        aria-label="Playback source"
        className="mt-2.5 flex flex-wrap items-center gap-1.5"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={item.id === activeId}
            onClick={() => onSelect(item.id)}
            className={chip(item.id === activeId, false)}
          >
            {item.label}
          </button>
        ))}

        {!useDrawer &&
          sortedSecondary.map((item) => {
            const active = item.id === activeId;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSelect(item.id)}
                className={chip(active, false)}
              >
                {dot(item.id)}
                {item.label}
              </button>
            );
          })}
      </div>

      {useDrawer && expanded && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {sortedSecondary.map(withDot)}
          </div>
          <p className="mt-2.5 text-[10px] leading-relaxed text-white/25">
            Backup mirrors · dots show live reachability from Oriel&apos;s
            servers — green opens reliably, red may still work in your browser.
          </p>
        </div>
      )}
    </div>
  );
}
