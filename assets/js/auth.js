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

  var URL_ERROR_STORAGE_KEY = 'ktp.urlError.v1';

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

  /*
   * A failed email link (expired, already used, wrong redirect URL not
   * allow-listed in Supabase, etc.) comes back as
   * "#error=...&error_code=...&error_description=..." in the URL rather
   * than throwing — nothing was reading this before, so people just
   * bounced back to a blank login page with no explanation. This pulls a
   * readable message out of it, if there is one.
   */
  function extractUrlError() {
    var hash = global.location.hash || '';
    if (hash.indexOf('error') === -1) { return null; }
    var params = new URLSearchParams(hash.replace(/^#/, ''));
    if (!params.has('error') && !params.has('error_description')) { return null; }
    var description = params.get('error_description');
    return description
      ? description.replace(/\+/g, ' ')
      : 'Your sign-in link is invalid or has expired.';
  }

  global.KTPAuth = {
    normalizeEmail: normalizeEmail,

    /*
     * Emails a one-time sign-in link to `email`, pointing back at
     * members.html (the default landing page) on this same site. Resolves
     * { ok: true } on success, or { ok: false, message } on failure —
     * including when the email isn't on the invited list, so as not to
     * reveal which addresses are.
     */
    sendMagicLink: function (email) {
      var redirectTo = new URL('members.html', global.location.href).toString();
      return client().auth.signInWithOtp({
        email: normalizeEmail(email),
        options: { emailRedirectTo: redirectTo },
      }).then(function (res) {
        if (res.error) {
          return {
            ok: false,
            message: "We couldn't send a sign-in link to that address. " +
              "If you're an active KTP member, make sure your chapter has submitted their roster or contact kappathetapinational@gmail.com.",
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
     * otherwise redirects to `loginUrl` and resolves null. If the URL
     * carries a failed-link error (see extractUrlError), it's stashed so
     * the login page can show it after the redirect — otherwise it would
     * just be lost.
     */
    requireSession: function (loginUrl) {
      var urlError = extractUrlError();
      if (urlError) {
        try { global.sessionStorage.setItem(URL_ERROR_STORAGE_KEY, urlError); } catch (e) { /* ignore */ }
      }
      return client().auth.getSession().then(function (res) {
        var session = res.data.session;
        if (!session) {
          global.location.replace(loginUrl || 'index.html');
          return null;
        }
        return session;
      });
    },

    /*
     * For the login page itself: returns a readable error message if the
     * current page load is the result of a failed email link, checking
     * both this URL directly (the link redirected straight here) and
     * sessionStorage (a gated page caught it via requireSession and
     * bounced here) — clears whichever it found, so refreshing doesn't
     * keep re-showing a stale error. Returns null if there's nothing to
     * report.
     */
    consumeUrlError: function () {
      var fromUrl = extractUrlError();
      if (fromUrl && global.history && global.history.replaceState) {
        global.history.replaceState(null, '', global.location.pathname + global.location.search);
      }

      var fromStorage = null;
      try {
        fromStorage = global.sessionStorage.getItem(URL_ERROR_STORAGE_KEY);
        global.sessionStorage.removeItem(URL_ERROR_STORAGE_KEY);
      } catch (e) { /* ignore */ }

      return fromUrl || fromStorage || null;
    },
  };
}(window));
