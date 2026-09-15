// Generate a matchup thumbnail for Union Vision videos.
// Usage:
//   node scripts/make-matchup.js <slug1> <name1> <slug2> <name2> [sport] [date] [outfile]
// Example:
//   node scripts/make-matchup.js elizabeth "Elizabeth" summit "Summit" "Boys Soccer" "Sept 15, 2026" elizsummit.jpg
// Output lands in images/photos/

'use strict';
const sharp = require('sharp');
const path  = require('path');

const W = 1280, H = 720;
const NAVY   = { r: 11,  g: 21,  b: 41  };  // #0b1529
const GOLD   = '#c4962a';
const SILVER = '#c3c9d1';
const LOGOS  = path.join(__dirname, '../images/logos/optimized');
const SEAL   = path.join(__dirname, '../images/uciac-logo-footer.png');
const OUT    = path.join(__dirname, '../images/photos');

const [,, slug1, name1, slug2, name2, sport = '', dateStr = '', outFile = 'matchup-thumb.jpg'] = process.argv;
if (!slug1 || !slug2) {
    console.error('Usage: node make-matchup.js <slug1> <name1> <slug2> <name2> [sport] [date] [outfile]');
    process.exit(1);
}

async function circleImg(filepath, size) {
    const half = size / 2;
    const mask = Buffer.from(
        `<svg width="${size}" height="${size}"><circle cx="${half}" cy="${half}" r="${half}" fill="white"/></svg>`
    );
    return sharp(filepath)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .composite([{ input: mask, blend: 'dest-in' }])
        .png()
        .toBuffer();
}

async function main() {
    const LOGO_SIZE = 280;
    const RING = LOGO_SIZE / 2 + 6;  // ring radius (px from center)
    const LCX = 300;                  // left logo center x
    const RCX = W - 300;              // right logo center x
    const LCY = H / 2 - 10;          // both logos vertically centered

    // Seal: use the solid-bg logo, resize, then clip to a circle
    const sealBuf = await circleImg(
        path.join(__dirname, '../images/uciac-logo.png'), 72
    );

    const [logo1, logo2] = await Promise.all([
        circleImg(path.join(LOGOS, slug1 + '.png'), LOGO_SIZE),
        circleImg(path.join(LOGOS, slug2 + '.png'), LOGO_SIZE),
    ]);

    const nameFontSize = name1.length + name2.length > 24 ? 32 : 38;
    const sportLine = sport
        ? `<text x="${W/2}" y="672" fill="${GOLD}" font-family="Arial,sans-serif" font-size="24" font-weight="700" text-anchor="middle" letter-spacing="3">${escXml(sport.toUpperCase())}${dateStr ? ' · ' + escXml(dateStr) : ''}</text>`
        : (dateStr ? `<text x="${W/2}" y="672" fill="${SILVER}" font-family="Arial,sans-serif" font-size="24" text-anchor="middle">${escXml(dateStr)}</text>` : '');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <!-- navy base -->
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#0f1e3a"/>
      <stop offset="100%" stop-color="#07101f"/>
    </linearGradient>
    <!-- glow halos behind each logo -->
    <radialGradient id="gL" cx="${LCX}" cy="${LCY}" r="${RING * 2}" gradientUnits="userSpaceOnUse">
      <stop offset="0%"  stop-color="#1e3060" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0b1529" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gR" cx="${RCX}" cy="${LCY}" r="${RING * 2}" gradientUnits="userSpaceOnUse">
      <stop offset="0%"  stop-color="#1e3060" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0b1529" stop-opacity="0"/>
    </radialGradient>
    <!-- center VS gradient -->
    <radialGradient id="gC" cx="${W/2}" cy="${LCY}" r="90" gradientUnits="userSpaceOnUse">
      <stop offset="0%"  stop-color="#1a2a50" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0b1529" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- glow halos -->
  <circle cx="${LCX}" cy="${LCY}" r="${RING * 2.2}" fill="url(#gL)"/>
  <circle cx="${RCX}" cy="${LCY}" r="${RING * 2.2}" fill="url(#gR)"/>
  <circle cx="${W/2}" cy="${LCY}" r="90" fill="url(#gC)"/>

  <!-- gold rings around logo areas -->
  <circle cx="${LCX}" cy="${LCY}" r="${RING}" fill="none" stroke="${GOLD}" stroke-width="3" opacity="0.85"/>
  <circle cx="${RCX}" cy="${LCY}" r="${RING}" fill="none" stroke="${GOLD}" stroke-width="3" opacity="0.85"/>

  <!-- backing disc for the UCC seal so it's visible on navy -->
  <circle cx="${W/2}" cy="76" r="40" fill="#1a2a50" opacity="0.8"/>
  <circle cx="${W/2}" cy="76" r="40" fill="none" stroke="${GOLD}" stroke-width="1.5" opacity="0.6"/>

  <!-- top label: UNION VISION text above two gold rules, seal sits below straddling them -->
  <text x="${W/2}" y="38" fill="${GOLD}" font-family="Arial,sans-serif" font-size="18" font-weight="700"
        text-anchor="middle" letter-spacing="6">UNION VISION</text>
  <line x1="80" y1="52" x2="${W/2 - 48}" y2="52" stroke="${GOLD}" stroke-width="1" opacity="0.6"/>
  <line x1="${W/2 + 48}" y1="52" x2="${W-80}" y2="52" stroke="${GOLD}" stroke-width="1" opacity="0.6"/>
  <line x1="80" y1="62" x2="${W/2 - 48}" y2="62" stroke="${GOLD}" stroke-width="1" opacity="0.6"/>
  <line x1="${W/2 + 48}" y1="62" x2="${W-80}" y2="62" stroke="${GOLD}" stroke-width="1" opacity="0.6"/>

  <!-- center divider line -->
  <line x1="${W/2}" y1="${LCY - RING - 10}" x2="${W/2}" y2="${LCY + RING + 10}"
        stroke="${GOLD}" stroke-width="1" opacity="0.4"/>

  <!-- VS badge -->
  <circle cx="${W/2}" cy="${LCY}" r="44" fill="#0b1529" stroke="${GOLD}" stroke-width="2.5"/>
  <text x="${W/2}" y="${LCY + 14}" fill="${GOLD}" font-family="Arial,sans-serif" font-size="36"
        font-weight="900" text-anchor="middle" letter-spacing="2">VS</text>

  <!-- school name labels -->
  <text x="${LCX}" y="${LCY + RING + 44}" fill="white" font-family="Arial,sans-serif"
        font-size="${nameFontSize}" font-weight="700" text-anchor="middle">${escXml(name1)}</text>
  <text x="${RCX}" y="${LCY + RING + 44}" fill="white" font-family="Arial,sans-serif"
        font-size="${nameFontSize}" font-weight="700" text-anchor="middle">${escXml(name2)}</text>

  <!-- sport + date -->
  ${sportLine}

  <!-- bottom rule -->
  <line x1="80" y1="${H - 32}" x2="${W-80}" y2="${H - 32}" stroke="${GOLD}" stroke-width="1" opacity="0.4"/>
</svg>`;

    await sharp({ create: { width: W, height: H, channels: 4, background: NAVY } })
        .composite([
            { input: Buffer.from(svg), top: 0, left: 0 },
            // gold disc under each logo (slightly larger than logo, solid)
            { input: await disc(LOGO_SIZE + 12, '#0b1529'), top: Math.round(LCY - (LOGO_SIZE+12)/2), left: Math.round(LCX - (LOGO_SIZE+12)/2) },
            { input: await disc(LOGO_SIZE + 12, '#0b1529'), top: Math.round(LCY - (LOGO_SIZE+12)/2), left: Math.round(RCX - (LOGO_SIZE+12)/2) },
            { input: logo1, top: Math.round(LCY - LOGO_SIZE/2), left: Math.round(LCX - LOGO_SIZE/2) },
            { input: logo2, top: Math.round(LCY - LOGO_SIZE/2), left: Math.round(RCX - LOGO_SIZE/2) },
            { input: sealBuf,  top: 40, left: Math.round(W/2 - 36) },
        ])
        .jpeg({ quality: 93 })
        .toFile(path.join(OUT, outFile));

    console.log('✓ Created images/photos/' + outFile);
}

async function disc(size, color) {
    const half = size / 2;
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    const svg = `<svg width="${size}" height="${size}"><circle cx="${half}" cy="${half}" r="${half}" fill="${color}"/></svg>`;
    return sharp({ create: { width: size, height: size, channels: 4, background: { r, g, b } } })
        .composite([{ input: Buffer.from(svg), blend: 'dest-in' }])
        .png()
        .toBuffer();
}

function escXml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

main().catch(e => { console.error(e); process.exit(1); });
