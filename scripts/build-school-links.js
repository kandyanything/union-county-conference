/**
 * Points every school link on the site at the address held in
 * data/schools.json.
 *
 * The crest grid on index.html and the cards on schools.html were each written
 * out by hand, so the site carried three separate copies of "where does this
 * school publish its schedule" - two in markup and one in schools.json that
 * nothing read. They drifted: only 5 of 22 still agreed, and the homepage was
 * still sending people to DigitalSports for schools that had moved to
 * ArbiterLive or to their own site.
 *
 * schools.json is now the single source. This script rewrites nothing but the
 * href, matched on the school's logo filename, so the markup, the labels and
 * the layout are untouched. Run it after editing schools.json; the schedule
 * workflow runs it on every rebuild so the two can never diverge again.
 *
 *   node scripts/build-school-links.js [--check]
 *
 * --check makes no changes and exits non-zero if anything is out of date,
 * which is what CI wants.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');

const raw = fs.readFileSync(path.join(ROOT, 'data', 'schools.json'), 'utf8').replace(/^﻿/, '');
const parsed = JSON.parse(raw);
const schools = Array.isArray(parsed) ? parsed : (parsed.schools || []);

const bySlug = new Map();
for (const s of schools) {
    if (!s.slug || !s.scheduleUrl) continue;
    bySlug.set(s.slug, s);
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * Replaces the href nearest a school's logo. `order` says whether the anchor
 * wraps the image (the homepage tiles) or follows it (the schools page cards).
 */
function retarget(html, slug, url, order) {
    const logo = escapeRe(`images/logos/optimized/${slug}.png`);
    const re = order === 'anchor-first'
        // <a class="school-tile" href="URL" ...><img src=".../slug.png"
        ? new RegExp(`(<a class="school-tile"[^>]*\\shref=")([^"]*)("[^>]*>\\s*<img src="${logo}")`, 'i')
        // <img src=".../slug.png" ...> ... <a href="URL"
        : new RegExp(`(<img src="${logo}"[\\s\\S]{0,500}?<a\\s+href=")([^"]*)(")`, 'i');

    const m = html.match(re);
    if (!m) return { html, found: false, changed: false };
    if (m[2] === url) return { html, found: true, changed: false };
    return { html: html.replace(re, `$1${url}$3`), found: true, changed: true, was: m[2] };
}

const TARGETS = [
    { file: 'index.html', order: 'anchor-first' },
    { file: 'schools.html', order: 'image-first' },
];

let changedTotal = 0, missingTotal = 0;

for (const { file, order } of TARGETS) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) { console.log(`  ${file}: not present, skipped`); continue; }

    let html = fs.readFileSync(full, 'utf8');
    const changes = [], missing = [];

    for (const [slug, s] of bySlug) {
        const r = retarget(html, slug, s.scheduleUrl, order);
        html = r.html;
        if (!r.found) missing.push(s.name);
        else if (r.changed) changes.push(`${s.name}\n        was ${r.was}\n        now ${s.scheduleUrl}`);
    }

    console.log(`\n  ${file}`);
    if (changes.length) changes.forEach(c => console.log(`      ${c}`));
    else console.log('      already correct');
    if (missing.length) console.log(`      NOT FOUND on the page: ${missing.join(', ')}`);

    changedTotal += changes.length;
    missingTotal += missing.length;

    if (changes.length && !CHECK) fs.writeFileSync(full, html, { encoding: 'utf8' });
}

console.log('');
if (CHECK) {
    if (changedTotal || missingTotal) {
        console.log(`${changedTotal} link(s) out of date, ${missingTotal} school(s) not found on a page`);
        process.exit(1);
    }
    console.log('every school link matches schools.json');
} else {
    console.log(changedTotal ? `updated ${changedTotal} link(s)` : 'nothing to change');
    if (missingTotal) { console.log(`${missingTotal} school(s) could not be located on a page`); process.exit(1); }
}
