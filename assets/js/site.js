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

// Format "2026-03" → "March"
function formatMonthName(yyyymm) {
  const [year, month] = yyyymm.split('-');
  const date = new Date(year, parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long' });
}

// Format "2026-03-01" → "Mar 1"
function formatShortDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Get current year as string
function getCurrentYear() {
  return String(new Date().getFullYear());
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

// Render entries grouped by month into a container element
function renderYearByMonth(entries, containerEl) {
  const byMonth = {};
  entries.forEach(e => {
    const key = e.date ? e.date.slice(0, 7) : 'unknown';
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(e);
  });

  Object.keys(byMonth).sort().reverse().forEach(key => {
    const monthEntries = byMonth[key].slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const group = document.createElement('div');
    group.className = 'month-group';

    const label = document.createElement('h3');
    label.className = 'month-group-label';
    label.textContent = formatMonthName(key);

    const grid = document.createElement('div');
    grid.className = 'entry-grid';

    group.appendChild(label);
    group.appendChild(grid);
    containerEl.appendChild(group);
    renderGrid(monthEntries, grid);
  });
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

    const currentYear = getCurrentYear();

    // Separate entries into buckets
    const pinned      = entries.filter(e => e.pinned);
    const currentYearEntries = entries.filter(e => e.date && e.date.startsWith(currentYear));

    // Older years = anything before current year, grouped by year
    const olderYears = {};
    entries.forEach(e => {
      const year = e.date ? e.date.slice(0, 4) : null;
      if (!year || year === currentYear) return;
      if (!olderYears[year]) olderYears[year] = [];
      olderYears[year].push(e);
    });

    // ── Pinned section ──
    if (pinned.length > 0) {
      document.getElementById('pinned-section').classList.remove('hidden');
      renderGrid(pinned, document.getElementById('pinned-grid'));
    }

    // ── Current year ──
    const currentLabel = document.getElementById('current-year-label');
    currentLabel.textContent = currentYear;
    const currentYearSection = document.getElementById('current-year-section');
    if (currentYearEntries.length > 0) {
      renderYearByMonth(currentYearEntries, currentYearSection);
    } else {
      currentLabel.textContent += ' — nothing yet';
    }

    // ── Older years footer nav ──
    const nav = document.getElementById('year-nav');
    const olderYearKeys = Object.keys(olderYears).sort().reverse();
    olderYearKeys.forEach(year => {
      const a = document.createElement('a');
      a.href = `#year-${year}`;
      a.textContent = year;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        showOlderYear(year, olderYears[year]);
      });
      nav.appendChild(a);
    });

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

// ── Show an older year inline when its nav link is clicked ───────────────────
function showOlderYear(year, entries) {
  // Remove any previously expanded older year section
  const existing = document.getElementById('older-year-expanded');
  if (existing) existing.remove();

  const section = document.createElement('section');
  section.id = 'older-year-expanded';

  const label = document.createElement('h2');
  label.className = 'section-label';
  label.textContent = year;

  section.appendChild(label);

  // Append inside main so it inherits the max-width/padding container
  document.querySelector('.site-main').appendChild(section);
  renderYearByMonth(entries, section);
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
