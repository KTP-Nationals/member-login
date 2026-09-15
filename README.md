# KTP Member Login

A navy-and-white member portal for KTP National: members sign in with a
one-time emailed link (no shared password), and browse two directories —
**Alumni Database** and **Member Directory**. The backend is
[Supabase](https://supabase.com) — a hosted Postgres database with an
auto-generated REST API and built-in auth.

## Status

- ✅ Supabase project connected (`assets/js/supabase-config.js` has real
  project keys, not placeholders)
- ✅ `alumni` table created with Row Level Security active — confirmed live:
  an unauthenticated request to the API returns `[]`, not a missing-table
  error
- ✅ Public sign-ups disabled — confirmed live: requesting a magic link for
  an uninvited address returns `signup_disabled`
- ✅ Real chapter roster imported into `alumni` (355-row national export,
  cleaned to 351 valid rows — see "Updating the roster" below)
- ⬜ `member_directory` table is new and **not yet created in Supabase** —
  run `supabase/member_directory_schema.sql` (and optionally
  `member_directory_seed.sql` for demo data) in the SQL Editor before the
  Member Directory tab will show anything but an empty state. I don't have
  write access to your database (only the public anon key), so this step
  has to happen on your end.

Two more things only you can confirm, since they happen inside the
Supabase dashboard and I can't check them from outside:
- Every current member has been **invited** (Authentication → Users, or
  via `scripts/invite-members.mjs`)
- The static files are hosted somewhere members can actually reach — as of
  this writing they've only been verified on `localhost`

## How it works

- **Sign-in** is a magic link, not a password. A member enters their email,
  Supabase emails them a one-time link, and clicking it signs them in.
- **Who's allowed to sign in** is controlled entirely on the Supabase side:
  new signups are off, so a link only ever gets sent to an email you've
  explicitly invited. This is the real access control — nothing
  client-side decides who gets in.
- **Alumni Database** (`dashboard.html`) — graduated members, with chapter,
  major, job, company, and grad date. Search by name, filter by chapter /
  company / grad year, click-to-sort any column, one-click reset.
- **Member Directory** (`members.html`) — current members, with major, grad
  date, school email (click to email), and LinkedIn/resume links (open in
  a new tab). Search by name, filter by major / grad year, same sort and
  reset pattern as Alumni Database.
- Both read from Postgres tables gated by RLS — an unauthenticated API
  request gets zero rows back, for real, not just hidden in the UI.
- A left sidebar switches between the two directories; whichever page
  you're on is highlighted.

## Files

| Path | What it's for |
|---|---|
| `index.html` | Login page — email in, magic link out. |
| `dashboard.html` | Member-only alumni directory. |
| `members.html` | Member-only current-member directory. |
| `assets/js/supabase-config.js` | Your project URL + anon key. Already filled in for this deployment. |
| `assets/js/supabase-client.js` | Builds the shared Supabase client from the config above. |
| `assets/js/auth.js` | Sign-in / session / sign-out logic (shared by both directories). |
| `assets/js/alumni.js` | Alumni directory search, filter, sort — reads the `alumni` table. |
| `assets/js/members.js` | Member directory search, filter, sort — reads the `member_directory` table. |
| `assets/css/style.css` | Shared navy/white styling, sidebar layout. |
| `supabase/member_directory_schema.sql` | Creates the `member_directory` table + RLS policy. **Not yet run** — see Status. |
| `supabase/member_directory_seed.sql` | 20 fictional demo rows for `member_directory`. |
| `scripts/invite-members.mjs` | Bulk-invite members from a CSV of emails. |
| `.gitignore` | Blocks `*.csv` so real roster exports never get committed. |

Note: `supabase/schema.sql` and `seed.sql` (the `alumni` table's setup
scripts) were removed from this repo once that table was live in
production — the table itself is unaffected, but if you ever need to
recreate it, use the "Database schema" section below rather than looking
for those files.

## Database schema

The exact SQL for both tables, kept here since standalone files in
`supabase/` have a habit of being cleaned up once they've served their
purpose. Safe to re-run — `create table if not exists` won't touch an
existing table.

**`alumni`** (graduated members):

```sql
create extension if not exists pgcrypto;

create table if not exists public.alumni (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  full_name text not null,
  chapter text not null,
  grad_date text,  -- free text; use "YYYY-MM" or a bare year so it sorts correctly
  major text,
  job text,
  company text,
  created_at timestamptz not null default now()
);

alter table public.alumni enable row level security;

create policy "Authenticated members can view alumni"
on public.alumni
for select
to authenticated
using (true);
```

**`member_directory`** (current members) — also in
`supabase/member_directory_schema.sql`:

```sql
create extension if not exists pgcrypto;

create table if not exists public.member_directory (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  school_email text,
  linkedin text,
  resume_link text,
  major text,
  grad_date text,  -- free text; a bare year like "2027" sorts fine
  created_at timestamptz not null default now()
);

alter table public.member_directory enable row level security;

create policy "Authenticated members can view member directory"
on public.member_directory
for select
to authenticated
using (true);
```

Both policies deliberately have no insert/update/delete for
`authenticated` — members can browse but not edit. Edit rows yourself via
the SQL Editor or Table Editor (service role, bypasses RLS).

## Redeploying from scratch (disaster recovery / a second chapter's project)

If you ever need to rebuild this in a brand-new Supabase project:

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → run both `create table` + policy blocks
   from "Database schema" above (or the seed files, for demo data).
3. **Authentication → Providers → Email** → turn **off** "Allow new users
   to sign up." This is what makes sign-in invite-only.
4. **Authentication → URL Configuration** → set Site URL to wherever the
   static site is hosted, and add `.../dashboard.html` and
   `.../members.html` to Redirect URLs (plus the `localhost` equivalents
   while testing locally).
5. **Project Settings → API** → copy the Project URL and anon public key
   into `assets/js/supabase-config.js`. (Tip: the project ref is also
   readable straight out of the anon key, since a JWT's payload is just
   base64 — `https://<ref>.supabase.co` where `<ref>` is the `"ref"` field
   in the decoded middle segment.)
6. **Invite members** — one at a time via Authentication → Users → Invite
   user, or in bulk:
   ```
   SUPABASE_URL=https://your-project-ref.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
   node scripts/invite-members.mjs members.csv
   ```
   The service role key is a full admin credential — never in client code,
   never committed, only run from your own machine.
7. **Host the static files** — Supabase hosts the database and API; the
   plain HTML/CSS/JS still needs somewhere to live. Vercel or Netlify (free,
   drag-and-drop or connect the repo) both work with zero build step.

## Local testing

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`. Make sure both
`http://localhost:8000/dashboard.html` and
`http://localhost:8000/members.html` are in the Supabase project's
Redirect URLs, or a magic link will redirect but fail to establish a
session.

## Updating the roster

Day-to-day edits (one person, a title change) are easiest directly in the
Supabase **Table Editor**: add, edit, or delete rows on `alumni` or
`member_directory`, or import a CSV. No code changes or redeploys needed —
both pages read live from the database.

For a full refresh from a new export, the CSV's headers need to match the
target table's columns exactly — Supabase's importer matches by exact
name, so raw headers like "First Name" get rejected.

- **`alumni`**: `first_name`, `last_name`, `full_name`, `chapter`,
  `grad_date`, `major`, `job`, `company`
- **`member_directory`**: `first_name`, `last_name`, `school_email`,
  `linkedin`, `resume_link`, `major`, `grad_date`

Before importing:

1. Rename the header row to the snake_case names above.
2. Make sure every row has its table's required fields filled in
   (`first_name`, `last_name`, plus `full_name` and `chapter` for
   `alumni`) — those are `not null`, and one blank row fails the whole
   import.
3. Trim stray leading/trailing whitespace in cells if the source
   spreadsheet has any (common after copy-pasting between tools).

The most recent `alumni` import (355 exported rows → 351 valid) dropped 4
rows for missing names — one had "Chicago" typed into the First Name cell
with no Last Name, and three had no name at all, just chapter/job/company
for incoming 2025–2026 grads. Fix those in the source spreadsheet and
re-add them whenever you're ready; ask me to prep a cleaned CSV again any
time a new export needs the same treatment.

## Extending this

- **Custom fields**: add columns to the relevant table
  (`alter table public.alumni add column ...` or same for
  `member_directory`), then add them to the `select(...)` and row template
  in `assets/js/alumni.js` or `assets/js/members.js`.
- **More sidebar sections**: the sidebar now has two nav items. Add more
  `<li><a class="sidebar-nav-item">` entries (in both `dashboard.html` and
  `members.html`, so the nav stays consistent) plus a corresponding page as
  the portal grows.
- **Let members self-edit their own directory row**: would need a
  `user_id uuid references auth.users` column on `member_directory`, plus
  an update policy scoped to `auth.uid() = user_id`. Not set up yet —
  ask if you want it.
- **Per-chapter admins**: Supabase supports richer RLS policies, e.g.
  restricting write access by a `chapter` claim on the user, if you want
  chapter leads to manage their own rows without full admin access.
