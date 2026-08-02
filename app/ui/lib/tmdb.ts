const API = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const BASE = "https://api.themoviedb.org/3";

export async function tmdbFetch(endpoint: string) {
  const res = await fetch(
    `${BASE}${endpoint}?api_key=${API}`,
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

  const priorities = [
    "Official Trailer",
    "Trailer",
    "Final Trailer",
    "Teaser",
  ];

  for (const name of priorities) {
    const video = data.results.find(
      (v: any) =>
        v.site === "YouTube" &&
        v.type.includes("Trailer") &&
        (v.name === name || v.official)
    );

    if (video) return video;
  }

  return (
    data.results.find(
      (v: any) => v.site === "YouTube"
    ) ?? null
  );
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
