// entry.js — injects the site header into individual entry pages

// Init theme from localStorage before paint
(function () {
  const saved = localStorage.getItem('theme') || 'auto';
  document.documentElement.setAttribute('data-theme', saved);
})();

document.addEventListener('DOMContentLoaded', function () {
  // Build and prepend header
  const header = document.createElement('header');
  header.className = 'entry-site-header';
  header.innerHTML =
    '<a href="/" class="entry-site-title">D<span class="title-insert">avid\'s T</span>umblr</a>' +
    '<div class="entry-header-actions">' +
      '<button id="entry-random-btn" title="Random entry">&#9862; random</button>' +
      '<button id="entry-theme-toggle" aria-label="Toggle theme">&#9788;</button>' +
    '</div>';
  document.body.insertBefore(header, document.body.firstChild);

  // Theme toggle — cycles auto → dark → light → auto
  document.getElementById('entry-theme-toggle').addEventListener('click', function () {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  // Random button — picks a random entry from manifest
  document.getElementById('entry-random-btn').addEventListener('click', function () {
    fetch('/manifest.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var entries = data.entries || [];
        if (entries.length === 0) return;
        var pick = entries[Math.floor(Math.random() * entries.length)];
        window.location.href = '/' + pick.path + '/';
      });
  });
});
