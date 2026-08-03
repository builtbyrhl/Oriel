"use client";

import { useState } from "react";

type Props = {
  text: string;
};

export default function Synopsis({ text }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="mb-16">

      <p className="mb-3 text-xs uppercase tracking-[0.35em] text-white/40">
        SYNOPSIS
      </p>

      <div className="relative">

        <p
          className={`text-lg leading-8 text-white/75 transition-all duration-500 ${
            expanded ? "" : "line-clamp-5"
          }`}
        >
          {text}
        </p>

        {!expanded && (
          <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-full bg-gradient-to-t from-[#050505] to-transparent" />
        )}

      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-5 text-sm font-medium text-white/60 transition hover:text-white"
      >
        {expanded ? "Show Less" : "Read More"}
      </button>

    </section>
  );
}
