"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import SearchResults from "@/components/search/SearchResults";

type Movie = {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path?: string;
  release_date: string;
  vote_average: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SearchDrawer({
  open,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setMovies([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);

      try {
        const res = await fetch(
          `/api/tmdb/search?query=${encodeURIComponent(
            query.trim()
          )}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          throw new Error(
            `Search request failed: ${res.status}`
          );
        }

        const data = await res.json();

        setResults(data.results || []);
        setMovies([]);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Search failed:", error);
          setResults([]);
          setMovies([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition ${
          open
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#090909] transition-transform duration-300 ${
          open
            ? "translate-x-0"
            : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <h2 className="text-xl font-light">
            Search
          </h2>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center rounded-full bg-white/10 px-4 py-3">
            <Search size={18} />

            <input
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              placeholder="Search any movie..."
              className="ml-3 w-full bg-transparent outline-none"
            />
          </div>

          <SearchResults
            loading={loading}
            results={results}
          />
        </div>
      </aside>
    </>
  );
}
