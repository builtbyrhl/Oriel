-- Oriel Enrichment Coverage.
--
-- Reports how much of a media type's catalog still needs AI enrichment, for
-- the backfill job and for operational visibility. One row of counts:
--
--   * total     — catalog rows of this media type
--   * enriched  — rows with a succeeded enrichment job
--   * remaining — rows still needing enrichment (total - enriched)
--
-- Semantics mirror the queue: "enriched" means a succeeded job exists
-- (job-level status, not the semantics table), so it agrees with what
-- oriel_enrichment_queue will no longer return.

begin;

create or replace function public.oriel_enrichment_coverage(
  p_media_type text
) returns table (total bigint, enriched bigint, remaining bigint)
language sql
as $$
  select
    count(m.tmdb_id)::bigint as total,
    count(j.tmdb_id)::bigint as enriched,
    count(m.tmdb_id)::bigint - count(j.tmdb_id)::bigint as remaining
  from public.oriel_movies m
  left join public.oriel_enrichment_jobs j
    on j.media_type = m.media_type
   and j.tmdb_id = m.tmdb_id
   and j.status = 'succeeded'
  where m.media_type = p_media_type;
$$;

commit;
