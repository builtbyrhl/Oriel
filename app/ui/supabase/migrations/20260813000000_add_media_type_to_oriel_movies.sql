-- Oriel Media Data Foundation — extend oriel_movies to support both movies
-- and TV series.
--
-- Backwards compatible: the existing rows (all movies) are defaulted to
-- media_type 'movie' and the old tmdb_id-unique constraint is replaced by a
-- composite unique (media_type, tmdb_id) so the same numeric TMDB id can
-- safely exist once per media type while remaining idempotent per upsert.
--
-- The whole migration runs in a single transaction so a failure anywhere
-- rolls everything back (important when executed through a raw SQL editor).

begin;

-- Every row is a movie today; new writes must always carry an explicit type.
alter table public.oriel_movies
  add column if not exists media_type text not null default 'movie';

-- Replace the single-column unique constraint with the media-scoped one.
alter table public.oriel_movies
  drop constraint if exists oriel_movies_tmdb_id_key;

create unique index if not exists oriel_movies_media_type_tmdb_id_key
  on public.oriel_movies (media_type, tmdb_id);

-- Restrict media_type to the two supported kinds.
alter table public.oriel_movies
  drop constraint if exists oriel_movies_media_type_check;

alter table public.oriel_movies
  add constraint oriel_movies_media_type_check
  check (media_type in ('movie', 'tv'));

-- TV-specific columns (null / empty / false for movies).
alter table public.oriel_movies
  add column if not exists number_of_episodes integer,
  add column if not exists number_of_seasons   integer,
  add column if not exists last_air_date       date,
  add column if not exists in_production       boolean not null default false,
  add column if not exists networks            text[]  not null default '{}';

create index if not exists oriel_movies_media_type_idx
  on public.oriel_movies (media_type);

create index if not exists oriel_movies_last_air_date_idx
  on public.oriel_movies (last_air_date desc);

commit;
