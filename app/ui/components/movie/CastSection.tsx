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
    <section className="mt-4">
      <div className="mb-5">
        <h2 className="text-2xl font-light tracking-wide">
          Featured Cast
        </h2>

        <p className="mt-1 text-sm text-white/45">
          Tap an actor to explore their filmography.
        </p>
      </div>

      <div
        className="flex gap-5 overflow-x-auto pb-5 snap-x snap-mandatory px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {cast.slice(0, 12).map((actor) => (
          <Link
            key={actor.id}
            href={`/person/${actor.id}`}
            className="snap-start shrink-0"
          >
            <motion.div
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="w-32 sm:w-36 overflow-hidden rounded-[30px] border border-white/10 bg-white/5 backdrop-blur-xl"
            >
              {actor.profile_path ? (
                <img
                  src={IMG + actor.profile_path}
                  alt={actor.name}
                  className="aspect-[2/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[2/3] items-center justify-center bg-white/5 text-5xl">
                  👤
                </div>
              )}

              <div className="p-3">
                <h3 className="truncate text-sm font-medium text-white">
                  {actor.name}
                </h3>

                <p className="mt-1 truncate text-xs text-white/50">
                  {actor.character}
                </p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </section>
  );
}
