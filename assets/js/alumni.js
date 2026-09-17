/*
 * KTP Alumni Directory — search, filter, sort
 *
 * Data comes from Supabase (window.supabaseClient), reading the `alumni`
 * table defined in supabase/schema.sql. Row Level Security there means an
 * unauthenticated request simply gets zero rows back — this file doesn't
 * need to do its own access checks.
 *
 * THE SEAM: getAll() below is the only place that touches the data source.
 * Point it anywhere else and everything below it — search, sort, filter,
 * rendering — keeps working, as long as records keep this shape:
 *   { name, chapter, major, job, company, gradDate, email, linkedin }
 */
(function (global) {
  'use strict';

  function getAll() {
    if (!global.supabaseClient) {
      return Promise.reject(new Error(
        'Supabase is not configured. Edit assets/js/supabase-config.js with your project URL and anon key.'
      ));
    }
    return global.supabaseClient
      .from('alumni')
      .select('full_name, chapter, major, job, company, grad_date, email, personal_email, linkedin')
      .then(function (res) {
        if (res.error) { throw res.error; }
        return (res.data || []).map(function (row) {
          return {
            name: row.full_name,
            chapter: row.chapter,
            major: row.major,
            job: row.job,
            company: row.company,
            gradDate: row.grad_date,
            // Prefer personal_email for display — a school address often
            // stops working a while after graduation. `email` (the
            // school/sign-in address) is still what auto-promotion
            // anchors on internally; this is purely cosmetic.
            email: row.personal_email || row.email,
            linkedin: row.linkedin,
          };
        });
      });
  }

  function uniqueSorted(list, key) {
    var seen = {};
    var out = [];
    list.forEach(function (item) {
      var v = item[key];
      if (v && !seen[v]) { seen[v] = true; out.push(v); }
    });
    out.sort(function (a, b) { return String(a).localeCompare(String(b)); });
    return out;
  }

  /* gradDate is free text (whatever the roster export used, e.g. "2024" or
     "2019-05") — pull the 4-digit year out of it so the filter works no
     matter the exact format. */
  function extractYear(gradDate) {
    var m = String(gradDate || '').match(/\d{4}/);
    return m ? m[0] : null;
  }

  function uniqueYears(list) {
    var seen = {};
    list.forEach(function (item) {
      var y = extractYear(item.gradDate);
      if (y) { seen[y] = true; }
    });
    return Object.keys(seen).sort(function (a, b) { return b.localeCompare(a); }); // newest first
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Only allow http(s) links through to an href, so a stray "javascript:"
     or empty value in the data can't do anything unexpected. */
  function safeHttpUrl(url) {
    var u = String(url || '').trim();
    return /^https?:\/\//i.test(u) ? u : '';
  }

  function linkCell(url, label) {
    var safe = safeHttpUrl(url);
    if (!safe) { return '<span class="row-muted">&mdash;</span>'; }
    return '<a class="row-link" href="' + escapeHtml(safe) + '" target="_blank" rel="noopener noreferrer">' +
      escapeHtml(label) + ' ↗</a>';
  }

  var COPY_ICON =
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>' +
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

  function emailCell(email) {
    var e = String(email || '').trim();
    if (!e) { return '<span class="row-muted">&mdash;</span>'; }
    return (
      '<span class="email-cell">' +
        '<a class="row-link" href="mailto:' + escapeHtml(e) + '">' + escapeHtml(e) + '</a>' +
        '<button type="button" class="copy-btn" data-copy-email="' + escapeHtml(e) + '" ' +
          'title="Copy email" aria-label="Copy email address">' + COPY_ICON + '</button>' +
      '</span>'
    );
  }

  /* Clipboard write needs a secure context (https, or localhost while
     testing) — falls back to the classic textarea+execCommand trick if
     navigator.clipboard isn't available. Resolves true/false; never
     rejects, so callers don't need a .catch(). */
  function copyToClipboard(text) {
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      return global.navigator.clipboard.writeText(text)
        .then(function () { return true; })
        .catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function setup(root, all) {
    var searchInput = root.querySelector('[data-alumni-search]');
    var chapterSelect = root.querySelector('[data-alumni-chapter]');
    var companySelect = root.querySelector('[data-alumni-company]');
    var gradYearSelect = root.querySelector('[data-alumni-gradyear]');
    var resetBtn = root.querySelector('[data-alumni-reset]');
    var tbody = root.querySelector('[data-alumni-body]');
    var resultsCount = root.querySelector('[data-alumni-count]');
    var headers = Array.prototype.slice.call(root.querySelectorAll('[data-sort-key]'));

    var state = { query: '', chapter: 'all', company: 'all', gradYear: 'all', sortKey: 'name', sortDir: 'asc' };

    function fillSelect(select, values, allLabel) {
      var frag = document.createDocumentFragment();
      var allOpt = document.createElement('option');
      allOpt.value = 'all';
      allOpt.textContent = allLabel;
      frag.appendChild(allOpt);
      values.forEach(function (v) {
        var opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        frag.appendChild(opt);
      });
      select.innerHTML = '';
      select.appendChild(frag);
    }

    fillSelect(chapterSelect, uniqueSorted(all, 'chapter'), 'All chapters');
    fillSelect(companySelect, uniqueSorted(all, 'company'), 'All companies');
    fillSelect(gradYearSelect, uniqueYears(all), 'All grad years');

    function filtered() {
      var q = state.query.trim().toLowerCase();
      return all.filter(function (a) {
        if (state.chapter !== 'all' && a.chapter !== state.chapter) { return false; }
        if (state.company !== 'all' && a.company !== state.company) { return false; }
        if (state.gradYear !== 'all' && extractYear(a.gradDate) !== state.gradYear) { return false; }
        if (q && a.name.toLowerCase().indexOf(q) === -1) { return false; }
        return true;
      });
    }

    function sorted(list) {
      var key = state.sortKey;
      var dir = state.sortDir === 'asc' ? 1 : -1;
      return list.slice().sort(function (a, b) {
        var av = a[key], bv = b[key];
        if (typeof av === 'number' && typeof bv === 'number') { return (av - bv) * dir; }
        return String(av).localeCompare(String(bv)) * dir;
      });
    }

    function render() {
      var rows = sorted(filtered());

      if (rows.length === 0) {
        tbody.innerHTML =
          '<tr class="empty-row"><td colspan="8">No alumni match your search or filters.</td></tr>';
      } else {
        tbody.innerHTML = rows.map(function (a) {
          return (
            '<tr>' +
              '<td class="col-name">' + escapeHtml(a.name) + '</td>' +
              '<td><span class="chip">' + escapeHtml(a.chapter) + '</span></td>' +
              '<td>' + escapeHtml(a.major || '') + '</td>' +
              '<td>' + escapeHtml(a.job || '') + '</td>' +
              '<td>' + escapeHtml(a.company || '') + '</td>' +
              '<td>' + escapeHtml(a.gradDate || '') + '</td>' +
              '<td>' + emailCell(a.email) + '</td>' +
              '<td>' + linkCell(a.linkedin, 'View') + '</td>' +
            '</tr>'
          );
        }).join('');
      }

      resultsCount.textContent = rows.length + ' of ' + all.length + ' alumni';

      headers.forEach(function (th) {
        var key = th.getAttribute('data-sort-key');
        th.classList.toggle('is-sorted', key === state.sortKey);
        th.setAttribute('aria-sort',
          key !== state.sortKey ? 'none' : (state.sortDir === 'asc' ? 'ascending' : 'descending'));
      });
    }

    searchInput.addEventListener('input', function () {
      state.query = searchInput.value;
      render();
    });

    chapterSelect.addEventListener('change', function () {
      state.chapter = chapterSelect.value;
      render();
    });

    companySelect.addEventListener('change', function () {
      state.company = companySelect.value;
      render();
    });

    gradYearSelect.addEventListener('change', function () {
      state.gradYear = gradYearSelect.value;
      render();
    });

    resetBtn.addEventListener('click', function () {
      state.query = '';
      state.chapter = 'all';
      state.company = 'all';
      state.gradYear = 'all';
      searchInput.value = '';
      chapterSelect.value = 'all';
      companySelect.value = 'all';
      gradYearSelect.value = 'all';
      render();
    });

    /* Event delegation for the per-row copy buttons: render() rewrites
       tbody's innerHTML on every change, so listeners bound to individual
       buttons would be lost each time. One listener on tbody survives that. */
    tbody.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('[data-copy-email]');
      if (!btn || btn.disabled) { return; }

      var email = btn.getAttribute('data-copy-email');
      copyToClipboard(email).then(function (ok) {
        var original = btn.innerHTML;
        btn.innerHTML = ok ? '&#10003;' : '&#10007;';
        btn.classList.toggle('is-copied', ok);
        btn.disabled = true;
        setTimeout(function () {
          btn.innerHTML = original;
          btn.classList.remove('is-copied');
          btn.disabled = false;
        }, 1200);
      });
    });

    headers.forEach(function (th) {
      var key = th.getAttribute('data-sort-key');

      function activate() {
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortKey = key;
          state.sortDir = 'asc';
        }
        render();
      }

      th.addEventListener('click', activate);
      th.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });
    });

    render();
  }

  function init(root) {
    var tbody = root.querySelector('[data-alumni-body]');
    tbody.innerHTML = '<tr class="empty-row"><td colspan="8">Loading alumni directory&hellip;</td></tr>';

    getAll().then(function (all) {
      setup(root, all);
    }).catch(function (err) {
      tbody.innerHTML =
        '<tr class="empty-row"><td colspan="8">Couldn’t load the directory' +
        (err && err.message ? ': ' + escapeHtml(err.message) : '.') +
        '</td></tr>';
    });
  }

  global.KTPAlumni = { init: init };
}(window));
