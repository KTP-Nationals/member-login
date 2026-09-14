# KTP Member Login

A navy-and-white member portal for KTP National: members sign in with a
one-time emailed link (no shared password), and see a searchable, sortable
alumni directory. The backend is [Supabase](https://supabase.com) — a
hosted Postgres database with an auto-generated REST API and built-in auth,
free to start.

## How it works

- **Sign-in** is a magic link, not a password. A member enters their email,
  Supabase emails them a one-time link, and clicking it signs them in.
- **Who's allowed to sign in** is controlled entirely on the Supabase side:
  new signups are turned off, so a link only ever gets sent to an email
  you've explicitly invited. This is the real access control — nothing
  client-side decides who gets in.
- **The alumni directory** lives in a `alumni` table in Postgres, gated by
  a Row Level Security (RLS) policy that only lets signed-in users read it.
  An unauthenticated request to the API gets zero rows back, for real —
  unlike the earlier static-JSON-file version, there's no client-side data
  to inspect in DevTools.

## Files

| Path | What it's for |
|---|---|
| `index.html` | Login page — email in, magic link out. |
| `dashboard.html` | Member-only alumni directory. |
| `assets/js/supabase-config.js` | **Edit this**: your project URL + anon key. |
| `assets/js/supabase-client.js` | Builds the shared Supabase client from the config above. |
| `assets/js/auth.js` | Sign-in / session / sign-out logic. |
| `assets/js/alumni.js` | Directory search, filter, sort — reads from Supabase. |
| `assets/css/style.css` | Shared navy/white styling. |
| `supabase/schema.sql` | Creates the `alumni` table + RLS policy. Run once. |
| `supabase/seed.sql` | Sample/demo alumni rows. Replace with your real roster. |
| `scripts/invite-members.mjs` | Bulk-invite members from a CSV of emails. |

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), sign up, and create a new
project (free tier is enough for this). Save the database password it
gives you somewhere safe — you likely won't need it day-to-day, but it's
your project's master credential.

### 2. Create the database table

In the Supabase dashboard: **SQL Editor → New query**. Paste in the
contents of `supabase/schema.sql` and run it. Then do the same with
`supabase/seed.sql` (demo data — swap for your real roster whenever
you're ready, e.g. via the Table Editor's CSV import).

### 3. Lock sign-ups to invited members only

**Authentication → Providers → Email** → turn **off** "Allow new users to
sign up." With this off, `signInWithOtp` (the magic-link call) only
succeeds for emails that already exist as a user — i.e. someone you've
invited. Everyone else gets a generic "couldn't send a link" error, and
the login page can't be used to figure out who's on the list.

### 4. Set your site URL and redirect URL

**Authentication → URL Configuration**:
- **Site URL**: wherever you'll host the static site (e.g.
  `https://ktp-yourchapter.vercel.app`).
- **Redirect URLs**: add that same URL + `/dashboard.html`, and while
  testing locally, also `http://localhost:8000/dashboard.html` (or
  whatever port you serve on).

### 5. Copy your project keys into the app

**Project Settings → API**. Copy the **Project URL** and the **anon
public** key into `assets/js/supabase-config.js`:

```js
window.KTP_SUPABASE = {
  url: 'https://your-project-ref.supabase.co',
  anonKey: 'eyJ...',
};
```

The anon key is meant to be public — it ships in client code by design.
Real access control comes from the RLS policy and the signups-off setting
above, not from hiding this key.

### 6. Invite your members

Either:
- **One at a time**: Authentication → Users → **Invite user**, or
- **In bulk**: put one email per line in a `members.csv`, then run:

  ```
  SUPABASE_URL=https://your-project-ref.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  node scripts/invite-members.mjs members.csv
  ```

  The **service role key** (also under Project Settings → API) is a full
  admin credential — never put it in client code or commit it. Only run
  this script from your own machine.

### 7. Host the static site

Supabase hosts your *database and API*; you still need somewhere to host
the plain HTML/CSS/JS files. Easiest options, both free:

- **[Vercel](https://vercel.com)** or **[Netlify](https://netlify.com)** —
  drag-and-drop this folder in their dashboard, or connect this GitHub
  repo for auto-deploys on push. No build step needed.

Once it's live, double check the URL matches what you set as the Site URL
in step 4 (and that `.../dashboard.html` is in the Redirect URLs list).

## Local testing

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html`. Make sure
`http://localhost:8000/dashboard.html` is added to Redirect URLs in
Supabase (step 4) or the magic link will redirect but fail to establish a
session.

## Changing the alumni data day-to-day

Use the Supabase dashboard's **Table Editor** on the `alumni` table —
add, edit, or delete rows directly, or import a CSV. No code changes or
redeploys needed; `dashboard.html` reads live from the database.

## Extending this

- **Custom fields** (LinkedIn URL, headshot, bio): add columns to the
  `alumni` table in `supabase/schema.sql`-style, then add them to the
  `select(...)` in `assets/js/alumni.js` and the row template in the same
  file.
- **Per-chapter admins**: Supabase supports richer RLS policies, e.g.
  restricting write access by a `chapter` claim on the user, if you want
  chapter leads to manage their own rows without full admin access.
