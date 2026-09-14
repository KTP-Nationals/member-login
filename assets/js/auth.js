/*
 * KTP Member Login — auth (Supabase magic-link sign-in)
 *
 * Depends on window.supabaseClient (assets/js/supabase-client.js), which
 * must load first. Access control (who is allowed to sign in at all) is
 * NOT decided here — it's enforced by Supabase itself: signups are turned
 * off, so a magic link only ever gets sent to an email you've invited
 * (Authentication → Users, or scripts/invite-members.mjs). What's on
 * these methods to look at, though, is which alumni rows come back — and
 * that's governed by the Row Level Security policy in supabase/schema.sql.
 */
(function (global) {
  'use strict';

  function client() {
    if (!global.supabaseClient) {
      throw new Error(
        'Supabase is not configured. Edit assets/js/supabase-config.js with your project URL and anon key.'
      );
    }
    return global.supabaseClient;
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  global.KTPAuth = {
    normalizeEmail: normalizeEmail,

    /*
     * Emails a one-time sign-in link to `email`, pointing back at
     * dashboard.html on this same site. Resolves { ok: true } on success,
     * or { ok: false, message } on failure — including when the email
     * isn't on the invited list, so as not to reveal which addresses are.
     */
    sendMagicLink: function (email) {
      var redirectTo = new URL('dashboard.html', global.location.href).toString();
      return client().auth.signInWithOtp({
        email: normalizeEmail(email),
        options: { emailRedirectTo: redirectTo },
      }).then(function (res) {
        if (res.error) {
          return {
            ok: false,
            message: "We couldn't send a sign-in link to that address. " +
              "If you're an active KTP member, contact your chapter's tech chair.",
          };
        }
        return { ok: true };
      });
    },

    /* Resolves the current session, or null if signed out / expired. */
    session: function () {
      return client().auth.getSession().then(function (res) {
        return res.data.session || null;
      });
    },

    signOut: function () {
      return client().auth.signOut();
    },

    /*
     * Gate for member-only pages. Resolves the session if there is one;
     * otherwise redirects to `loginUrl` and resolves null.
     */
    requireSession: function (loginUrl) {
      return client().auth.getSession().then(function (res) {
        var session = res.data.session;
        if (!session) {
          global.location.replace(loginUrl || 'index.html');
          return null;
        }
        return session;
      });
    },
  };
}(window));
