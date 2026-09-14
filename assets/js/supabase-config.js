/*
 * KTP Member Login — Supabase connection info
 * --------------------------------------------
 * Get these from: Supabase Dashboard → Project Settings → API
 *
 * The anon key is meant to be public — Supabase is designed for this key to
 * ship in client code. Real access control comes from Row Level Security
 * policies (see supabase/schema.sql), not from hiding this key. Never put
 * the *service role* key here or anywhere in client-side code.
 */

window.KTP_SUPABASE = {
  url: 'https://ervpowyvbyqgxhbtwjdj.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVydnBvd3l2YnlxZ3hoYnR3amRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MjUxMzMsImV4cCI6MjEwNTAwMTEzM30.fz5aPhAD9RHekNFWODAzveyz4FDzhs2xP6Nl_xR0qLg',
};
