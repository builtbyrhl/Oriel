"use client";

import Timeline from "./Timeline";
import { usePlaybackContext } from "./context/PlaybackProvider";

type Props = {
  visible: boolean;
};

function format(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
  }

  return `${m}:${s.toString().padStart(2,"0")}`;
}

export default function PlayerControls({
  visible,
}: Props) {
  const playback = usePlaybackContext();

  const remaining =
    playback.duration - playback.currentTime;

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent px-6 pb-8 pt-20 transition-all duration-500 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-6 pointer-events-none"
      }`}
    >
      <div className="mb-3 flex justify-between text-[11px] tracking-wide text-white/40">
        <span>{format(playback.currentTime)}</span>
        <span>-{format(remaining)}</span>
      </div>

      <div className="mb-8">
        <Timeline progress={playback.progress} />
      </div>

      <div className="mb-8 flex justify-center">
        <div className="h-7 w-7 rotate-[-12deg] rounded-full border border-white/60" />
      </div>

      <div className="flex justify-between text-[11px] uppercase tracking-[0.35em] text-white/60">
        <button className="transition hover:text-white">
          Episodes
        </button>

        <button className="transition hover:text-white">
          Companion
        </button>
      </div>
    </div>
  );
}
