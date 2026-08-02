"use client";

import Image from "next/image";
import { Plus } from "lucide-react";

export interface MovieCardProps {
  id: number | string;
  title: string;
  year?: string;
  image: string;
  mood?: string;
  onOpen?: () => void;
  onCollection?: () => void;
}

export default function MovieCard({
  title,
  year,
  image,
  mood,
  onOpen,
  onCollection,
}: MovieCardProps) {

  const vibrate = () => {
    if (navigator.vibrate) navigator.vibrate(12);
  };

  return (
    <div
      className="group relative aspect-[2/3] overflow-hidden rounded-3xl bg-neutral-900 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
      onClick={vibrate}
    >
      <Image
        src={image}
        alt={title}
        fill
        sizes="(max-width:768px) 50vw, 20vw"
        className="object-cover transition duration-500 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 transition duration-300 group-hover:opacity-100"/>

      <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-6 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">

        {mood && (
          <span className="mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">
            {mood}
          </span>
        )}

        <h3 className="text-lg font-medium text-white">
          {title}
        </h3>

        <p className="text-sm text-white/70">
          {year}
        </p>

        <div className="mt-4 flex gap-3">

          <button
            onClick={onOpen}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
          >
            ◉
          </button>

          <button
            onClick={onCollection}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur transition hover:bg-white/30"
          >
            <Plus size={20}/>
          </button>

        </div>

      </div>
    </div>
  );
}
