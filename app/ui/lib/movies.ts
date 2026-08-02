import { tmdbFetch } from "./tmdb";

export async function getTrendingMovies() {
  const data = await tmdbFetch("/trending/movie/week");
  return data.results;
}

export async function getPopularMovies() {
  const data = await tmdbFetch("/movie/popular");
  return data.results;
}

export async function getTopRatedMovies() {
  const data = await tmdbFetch("/movie/top_rated");
  return data.results;
}
