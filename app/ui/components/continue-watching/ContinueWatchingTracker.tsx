"use client";

import { useEffect } from "react";
import {
  ContinueMovie,
  saveContinueWatching,
} from "@/lib/continueWatching";

type Props = {
  movie: {
    id: number;
    title: string;
    poster_path: string;
    backdrop_path: string;
    release_date: string;
    vote_average: number;
  };
};

const IMG = "https://image.tmdb.org/t/p/w500";

export default function ContinueWatchingTracker({
  movie,
}: Props) {
  useEffect(() => {
    const item: ContinueMovie = {
      id: movie.id,
      title: movie.title,
      poster: movie.poster_path
        ? IMG + movie.poster_path
        : "",
      backdrop: movie.backdrop_path
        ? IMG + movie.backdrop_path
        : "",
      year: (movie.release_date || "").slice(0, 4),
      rating: movie.vote_average,
      progress: 0,
      updatedAt: Date.now(),
    };

    saveContinueWatching(item);
  }, [movie]);

  return null;
}
