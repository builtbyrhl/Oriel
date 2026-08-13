-- Oriel Curation Engine — discovery candidate pool: add browse imagery.
--
-- Recreates oriel_discovery_candidates so the pool also carries the poster
-- and backdrop paths stored on oriel_movies. Pure additive passthrough for
-- the browse UI: the filtering (genre/mood intersection, media_type scope)
-- and ordering/limit logic are unchanged. The paths are TMDB-relative
-- (e.g. "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg") and are combined with the TMDB
-- image base URL by the client.

begin;

drop function if exists public.oriel_discovery_candidates(
  p_genre text,
  p_mood text,
  p_media_type text,
  p_limit integer
);

create or replace function public.oriel_discovery_candidates(
  p_genre      text,
  p_mood       text,
  p_media_type text,
  p_limit      integer
) returns table (
  media_type   text,
  tmdb_id      bigint,
  title        text,
  release_date date,
  vote_average numeric,
  vote_count   integer,
  popularity   numeric,
  genres       text[],
  poster_path  text,
  backdrop_path text,
  version      integer,
  provider     text,
  model        text,
  fields       jsonb
)
language sql
stable
as $$
  select m.media_type,
         m.tmdb_id,
         m.title,
         m.release_date,
         m.vote_average,
         m.vote_count,
         m.popularity,
         m.genres,
         m.poster_path,
         m.backdrop_path,
         s.version,
         s.provider,
         s.model,
         s.fields
    from public.oriel_movies m
    left join public.oriel_media_semantics s
      on s.media_type = m.media_type and s.tmdb_id = m.tmdb_id
   where (p_media_type is null or m.media_type = p_media_type)
     and (
       p_genre is null
       or exists (
         select 1
           from unnest(m.genres) as g(genre)
          where lower(g.genre) = lower(p_genre)
       )
     )
     and (
       p_mood is null
       or exists (
         select 1
           from jsonb_array_elements_text(s.fields -> 'moods') as j(mood)
          where lower(j.mood) = lower(p_mood)
       )
     )
   order by coalesce(m.popularity, 0) desc, m.tmdb_id asc
   limit p_limit;
$$;

commit;
