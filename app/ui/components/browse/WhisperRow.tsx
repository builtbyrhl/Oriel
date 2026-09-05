"use client";

import { motion } from "framer-motion";
import WhisperCard from "./WhisperCard";

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
  index: string;
  movies: Movie[];
};
export default function WhisperRow({ title, index, movies }: Props) {
  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-10 flex items-baseline gap-6"
      >
        <span className="font-mono text-[10px] tabular-nums tracking-[0.3em] text-[#d4af37]/40">
          {index}
        </span>
        <h3 className="text-xl font-light tracking-[0.06em] text-[#f5f1ea]/80">
          {title}
        </h3>
        <div className="h-px flex-1 bg-gradient-to-r from-[#f5f1ea]/[0.06] to-transparent" />
      </motion.div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#0a0807] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#0a0807] to-transparent" />

        <div className="-mx-8 flex gap-4 overflow-x-auto px-8 pb-4 pt-1 snap-x snap-mandatory scrollbar-hide md:gap-5">
          {movies.map((movie) => (
            <WhisperCard
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
