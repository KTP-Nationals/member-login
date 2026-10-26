#!/usr/bin/env node
/*
 * Bulk-add KTP members so they can sign in — two modes:
 *
 *   node scripts/invite-members.mjs members.csv
 *     Sends each email a "you've been invited" email right away.
 *
 *   SILENT=1 node scripts/invite-members.mjs members.csv
 *     Creates each account with no email sent at all. Nobody hears
 *     anything until they show up on their own and use the normal
 *     "Send sign-in link" form — which sends the ordinary sign-in email
 *     they'd expect at that point, not an unsolicited one out of nowhere.
 *     Good for a big one-time import (hundreds of rows) where you don't
 *     want everyone emailed at once, or want to control when that happens.
 *
 * Either way, this IS the real allowlist: with "Allow new user signups"
 * turned off in Supabase (Authentication → Providers → Email), only
 * emails that exist as a user — created here, or one at a time via
 * Authentication → Users — will ever get a working sign-in link. Anyone
 * else gets a generic "couldn't send a link" error from the login page.
 *
 * Usage:
 *   SUPABASE_URL=https://your-project-ref.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
 *   node scripts/invite-members.mjs members.csv
 *
 * members.csv: one email per line. A header row (or any non-email line)
 * is skipped automatically.
 *
 * The service role key is an admin credential with full access to your
 * project, bypassing every RLS policy. Get it from Project Settings → API.
 * Never put it in client-side code, never commit it, and only ever run
 * this script from your own machine.
 *
 * Requires Node 18+ (for the built-in fetch()). No npm install needed.
 */

import { readFileSync } from 'node:fs';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const silent = /^(1|true|yes)$/i.test(process.env.SILENT || '');
const csvPath = process.argv[2];

if (!url || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables first.');
  process.exit(1);
}
if (!csvPath) {
  console.error('Usage: node scripts/invite-members.mjs <path-to-emails.csv>');
  process.exit(1);
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lines = readFileSync(csvPath, 'utf8')
  .split(/\r?\n/)
  .map((line) => line.trim().replace(/,.*$/, '')); // tolerate "email,name" CSVs too

const emails = [...new Set(lines.filter((line) => emailPattern.test(line)))];

if (emails.length === 0) {
  console.error('No valid email addresses found in ' + csvPath);
  process.exit(1);
}

console.log(
  (silent ? 'Silently creating ' : 'Inviting ') + emails.length + ' member(s) in ' + url +
  (silent ? ' (no emails will be sent) ...\n' : ' ...\n')
);

let ok = 0;
let failed = 0;

for (const email of emails) {
  // Two different Admin API endpoints:
  //  - /auth/v1/invite        → supabase.auth.admin.inviteUserByEmail(): creates + emails.
  //  - /auth/v1/admin/users   → supabase.auth.admin.createUser(): creates only, silent.
  //    email_confirm: true marks the address as already verified, so the
  //    member can sign in with a normal magic link right away — there's
  //    no separate "confirm your invite" step to get stuck on.
  const endpoint = silent ? '/auth/v1/admin/users' : '/auth/v1/invite';
  const body = silent ? { email, email_confirm: true } : { email };

  const res = await fetch(url + endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
    },
    body: JSON.stringify(body),
  });

  if (res.ok) {
    ok += 1;
    console.log('  ' + (silent ? 'created (silent): ' : 'invited: ') + email);
  } else {
    failed += 1;
    const errBody = await res.text();
    console.log('  FAILED:  ' + email + ' -> ' + res.status + ' ' + errBody);
  }
}

console.log('\nDone. ' + ok + (silent ? ' created' : ' invited') + ', ' + failed + ' failed.');
if (failed > 0) {
  console.log(
    "\nIf every request failed the same way, double-check SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY, " +
    "or fall back to adding members one at a time via Authentication → Users → " +
    (silent ? 'Add user (uncheck “Send email invite”)' : 'Invite user') +
    ' in the dashboard.'
  );
}
