#!/usr/bin/env node
/**
 * The registration form (#register section) lives in register-section.html.
 * Edit it there, not in index.html — step 7 below copies it into the page.
 */

/**
 * IAI Deploy Prep Script
 * ----------------------
 * Run this after every Claude Design export to produce a clean,
 * mobile-safe, GitHub/Netlify-ready index.html with the registration
 * form already embedded.
 *
 * Usage (from your site folder in Claude Code terminal):
 *   node deploy-prep.js
 *
 * Input:  index.html  (raw Claude Design export in the same folder)
 * Output: index.html  (cleaned and ready — overwrites the export)
 *
 * What it does:
 *   1. Unwraps <x-dc> / <helmet> wrapper elements
 *   2. Removes Claude Design bundler scripts (_ds_bundle, image-slot.js, support.js)
 *   3. Removes DCLogic / data-props script blocks
 *   4. Replaces <image-slot> placeholders with real <img> tags
 *   5. Updates all nav/CTA buttons to point to #register
 *   6. Replaces the #register section with the full two-step form
 *   7. Updates title, meta tags, favicon to IAI branding
 *   8. Writes the clean file back to index.html
 *
 * DEPLOY WORKFLOW (updated — this repo is now connected to Netlify via GitHub):
 *   The site no longer deploys by dragging a folder into Netlify. Netlify
 *   auto-deploys from the "info-IAI/Dental-Airways-Retreat" GitHub repo on
 *   every push to main. This matters because netlify.toml (which points to
 *   the Helcim serverless function) is only read on Git-based deploys — a
 *   drag-and-drop deploy silently skips it and breaks the payment modal.
 *   After this script finishes, commit and push your changes with Git
 *   instead of dragging the folder into Netlify. See the printed
 *   instructions at the end of this script for the exact commands.
 */

const fs   = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const INPUT  = path.join(__dirname, 'index.html');
const OUTPUT = path.join(__dirname, 'index.html');

// Apps Script URL — paste your deployed web app URL here when ready to go live
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzmqeVW5tHfEgMvC2pdASQEgbEWm8SjuWHqBoUvRxXATCUf0HwRjaXrjsewWxNdDit4/exec';

// Helcim payment page URL
const HELCIM_URL = 'https://integrated-airway-institute.myhelcim.com/hosted/?token=1ea1697203da249c458414&amount=6100.00&amountHash=0185ad391883b4d8ccf456bb9bd13e5e5cc4652de6081640393d84038c68fedc';

// Image slot replacements — map each slot id to its real image file
const IMAGE_SLOTS = {
  'breath-band':    { src: 'uploads/image_a6b3dd5f.png',                    alt: 'Miraval Arizona spa',          style: 'width: 100%; aspect-ratio: 21 / 8; object-fit: cover; border-radius: 8px; display: block;' },
  'venue-photo':    { src: 'uploads/Miraval_Screen_Shot.jpg',                alt: 'Miraval Arizona Resort',       style: 'width: 100%; aspect-ratio: 16 / 11; object-fit: cover; border-radius: 8px; display: block;' },
  'faculty-plein':  { src: 'uploads/CP___Screenshot_2026-09-11_173657.png', alt: 'Dr. Colleen Plein',            style: 'width: 132px; height: 132px; border-radius: 50%; object-fit: cover; object-position: 50% 20%; border: 1px solid var(--color-neutral-700); display: block;' },
  'faculty-mberman':{ src: 'uploads/Michah_Berman-Web-Photo-2020-2.jpg',    alt: 'Dr. Micah Berman',             style: 'width: 132px; height: 132px; border-radius: 50%; object-fit: cover; object-position: 50% 20%; border: 1px solid var(--color-neutral-700); display: block;' },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

console.log('IAI Deploy Prep — starting...\n');

if (!fs.existsSync(INPUT)) {
  console.error('ERROR: index.html not found in this folder.');
  console.error('Export from Claude Design first, then run this script.');
  process.exit(1);
}

let html = fs.readFileSync(INPUT, 'utf8');
let changes = [];

// 1. Unwrap <x-dc> wrapper
if (html.includes('<x-dc>')) {
  html = html.replace(/<x-dc>\s*/gi, '').replace(/\s*<\/x-dc>/gi, '');
  changes.push('Removed <x-dc> wrapper');
}

// 2. Unwrap <helmet> block — move its contents into <head>
const helmetMatch = html.match(/<helmet>([\s\S]*?)<\/helmet>/i);
if (helmetMatch) {
  const helmetContents = helmetMatch[1];
  html = html.replace(/<helmet>[\s\S]*?<\/helmet>/i, '');
  html = html.replace('</head>', helmetContents + '\n</head>');
  changes.push('Unwrapped <helmet> into <head>');
}

// 3. Remove Claude Design bundler scripts
const scriptsToRemove = [
  /<script[^>]*src="[^"]*_ds_bundle[^"]*"[^>]*><\/script>/gi,
  /<script[^>]*src="[^"]*image-slot\.js[^"]*"[^>]*><\/script>/gi,
  /<script[^>]*src="[^"]*support\.js[^"]*"[^>]*><\/script>/gi,
  /<link[^>]*href="[^"]*_ds[/\\][^"]*styles\.css[^"]*"[^>]*>/gi,
];
scriptsToRemove.forEach(pattern => {
  if (pattern.test(html)) {
    html = html.replace(pattern, '');
    changes.push('Removed bundler script/stylesheet: ' + pattern.toString().substring(0, 40) + '...');
    pattern.lastIndex = 0;
  }
});

// 4. Remove DCLogic / data-props script blocks
html = html.replace(/<script[^>]*data-dc-script[^>]*>[\s\S]*?<\/script>/gi, '');
html = html.replace(/<script[^>]*type="text\/x-dc"[^>]*>[\s\S]*?<\/script>/gi, '');
changes.push('Removed DCLogic/data-props script blocks');

// 5. Replace <image-slot> elements with real <img> tags
Object.entries(IMAGE_SLOTS).forEach(([id, img]) => {
  const pattern = new RegExp(`<image-slot[^>]*id="${escapeRegex(id)}"[^>]*><\\/image-slot>|<image-slot[^>]*id="${escapeRegex(id)}"[^>]*\\/>|<image-slot[^>]*id="${escapeRegex(id)}"[^>]*>`, 'gi');
  if (pattern.test(html)) {
    html = html.replace(pattern, `<img src="${img.src}" alt="${img.alt}" style="${img.style}">`);
    changes.push(`Replaced <image-slot id="${id}"> with real <img>`);
    pattern.lastIndex = 0;
  }
});

// 6. Update all registration/CTA button hrefs to #register
const ctaPatterns = [
  { pattern: /href="{{ registrationUrl }}"/g,                    replacement: 'href="#register"' },
  { pattern: /href="{{ registrationUrl }}" target="_blank"[^>]*/g, replacement: 'href="#register"' },
];
ctaPatterns.forEach(({ pattern, replacement }) => {
  if (pattern.test(html)) {
    html = html.replace(pattern, replacement);
    changes.push('Updated CTA buttons to href="#register"');
    pattern.lastIndex = 0;
  }
});

// 7. Replace the #register section with the one in register-section.html
const REGISTER_FILE = path.join(__dirname, 'register-section.html');
if (!fs.existsSync(REGISTER_FILE)) {
  console.error('ERROR: register-section.html not found in this folder.');
  console.error('It holds the registration form that step 7 copies into the page.');
  console.error('Nothing was written. Restore register-section.html and run again.');
  process.exit(1);
}
const REGISTER_SECTION = fs.readFileSync(REGISTER_FILE, 'utf8');
const registerPattern = /<section id="register"[\s\S]*?<\/section>/;
if (registerPattern.test(html)) {
  const injected = REGISTER_SECTION
    .replace('__APPS_SCRIPT_URL__', APPS_SCRIPT_URL)
    .replace('__HELCIM_URL__', HELCIM_URL);
  html = html.replace(registerPattern, () => injected.trim());
  changes.push('Injected registration form from register-section.html into #register section');
} else {
  // No existing #register section — insert before </main> or </body>
  const insertBefore = html.includes('</main>') ? '</main>' : '</body>';
  const injected = REGISTER_SECTION
    .replace('__APPS_SCRIPT_URL__', APPS_SCRIPT_URL)
    .replace('__HELCIM_URL__', HELCIM_URL);
  html = html.replace(insertBefore, () => injected.trim() + '\n' + insertBefore);
  changes.push('No #register section found — inserted form from register-section.html before ' + insertBefore);
}

// 8. Update title and meta tags if they still have old branding
if (html.includes('Dental Airway Institute')) {
  html = html.replace(/Dental Airway Institute/g, 'Integrated Airway Institute');
  changes.push('Updated branding: "Dental Airway Institute" → "Integrated Airway Institute"');
}

// 9. Add HelcimPay.js script tag if not already present
if (!html.includes('secure.helcim.app')) {
  html = html.replace(
    '<link rel="icon" type="image/png" href="uploads/IAI_logo_centered.png">',
    '<link rel="icon" type="image/png" href="uploads/IAI_logo_centered.png">\n<script type="text/javascript" src="https://secure.helcim.app/helcim-pay/services/start.js"><\/script>'
  );
  changes.push('Added HelcimPay.js script tag');
}

// 10. Update favicon to new logo
html = html.replace(
  /<link rel="icon"[^>]*>/gi,
  '<link rel="icon" type="image/png" href="uploads/IAI_logo_centered.png">'
);
changes.push('Updated favicon to IAI_logo_centered.png');

// Add Google Analytics (GA4) as the first thing inside <head>, only once
const GA_MEASUREMENT_ID = 'G-YFP81ZD32Z';
const GA_SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_MEASUREMENT_ID}');
</script>`;
const headOpenTag = /<head(\s[^>]*)?>/i;
if (html.includes('googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID)) {
  changes.push('Google Analytics tag already present — not added again');
} else if (headOpenTag.test(html)) {
  html = html.replace(headOpenTag, match => match + '\n' + GA_SNIPPET);
  changes.push('Added Google Analytics tag (' + GA_MEASUREMENT_ID + ') at the top of <head>');
} else {
  console.warn('WARNING: no <head> tag found — Google Analytics tag NOT added.');
}

// 10. Write output
fs.writeFileSync(OUTPUT, html, 'utf8');

// ─── REPORT ──────────────────────────────────────────────────────────────────

console.log('Done. Changes applied:\n');
changes.forEach(c => console.log('  ✓ ' + c));
console.log('\nOutput: index.html');
console.log('\nNext step — this site deploys from GitHub now, not drag-and-drop:');
console.log('  1. git add -A');
console.log('  2. git commit -m "Update site content"');
console.log('  3. git push');
console.log('  4. Check the Deploys tab in Netlify and wait for "Published"');
console.log('\n(Dragging the folder into Netlify still works for quick previews, but the');
console.log(' Helcim payment function only loads on a Git-based deploy, so a drag-and-drop');
console.log(' deploy will look fine and then silently break the payment modal.)');
if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
  console.log('\n⚠  APPS_SCRIPT_URL is still a placeholder.');
  console.log('   Open deploy-prep.js and paste your real URL before going live.');
}
