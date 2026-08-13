-- Oriel Movie Data Foundation
-- Movies table storing normalized TMDB movie metadata used by the
-- Oriel ingestion layer and future curation engine.
--
-- TMDB ID is the external identity. The unique constraint on tmdb_id
-- guarantees a movie record can never be duplicated for the same TMDB movie,
-- making the ingestion upsert idempotent.
--
-- The whole migration runs in a single transaction so a failure anywhere
-- rolls everything back (important when executed through a raw SQL editor).

begin;

create table if not exists public.oriel_movies (
  id                 bigint generated always as identity primary key,
  tmdb_id            bigint       not null unique,
  title              text         not null,
  original_title     text,
  overview           text,
  poster_path        text,
  backdrop_path      text,
  release_date       date,
  vote_average       numeric(4,1),
  vote_count         integer,
  popularity         numeric(10,3),
  genre_ids          bigint[]     not null default '{}',
  genres             text[]       not null default '{}',
  original_language  varchar(10),
  adult              boolean      not null default false,
  video              boolean      not null default false,
  runtime            integer,
  origin_countries   text[]       not null default '{}',
  status             varchar(30),
  created_at         timestamptz  not null default now(),
  updated_at         timestamptz  not null default now(),
  last_sync_at       timestamptz  not null default now()
);

-- Indexes justified by the documented future query patterns of the
-- Oriel curation engine:
--   * movies by genre            -> GIN on genres
--   * movies by release period   -> release_date
--   * movies by rating           -> vote_average
--   * movies by vote count       -> vote_count
--   * movies by popularity       -> popularity
--   * recently synchronized      -> last_sync_at

create index if not exists oriel_movies_genres_idx
  on public.oriel_movies using gin (genre_ids);

create index if not exists oriel_movies_release_date_idx
  on public.oriel_movies (release_date desc);

create index if not exists oriel_movies_vote_average_idx
  on public.oriel_movies (vote_average desc);

create index if not exists oriel_movies_vote_count_idx
  on public.oriel_movies (vote_count desc);

create index if not exists oriel_movies_popularity_idx
  on public.oriel_movies (popularity desc);

create index if not exists oriel_movies_last_sync_at_idx
  on public.oriel_movies (last_sync_at desc);

-- Keep updated_at in sync on row changes. Recording updated_at is the
-- responsibility of the ingestion layer, but this trigger provides a
-- safety net so manual edits can never leave a stale timestamp.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists oriel_movies_set_updated_at on public.oriel_movies;

create trigger oriel_movies_set_updated_at
  before update on public.oriel_movies
  for each row
  execute function public.set_updated_at();

-- Row-level security is intentionally permissive-by-default for this
-- foundation table: no user/authentication system exists yet. The service
-- role client writes via the server. Enabling RLS with no policies would
-- silently block the anon/client read path needed by the future feed.
alter table public.oriel_movies enable row level security;

create policy "oriel_movies_select_public"
  on public.oriel_movies
  for select
  to anon, authenticated
  using (true);

commit;