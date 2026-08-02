"use client";

import { useState } from "react";
import TrailerModal from "./TrailerModal";
import CastSection from "./CastSection";

type Credit = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

type Props = {
  trailerKey: string | null;
  credits: {
    cast: Credit[];
  };
};

export default function MovieClient({
  trailerKey,
  credits,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {trailerKey && (
        <>
          <button
            onClick={() => setOpen(true)}
            className="mt-8 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-6 py-3 backdrop-blur-xl transition hover:bg-white/20"
          >
            ▶ Trailer
          </button>

          <TrailerModal
            open={open}
            videoKey={trailerKey}
            onClose={() => setOpen(false)}
          />
        </>
      )}

      <CastSection cast={credits.cast} />
    </>
  );
}
