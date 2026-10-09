"use client";

import { ShieldCheck } from "lucide-react";

type PickerItem = {
  id: string;
  label: string;
};

type Props = {
  items: PickerItem[];
  activeId: string;
  onSelect: (id: string) => void;
  /**
   * "page" — wrapped row under the detail-page player header.
   * "overlay" — compact scrollable strip in the fullscreen player header.
   */
  variant: "page" | "overlay";
};

const SELFHOSTED = "vidlink-selfhosted";

/**
 * Source switcher rendered as pill chips (never a native <select>).
 * Selected chip lifts with white fill + soft glow; the self-hosted source
 * carries a shield mark so "ad-free" is one glance away.
 */
export default function SourcePicker({ items, activeId, onSelect, variant }: Props) {
  if (items.length === 0) return null;

  const chip = (active: boolean): string =>
    [
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-medium transition-all duration-200",
      active
        ? "border-white/35 bg-white/15 text-white shadow-[0_0_16px_rgba(255,255,255,0.08)]"
        : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/85",
      variant === "overlay" ? "py-1.5" : "py-2",
    ].join(" ");

  const buttons = items.map((item) => {
    const active = item.id === activeId;
    return (
      <button
        key={item.id}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onSelect(item.id)}
        className={chip(active)}
      >
        {item.id === SELFHOSTED && <ShieldCheck size={12} className="shrink-0" />}
        {item.label}
      </button>
    );
  });

  if (variant === "overlay") {
    return (
      <div
        role="radiogroup"
        aria-label="Playback source"
        className="flex items-center gap-1.5 overflow-x-auto px-4 scrollbar-hide sm:px-6"
      >
        {buttons}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2.5 text-xs uppercase tracking-widest text-white/45">
        Source
      </p>
      <div
        role="radiogroup"
        aria-label="Playback source"
        className="flex flex-wrap gap-1.5"
      >
        {buttons}
      </div>
    </div>
  );
}
