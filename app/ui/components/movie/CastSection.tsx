"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type Credit = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

type Props = {
  cast: Credit[];
};

const IMG = "https://image.tmdb.org/t/p/w342";

export default function CastSection({ cast }: Props) {
  return (
    <section className="mt-8 md:mt-10">
      <div className="mb-5">
        <h2 className="text-3xl font-extralight tracking-tight">
          Featured Cast
        </h2>

        <p className="mt-2 text-sm leading-6 text-white/45">
          Tap an actor to explore their filmography.
        </p>
      </div>

      <div className="relative">

        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-10 bg-gradient-to-r from-[#050505] to-transparent" />

        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-[#050505] to-transparent" />

        <div
          className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
        {cast.slice(0, 12).map((actor) => (
          <Link
            key={actor.id}
            href={`/person/${actor.id}`}
            className="snap-start shrink-0"
          >
            <motion.div
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="group w-36 sm:w-40 overflow-hidden rounded-[32px] border border-white/8 bg-white/5 backdrop-blur-xl"
            >
              {actor.profile_path ? (
                <img
                  src={IMG + actor.profile_path}
                  alt={actor.name}
                  className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center bg-white/5 text-5xl">
                  👤
                </div>
              )}

              <div className="p-4">
                <h3 className="truncate text-[15px] font-medium text-white">
                  {actor.name}
                </h3>

                <p className="mt-1 truncate text-[12px] text-white/45">
                  {actor.character}
                </p>
              </div>
            </motion.div>
          </Link>
        ))}
        </div>
      </div>
    </section>
  );
}
