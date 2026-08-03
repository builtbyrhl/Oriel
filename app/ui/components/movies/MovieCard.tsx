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
        whileHover={{ y: -6, scale: 1.015 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="group relative overflow-hidden rounded-[30px] border border-white/8 bg-neutral-900/90 cursor-pointer shadow-[0_10px_35px_rgba(0,0,0,0.45)] transition-all duration-500 hover:border-white/15 hover:shadow-[0_20px_50px_rgba(255,255,255,0.08)]"
      >
        <div className="aspect-[2/3] overflow-hidden">
          <img
            src={movie.image}
            alt={movie.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

        <div className="pointer-events-none absolute bottom-0 w-full p-4">
          <h3 className="text-[17px] font-semibold tracking-tight text-white">
            {movie.title}
          </h3>

          <p className="mt-1 text-xs tracking-wide text-white/60">
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
