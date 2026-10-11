"use client";

import { useEffect } from "react";
import { ExternalLink, X } from "lucide-react";

type Props = {
  open: boolean;
  /** YouTube video key (the `v=` part). */
  videoKey: string;
  title?: string;
  onClose: () => void;
};

/**
 * Cinema-style in-site trailer modal. The trailer plays on our surface; when
 * the studio has disabled embedded playback (per-video YouTube setting,
 * undetectable cross-origin), the "Open on YouTube" link in the header is
 * the escape hatch — the blank embed case is covered by design, not by luck.
 */
export default function TrailerModal({
  open,
  videoKey,
  title,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !videoKey) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Trailer"
    >
      <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/40">
              Trailer
            </p>
            <h3 className="truncate text-lg font-light text-white/90">
              {title}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={`https://www.youtube.com/watch?v=${videoKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs text-white/60 transition hover:border-white/30 hover:text-white/90"
            >
              Can&apos;t play? YouTube
              <ExternalLink size={11} className="opacity-60" />
            </a>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-2.5 text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Deep cinematic backdrop (design rule 9) shows around the 16:9
            window and if the embed is blocked, so the modal never looks
            like a raw white hole. */}
        <div className="relative aspect-video overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-[#050814] via-[#04070f] to-black">
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${videoKey}?autoplay=1&rel=0`}
            title={`${title ?? "Movie"} trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
