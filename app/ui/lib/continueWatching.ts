export type ContinueMovie = {
  id: number;
  title: string;
  poster: string;
  backdrop: string;
  year: string;
  rating: number;
  progress: number;
  updatedAt: number;
};

const KEY = "oriel_continue_watching";

export function getContinueWatching(): ContinueMovie[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(KEY);

    if (!raw) return [];

    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveContinueWatching(movie: ContinueMovie) {
  if (typeof window === "undefined") return;

  const existing = getContinueWatching().filter(
    (m) => m.id !== movie.id
  );

  existing.unshift(movie);

  localStorage.setItem(
    KEY,
    JSON.stringify(existing.slice(0, 20))
  );
}

export function clearContinueWatching() {
  if (typeof window === "undefined") return;

  localStorage.removeItem(KEY);
}
