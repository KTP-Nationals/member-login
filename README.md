# KTP Member Login

A navy-and-white member portal for KTP National: members sign in with a
one-time emailed link (no shared password), then land on a **Member
Directory**, with an **Alumni Database**, **Important Links**, and a
self-service **Profile** page alongside it. The backend is
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
- ✅ Real member roster imported into `member_directory` (425-row export,
  cleaned to 424 valid rows)
- ⬜ `member_directory`'s `minor` column and the self-edit RLS policy are
  new — **run `supabase/member_directory_schema.sql` again** (it's
  idempotent, safe to re-run) before Profile page saves will work.

Two more things only you can confirm, since they happen inside the
Supabase dashboard and I can't check them from outside:
- Every current member has been **invited** (Authentication → Users, or
  via `scripts/invite-members.mjs`)
- The static files are hosted somewhere members can actually reach — as of
  this writing they've only been verified on `localhost`

## How it works

- **Sign-in** is a magic link, not a password. A member enters their email,
  Supabase emails them a one-time link, and clicking it signs them in —
  landing on **Member Directory**, the default page.
- **Who's allowed to sign in** is controlled entirely on the Supabase side:
  new signups are off, so a link only ever gets sent to an email you've
  explicitly invited. This is the real access control — nothing
  client-side decides who gets in.
- **Member Directory** (`members.html`) — current members: chapter, major,
  grad date, school email (click to email, or copy with the icon next to
  it), and a LinkedIn link. Search by name, filter by chapter / major /
  grad year, click-to-sort any column, one-click reset.
- **Alumni Database** (`dashboard.html`) — graduated members: chapter,
  major, job, company, grad date. Same search / filter / sort / reset
  pattern as Member Directory.
- **Important Links** (`links.html`) — placeholder page, ready for content.
- **Profile** (`profile.html`) — a member's own editable view of their
  Member Directory row: name, major, minor, LinkedIn, and grad date can be
  changed; chapter and school email are shown but locked (see "How Profile
  finds your row" below). Saves write straight to `member_directory`, so
  the change shows up in the directory immediately — there's no separate
  copy of the data to keep in sync.
- Every table is gated by Postgres Row Level Security — an unauthenticated
  API request gets zero rows back, for real, not just hidden in the UI.
- A left sidebar switches between all four pages; whichever one you're on
  is highlighted.

### How Profile finds — and protects — your row

There's no login/member-directory linking column. Instead, the row you can
edit is whichever `member_directory` row has a `school_email` matching
your signed-in email (case-insensitively) — reliable because accounts are
invite-only by school email already. That matching is enforced by the
database itself via this RLS policy (already in
`supabase/member_directory_schema.sql`):

```sql
create policy "Members can update their own directory row"
on public.member_directory
for update
to authenticated
using (lower(school_email) = lower(auth.jwt() ->> 'email'))
with check (lower(school_email) = lower(auth.jwt() ->> 'email'));
```

That's real security, not a UI restriction — even a request crafted by
hand against the API can only ever update the row matching the signer's
own email. It's also why `school_email` isn't an editable field on the
Profile page: changing it to something else would just be rejected by this
same policy, so the form locks it instead of surprising someone with a
failed save.

## Files

| Path | What it's for |
|---|---|
| `index.html` | Login page — email in, magic link out. |
| `members.html` | Member-only current-member directory (default landing page). |
| `dashboard.html` | Member-only alumni directory. |
| `links.html` | Placeholder resources page — no content yet. |
| `profile.html` | Edit your own Member Directory row. |
| `assets/js/supabase-config.js` | Your project URL + anon key. Already filled in for this deployment. |
| `assets/js/supabase-client.js` | Builds the shared Supabase client from the config above. |
| `assets/js/auth.js` | Sign-in / session / sign-out logic (shared by every page). |
| `assets/js/alumni.js` | Alumni directory search, filter, sort — reads the `alumni` table. |
| `assets/js/members.js` | Member directory search, filter, sort — reads the `member_directory` table. |
| `assets/js/profile.js` | Loads and saves the signed-in member's own `member_directory` row. |
| `assets/css/style.css` | Shared navy/white styling, sidebar layout. |
| `assets/favicon.svg` | Simple navy/gold "K" monogram, used as the site favicon. |
| `supabase/member_directory_schema.sql` | Creates `member_directory` + both RLS policies (view-all, edit-own). |
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
purpose. Safe to re-run — every statement is idempotent.

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
  chapter text,  -- nullable so adding this column later stays a safe migration
  school_email text,
  linkedin text,
  major text,
  minor text,
  grad_date text,  -- free text; a bare year like "2027" sorts fine
  created_at timestamptz not null default now()
);

-- Safe to re-run against a table created before a later column existed:
alter table public.member_directory add column if not exists chapter text;
alter table public.member_directory add column if not exists minor text;
alter table public.member_directory drop column if exists resume_link;

alter table public.member_directory enable row level security;

drop policy if exists "Authenticated members can view member directory" on public.member_directory;
create policy "Authenticated members can view member directory"
on public.member_directory
for select
to authenticated
using (true);

-- Lets a member update ONLY the row whose school_email matches their own
-- sign-in email — see "How Profile finds your row" above.
drop policy if exists "Members can update their own directory row" on public.member_directory;
create policy "Members can update their own directory row"
on public.member_directory
for update
to authenticated
using (lower(school_email) = lower(auth.jwt() ->> 'email'))
with check (lower(school_email) = lower(auth.jwt() ->> 'email'));
```

`alumni` has no insert/update/delete policy for `authenticated` at all —
members can browse but not edit; you edit rows yourself via the SQL Editor
or Table Editor (service role, bypasses RLS). `member_directory` is the
same **except** a member can update their own row via the Profile page, as
described above — everyone else's rows, and every column of their own row
Profile doesn't expose (`chapter`, `school_email`), are still admin-only.

## Redeploying from scratch (disaster recovery / a second chapter's project)

If you ever need to rebuild this in a brand-new Supabase project:

1. **Create a Supabase project** at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → run both `create table` + policy blocks
   from "Database schema" above (or the seed files, for demo data).
3. **Authentication → Providers → Email** → turn **off** "Allow new users
   to sign up." This is what makes sign-in invite-only.
4. **Authentication → URL Configuration** → set Site URL to wherever the
   static site is hosted, and add `.../members.html` and `.../dashboard.html`
   to Redirect URLs (plus the `localhost` equivalents while testing
   locally). Only `members.html` needs to be a redirect target in
   practice (that's where the magic link sends people), but adding both
   costs nothing.
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

Then open `http://localhost:8000/index.html`. Make sure
`http://localhost:8000/members.html` (the magic-link landing page) is in
the Supabase project's Redirect URLs, or a magic link will redirect but
fail to establish a session.

## Updating the roster

Day-to-day edits (one person, a title change) are easiest directly in the
Supabase **Table Editor**: add, edit, or delete rows on `alumni` or
`member_directory`, or import a CSV. No code changes or redeploys needed —
every page reads live from the database. Members can also update their own
`major`, `minor`, `linkedin`, `grad_date`, and name themselves via the
Profile page.

For a full refresh from a new export, the CSV's headers need to match the
target table's columns exactly — Supabase's importer matches by exact
name, so raw headers like "First Name" get rejected.

- **`alumni`**: `first_name`, `last_name`, `full_name`, `chapter`,
  `grad_date`, `major`, `job`, `company`
- **`member_directory`**: `first_name`, `last_name`, `chapter`,
  `school_email`, `linkedin`, `major`, `minor`, `grad_date`

Before importing:

1. Rename the header row to the snake_case names above.
2. Make sure every row has its table's required fields filled in
   (`first_name`, `last_name`, plus `full_name` and `chapter` for
   `alumni`) — those are `not null`, and one blank row fails the whole
   import.
3. Trim stray leading/trailing whitespace in cells if the source
   spreadsheet has any (common after copy-pasting between tools).
4. Normalize any date-ish field (like `member_directory.grad_date`) to one
   consistent format across every chapter before importing — different
   chapters tend to enter this differently ("S27", "Fall 2026", "may
   2028", …), and a mixed format makes sorting/filtering unreliable. Ask
   me to normalize a new export and I'll do the same pass as the ones
   below.

**`alumni`** (355 exported rows → 351 valid): dropped 4 rows for missing
names — one had "Chicago" typed into the First Name cell with no Last
Name, and three had no name at all, just chapter/job/company for incoming
2025–2026 grads.

**`member_directory`** (425 exported rows → 424 valid): the source had a
single combined "Name" column (split into first/last on the first space),
27 rows under a misspelled chapter name (fixed), 1 exact duplicate row
(dropped), 1 malformed email (cleared), a few LinkedIn values that were
bare usernames or, in three cases, someone's name typed into the wrong
column, and 30 Cornell rows missing a last name entirely (later filled in
by hand and merged in). `grad_date` came in 27 different spellings across
chapters (`S27`, `F26`, `Fall 26`, `may 2028`, `December 2028`, …) and was
normalized to a single scheme: `Spring 2027` / `Fall 2027` when a season
was stated, or a bare year when it wasn't.

Fix anything flagged like this in the source spreadsheet and re-add it
whenever you're ready; ask me to prep a cleaned CSV again any time a new
export needs the same treatment.

## Extending this

- **Custom fields**: add columns to the relevant table
  (`alter table public.alumni add column ...` or same for
  `member_directory`), then add them to the `select(...)` and row template
  in `assets/js/alumni.js` or `assets/js/members.js` (and `profile.js` if
  members should be able to edit it themselves).
- **More sidebar sections**: add a `<li><a class="sidebar-nav-item">` entry
  to the `<ul class="sidebar-nav">` in **every** page (`members.html`,
  `dashboard.html`, `links.html`, `profile.html`), so the nav stays
  consistent, plus a corresponding new page.
- **Filling in Important Links**: `links.html` is a placeholder — replace
  its empty-state `<div>` with a `<ul class="links-list">` of
  `<li><a class="row-link" href="..." target="_blank" rel="noopener noreferrer">Title</a></li>`
  entries, or ask me to add specific links.
- **Letting members edit chapter or school email themselves**: currently
  locked on the Profile page on purpose (see "How Profile finds your
  row"). Possible, but needs more thought — e.g. an admin-approval step
  for chapter transfers, since chapter isn't matched against anything at
  sign-in the way email is.
- **Per-chapter admins**: Supabase supports richer RLS policies, e.g.
  restricting write access by a `chapter` claim on the user, if you want
  chapter leads to manage rows beyond their own without full admin access.
