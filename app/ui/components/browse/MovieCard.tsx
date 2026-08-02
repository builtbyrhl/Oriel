"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";

type MovieCardProps = {
  title: string;
  genre: string;
  year: string;
  image: string;
};

export default function MovieCard({
  title,
  genre,
  year,
  image,
}: MovieCardProps) {

  const vibrate = () => {
    if ("vibrate" in navigator) navigator.vibrate(12);
  };

  return (
    <motion.div
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.25 }}
      onClick={vibrate}
      className="group overflow-hidden rounded-3xl bg-white shadow-sm"
    >
      <div className="relative aspect-[2/3] overflow-hidden">

        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30"/>

        <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 transition group-hover:opacity-100">

          <button className="h-12 w-12 rounded-full bg-white/80 backdrop-blur text-black font-semibold">
            ○
          </button>

          <button className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 backdrop-blur">
            <Plus className="h-5 w-5"/>
          </button>

        </div>

      </div>

      <div className="p-4">

        <h4 className="font-medium">{title}</h4>

        <p className="text-sm text-black/60">
          {genre} • {year}
        </p>

      </div>

    </motion.div>
  );
}
