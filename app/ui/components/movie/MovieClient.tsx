"use client";

import { motion } from "framer-motion";
import CastSection from "./CastSection";
import PlaybackPlayer from "./PlaybackPlayer";
import type { SeasonDef } from "./SeasonEpisodePicker";

type Credit = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

type Props = {
  movieId: number;
  movieTitle: string;
  contentType?: "movie" | "series";
  credits: {
    cast: Credit[];
  };
  /** Per-season episode counts (series only). Omitted for movies. */
  seasons?: SeasonDef[];
};

export default function MovieClient({
  movieId,
  movieTitle,
  contentType = "movie",
  credits,
  seasons,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="space-y-16 md:space-y-20"
    >
      <PlaybackPlayer
        tmdbId={movieId}
        title={movieTitle}
        contentType={contentType}
        seasons={contentType === "series" ? seasons : undefined}
      />
      <CastSection cast={credits.cast} />
    </motion.div>
  );
}
