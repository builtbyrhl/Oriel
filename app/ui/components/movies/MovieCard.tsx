"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

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
        whileHover={{ y: -6 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.25 }}
        className="group relative overflow-hidden rounded-[28px] bg-neutral-900 cursor-pointer"
      >
        <div className="aspect-[2/3] overflow-hidden">
          <img
            src={movie.image}
            alt={movie.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
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

        <button
          onClick={(e) => e.preventDefault()}
          className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-xl"
        >
          <Plus size={20} />
        </button>
      </motion.div>
    </Link>
  );
}

