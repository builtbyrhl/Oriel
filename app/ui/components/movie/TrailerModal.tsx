"use client";

import { X } from "lucide-react";

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

          </div>

        </div>

      </div>

    </div>
  );
}
