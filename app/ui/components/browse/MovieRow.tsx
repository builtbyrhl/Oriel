"use client";

import { motion } from "framer-motion";
import MovieCard from "./MovieCard";
import { ChevronRight } from "lucide-react";

type Movie = {
  id: number;
  title: string;
  genre: string;
  year: string;
  image: string;
  contentType: "movie" | "series";
};

type Props = {
  title: string;
  index?: string;
  movies: Movie[];
  count?: string;
};

export default function MovieRow({ title, index, movies, count }: Props) {
  return (
    <section className="relative">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="mb-7 flex items-end justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          {index && (
            <span className="font-mono text-xs tabular-nums tracking-[0.2em] text-[#d4af37]/80">
              {index}
            </span>
          )}
          <div>
            <h3 className="text-xl font-light tracking-tight text-white md:text-2xl">
              {title}
            </h3>
            {count && (
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                {count}
              </p>
            )}
          </div>
        </div>
        <button className="group hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/50 transition-colors duration-300 hover:text-white md:flex">
          <span>View all</span>
          <ChevronRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" />
        </button>
      </motion.div>

      {/* Scroll row with edge fades */}
      <div className="relative">
        {/* Edge fades — left + right */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-14 bg-gradient-to-r from-[#050505] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 bg-gradient-to-l from-[#050505] to-transparent" />

        <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-3 pt-1 snap-x snap-mandatory scrollbar-hide md:gap-4">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              id={movie.id}
              title={movie.title}
              genre={movie.genre}
              year={movie.year}
              image={movie.image}
              contentType={movie.contentType}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
