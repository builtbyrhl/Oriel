import { tmdbFetch } from "./tmdb";

export async function getTrendingTv() {
  const data = await tmdbFetch("/trending/tv/week");
  return data.results;
}

export async function getPopularTv() {
  const data = await tmdbFetch("/tv/popular");
  return data.results;
}

export async function getTopRatedTv() {
  const data = await tmdbFetch("/tv/top_rated");
  return data.results;
}
