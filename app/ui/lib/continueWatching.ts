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

// ——— Last-watched position (series) ———

export type LastWatchedPosition = {
  season: number;
  episode: number;
  updatedAt: number;
};

const lastWatchedKey = (type: "movie" | "tv", tmdbId: number) =>
  `oriel:last-watched:${type}:${tmdbId}`;

export function getLastWatchedPosition(
  type: "movie" | "tv",
  tmdbId: number,
): LastWatchedPosition | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(lastWatchedKey(type, tmdbId));
    return raw ? (JSON.parse(raw) as LastWatchedPosition) : null;
  } catch {
    return null;
  }
}

export function saveLastWatchedPosition(
  type: "movie" | "tv",
  tmdbId: number,
  position: { season: number; episode: number },
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      lastWatchedKey(type, tmdbId),
      JSON.stringify({ ...position, updatedAt: Date.now() }),
    );
  } catch {
    // Storage unavailable — remember nothing, remember it silently.
  }
}
