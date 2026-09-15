/*
 * KTP Member Directory — search, filter, sort
 *
 * Data comes from Supabase (window.supabaseClient), reading the
 * `member_directory` table defined in supabase/member_directory_schema.sql.
 * Row Level Security there means an unauthenticated request simply gets
 * zero rows back — this file doesn't need to do its own access checks.
 *
 * THE SEAM: getAll() below is the only place that touches the data source.
 * Point it anywhere else and everything below it — search, sort, filter,
 * rendering — keeps working, as long as records keep this shape:
 *   { name, major, gradDate, email, linkedin, resume }
 *
 * This mirrors assets/js/alumni.js closely on purpose; the two directories
 * share a lot of behavior but different fields, so they're kept as
 * separate small files rather than one file with branching everywhere.
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
      .from('member_directory')
      .select('first_name, last_name, school_email, linkedin, resume_link, major, grad_date')
      .then(function (res) {
        if (res.error) { throw res.error; }
        return (res.data || []).map(function (row) {
          var name = ((row.first_name || '') + ' ' + (row.last_name || '')).trim();
          return {
            name: name,
            email: row.school_email,
            linkedin: row.linkedin,
            resume: row.resume_link,
            major: row.major,
            gradDate: row.grad_date,
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

  /* gradDate is free text — pull the 4-digit year out of it so the filter
     works no matter the exact format. */
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

  function emailCell(email) {
    var e = String(email || '').trim();
    if (!e) { return '<span class="row-muted">&mdash;</span>'; }
    return '<a class="row-link" href="mailto:' + escapeHtml(e) + '">' + escapeHtml(e) + '</a>';
  }

  function setup(root, all) {
    var searchInput = root.querySelector('[data-members-search]');
    var majorSelect = root.querySelector('[data-members-major]');
    var gradYearSelect = root.querySelector('[data-members-gradyear]');
    var resetBtn = root.querySelector('[data-members-reset]');
    var tbody = root.querySelector('[data-members-body]');
    var resultsCount = root.querySelector('[data-members-count]');
    var headers = Array.prototype.slice.call(root.querySelectorAll('[data-sort-key]'));

    var state = { query: '', major: 'all', gradYear: 'all', sortKey: 'name', sortDir: 'asc' };

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

    fillSelect(majorSelect, uniqueSorted(all, 'major'), 'All majors');
    fillSelect(gradYearSelect, uniqueYears(all), 'All grad years');

    function filtered() {
      var q = state.query.trim().toLowerCase();
      return all.filter(function (m) {
        if (state.major !== 'all' && m.major !== state.major) { return false; }
        if (state.gradYear !== 'all' && extractYear(m.gradDate) !== state.gradYear) { return false; }
        if (q && m.name.toLowerCase().indexOf(q) === -1) { return false; }
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
          '<tr class="empty-row"><td colspan="6">No members match your search or filters.</td></tr>';
      } else {
        tbody.innerHTML = rows.map(function (m) {
          return (
            '<tr>' +
              '<td class="col-name">' + escapeHtml(m.name) + '</td>' +
              '<td>' + escapeHtml(m.major || '') + '</td>' +
              '<td>' + escapeHtml(m.gradDate || '') + '</td>' +
              '<td>' + emailCell(m.email) + '</td>' +
              '<td>' + linkCell(m.linkedin, 'View') + '</td>' +
              '<td>' + linkCell(m.resume, 'View') + '</td>' +
            '</tr>'
          );
        }).join('');
      }

      resultsCount.textContent = rows.length + ' of ' + all.length + ' members';

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

    majorSelect.addEventListener('change', function () {
      state.major = majorSelect.value;
      render();
    });

    gradYearSelect.addEventListener('change', function () {
      state.gradYear = gradYearSelect.value;
      render();
    });

    resetBtn.addEventListener('click', function () {
      state.query = '';
      state.major = 'all';
      state.gradYear = 'all';
      searchInput.value = '';
      majorSelect.value = 'all';
      gradYearSelect.value = 'all';
      render();
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
    var tbody = root.querySelector('[data-members-body]');
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Loading member directory&hellip;</td></tr>';

    getAll().then(function (all) {
      setup(root, all);
    }).catch(function (err) {
      tbody.innerHTML =
        '<tr class="empty-row"><td colspan="6">Couldn’t load the directory' +
        (err && err.message ? ': ' + escapeHtml(err.message) : '.') +
        '</td></tr>';
    });
  }

  global.KTPMembers = { init: init };
}(window));
