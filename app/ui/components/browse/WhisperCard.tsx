"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type MovieCardProps = {
  id: number;
  title: string;
  genre: string;
  year: string;
  image: string;
  contentType: "movie" | "series";
};

export default function WhisperCard({
  id,
  title,
  year,
  image,
  contentType,
}: MovieCardProps) {
  const href = contentType === "series" ? `/tv/${id}` : `/movie/${id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      className="group min-w-[150px] snap-start md:min-w-[200px]"
    >
      <Link href={href} className="block">
        <div className="relative overflow-hidden rounded-[12px] bg-[#12100e]">
          <div className="relative aspect-[2/3] overflow-hidden">
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition-all duration-700 group-hover:brightness-75"
              style={{ filter: "grayscale(0%)", transition: "filter 0.6s ease, transform 0.7s ease" }}
            />
            {/* Subtle bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0a0807]/80 to-transparent" />

            {/* No decorative elements — quiet */}
          </div>

          {/* Minimal info — title only */}
          <div className="p-3.5 pb-4">
            <h3 className="truncate text-[13px] font-light tracking-[0.03em] text-[#f5f1ea]/90 leading-snug">
              {title}
            </h3>
            <p className="mt-1.5 font-mono text-[10px] tracking-[0.1em] text-[#f5f1ea]/30">
              {year}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
