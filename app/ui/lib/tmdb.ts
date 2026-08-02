const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;

const BASE_URL = "https://api.themoviedb.org/3";

export async function tmdbFetch(path: string) {
  const res = await fetch(
    `${BASE_URL}${path}${path.includes("?") ? "&" : "?"}api_key=${API_KEY}`,
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  if (!res.ok) {
    throw new Error("TMDB request failed");
  }

  return res.json();
}

export function poster(path: string) {
  return `https://image.tmdb.org/t/p/w500${path}`;
}

export function backdrop(path: string) {
  return `https://image.tmdb.org/t/p/original${path}`;
}
