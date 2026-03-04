// build-manifest.js
//
// This script crawls the entries/ folder, reads the metadata block from
// each entry's index.html, and writes a manifest.json file.
//
// Run it with: node scripts/build-manifest.js
// It runs automatically on Netlify every time you push a new entry.

const fs = require('fs');
const path = require('path');

const ENTRIES_DIR = path.join(__dirname, '..', 'entries');
const OUTPUT_FILE = path.join(__dirname, '..', 'manifest.json');

// Collect all entries by walking entries/YYYY-MM/MMDD-slug/ folders
function findEntries() {
  const entries = [];

  if (!fs.existsSync(ENTRIES_DIR)) {
    console.log('No entries/ folder found. Creating it.');
    fs.mkdirSync(ENTRIES_DIR);
    return entries;
  }

  // Each subfolder of entries/ is a month (e.g. 2026-03)
  const monthFolders = fs.readdirSync(ENTRIES_DIR).filter(name => {
    return fs.statSync(path.join(ENTRIES_DIR, name)).isDirectory();
  });

  for (const month of monthFolders) {
    const monthPath = path.join(ENTRIES_DIR, month);

    // Each subfolder of the month is one entry (e.g. 0301-morning-fog)
    const entryFolders = fs.readdirSync(monthPath).filter(name => {
      return fs.statSync(path.join(monthPath, name)).isDirectory();
    });

    for (const entryFolder of entryFolders) {
      const htmlPath = path.join(monthPath, entryFolder, 'index.html');

      if (!fs.existsSync(htmlPath)) {
        console.warn(`  Skipping ${month}/${entryFolder} — no index.html found`);
        continue;
      }

      const html = fs.readFileSync(htmlPath, 'utf-8');
      const meta = extractMeta(html, `${month}/${entryFolder}`);

      if (!meta) {
        console.warn(`  Skipping ${month}/${entryFolder} — no <script id="entry-meta"> found`);
        continue;
      }

      entries.push({
        path: `entries/${month}/${entryFolder}`,
        ...meta
      });
    }
  }

  // Sort entries newest first
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));

  return entries;
}

// Pull the JSON metadata block out of an entry's HTML
function extractMeta(html, label) {
  const match = html.match(/<script[^>]+id="entry-meta"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;

  try {
    return JSON.parse(match[1].trim());
  } catch (e) {
    console.error(`  Error parsing metadata in ${label}: ${e.message}`);
    return null;
  }
}

// Main
const entries = findEntries();

const manifest = {
  generated: new Date().toISOString(),
  entries
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(manifest, null, 2));
console.log(`\nDone! Wrote ${entries.length} entries to manifest.json\n`);
