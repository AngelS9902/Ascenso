-- =========================================================
-- Hábitos · esquema de sincronización (Supabase)
-- Pegar completo en: Supabase → SQL Editor → New query → Run
-- =========================================================

-- Marca de tiempo del servidor (cursor de sincronización)
create or replace function public.touch_server_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_at := clock_timestamp();
  return new;
end;
$$;

-- ---------- Hábitos ----------
create table if not exists public.habits (
  user_id    uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  id         text    not null,
  data       jsonb   not null default '{}'::jsonb,
  deleted    boolean not null default false,
  updated_at bigint  not null default 0,          -- reloj del cliente (ms)
  server_at  timestamptz not null default clock_timestamp(),
  primary key (user_id, id)
);

-- ---------- Registros por día ----------
create table if not exists public.entries (
  user_id    uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id   text    not null,
  day        date    not null,
  value      numeric not null default 0,           -- 0 = sin registro
  updated_at bigint  not null default 0,
  server_at  timestamptz not null default clock_timestamp(),
  primary key (user_id, habit_id, day)
);

-- ---------- Ajustes ----------
create table if not exists public.settings (
  user_id    uuid  primary key default auth.uid() references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at bigint not null default 0,
  server_at  timestamptz not null default clock_timestamp()
);

create index if not exists habits_user_server_at   on public.habits   (user_id, server_at);
create index if not exists entries_user_server_at  on public.entries  (user_id, server_at);

drop trigger if exists habits_touch   on public.habits;
drop trigger if exists entries_touch  on public.entries;
drop trigger if exists settings_touch on public.settings;
create trigger habits_touch   before insert or update on public.habits   for each row execute function public.touch_server_at();
create trigger entries_touch  before insert or update on public.entries  for each row execute function public.touch_server_at();
create trigger settings_touch before insert or update on public.settings for each row execute function public.touch_server_at();

-- ---------- Seguridad: cada usuario solo ve lo suyo ----------
alter table public.habits   enable row level security;
alter table public.entries  enable row level security;
alter table public.settings enable row level security;

drop policy if exists "own habits"   on public.habits;
drop policy if exists "own entries"  on public.entries;
drop policy if exists "own settings" on public.settings;
create policy "own habits"   on public.habits   for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own entries"  on public.entries  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own settings" on public.settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Permisos explícitos (el proyecto no expone tablas automáticamente)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.habits, public.entries, public.settings to authenticated;
revoke all on public.habits, public.entries, public.settings from anon;
