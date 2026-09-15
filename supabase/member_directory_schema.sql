-- KTP Member Directory — database schema
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--
-- This is a separate table from `alumni` (current members, not graduates —
-- no company/job history, but LinkedIn/resume for networking instead).

create extension if not exists pgcrypto; -- for gen_random_uuid(), if not already enabled

create table if not exists public.member_directory (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  school_email text,
  linkedin text,
  resume_link text,
  major text,
  -- Free text on purpose, to match whatever your roster export uses. For it
  -- to SORT correctly, use a consistent format that also sorts
  -- chronologically as plain text, e.g. a bare year "2027".
  grad_date text,
  created_at timestamptz not null default now()
);

-- Row Level Security: an unauthenticated request to this table returns
-- zero rows. Same pattern as the `alumni` table.
alter table public.member_directory enable row level security;

-- Only signed-in members can read the directory. No insert/update/delete
-- policy for "authenticated" — members can browse but not edit their own
-- or anyone else's entry. Edit the roster via the SQL Editor or Table
-- Editor in the dashboard (service role, bypasses RLS).
--
-- If you'd rather let members self-edit their own row later, that would
-- need a way to match a row to the signed-in user (e.g. a `user_id uuid
-- references auth.users` column) plus an update policy scoped to
-- `auth.uid() = user_id` — ask if you want that added.
create policy "Authenticated members can view member directory"
on public.member_directory
for select
to authenticated
using (true);
