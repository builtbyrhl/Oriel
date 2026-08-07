"use client";

import Timeline from "./Timeline";
import { usePlaybackContext } from "./context/PlaybackProvider";

type Props = {
  visible: boolean;
  onExpand: () => void;
};

export default function CollapsedPlayer({
  visible,
  onExpand,
}: Props) {
  const playback = usePlaybackContext();

  if (visible) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onExpand();
      }}
      aria-label="Expand player"
      className="absolute inset-x-0 bottom-0 z-40 flex justify-center pb-[2px]"
    >
      <Timeline
        progress={playback.progress}
        collapsed
      />
    </button>
  );
}
