"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import WatchlistButton from "@/components/watchlist/WatchlistButton";

export type Movie = {
  id: number;
  title: string;
  genre: string;
  year: string;
  image: string;
};

type Props = {
  movie: Movie;
};

export default function MovieCard({ movie }: Props) {
  return (
    <Link href={`/movie/${movie.id}`} className="block">
      <motion.div
        whileHover={{ y: -10, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="group relative overflow-hidden rounded-[28px] bg-neutral-900 cursor-pointer shadow-xl transition-shadow duration-300 hover:shadow-white/10"
      >
        <div className="aspect-[2/3] overflow-hidden">
          <img
            src={movie.image}
            alt={movie.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-115"
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />

        <div className="pointer-events-none absolute bottom-0 w-full p-4">
          <h3 className="text-lg font-medium text-white">
            {movie.title}
          </h3>

          <p className="mt-1 text-sm text-white/70">
            {movie.genre} • {movie.year}
          </p>
        </div>

        <div
          className="absolute right-4 top-4"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <WatchlistButton
            movie={{
              id: movie.id,
              title: movie.title,
              poster: movie.image,
              backdrop: movie.image,
              year: movie.year,
              rating: 0,
            }}
          />
        </div>

      </motion.div>
    </Link>
  );
}
