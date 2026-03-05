// collection.js — powers all collection pages (movies, books, theater, etc.)
//
// How it works:
//   1. Each collection page has a <script id="collection-config"> JSON block
//      that tells this script what type to filter for and what sort options to show.
//   2. This script fetches manifest.json, filters entries by type,
//      and renders type-specific cards into #collection-grid.
//   3. Sort buttons (by date or rating) let you reorder entries.
//   4. The random button picks from THIS collection only.
//   5. Theme toggle works the same as on the main page.

// ── Site title hover ──────────────────────────────────────────────────────────
(function() {
  const el = document.querySelector('.site-title');
  if (!el) return;
  el.innerHTML = 'D<span class="title-insert">avid\'s T</span>umblr';
})();

// ── Theme init (same logic as site.js) ───────────────────────────────────────
(function initTheme() {
  const saved = localStorage.getItem('theme') || 'auto';
  document.documentElement.setAttribute('data-theme', saved);
})();

document.getElementById('theme-toggle').addEventListener('click', () => {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ── Read the collection config from the page ──────────────────────────────────
//
// Each collection page has a block like:
//   <script type="application/json" id="collection-config">
//   { "type": "movie", "title": "Movies", "sortOptions": ["date","rating"], "defaultSort": "date" }
//   </script>
//
const config = JSON.parse(
  document.getElementById('collection-config').textContent
);

// ── Star rating renderer ──────────────────────────────────────────────────────
//
// Takes a number 0–5 (halves supported, e.g. 4.5) and returns an HTML string
// showing filled, half, and empty star characters.
//
// Half stars use a CSS ::before trick (see site.css .star-half) to show only
// the left half of a filled star — no icon libraries needed.
//
function renderStars(rating) {
  const clamped = Math.min(5, Math.max(0, rating));
  const rounded = Math.round(clamped * 2) / 2; // round to nearest 0.5

  let html = '<span class="star-rating" aria-label="' + rounded + ' out of 5 stars">';

  for (let i = 1; i <= 5; i++) {
    if (rounded >= i) {
      html += '<span class="star star-full" aria-hidden="true">★</span>';
    } else if (rounded >= i - 0.5) {
      html += '<span class="star star-half" aria-hidden="true">★</span>';
    } else {
      html += '<span class="star star-empty" aria-hidden="true">☆</span>';
    }
  }

  html += '</span>';
  return html;
}

// ── Date formatter ────────────────────────────────────────────────────────────
function formatStampDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const mon = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return mon + ' ' + day + ' ' + year;
}

function formatShortDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Base card builder ─────────────────────────────────────────────────────────
//
// Builds the parts every card shares: title, description, date.
// No type badge — on a collection page the type is already obvious.
// Returns an <a> element. Type-specific builders call this then add more rows.
//
function buildBaseCard(entry) {
  const a = document.createElement('a');
  a.className = 'entry-card';
  a.href = entry.path + '/';

  const titleEl = document.createElement('div');
  titleEl.className = 'card-title';
  titleEl.textContent = entry.title;
  a.appendChild(titleEl);

  if (entry.description) {
    const descEl = document.createElement('div');
    descEl.className = 'card-description';
    descEl.textContent = entry.description;
    a.appendChild(descEl);
  }

  const dateEl = document.createElement('div');
  dateEl.className = 'card-date';
  dateEl.textContent = formatShortDate(entry.date);
  a.appendChild(dateEl);

  return a;
}

// ── Append metadata row ───────────────────────────────────────────────────────
//
// Inserts a star rating and/or a "director · year · where" style row
// between the description and date on the card.
//
// metaItems — array of strings, shown as "item1 · item2 · item3"
// rating    — number or null (pass null if the type doesn't use ratings)
//
function appendMetaRow(card, metaItems, rating) {
  const dateEl = card.querySelector('.card-date');

  // Stars go first (above the text meta row)
  if (rating != null) {
    const starsEl = document.createElement('div');
    starsEl.className = 'card-rating';
    starsEl.innerHTML = renderStars(rating);
    card.insertBefore(starsEl, dateEl);
  }

  // Meta text (director, author, venue, etc.)
  const filtered = metaItems.filter(Boolean); // remove any undefined/empty values
  if (filtered.length > 0) {
    const metaEl = document.createElement('div');
    metaEl.className = 'card-meta-row';
    metaEl.textContent = filtered.join(' · ');
    card.insertBefore(metaEl, dateEl);
  }
}

// ── Poster card builder (Letterboxd-style, used when config.layout = "poster") ──
//
// Shows a portrait poster image (or a placeholder), then title, stars, and
// director/year below. Add a "poster" field to the entry metadata with either
// a URL or a base64 data URI to show a real poster image.
//
function buildPosterCard(entry) {
  const a = document.createElement('a');
  a.className = 'poster-card';
  a.href = entry.path + '/';

  // Image / placeholder
  const imageDiv = document.createElement('div');
  imageDiv.className = 'poster-image';

  if (entry.poster) {
    const img = document.createElement('img');
    img.src = entry.poster;
    img.alt = entry.title;
    img.loading = 'lazy';
    imageDiv.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'poster-placeholder';
    ph.textContent = entry.title;
    imageDiv.appendChild(ph);
  }

  // Info below the image
  const info = document.createElement('div');
  info.className = 'poster-info';

  // "Title (Year)"
  const titleEl = document.createElement('div');
  titleEl.className = 'poster-title';
  titleEl.textContent = entry.year ? entry.title + ' (' + entry.year + ')' : entry.title;
  info.appendChild(titleEl);

  // Star rating
  if (entry.rating != null) {
    const ratingEl = document.createElement('div');
    ratingEl.className = 'poster-rating';
    ratingEl.innerHTML = renderStars(entry.rating);
    info.appendChild(ratingEl);
  }

  // When I saw it
  if (entry.date) {
    const dateEl = document.createElement('div');
    dateEl.className = 'poster-meta';
    dateEl.textContent = formatShortDate(entry.date);
    info.appendChild(dateEl);
  }

  a.appendChild(imageDiv);
  a.appendChild(info);
  return a;
}

// ── Type-specific card builders ───────────────────────────────────────────────
//
// One function per entry type. Each calls buildBaseCard() then appendMetaRow()
// with the fields relevant to that type.
//
// Adding a new type? Add a key here matching the "type" field in the entry's metadata.
//
const cardBuilders = {

  movie(entry) {
    // Use poster layout when the page config requests it
    if (config.layout === 'poster') return buildPosterCard(entry);
    const card = buildBaseCard(entry);
    appendMetaRow(
      card,
      [entry.director, entry.year, entry.where],
      entry.rating ?? null
    );
    return card;
  },

  book(entry) {
    if (config.layout === 'poster') return buildPosterCard(entry);
    const card = buildBaseCard(entry);
    appendMetaRow(
      card,
      [entry.author, entry.year, entry.genre],
      entry.rating ?? null
    );
    return card;
  },

  theater(entry) {
    const card = buildBaseCard(entry);
    appendMetaRow(
      card,
      [entry.playwright, entry.venue],
      entry.rating ?? null
    );
    return card;
  },

  meal(entry) {
    const card = buildBaseCard(entry);
    appendMetaRow(
      card,
      [entry.restaurant, entry.cuisine],
      entry.rating ?? null
    );
    return card;
  },

  outfit(entry) {
    const card = buildBaseCard(entry);
    appendMetaRow(
      card,
      [entry.occasion],
      null
    );
    return card;
  },

  quote(entry) {
    const card = buildBaseCard(entry);
    appendMetaRow(
      card,
      [entry.attribution, entry.source],
      null
    );
    return card;
  },

  note(entry) {
    return buildBaseCard(entry);
  },

  travel(entry) {
    const card = buildBaseCard(entry);
    appendMetaRow(
      card,
      [entry.location, entry.country],
      null // travel doesn't use a star rating
    );
    return card;
  },

  shelf(entry) {
    const card = buildBaseCard(entry);
    appendMetaRow(
      card,
      [entry.brand],
      null // shelf doesn't use a star rating
    );
    return card;
  },

  interactive(entry) {
    // Interactive entries just use the base card — no extra fields
    return buildBaseCard(entry);
  },

  top5(entry) {
    const a = document.createElement('a');
    a.className = 'entry-card top5-card';
    a.href = entry.path + '/';

    // Mini notebook preview
    const nb = document.createElement('div');
    nb.className = 'top5-nb-preview';

    const head = document.createElement('div');
    head.className = 'top5-nb-head';
    head.textContent = entry.title;

    const lines = document.createElement('div');
    lines.className = 'top5-nb-lines';

    nb.appendChild(head);
    nb.appendChild(lines);
    a.appendChild(nb);

    // Date below the preview
    if (entry.date) {
      const [y, m, d] = entry.date.split('-').map(Number);
      const dateEl = document.createElement('div');
      dateEl.className = 'top5-card-date';
      dateEl.textContent = new Date(y, m - 1, d)
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      a.appendChild(dateEl);
    }

    return a;
  },

  memory(entry) {
    const a = document.createElement('a');
    a.className = 'polaroid-card';
    a.href = entry.path + '/';

    const wrap = document.createElement('div');
    wrap.className = 'polaroid-photo-wrap';

    if (entry.photo) {
      const img = document.createElement('img');
      img.src = entry.path + '/' + entry.photo;
      img.alt = entry.title;
      img.loading = 'lazy';
      wrap.appendChild(img);
    }

    const stamp = document.createElement('div');
    stamp.className = 'polaroid-date-stamp';
    stamp.textContent = formatStampDate(entry.date);
    wrap.appendChild(stamp);

    a.appendChild(wrap);

    const caption = document.createElement('div');
    caption.className = 'polaroid-caption';
    caption.textContent = entry.title;
    a.appendChild(caption);

    return a;
  }

};

// ── Render grid ───────────────────────────────────────────────────────────────
function renderGrid(entries) {
  const grid  = document.getElementById('collection-grid');
  const empty = document.getElementById('empty-state');
  grid.innerHTML = '';

  if (config.layout === 'polaroid') {
    grid.className = 'polaroid-grid';
  } else if (config.layout === 'poster') {
    grid.className = 'poster-grid';
  } else {
    grid.className = 'entry-grid';
  }

  if (entries.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  // Use the type-specific builder if one exists, otherwise fall back to base card
  const builder = cardBuilders[config.type] || buildBaseCard;
  entries.forEach(entry => grid.appendChild(builder(entry)));
}

// ── Sort ──────────────────────────────────────────────────────────────────────
let currentSort = config.defaultSort || 'date';

function sortEntries(entries, sortBy) {
  return [...entries].sort((a, b) => {
    if (sortBy === 'rating') {
      // Higher rating first; entries with no rating sink to the bottom
      const ra = a.rating ?? -1;
      const rb = b.rating ?? -1;
      return rb - ra;
    }
    // Default: newest date first
    return new Date(b.date) - new Date(a.date);
  });
}

// ── Sort buttons ──────────────────────────────────────────────────────────────
//
// Only built if sortOptions has 2 or more items.
//
function buildSortControls(entries) {
  const container = document.getElementById('sort-controls');
  if (!config.sortOptions || config.sortOptions.length < 2) return;

  config.sortOptions.forEach(option => {
    const btn = document.createElement('button');
    btn.textContent = option === 'date' ? 'Recent' : 'Rating';
    btn.className = 'sort-btn' + (option === currentSort ? ' sort-btn-active' : '');
    btn.dataset.sort = option;

    btn.addEventListener('click', () => {
      if (currentSort === option) return; // already active
      currentSort = option;
      container.querySelectorAll('.sort-btn').forEach(b => {
        b.classList.toggle('sort-btn-active', b.dataset.sort === currentSort);
      });
      renderGrid(sortEntries(entries, currentSort));
    });

    container.appendChild(btn);
  });
}

// ── Main: fetch manifest and render ──────────────────────────────────────────
fetch('manifest.json')
  .then(res => {
    if (!res.ok) throw new Error('manifest.json not found');
    return res.json();
  })
  .then(manifest => {
    const all      = manifest.entries || [];
    const filtered = all.filter(e => e.type === config.type);

    // Update the entry count label
    const countEl = document.getElementById('collection-count');
    if (countEl) {
      const n = filtered.length;
      countEl.textContent = n + ' entr' + (n === 1 ? 'y' : 'ies');
    }

    // Build sort buttons
    buildSortControls(filtered);

    // Initial render
    renderGrid(sortEntries(filtered, currentSort));

    // Random button: picks a random entry from THIS collection only
    document.getElementById('random-btn').addEventListener('click', () => {
      if (filtered.length === 0) return;
      const pick = filtered[Math.floor(Math.random() * filtered.length)];
      window.location.href = pick.path + '/';
    });
  })
  .catch(err => {
    console.error('Could not load manifest:', err);
    const empty = document.getElementById('empty-state');
    empty.classList.remove('hidden');
    empty.textContent = 'Could not load entries. Run `npm run build` first.';
  });
