"use client";

import { motion } from "framer-motion";
import { Plus, Play } from "lucide-react";
import Link from "next/link";

type MovieCardProps = {
  id: number;
  title: string;
  genre: string;
  year: string;
  image: string;
  contentType: "movie" | "series";
};

export default function MovieCard({
  id,
  title,
  genre,
  year,
  image,
  contentType,
}: MovieCardProps) {
  const href = contentType === "series" ? `/tv/${id}` : `/movie/${id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
      className="group relative min-w-[140px] snap-start md:min-w-[190px]"
    >
      <Link href={href} className="block">
        <div className="relative overflow-hidden rounded-[22px] bg-neutral-900/80 border border-transparent transition-all duration-500 hover:border-[#d4af37]/35 hover:shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_25px_rgba(212,175,55,0.12)]">
          {/* Poster image */}
          <div className="relative aspect-[2/3] overflow-hidden">
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-110 group-hover:brightness-75"
            />

            {/* Gradient overlay — always visible slightly */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-100" />

            {/* Corner gold frame accents — revealed on hover */}
            <span aria-hidden className="absolute right-0 top-0 h-7 w-7 border-t-2 border-r-2 border-[#d4af37] opacity-0 transition-all duration-500 group-hover:opacity-100" style={{ borderTopRightRadius: "22px" }} />
            <span aria-hidden className="absolute bottom-0 left-0 h-7 w-7 border-b-2 border-l-2 border-[#d4af37] opacity-0 transition-all duration-500 group-hover:opacity-100" style={{ borderBottomLeftRadius: "22px" }} />

            {/* Action overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {/* Play */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg backdrop-blur-sm"
              >
                <Play className="h-5 w-5 fill-current ml-0.5" />
              </motion.button>
              {/* Add to list */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-sm"
              >
                <Plus className="h-4 w-4" />
              </motion.button>
            </div>

            {/* Content type badge — top left */}
            <span className="absolute left-3 top-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/80">
              {contentType === "series" ? "S E R I E S" : "F I L M"}
            </span>
          </div>

          {/* Info panel */}
          <div className="relative p-3.5 pb-4">
            {/* Title */}
            <h3 className="truncate text-sm font-medium leading-snug text-white/95">
              {title}
            </h3>
            {/* Meta */}
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-mono text-[10px] tabular-nums text-white/45">
                {year}
              </span>
              <span className="flex items-center gap-1">
                <span className="block h-1 w-1 rounded-full bg-[#d4af37]" />
                <span className="font-mono text-[10px] text-white/45">
                  HD
                </span>
              </span>
            </div>
          </div>

          {/* Bottom gold line — progress bar style */}
          <div className="h-[2px] w-full overflow-hidden rounded-b-[22px]">
            <div className="h-full w-0 group-hover:w-full rounded-full bg-gradient-to-r from-[#d4af37]/60 to-[#d4af37] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
