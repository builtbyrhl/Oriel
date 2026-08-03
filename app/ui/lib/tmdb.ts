const API = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";

export async function tmdbFetch(endpoint: string) {
  const separator = endpoint.includes("?") ? "&" : "?";

  const res = await fetch(
    `${BASE}${endpoint}${separator}api_key=${API}`,
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

export async function getMovieTrailer(id: string) {
  const data = await tmdbFetch(`/movie/${id}/videos`);

  const videos = data.results.filter(
    (v: any) => v.site === "YouTube"
  );

  // Official YouTube trailer
  let trailer = videos.find(
    (v: any) =>
      v.type === "Trailer" &&
      v.official === true
  );

  if (trailer) return trailer;

  // Any YouTube trailer
  trailer = videos.find(
    (v: any) => v.type === "Trailer"
  );

  if (trailer) return trailer;

  // Official teaser
  trailer = videos.find(
    (v: any) =>
      v.type === "Teaser" &&
      v.official === true
  );

  if (trailer) return trailer;

  // Fallback
  return videos[0] ?? null;
}

export async function getMovieCredits(id: string) {
  return tmdbFetch(`/movie/${id}/credits`);
}

export async function getPerson(id: string) {
  return tmdbFetch(`/person/${id}`);
}

export async function getPersonMovies(id: string) {
  return tmdbFetch(`/person/${id}/movie_credits`);
}

export async function multiSearch(query: string) {
  if (!query.trim()) return { results: [] };

  return tmdbFetch(
    `/search/multi?query=${encodeURIComponent(query)}`
  );
}

export async function getSimilarMovies(id: string) {
  return tmdbFetch(`/movie/${id}/similar`);
}
