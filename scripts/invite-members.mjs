#!/usr/bin/env node
/*
 * Bulk-invite KTP members so they can sign in.
 *
 * This IS the real allowlist: with "Allow new user signups" turned off in
 * Supabase (Authentication → Providers → Email), only emails invited here
 * — or one at a time via Authentication → Users → Invite user — will ever
 * receive a working sign-in link. Anyone else gets a generic "couldn't
 * send a link" error from the login page.
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

console.log('Inviting ' + emails.length + ' member(s) to ' + url + ' ...\n');

let ok = 0;
let failed = 0;

for (const email of emails) {
  // Endpoint used by supabase.auth.admin.inviteUserByEmail() under the hood.
  const res = await fetch(url + '/auth/v1/invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
    },
    body: JSON.stringify({ email }),
  });

  if (res.ok) {
    ok += 1;
    console.log('  invited: ' + email);
  } else {
    failed += 1;
    const body = await res.text();
    console.log('  FAILED:  ' + email + ' -> ' + res.status + ' ' + body);
  }
}

console.log('\nDone. ' + ok + ' invited, ' + failed + ' failed.');
if (failed > 0) {
  console.log(
    "\nIf every request failed the same way, double-check SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY, " +
    "or fall back to inviting one at a time via Authentication → Users → Invite user in the dashboard."
  );
}
