-- Oriel Curation Engine — milestone 1: discovery candidate pool.
--
-- One RPC, oriel_discovery_candidates, returns a broad, unranked pool of media
-- candidates for a discovery request. Genre and mood are independent
-- dimensions; when BOTH are provided the two filters are ANDed (intersection),
-- never ORed.
--
-- Filtering rules (mirrored 1:1 by the curation engine in
-- lib/oriel/curation/discovery.ts):
--   * genre     -> case-insensitive match against public.oriel_movies.genres
--   * mood      -> case-insensitive match against the stored AI semantic
--                  envelope's `moods` array (public.oriel_media_semantics
--                  fields->'moods'). Media without semantic enrichment have no
--                  moods, so they can only match a genre-only request.
--   * media_type-> NULL means "both"; otherwise exactly 'movie' or 'tv'
--   * limit     -> caps the returned pool size
--
-- The pool is deliberately NOT ranked, scored, diversified, personalized, or
-- reduced to final recommendations — later curation milestones do that. This
-- RPC stays provider- and UI-independent and returns the full intersection of
-- matching media for downstream ranking.

begin;

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
  popularity   numeric,
  genres       text[],
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
         m.popularity,
         m.genres,
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
