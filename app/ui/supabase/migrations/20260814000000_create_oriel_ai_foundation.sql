-- Oriel AI Enrichment Foundation.
--
-- Two tables, both intentionally decoupled from public.oriel_movies:
--
--   * oriel_media_semantics — the validated structured semantic output of an
--     AI enrichment job, stored as a JSONB envelope (fields) plus a schema
--     `version` and provenance (provider/model). Future AI fields extend the
--     JSONB envelope with a new version — no DDL on the movies table, no
--     redesign of the media schema. The unique (media_type, tmdb_id) index
--     keeps enrichment idempotent per media item.
--
--   * oriel_enrichment_jobs — job lifecycle state for retries. One row per
--     media item; status tracks pending/processing/succeeded/failed and
--     attempt_count bounds how many times a failed job is re-run. A media
--     item with no succeeded job and attempts remaining is re-queued.
--
-- Failure safety: enrichment writes NEVER touch oriel_movies, so a failed or
-- missing AI result can never make a movie unusable to the read path.
--
-- The whole migration runs in a single transaction so a failure anywhere
-- rolls everything back.

begin;

-- ---------------------------------------------------------------------------
-- Semantic enrichment results
-- ---------------------------------------------------------------------------

create table if not exists public.oriel_media_semantics (
  id          bigint generated always as identity primary key,
  media_type  text         not null,
  tmdb_id     bigint       not null,
  version     integer      not null default 1,
  fields      jsonb        not null,
  provider    text         not null,
  model       text         not null,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create unique index if not exists oriel_media_semantics_media_key
  on public.oriel_media_semantics (media_type, tmdb_id);

create index if not exists oriel_media_semantics_media_type_idx
  on public.oriel_media_semantics (media_type);

alter table public.oriel_media_semantics
  drop constraint if exists oriel_media_semantics_media_type_check;

alter table public.oriel_media_semantics
  add constraint oriel_media_semantics_media_type_check
  check (media_type in ('movie', 'tv'));

-- ---------------------------------------------------------------------------
-- Enrichment job lifecycle
-- ---------------------------------------------------------------------------

create table if not exists public.oriel_enrichment_jobs (
  id             bigint generated always as identity primary key,
  media_type     text         not null,
  tmdb_id        bigint       not null,
  status         text         not null default 'pending',
  attempt_count  integer      not null default 0,
  max_attempts   integer      not null default 3,
  last_error     text,
  last_run_at    timestamptz,
  next_run_at    timestamptz,
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now()
);

create unique index if not exists oriel_enrichment_jobs_media_key
  on public.oriel_enrichment_jobs (media_type, tmdb_id);

create index if not exists oriel_enrichment_jobs_status_idx
  on public.oriel_enrichment_jobs (status);

create index if not exists oriel_enrichment_jobs_queue_idx
  on public.oriel_enrichment_jobs (media_type, status, updated_at);

alter table public.oriel_enrichment_jobs
  drop constraint if exists oriel_enrichment_jobs_media_type_check;

alter table public.oriel_enrichment_jobs
  add constraint oriel_enrichment_jobs_media_type_check
  check (media_type in ('movie', 'tv'));

alter table public.oriel_enrichment_jobs
  drop constraint if exists oriel_enrichment_jobs_status_check;

alter table public.oriel_enrichment_jobs
  add constraint oriel_enrichment_jobs_status_check
  check (status in ('pending', 'processing', 'succeeded', 'failed'));

-- ---------------------------------------------------------------------------
-- Job primitives (atomically claim / finish / queue)
-- ---------------------------------------------------------------------------

-- Atomically claims the enrichment job for a media item: creates it on first
-- touch and increments the attempt counter on retries. Returns proceed=false
-- when the job is already succeeded or has exhausted its attempts.
--
-- Note: row existence is tested via v_job.media_type (a NOT NULL column), not
-- `v_job IS NULL`/`v_job IS NOT NULL` — for PL/pgSQL rowtype variables those
-- are indeterminate (both false) whenever the row mixes NULL and non-NULL
-- columns (last_error/last_run_at/next_run_at are typically NULL), which would
-- wrongly re-arm succeeded jobs into the retry branch.
create or replace function public.oriel_claim_enrichment(
  p_media_type   text,
  p_tmdb_id      bigint,
  p_max_attempts integer default 3
) returns table (proceed boolean, reason text, attempt integer)
language plpgsql
as $$
declare
  v_job public.oriel_enrichment_jobs%rowtype;
begin
  select *
    into v_job
  from public.oriel_enrichment_jobs
  where media_type = p_media_type and tmdb_id = p_tmdb_id
  for update;

  if v_job.media_type is not null and v_job.status = 'succeeded' then
    return query select false, 'already_succeeded', v_job.attempt_count;
    return;
  end if;

  if v_job.media_type is not null
     and v_job.status in ('failed', 'processing')
     and v_job.attempt_count >= v_job.max_attempts then
    return query select false, 'attempts_exhausted', v_job.attempt_count;
    return;
  end if;

  if v_job.media_type is null then
    insert into public.oriel_enrichment_jobs
      (media_type, tmdb_id, status, attempt_count, max_attempts, last_run_at)
    values
      (p_media_type, p_tmdb_id, 'processing', 1, p_max_attempts, now())
    on conflict (media_type, tmdb_id) do nothing;

    return query select true, 'ok', 1;
    return;
  end if;

  update public.oriel_enrichment_jobs
     set status         = 'processing',
         attempt_count  = attempt_count + 1,
         max_attempts   = p_max_attempts,
         last_run_at    = now(),
         next_run_at    = null,
         updated_at     = now()
   where media_type = p_media_type and tmdb_id = p_tmdb_id;

  return query select true, 'ok', v_job.attempt_count + 1;
end;
$$;

-- Records the terminal outcome of a job. Failed jobs get a simple backoff
-- before they can re-enter the queue.
create or replace function public.oriel_finish_enrichment(
  p_media_type text,
  p_tmdb_id    bigint,
  p_status     text,
  p_error      text default null
) returns void
language plpgsql
as $$
begin
  update public.oriel_enrichment_jobs
     set status     = p_status,
         last_error = p_error,
         next_run_at = case
           when p_status = 'failed' then now() + interval '5 minutes'
           else null
         end,
         updated_at = now()
   where media_type = p_media_type and tmdb_id = p_tmdb_id;
end;
$$;

-- Media items still needing enrichment: never-enriched, or with a job that is
-- not succeeded and still has attempts remaining (respecting backoff).
create or replace function public.oriel_enrichment_queue(
  p_media_type text,
  p_limit      integer
) returns table (media_type text, tmdb_id bigint)
language sql
as $$
  select m.media_type, m.tmdb_id
    from public.oriel_movies m
    left join public.oriel_enrichment_jobs j
      on j.media_type = m.media_type and j.tmdb_id = m.tmdb_id
   where m.media_type = p_media_type
     and (
       j.media_type is null
       or (
         j.status <> 'succeeded'
         and j.attempt_count < j.max_attempts
         and (j.next_run_at is null or j.next_run_at <= now())
       )
     )
   order by (j.updated_at is null) desc, coalesce(j.updated_at, m.updated_at) asc
   limit p_limit;
$$;

-- ---------------------------------------------------------------------------
-- Access control
-- ---------------------------------------------------------------------------

-- Semantic output is meant to be read by the public feed later; jobs are
-- operational state and stay private to the service role.
alter table public.oriel_media_semantics enable row level security;
alter table public.oriel_enrichment_jobs enable row level security;

create policy "oriel_media_semantics_select_public"
  on public.oriel_media_semantics
  for select
  to anon, authenticated
  using (true);

commit;
