// entry.js — theme and random button for individual entry pages

// ── Site title hover ──────────────────────────────────────────────────────────
(function () {
  var el = document.querySelector('.site-title');
  if (el) el.innerHTML = 'D<span class="title-insert">avid\'s T</span>umblr';
})();

// ── Theme toggle ──────────────────────────────────────────────────────────────
document.getElementById('theme-toggle').addEventListener('click', function () {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme');
  var next = current === 'auto' ? 'dark' : current === 'dark' ? 'light' : 'auto';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ── Random button ─────────────────────────────────────────────────────────────
document.getElementById('random-btn').addEventListener('click', function () {
  fetch('/manifest.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var entries = data.entries || [];
      if (!entries.length) return;
      var pick = entries[Math.floor(Math.random() * entries.length)];
      window.location.href = '/' + pick.path + '/';
    });
});
