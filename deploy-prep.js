#!/usr/bin/env node
/**
 * IAI Deploy Prep Script
 * ----------------------
 * Run this after every Claude Design export to produce a clean,
 * mobile-safe, Netlify-ready index.html with the registration
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
 */

const fs   = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const INPUT  = path.join(__dirname, 'index.html');
const OUTPUT = path.join(__dirname, 'index.html');

// Apps Script URL — paste your deployed web app URL here when ready to go live
const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';

// Helcim payment page URL
const HELCIM_URL = 'https://integrated-airway-institute.myhelcim.com/hosted/?token=1ea1697203da249c458414&amount=6100.00&amountHash=0185ad391883b4d8ccf456bb9bd13e5e5cc4652de6081640393d84038c68fedc';

// Image slot replacements — map each slot id to its real image file
const IMAGE_SLOTS = {
  'breath-band':    { src: 'uploads/image_a6b3dd5f.png',                    alt: 'Miraval Arizona spa',          style: 'width: 100%; aspect-ratio: 21 / 8; object-fit: cover; border-radius: 8px; display: block;' },
  'venue-photo':    { src: 'uploads/Miraval_Screen_Shot.jpg',                alt: 'Miraval Arizona Resort',       style: 'width: 100%; aspect-ratio: 16 / 11; object-fit: cover; border-radius: 8px; display: block;' },
  'faculty-plein':  { src: 'uploads/CP___Screenshot_2026-09-11_173657.png', alt: 'Dr. Colleen Plein',            style: 'width: 132px; height: 132px; border-radius: 50%; object-fit: cover; object-position: 50% 20%; border: 1px solid var(--color-neutral-700); display: block;' },
  'faculty-mberman':{ src: 'uploads/Michah_Berman-Web-Photo-2020-2.jpg',    alt: 'Dr. Micah Berman',             style: 'width: 132px; height: 132px; border-radius: 50%; object-fit: cover; object-position: 50% 20%; border: 1px solid var(--color-neutral-700); display: block;' },
};

// ─── REGISTRATION SECTION HTML ───────────────────────────────────────────────

const REGISTER_SECTION = `
    <section id="register" style="position: relative; overflow: hidden; padding: 88px 0 96px">
      <div aria-hidden="true" style="position: absolute; inset: auto 8px 40px auto; width: min(340px, 32vw); aspect-ratio: 1; border-radius: 18%; mix-blend-mode: lighten; opacity: 0.42; background: url('uploads/mark-spiral.png') center / contain no-repeat; pointer-events: none"></div>
      <svg viewBox="0 0 1200 200" preserveAspectRatio="none" aria-hidden="true" style="position: absolute; inset: 0 0 auto 0; width: 100%; height: 200px; opacity: 0.22; pointer-events: none">
        <g fill="none" stroke="var(--color-accent)" stroke-width="1" stroke-linecap="round">
          <path d="M-40 40C160 40 220 -8 420 -8S680 40 880 40s280-48 480-48"></path>
          <path d="M-40 96C160 96 220 48 420 48S680 96 880 96s280-48 480-48" opacity="0.6"></path>
        </g>
      </svg>

      <div style="position: relative">
        <h2 style="font-family: var(--font-heading); font-weight: var(--font-heading-weight); font-size: clamp(28px, 3vw, 38px); line-height: 1.2; letter-spacing: -0.012em; margin: 0 0 12px; max-width: 22ch">Seats are held in the order they are claimed.</h2>
        <p style="font-size: 16px; line-height: 1.65; margin: 0 0 40px; max-width: 52ch; color: color-mix(in srgb, var(--color-text) 78%, transparent)">We cap the retreat at 15 so every case gets discussed. When it fills, it fills — the next one is a year away.</p>

        <!-- Step indicators -->
        <div id="reg-steps" style="display: flex; align-items: center; gap: 0; margin-bottom: 10px; max-width: 560px">
          <div id="reg-dot-1" style="width: 28px; height: 28px; border-radius: 50%; background: var(--color-accent); color: var(--color-bg); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0; transition: background 0.3s">1</div>
          <div id="reg-line-1" style="flex: 1; height: 1px; background: color-mix(in srgb, var(--color-text) 20%, transparent); transition: background 0.3s"></div>
          <div id="reg-dot-2" style="width: 28px; height: 28px; border-radius: 50%; border: 1px solid color-mix(in srgb, var(--color-text) 28%, transparent); color: color-mix(in srgb, var(--color-text) 40%, transparent); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; flex-shrink: 0; transition: all 0.3s">2</div>
        </div>
        <div style="display: flex; justify-content: space-between; max-width: 560px; margin-bottom: 32px">
          <span id="reg-lbl-1" style="font-size: 12px; color: var(--color-accent)">Your information</span>
          <span id="reg-lbl-2" style="font-size: 12px; color: color-mix(in srgb, var(--color-text) 40%, transparent)">Review &amp; continue</span>
        </div>

        <!-- Step 1: Registration form -->
        <div id="reg-panel-1" style="max-width: 560px">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px">
            <div class="field">
              <label for="reg-first">First name</label>
              <input class="input" id="reg-first" type="text" placeholder="Sarah" autocomplete="given-name">
              <span id="err-reg-first" style="font-size: 12px; color: #c0392b; display: none; margin-top: 4px">Enter your first name</span>
            </div>
            <div class="field">
              <label for="reg-last">Last name</label>
              <input class="input" id="reg-last" type="text" placeholder="Chen" autocomplete="family-name">
              <span id="err-reg-last" style="font-size: 12px; color: #c0392b; display: none; margin-top: 4px">Enter your last name</span>
            </div>
          </div>
          <div style="height: 14px"></div>
          <div class="field">
            <label for="reg-email">Email address</label>
            <input class="input" id="reg-email" type="email" placeholder="sarah@dentalgroup.com" autocomplete="email">
            <span id="err-reg-email" style="font-size: 12px; color: #c0392b; display: none; margin-top: 4px">Enter a valid email address</span>
          </div>
          <div style="height: 14px"></div>
          <div class="field">
            <label for="reg-phone">Phone number</label>
            <input class="input" id="reg-phone" type="tel" placeholder="(312) 555-0100" autocomplete="tel">
            <span id="err-reg-phone" style="font-size: 12px; color: #c0392b; display: none; margin-top: 4px">Enter your phone number</span>
          </div>
          <div style="height: 14px"></div>
          <div class="field">
            <label for="reg-practice">Practice name <span style="font-weight: 400; opacity: 0.55">(optional)</span></label>
            <input class="input" id="reg-practice" type="text" placeholder="Lakeview Dental Associates">
          </div>
          <div style="height: 14px"></div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px">
            <div class="field">
              <label for="reg-city">City</label>
              <input class="input" id="reg-city" type="text" placeholder="Chicago">
              <span id="err-reg-city" style="font-size: 12px; color: #c0392b; display: none; margin-top: 4px">Enter your city</span>
            </div>
            <div class="field">
              <label for="reg-state">State</label>
              <select class="input" id="reg-state" style="cursor: pointer">
                <option value="">Select state</option>
                <option>AL</option><option>AK</option><option>AZ</option><option>AR</option><option>CA</option>
                <option>CO</option><option>CT</option><option>DE</option><option>FL</option><option>GA</option>
                <option>HI</option><option>ID</option><option>IL</option><option>IN</option><option>IA</option>
                <option>KS</option><option>KY</option><option>LA</option><option>ME</option><option>MD</option>
                <option>MA</option><option>MI</option><option>MN</option><option>MS</option><option>MO</option>
                <option>MT</option><option>NE</option><option>NV</option><option>NH</option><option>NJ</option>
                <option>NM</option><option>NY</option><option>NC</option><option>ND</option><option>OH</option>
                <option>OK</option><option>OR</option><option>PA</option><option>RI</option><option>SC</option>
                <option>SD</option><option>TN</option><option>TX</option><option>UT</option><option>VT</option>
                <option>VA</option><option>WA</option><option>WV</option><option>WI</option><option>WY</option>
              </select>
              <span id="err-reg-state" style="font-size: 12px; color: #c0392b; display: none; margin-top: 4px">Select your state</span>
            </div>
          </div>
          <div style="height: 14px"></div>
          <div class="field">
            <label for="reg-specialty">Dental specialty</label>
            <select class="input" id="reg-specialty" style="cursor: pointer">
              <option value="">Select specialty</option>
              <option>General Dentistry</option>
              <option>Orthodontics</option>
              <option>Periodontics</option>
              <option>Oral and Maxillofacial Surgery</option>
              <option>Pediatric Dentistry</option>
              <option>Prosthodontics</option>
              <option>Endodontics</option>
              <option>Oral Medicine</option>
              <option>Other</option>
            </select>
            <span id="err-reg-specialty" style="font-size: 12px; color: #c0392b; display: none; margin-top: 4px">Select your specialty</span>
          </div>
          <div style="height: 14px"></div>
          <div class="field">
            <label for="reg-hear">How did you hear about us?</label>
            <select class="input" id="reg-hear" style="cursor: pointer">
              <option value="">Select one</option>
              <option>Referral from a colleague</option>
              <option>Social media</option>
              <option>Email</option>
              <option>Podcast</option>
              <option>Conference or event</option>
              <option>Other</option>
            </select>
          </div>
          <div style="height: 14px"></div>
          <div class="field">
            <label for="reg-questions">Questions or comments <span style="font-weight: 400; opacity: 0.55">(optional)</span></label>
            <textarea class="input" id="reg-questions" rows="3" placeholder="Anything you'd like us to know before the retreat" style="resize: vertical; line-height: 1.55"></textarea>
          </div>
          <div style="height: 24px"></div>
          <button class="btn btn-primary" id="reg-next-btn" onclick="regGoToStep2()" style="width: 100%">Continue to review</button>
        </div>

        <!-- Step 2: Summary + payment -->
        <div id="reg-panel-2" style="display: none; max-width: 560px">
          <div id="reg-summary" style="background: color-mix(in srgb, var(--color-text) 5%, transparent); border: 1px solid color-mix(in srgb, var(--color-text) 14%, transparent); border-radius: 8px; padding: 20px 24px; margin-bottom: 24px; font-size: 14px; line-height: 1.7"></div>
          <div style="border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent); border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; font-size: 14px; color: color-mix(in srgb, var(--color-text) 78%, transparent); background: color-mix(in srgb, var(--color-accent) 7%, transparent)">
            After submitting your information, you will be taken to our secure payment page to complete your $6,100 registration by credit card or ACH bank transfer. A seat confirmation email will follow once payment is received.
          </div>
          <button class="btn btn-primary" id="reg-pay-btn" onclick="regGoToPayment()" style="width: 100%; font-size: 16px; padding: 14px">Submit and go to payment — $6,100</button>
          <div style="height: 14px"></div>
          <button class="btn btn-ghost" onclick="regGoBack()" style="width: 100%; font-size: 14px">Edit your information</button>
        </div>

        <!-- Step 3: Confirmation -->
        <div id="reg-panel-confirm" style="display: none; max-width: 560px; text-align: center; padding: 40px 0">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin: 0 auto 20px; display: block">
            <circle cx="24" cy="24" r="20" stroke-opacity="0.3"></circle>
            <polyline points="15,24 21,30 33,18"></polyline>
          </svg>
          <h3 style="font-family: var(--font-heading); font-size: 24px; font-weight: var(--font-heading-weight); margin: 0 0 10px">Information received</h3>
          <p style="font-size: 15px; line-height: 1.65; color: color-mix(in srgb, var(--color-text) 72%, transparent); max-width: 38ch; margin: 0 auto">Complete your payment in the tab that just opened. A seat confirmation email will follow once payment clears.</p>
          <p style="margin-top: 20px; font-size: 13px; color: color-mix(in srgb, var(--color-text) 48%, transparent)">Questions? <a href="mailto:info@integratedairwayinstitute.com">info@integratedairwayinstitute.com</a></p>
        </div>
      </div>

      <style>
        #register .field { display: grid; gap: 6px; }
        #register .field label { font-size: 13px; font-weight: 500; color: color-mix(in srgb, var(--color-text) 75%, transparent); }
        #register .input { width: 100%; box-sizing: border-box; background: color-mix(in srgb, var(--color-text) 5%, transparent); border: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent); border-radius: 6px; padding: 10px 12px; font-size: 15px; color: var(--color-text); font-family: var(--font-body); transition: border-color 0.15s; }
        #register .input:focus { outline: none; border-color: var(--color-accent); }
        #register select.input option { background: #1a1a1a; color: #fff; }
        #register textarea.input { font-family: var(--font-body); }
        #register .summary-row { display: flex; justify-content: space-between; padding: 3px 0; }
        #register .summary-row .slabel { color: color-mix(in srgb, var(--color-text) 55%, transparent); }
        #register .summary-row .svalue { font-weight: 500; }
        #register .summary-total { display: flex; justify-content: space-between; border-top: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent); margin-top: 10px; padding-top: 12px; font-size: 16px; }
        #register .summary-total .slabel { font-weight: 500; }
        #register .summary-total .svalue { color: var(--color-accent); font-weight: 600; }
      </style>

      <script>
        var APPS_SCRIPT_URL = '__APPS_SCRIPT_URL__';
        var HELCIM_URL = '__HELCIM_URL__';

        function regGetVal(id) { return document.getElementById(id).value.trim(); }
        function regShowError(id, show) { var el = document.getElementById('err-' + id); if (el) el.style.display = show ? 'block' : 'none'; }
        function regClearErrors() { ['reg-first','reg-last','reg-email','reg-phone','reg-city','reg-state','reg-specialty'].forEach(function(id) { regShowError(id, false); }); }
        function regValidEmail(v) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v); }

        function regGoToStep2() {
          regClearErrors();
          var valid = true;
          var checks = [
            { id: 'reg-first', fn: function(v) { return v.length > 0; } },
            { id: 'reg-last',  fn: function(v) { return v.length > 0; } },
            { id: 'reg-email', fn: function(v) { return regValidEmail(v); } },
            { id: 'reg-phone', fn: function(v) { return v.length > 0; } },
            { id: 'reg-city',  fn: function(v) { return v.length > 0; } },
            { id: 'reg-state', fn: function(v) { return v.length > 0; } },
            { id: 'reg-specialty', fn: function(v) { return v.length > 0; } }
          ];
          checks.forEach(function(c) { if (!c.fn(regGetVal(c.id))) { regShowError(c.id, true); valid = false; } });
          if (!valid) { document.getElementById('reg-panel-1').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }

          var rows = [
            { label: 'Name',      value: regGetVal('reg-first') + ' ' + regGetVal('reg-last') },
            { label: 'Email',     value: regGetVal('reg-email') },
            { label: 'Phone',     value: regGetVal('reg-phone') },
            { label: 'Practice',  value: regGetVal('reg-practice') || '—' },
            { label: 'Location',  value: regGetVal('reg-city') + ', ' + regGetVal('reg-state') },
            { label: 'Specialty', value: regGetVal('reg-specialty') }
          ];
          var html = rows.map(function(r) { return '<div class="summary-row"><span class="slabel">' + r.label + '</span><span class="svalue">' + r.value + '</span></div>'; }).join('') + '<div class="summary-total"><span class="slabel">Total due</span><span class="svalue">$6,100</span></div>';
          document.getElementById('reg-summary').innerHTML = html;

          document.getElementById('reg-panel-1').style.display = 'none';
          document.getElementById('reg-panel-2').style.display = 'block';
          document.getElementById('reg-dot-1').style.opacity = '0.5';
          document.getElementById('reg-dot-1').innerHTML = '&#10003;';
          document.getElementById('reg-dot-2').style.background = 'var(--color-accent)';
          document.getElementById('reg-dot-2').style.color = 'var(--color-bg)';
          document.getElementById('reg-dot-2').style.border = 'none';
          document.getElementById('reg-line-1').style.background = 'var(--color-accent)';
          document.getElementById('reg-lbl-1').style.color = 'color-mix(in srgb, var(--color-text) 50%, transparent)';
          document.getElementById('reg-lbl-2').style.color = 'var(--color-accent)';
          document.getElementById('reg-panel-2').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function regGoBack() {
          document.getElementById('reg-panel-2').style.display = 'none';
          document.getElementById('reg-panel-1').style.display = 'block';
          document.getElementById('reg-dot-1').style.opacity = '1';
          document.getElementById('reg-dot-1').innerHTML = '1';
          document.getElementById('reg-dot-2').style.background = 'transparent';
          document.getElementById('reg-dot-2').style.color = 'color-mix(in srgb, var(--color-text) 40%, transparent)';
          document.getElementById('reg-dot-2').style.border = '1px solid color-mix(in srgb, var(--color-text) 28%, transparent)';
          document.getElementById('reg-line-1').style.background = 'color-mix(in srgb, var(--color-text) 20%, transparent)';
          document.getElementById('reg-lbl-1').style.color = 'var(--color-accent)';
          document.getElementById('reg-lbl-2').style.color = 'color-mix(in srgb, var(--color-text) 40%, transparent)';
          document.getElementById('reg-panel-1').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function regGoToPayment() {
          var data = {
            'First Name':    regGetVal('reg-first'),
            'Last Name':     regGetVal('reg-last'),
            'Email Address': regGetVal('reg-email'),
            'Phone Number':  regGetVal('reg-phone'),
            'Practice Name': regGetVal('reg-practice'),
            'City':          regGetVal('reg-city'),
            'State':         regGetVal('reg-state'),
            'Dental Specialty': regGetVal('reg-specialty'),
            'How did you hear about us?': regGetVal('reg-hear'),
            'Questions or Comments': regGetVal('reg-questions')
          };
          if (APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL_HERE') {
            fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).catch(function() {});
          }
          window.open(HELCIM_URL, '_blank');
          document.getElementById('reg-panel-2').style.display = 'none';
          document.getElementById('reg-steps').style.display = 'none';
          document.getElementById('reg-panel-confirm').style.display = 'block';
        }
      </script>
    </section>
`;

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

// 7. Replace the #register section with the full two-step form
const registerPattern = /<section id="register"[\s\S]*?<\/section>/;
if (registerPattern.test(html)) {
  const injected = REGISTER_SECTION
    .replace('__APPS_SCRIPT_URL__', APPS_SCRIPT_URL)
    .replace('__HELCIM_URL__', HELCIM_URL);
  html = html.replace(registerPattern, injected.trim());
  changes.push('Injected two-step registration form into #register section');
} else {
  // No existing #register section — insert before </main> or </body>
  const insertBefore = html.includes('</main>') ? '</main>' : '</body>';
  const injected = REGISTER_SECTION
    .replace('__APPS_SCRIPT_URL__', APPS_SCRIPT_URL)
    .replace('__HELCIM_URL__', HELCIM_URL);
  html = html.replace(insertBefore, injected.trim() + '\n' + insertBefore);
  changes.push('No #register section found — inserted form before ' + insertBefore);
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

// 10. Write output
fs.writeFileSync(OUTPUT, html, 'utf8');

// ─── REPORT ──────────────────────────────────────────────────────────────────

console.log('Done. Changes applied:\n');
changes.forEach(c => console.log('  ✓ ' + c));
console.log('\nOutput: index.html');
console.log('\nNext step: drag your site folder into Netlify → Production deploys.');
if (APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL_HERE') {
  console.log('\n⚠  APPS_SCRIPT_URL is still a placeholder.');
  console.log('   Open deploy-prep.js and paste your real URL before going live.');
}
