/*
 * KTP Profile — view and edit your own Member Directory entry
 *
 * "Your own row" is found by matching the signed-in email (from the
 * magic-link session) against `member_directory.school_email`,
 * case-insensitively. There's no separate user_id column — since accounts
 * are invite-only by school email already (see auth.js / the Supabase
 * setup in README.md), the email itself reliably links a signed-in
 * session to a directory row.
 *
 * Saving here updates the same `member_directory` table the directory
 * pages read from, so changes show up there immediately — there's no
 * separate "profile" data store to keep in sync.
 *
 * The actual security is enforced by the "Members can update their own
 * directory row" RLS policy in supabase/member_directory_schema.sql, not
 * by anything in this file — this file just can't succeed in updating a
 * row that policy doesn't allow.
 */
(function (global) {
  'use strict';

  var TABLE = 'member_directory';
  var SELECT_COLS = 'id, first_name, last_name, chapter, school_email, linkedin, major, minor, grad_date';

  function client() {
    if (!global.supabaseClient) {
      throw new Error('Supabase is not configured. Edit assets/js/supabase-config.js with your project URL and anon key.');
    }
    return global.supabaseClient;
  }

  function safeHttpUrl(url) {
    var u = String(url || '').trim();
    return (!u || /^https?:\/\//i.test(u)) ? u : '';
  }

  function init(root, session) {
    var email = session && session.user && session.user.email;

    var loadingState = root.getElementById('loadingState');
    var notFoundState = root.getElementById('notFoundState');
    var form = root.getElementById('profileForm');
    var alertError = root.getElementById('alertError');
    var alertErrorText = root.getElementById('alertErrorText');
    var alertSuccess = root.getElementById('alertSuccess');
    var saveBtn = root.getElementById('saveBtn');

    var firstNameInput = root.getElementById('firstName');
    var lastNameInput = root.getElementById('lastName');
    var chapterInput = root.getElementById('chapter');
    var schoolEmailInput = root.getElementById('schoolEmail');
    var majorInput = root.getElementById('major');
    var minorInput = root.getElementById('minor');
    var linkedinInput = root.getElementById('linkedin');
    var gradDateInput = root.getElementById('gradDate');

    var profileId = null;

    function hideAlerts() {
      alertError.classList.remove('is-visible');
      alertSuccess.classList.remove('is-visible');
    }

    function showError(message) {
      alertSuccess.classList.remove('is-visible');
      alertErrorText.textContent = message;
      alertError.classList.add('is-visible');
    }

    function showSuccess() {
      alertError.classList.remove('is-visible');
      alertSuccess.classList.add('is-visible');
    }

    function setSaving(isSaving) {
      saveBtn.disabled = isSaving;
      saveBtn.classList.toggle('is-loading', isSaving);
    }

    function populate(row) {
      profileId = row.id;
      firstNameInput.value = row.first_name || '';
      lastNameInput.value = row.last_name || '';
      chapterInput.value = row.chapter || '';
      schoolEmailInput.value = row.school_email || '';
      majorInput.value = row.major || '';
      minorInput.value = row.minor || '';
      linkedinInput.value = row.linkedin || '';
      gradDateInput.value = row.grad_date || '';
    }

    if (!email) {
      loadingState.hidden = true;
      notFoundState.hidden = false;
      return;
    }

    client()
      .from(TABLE)
      .select(SELECT_COLS)
      .ilike('school_email', email)
      .maybeSingle()
      .then(function (res) {
        loadingState.hidden = true;

        if (res.error) {
          showError('Couldn’t load your profile: ' + res.error.message);
          notFoundState.hidden = false;
          return;
        }

        if (!res.data) {
          notFoundState.hidden = false;
          return;
        }

        populate(res.data);
        form.hidden = false;
      })
      .catch(function (err) {
        loadingState.hidden = true;
        notFoundState.hidden = false;
        showError('Couldn’t load your profile: ' + (err && err.message ? err.message : 'unknown error'));
      });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideAlerts();

      var firstName = firstNameInput.value.trim();
      var lastName = lastNameInput.value.trim();
      if (!firstName || !lastName) {
        showError('First and last name can’t be empty.');
        return;
      }

      var linkedinRaw = linkedinInput.value.trim();
      if (linkedinRaw && !safeHttpUrl(linkedinRaw)) {
        showError('LinkedIn should be a full link starting with https://');
        return;
      }

      setSaving(true);

      client()
        .from(TABLE)
        .update({
          first_name: firstName,
          last_name: lastName,
          major: majorInput.value.trim(),
          minor: minorInput.value.trim(),
          linkedin: linkedinRaw,
          grad_date: gradDateInput.value.trim(),
        })
        .eq('id', profileId)
        .then(function (res) {
          setSaving(false);
          if (res.error) {
            showError('Couldn’t save: ' + res.error.message);
            return;
          }
          showSuccess();
        })
        .catch(function (err) {
          setSaving(false);
          showError('Couldn’t save: ' + (err && err.message ? err.message : 'unknown error'));
        });
    });
  }

  global.KTPProfile = { init: init };
}(window));
