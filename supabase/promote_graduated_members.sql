-- Admin catch-all: moves every member_directory row whose grad year has
-- passed into alumni, for members who haven't logged back in since
-- graduating (the automatic move in assets/js/graduation.js only runs
-- when a member visits Member Directory or Profile themselves — this
-- covers everyone else). Run in Supabase: Dashboard → SQL Editor. Safe to
-- run repeatedly, e.g. once a semester — anyone already promoted no
-- longer matches (their member_directory row is gone).
--
-- "Grad year has passed" mirrors the client-side rule: the year is
-- strictly before the current calendar year, taken from the first 4-digit
-- number found in the free-text grad_date column. A row with no
-- recognizable year, or no chapter (required on alumni), is left alone
-- rather than guessed at.
--
-- Uses the service role implicitly (SQL Editor queries run as the
-- database owner, bypassing RLS) — that's expected and required here,
-- since this touches rows that don't belong to whoever's running it.

insert into public.alumni
  (first_name, last_name, full_name, chapter, grad_date, major, job, company, email, personal_email, linkedin)
select
  m.first_name,
  m.last_name,
  trim(m.first_name || ' ' || m.last_name),
  m.chapter,
  m.grad_date,
  m.major,
  m.position,
  m.company,
  m.school_email,
  m.personal_email,
  m.linkedin
from public.member_directory m
where m.chapter is not null
  and m.grad_date ~ '[0-9]{4}'
  and (substring(m.grad_date from '[0-9]{4}'))::int < extract(year from now())::int
  and not exists (
    select 1 from public.alumni a
    where lower(a.email) = lower(m.school_email)
  );

delete from public.member_directory m
where m.chapter is not null
  and m.grad_date ~ '[0-9]{4}'
  and (substring(m.grad_date from '[0-9]{4}'))::int < extract(year from now())::int
  and exists (
    select 1 from public.alumni a
    where lower(a.email) = lower(m.school_email)
  );
