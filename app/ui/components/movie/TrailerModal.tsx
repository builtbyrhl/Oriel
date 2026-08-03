"use client";

import { X, Play } from "lucide-react";

type Props = {
  open: boolean;
  videoKey: string | null;
  onClose: () => void;
};

export default function TrailerModal({
  open,
  videoKey,
  onClose,
}: Props) {
  if (!open || !videoKey) return null;

console.log("Trailer Key:", videoKey);
console.log("Embed URL:", `https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0`);


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">

      <button
        onClick={onClose}
        className="absolute right-6 top-6 rounded-full bg-white/10 p-3 transition hover:bg-white/20"
      >
        <X size={22} />
      </button>

      <div className="w-full max-w-6xl px-4">

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">

          <div className="aspect-video w-full">

            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0`}
              title="Trailer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />

            <div className="mt-6 flex flex-col items-center justify-center gap-4 text-center">

              <p className="text-white/60">
                If the trailer doesn't play, the studio has disabled embedded playback.
              </p>

              <a
                href={`https://www.youtube.com/watch?v=${videoKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 font-medium transition hover:bg-red-500"
              >
                <Play size={18} fill="currentColor" />
                Watch on YouTube
              </a>

            </div>

            <div className="mt-6 flex flex-col items-center justify-center gap-4 text-center">

              <p className="text-white/60">
                If the trailer doesn't play, the studio has disabled embedded playback.
              </p>

              <a
                href={`https://www.youtube.com/watch?v=${videoKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 font-medium transition hover:bg-red-500"
              >
                <Play size={18} fill="currentColor" />
                Watch on YouTube
              </a>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
