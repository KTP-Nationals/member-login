-- KTP Alumni Directory — database schema
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create extension if not exists pgcrypto; -- for gen_random_uuid()

create table if not exists public.alumni (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  chapter text not null,
  company text not null,
  title text not null,
  grad_year integer not null,
  location text,
  created_at timestamptz not null default now()
);

-- Row Level Security: this is what makes the directory actually private,
-- unlike the earlier static-JSON-file version. With RLS on and no policy
-- for the "anon" role, an unauthenticated request returns zero rows.
alter table public.alumni enable row level security;

-- Only signed-in members (i.e. someone who completed a magic-link sign-in)
-- can read the directory. There is deliberately no insert/update/delete
-- policy for "authenticated" — members can browse but not edit. You edit
-- the roster yourself via the SQL Editor or Table Editor in the dashboard,
-- both of which use the service role and bypass RLS.
create policy "Authenticated members can view alumni"
on public.alumni
for select
to authenticated
using (true);
