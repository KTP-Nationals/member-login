/*
 * KTP Graduation — auto-promote a member from Member Directory to Alumni
 * Database once their graduation year has passed.
 *
 * Checked on load of members.html and profile.html — the two pages a
 * signed-in member is likely to land on. This only ever acts on the
 * SIGNED-IN member's own row, matched by school_email against their
 * sign-in email (the same pattern as everywhere else in this app), so
 * it's safe to call from any page without touching anyone else's data —
 * and it's not just client-side politeness: the actual database RLS
 * policies (supabase/add_career_fields_and_promotion.sql) only let a
 * member insert an alumni row or delete a member_directory row where the
 * email matches their own JWT, so a hand-crafted request couldn't move
 * (or delete) someone else's row either.
 *
 * "Grad year has passed" means the year in grad_date is strictly less
 * than the current calendar year — someone graduating "Spring 2027" isn't
 * moved until 2028 arrives. grad_date is free text, so this uses the
 * first 4-digit number found in it (same rule the directory filters use).
 *
 * There's no server always running (this is a static site), so this only
 * ever fires when the graduating member visits the site themselves.
 * supabase/promote_graduated_members.sql is the admin-run catch-all for
 * anyone who doesn't log back in after graduating.
 */
(function (global) {
  'use strict';

  var MEMBER_COLS =
    'id, first_name, last_name, chapter, school_email, personal_email, linkedin, major, minor, company, position, grad_date';

  function client() {
    if (!global.supabaseClient) {
      throw new Error('Supabase is not configured. Edit assets/js/supabase-config.js with your project URL and anon key.');
    }
    return global.supabaseClient;
  }

  function extractYear(gradDate) {
    var m = String(gradDate || '').match(/\d{4}/);
    return m ? parseInt(m[0], 10) : null;
  }

  function checkAlreadyAlumni(email) {
    return client()
      .from('alumni')
      .select('id, full_name, chapter')
      .ilike('email', email)
      .maybeSingle()
      .then(function (res) {
        if (res.error) { throw res.error; }
        return res.data
          ? { status: 'already-alumni', row: res.data }
          : { status: 'not-found' };
      });
  }

  function removeFromMemberDirectory(row) {
    return client()
      .from('member_directory')
      .delete()
      .eq('id', row.id)
      .then(function (res) {
        if (res.error) { throw res.error; }
      });
  }

  function promote(row) {
    var fullName = ((row.first_name || '') + ' ' + (row.last_name || '')).trim();

    // Check first in case a previous attempt inserted the alumni row but
    // was interrupted before deleting the member_directory row (e.g. a
    // closed tab) — avoids creating a duplicate on retry.
    return client()
      .from('alumni')
      .select('id')
      .ilike('email', row.school_email)
      .maybeSingle()
      .then(function (checkRes) {
        if (checkRes.error) { throw checkRes.error; }
        if (checkRes.data) {
          return removeFromMemberDirectory(row);
        }

        return client()
          .from('alumni')
          .insert({
            first_name: row.first_name,
            last_name: row.last_name,
            full_name: fullName,
            chapter: row.chapter,
            grad_date: row.grad_date,
            major: row.major,
            job: row.position,
            company: row.company,
            email: row.school_email,
            personal_email: row.personal_email,
            linkedin: row.linkedin,
          })
          .then(function (insertRes) {
            if (insertRes.error) { throw insertRes.error; }
            return removeFromMemberDirectory(row);
          });
      })
      .then(function () {
        return { status: 'promoted', row: row };
      });
  }

  /*
   * Resolves one of:
   *   { status: 'active', row }          — still a current member
   *   { status: 'promoted', row }        — was just moved to alumni
   *   { status: 'already-alumni', row }  — no member_directory row, found in alumni instead
   *   { status: 'not-found' }            — no row anywhere matching this email
   */
  function checkAndPromote(email) {
    return client()
      .from('member_directory')
      .select(MEMBER_COLS)
      .ilike('school_email', email)
      .maybeSingle()
      .then(function (res) {
        if (res.error) { throw res.error; }

        if (!res.data) {
          return checkAlreadyAlumni(email);
        }

        var row = res.data;
        var gradYear = extractYear(row.grad_date);
        var currentYear = new Date().getFullYear();

        // Can't promote without a year to compare, or without a chapter
        // (alumni requires one) — leave them as an active member; an
        // admin fixing the missing field will let this succeed next time.
        if (gradYear === null || gradYear >= currentYear || !row.chapter) {
          return { status: 'active', row: row };
        }

        return promote(row);
      });
  }

  global.KTPGraduation = { checkAndPromote: checkAndPromote };
}(window));
