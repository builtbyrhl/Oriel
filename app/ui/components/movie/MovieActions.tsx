"use client";

import { useState } from "react";
import TrailerModal from "./TrailerModal";
import WatchButton from "./WatchButton";
import TrailerButton from "./TrailerButton";
import PlayerOverlay from "@/components/player/PlayerOverlay";

type Props = {
  trailerKey: string | null;
  movieId: number;
  title: string;
};

export default function MovieActions({
  trailerKey,
  movieId,
  title,
}: Props) {
  const [openTrailer, setOpenTrailer] = useState(false);
  const [openPlayer, setOpenPlayer] = useState(false);

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center gap-4">

        <WatchButton
          onClick={() => setOpenPlayer(true)}
        />

        {trailerKey && (
          <>
            <TrailerButton
              onClick={() => setOpenTrailer(true)}
            />

            <TrailerModal
              open={openTrailer}
              onClose={() => setOpenTrailer(false)}
              videoKey={trailerKey}
            />
          </>
        )}

      </div>

      <PlayerOverlay
  open={openPlayer}
  onClose={() => setOpenPlayer(false)}
  movieId={movieId}
  title={title}
/>
    </>
  );
}
