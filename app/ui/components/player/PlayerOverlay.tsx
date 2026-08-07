"use client";

import { useEffect, useState } from "react";
import { getMovieStream } from "@/lib/streaming/manager";
import { PlaybackProvider } from "./context/PlaybackProvider";
import { usePlayerControls } from "@/hooks/usePlayerControls";
import PlayerControls from "./PlayerControls";
import CollapsedPlayer from "./CollapsedPlayer";
import VideoPlayer from "./VideoPlayer";
import LoadingOverlay from "./LoadingOverlay";

type Props = {
  open: boolean;
  onClose: () => void;
  movieId: number;
  title?: string;
};

export default function PlayerOverlay({
  open,
  onClose,
  movieId,
  title,
}: Props) {
  const { visible, toggleControls } = usePlayerControls();

  const [src, setSrc] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const stream = await getMovieStream(movieId);

      if (mounted && stream) {
        setSrc(stream.url);
      }
    }

    if (open) {
      load();
    }

    return () => {
      mounted = false;
    };
  }, [movieId, open]);

  if (!open) return null;

  return (
    <PlaybackProvider>
      <div
        onClick={toggleControls}
        className="fixed inset-0 z-[9999] bg-black"
      >
        {!src && <LoadingOverlay />}

        {src && (
          <VideoPlayer
            src={src}
            title={title}
          />
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute left-6 top-6 z-20 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl"
        >
          ← Back
        </button>

        <PlayerControls visible={visible} />

        <CollapsedPlayer
          visible={visible}
          onExpand={toggleControls}
        />
      </div>
    </PlaybackProvider>
  );
}
