// site.js — all behavior for the main page
//
// What this file does:
//   1. Loads manifest.json (the list of all entries)
//   2. Renders entry cards grouped by month
//   3. Powers the random entry button
//   4. Builds the older-months navigation in the footer
//   5. Handles the light/dark theme toggle

// ── Site title hover ──────────────────────────────────────────────────────────
(function() {
  const el = document.querySelector('.site-title');
  if (!el) return;
  el.innerHTML = 'D<span class="title-insert">avid\'s T</span>umblr';
})();

// ── Theme toggle ──────────────────────────────────────────────────────────────
// On page load, read the saved preference (or default to "auto" which follows the OS)
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'auto';
  document.documentElement.setAttribute('data-theme', saved);
})();

document.getElementById('theme-toggle').addEventListener('click', () => {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');

  // Cycle: auto → dark → light → auto
  const next = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// Format "2026-03" → "March 2026"
function formatMonthLabel(yyyymm) {
  const [year, month] = yyyymm.split('-');
  const date = new Date(year, parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Format "2026-03-01" → "Mar 1"
function formatShortDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Get YYYY-MM string for today and last month
function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getLastMonthKey() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Build one entry card element
function buildCard(entry) {
  const a = document.createElement('a');
  a.className = 'entry-card';
  a.href = `${entry.path}/`;

  const type = document.createElement('div');
  type.className = 'card-type';
  type.textContent = entry.type || 'entry';

  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = entry.title;

  // Optional pinned badge shown next to title
  if (entry.pinned) {
    const badge = document.createElement('span');
    badge.className = 'card-pinned-badge';
    badge.textContent = 'pinned';
    title.appendChild(badge);
  }

  const date = document.createElement('div');
  date.className = 'card-date';
  date.textContent = formatShortDate(entry.date);

  a.appendChild(type);
  a.appendChild(title);

  // Optional description
  if (entry.description) {
    const desc = document.createElement('div');
    desc.className = 'card-description';
    desc.textContent = entry.description;
    a.appendChild(desc);
  }

  a.appendChild(date);
  return a;
}

// Render a list of entries into a grid element
function renderGrid(entries, gridEl) {
  gridEl.innerHTML = '';
  entries.forEach(entry => gridEl.appendChild(buildCard(entry)));
}

// ── Main: load manifest and render ───────────────────────────────────────────
fetch('manifest.json')
  .then(res => {
    if (!res.ok) throw new Error('manifest.json not found');
    return res.json();
  })
  .then(manifest => {
    const entries = manifest.entries || [];

    if (entries.length === 0) {
      document.getElementById('empty-state').classList.remove('hidden');
      return;
    }

    const currentKey = getCurrentMonthKey();
    const lastKey    = getLastMonthKey();

    // Separate entries into buckets
    const pinned      = entries.filter(e => e.pinned);
    const currentMonth = entries.filter(e => e.date && e.date.startsWith(currentKey));
    const lastMonth    = entries.filter(e => e.date && e.date.startsWith(lastKey));

    // Older = anything before last month, grouped by YYYY-MM
    const olderMonths = {};
    entries.forEach(e => {
      const key = e.date ? e.date.slice(0, 7) : null;
      if (!key || key === currentKey || key === lastKey) return;
      if (!olderMonths[key]) olderMonths[key] = [];
      olderMonths[key].push(e);
    });

    // ── Pinned section ──
    if (pinned.length > 0) {
      document.getElementById('pinned-section').classList.remove('hidden');
      renderGrid(pinned, document.getElementById('pinned-grid'));
    }

    // ── Current month ──
    const currentLabel = document.getElementById('current-month-label');
    currentLabel.textContent = formatMonthLabel(currentKey);
    if (currentMonth.length > 0) {
      renderGrid(currentMonth, document.getElementById('current-month-grid'));
    } else {
      currentLabel.textContent += ' — nothing yet';
    }

    // ── Last month ──
    if (lastMonth.length > 0) {
      document.getElementById('last-month-section').classList.remove('hidden');
      document.getElementById('last-month-label').textContent = formatMonthLabel(lastKey);
      renderGrid(lastMonth, document.getElementById('last-month-grid'));
    }

    // ── Older months footer nav ──
    const nav = document.getElementById('month-nav');
    const olderKeys = Object.keys(olderMonths).sort().reverse();
    if (olderKeys.length > 0) {
      olderKeys.forEach(key => {
        const a = document.createElement('a');
        a.href = `#month-${key}`;
        a.textContent = formatMonthLabel(key);

        // Clicking a nav link: show a full month section below the footer
        a.addEventListener('click', (e) => {
          e.preventDefault();
          showOlderMonth(key, olderMonths[key]);
        });

        nav.appendChild(a);
      });
    }

    // ── Random button ──
    document.getElementById('random-btn').addEventListener('click', () => {
      const pick = entries[Math.floor(Math.random() * entries.length)];
      window.location.href = `${pick.path}/`;
    });
  })
  .catch(err => {
    console.error('Could not load manifest:', err);
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('empty-state').textContent =
      'Could not load entries. Run `npm run build` first.';
  });

// ── Show an older month inline when its nav link is clicked ──────────────────
function showOlderMonth(key, entries) {
  // Remove any previously expanded older month section
  const existing = document.getElementById('older-month-expanded');
  if (existing) existing.remove();

  const section = document.createElement('section');
  section.id = 'older-month-expanded';

  const label = document.createElement('h2');
  label.className = 'section-label';
  label.textContent = formatMonthLabel(key);

  const grid = document.createElement('div');
  grid.className = 'entry-grid';

  section.appendChild(label);
  section.appendChild(grid);

  // Append inside main so it inherits the max-width/padding container
  document.querySelector('.site-main').appendChild(section);
  renderGrid(entries, grid);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
