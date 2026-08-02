"use client";

import { useEffect, useState } from "react";
import { Plus, Check } from "lucide-react";
import {
  WatchlistMovie,
  isInWatchlist,
  toggleWatchlist,
} from "@/lib/watchlist";

type Props = {
  movie: WatchlistMovie;
};

export default function WatchlistButton({ movie }: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isInWatchlist(movie.id));
  }, [movie.id]);

  function handleClick() {
    toggleWatchlist(movie);
    setSaved(isInWatchlist(movie.id));
  }

  return (
    <button
      onClick={handleClick}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-xl transition hover:bg-white/30"
    >
      {saved ? <Check size={20} /> : <Plus size={20} />}
    </button>
  );
}
