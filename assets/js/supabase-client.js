/*
 * Creates the shared Supabase client from assets/js/supabase-config.js.
 * Load order matters: the Supabase CDN script, then supabase-config.js,
 * then this file, before auth.js or alumni.js.
 */
(function (global) {
  'use strict';

  var cfg = global.KTP_SUPABASE || {};
  var placeholder = !cfg.url || !cfg.anonKey ||
    cfg.url.indexOf('YOUR-PROJECT-REF') !== -1 ||
    cfg.anonKey.indexOf('YOUR-ANON') !== -1;

  if (placeholder) {
    console.warn(
      '[KTP] Supabase is not configured yet. Edit assets/js/supabase-config.js ' +
      'with your project URL and anon key (Project Settings → API).'
    );
    global.supabaseClient = null;
    return;
  }

  if (typeof global.supabase === 'undefined' || !global.supabase.createClient) {
    console.error('[KTP] Supabase JS library did not load. Check the CDN <script> tag in this page.');
    global.supabaseClient = null;
    return;
  }

  global.supabaseClient = global.supabase.createClient(cfg.url, cfg.anonKey);
}(window));
