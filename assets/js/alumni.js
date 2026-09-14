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
 *   { name, chapter, company, title, gradYear, location }
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
      .select('name, chapter, company, title, grad_year, location')
      .then(function (res) {
        if (res.error) { throw res.error; }
        return (res.data || []).map(function (row) {
          return {
            name: row.name,
            chapter: row.chapter,
            company: row.company,
            title: row.title,
            gradYear: row.grad_year,
            location: row.location,
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function setup(root, all) {
    var searchInput = root.querySelector('[data-alumni-search]');
    var chapterSelect = root.querySelector('[data-alumni-chapter]');
    var companySelect = root.querySelector('[data-alumni-company]');
    var tbody = root.querySelector('[data-alumni-body]');
    var resultsCount = root.querySelector('[data-alumni-count]');
    var headers = Array.prototype.slice.call(root.querySelectorAll('[data-sort-key]'));

    var state = { query: '', chapter: 'all', company: 'all', sortKey: 'name', sortDir: 'asc' };

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

    function filtered() {
      var q = state.query.trim().toLowerCase();
      return all.filter(function (a) {
        if (state.chapter !== 'all' && a.chapter !== state.chapter) { return false; }
        if (state.company !== 'all' && a.company !== state.company) { return false; }
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
          '<tr class="empty-row"><td colspan="5">No alumni match your search or filters.</td></tr>';
      } else {
        tbody.innerHTML = rows.map(function (a) {
          return (
            '<tr>' +
              '<td class="col-name">' + escapeHtml(a.name) + '</td>' +
              '<td><span class="chip">' + escapeHtml(a.chapter) + '</span></td>' +
              '<td>' + escapeHtml(a.company) + '</td>' +
              '<td>' + escapeHtml(a.title) + '</td>' +
              '<td>' + escapeHtml(a.gradYear) + '</td>' +
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
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Loading alumni directory&hellip;</td></tr>';

    getAll().then(function (all) {
      setup(root, all);
    }).catch(function (err) {
      tbody.innerHTML =
        '<tr class="empty-row"><td colspan="5">Couldn’t load the directory' +
        (err && err.message ? ': ' + escapeHtml(err.message) : '.') +
        '</td></tr>';
    });
  }

  global.KTPAlumni = { init: init };
}(window));
