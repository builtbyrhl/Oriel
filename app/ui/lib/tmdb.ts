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

interface TmdbVideo {
  site: string;
  type: string;
  official?: boolean;
  key: string;
}

function pickTrailer(videos: TmdbVideo[]): TmdbVideo | null {
  const youtube = videos.filter((v) => v.site === "YouTube");

  // Official YouTube trailer
  let trailer: TmdbVideo | undefined = youtube.find(
    (v) => v.type === "Trailer" && v.official === true
  );

  // Any YouTube trailer
  if (!trailer) {
    trailer = youtube.find((v) => v.type === "Trailer");
  }

  // Official teaser
  if (!trailer) {
    trailer = youtube.find((v) => v.type === "Teaser" && v.official === true);
  }

  return trailer ?? youtube[0] ?? null;
}

export async function getMovieTrailer(id: string) {
  const data = await tmdbFetch(`/movie/${id}/videos`);

  return pickTrailer(data.results);
}

export async function getTvTrailer(id: string) {
  const data = await tmdbFetch(`/tv/${id}/videos`);

  return pickTrailer(data.results);
}

export async function getMovieCredits(id: string) {
  return tmdbFetch(`/movie/${id}/credits`);
}


export async function getTv(id: string) {
  return tmdbFetch(`/tv/${id}`);
}

export async function getTvCredits(id: string) {
  return tmdbFetch(`/tv/${id}/credits`);
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

export async function getSimilarTv(id: string) {
  return tmdbFetch(`/tv/${id}/similar`);
}
