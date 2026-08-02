export type WatchlistMovie = {
  id: number;
  title: string;
  poster: string;
  backdrop: string;
  year: string;
  rating: number;
};

const KEY = "oriel_watchlist";

export function getWatchlist(): WatchlistMovie[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function isInWatchlist(id: number) {
  return getWatchlist().some((m) => m.id === id);
}

export function toggleWatchlist(movie: WatchlistMovie) {
  const list = getWatchlist();

  const exists = list.find((m) => m.id === movie.id);

  if (exists) {
    localStorage.setItem(
      KEY,
      JSON.stringify(list.filter((m) => m.id !== movie.id))
    );
  } else {
    localStorage.setItem(
      KEY,
      JSON.stringify([movie, ...list])
    );
  }
}
