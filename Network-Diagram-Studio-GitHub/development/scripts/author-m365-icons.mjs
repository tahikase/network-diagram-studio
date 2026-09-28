// One-shot authoring script for the Microsoft 365 icon set.
//
// WHY THESE ARE HAND-DRAWN.
// Microsoft does not publish the SharePoint / OneDrive / Teams / Copilot
// *brand marks* for redistribution — they sit under the Microsoft Trademark
// and Brand Guidelines, not under the architecture-icon terms of use that
// cover the 714 Azure icons bundled here. The pack Microsoft *does* publish
// ("Microsoft 365 architecture icons") is a library of generic concept
// glyphs tinted into brand colourways; it contains no product marks at all,
// so it does not answer the question either.
//
// So every symbol below is drawn from scratch on the same 18x18 grid and in
// the same house style as `custom-svg/On-premises/`. What each one reuses is
// the *functional motif* the product is universally drawn with — an envelope
// for mail, a cloud for cloud storage, a shield for a security product, a
// sparkle for an AI assistant. Motifs are unprotectable; the marks are not
// copied, traced, or approximated.
//
// If you later obtain the official product art through Microsoft's internal
// brand channels, drop the SVGs into this folder and re-run
// `npm run build:icons` — the file name becomes the icon id, so a file named
// `05-icon-sharepoint.svg` transparently replaces the drawing below.
//
// Run:  node scripts/author-m365-icons.mjs
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const OUT = 'src/icons/custom-svg/Microsoft 365';

// Same house palette as the On-premises set, so the two families sit
// together on a canvas without one looking pasted in.
const BLUE = '#0078d4'; // primary stroke
const WASH = '#e6f0fb'; // light fill
const SLATE = '#94a3b8'; // secondary detail
const GREEN = '#22c55e'; // status / success
const AMBER = '#f59e0b'; // highlight, AI accent
const RED = '#ef4444'; // security / alert accent

// --- shared motif fragments -------------------------------------------

// The mail body. Everything in the Exchange/Outlook family is built on it
// so the group reads as one family at 18px.
const envelope = (fill = WASH) =>
  `<rect x="1.6" y="4.4" width="14.8" height="10" rx="1.2" fill="${fill}"/>` +
  `<path d="M2.2 5.4 L9 10.4 L15.8 5.4"/>`;
const miniEnvelope = (cx, cy, s, fill = '#fff') =>
  mini(envelope(fill), 9, 9.4, cx, cy, s);

// A cloud. Slightly plumper than the on-prem WAN cloud and always sitting
// high on the grid, so "cloud service" never reads as "the internet".
const CLOUD =
  'M5.2 13 A3 3 0 0 1 5.6 7.1 A3.8 3.8 0 0 1 12.8 6.3 ' +
  'A3 3 0 0 1 13.2 13 Z';
const cloud = (fill = WASH) => `<path d="${CLOUD}" fill="${fill}"/>`;

// Scaled copies are placed by their *visual centre*, not by a raw translate.
// Doing the arithmetic by hand is how a badge ends up half off the canvas,
// so both mini helpers take the centre they should land on and pre-divide
// stroke-width so the copy still renders at 1.2.
const CLOUD_CX = 9.2;
const CLOUD_CY = 8.4;
const mini = (inner, ox, oy, cx, cy, s) =>
  `<g transform="translate(${(cx - ox * s).toFixed(2)} ${(cy - oy * s).toFixed(2)}) scale(${s})" ` +
  `stroke-width="${(1.2 / s).toFixed(2)}">${inner}</g>`;
const miniCloud = (cx, cy, s, fill = '#fff') =>
  mini(cloud(fill), CLOUD_CX, CLOUD_CY, cx, cy, s);

// A document page with a folded corner — the content/file motif.
const page = (fill = WASH) =>
  `<path d="M3.9 15.6 v-13.2 h6.5 l3.7 3.7 v9.5 z" fill="${fill}"/>` +
  `<path d="M10.4 2.4 v3.7 h3.7" fill="#fff"/>`;

// Head + shoulders. `s` scales the whole figure about (cx, cy).
const person = (cx, cy, s = 1, fill = '#fff') =>
  `<g transform="translate(${cx} ${cy}) scale(${s})" stroke-width="${(1.2 / s).toFixed(2)}">` +
  `<circle cx="0" cy="-2.6" r="2" fill="${fill}"/>` +
  `<path d="M-3.4 4 v-0.7 a3.4 3.4 0 0 1 6.8 0 v0.7" fill="${fill}"/></g>`;

// A shield — every security product wears one so they group visually.
const shield = (fill = WASH) =>
  `<path d="M9 1.9 L15.4 4.3 v5.1 c0 3.6-3 6-6.4 7.1 C5.6 15.4 2.6 13 2.6 9.4 V4.3 z" fill="${fill}"/>`;

// The AI sparkle. Four-point star, the now-universal assistant motif.
const sparkle = (cx, cy, r, fill = '#fff') => {
  const i = r * 0.28; // waist of the star
  return (
    `<path d="M${cx} ${cy - r} C${cx + i} ${cy - i} ${cx + i} ${cy - i} ${cx + r} ${cy} ` +
    `C${cx + i} ${cy + i} ${cx + i} ${cy + i} ${cx} ${cy + r} ` +
    `C${cx - i} ${cy + i} ${cx - i} ${cy + i} ${cx - r} ${cy} ` +
    `C${cx - i} ${cy - i} ${cx - i} ${cy - i} ${cx} ${cy - r} Z" fill="${fill}" stroke-linejoin="round"/>`
  );
};

// A rounded app tile, for the launcher grid.
const tile = (x, y, fill = WASH) =>
  `<rect x="${x}" y="${y}" width="5.6" height="5.6" rx="1.2" fill="${fill}"/>`;

// A chat bubble with a tail on the bottom-left.
const bubble = (x, y, w, h, fill = '#fff') =>
  `<path d="M${x + 1.6} ${y} h${w - 3.2} a1.6 1.6 0 0 1 1.6 1.6 v${h - 3.2} ` +
  `a1.6 1.6 0 0 1 -1.6 1.6 h-${w - 5.4} l-2.4 2.3 v-2.3 h-0.2 ` +
  `a1.6 1.6 0 0 1 -1.6 -1.6 v-${h - 3.2} a1.6 1.6 0 0 1 1.6 -1.6 z" fill="${fill}"/>`;

// A display / screen on a stand — Teams Room, meetings, admin console.
const screen = (fill = WASH) =>
  `<rect x="1.6" y="2.8" width="14.8" height="9.6" rx="1.2" fill="${fill}"/>` +
  `<path d="M9 12.4 v2.4 M6 14.8 h6" stroke-linecap="round"/>`;

// The 3U chassis from the on-prem set, reused verbatim so a hybrid server
// drawn here is visibly the same object as one drawn from On-premises.
const chassis = () => {
  let s = '';
  for (let i = 0; i < 3; i++) {
    const y = 2.6 + i * 4.3;
    s +=
      `<rect x="2.5" y="${y}" width="13" height="3.6" rx="0.7" fill="${WASH}"/>` +
      `<circle cx="4.5" cy="${y + 1.8}" r="0.5" fill="${GREEN}" stroke="none"/>` +
      `<path d="M6.4 ${y + 1.8} h6.8" stroke="${SLATE}"/>`;
  }
  return s;
};

// Badge disc, bottom-right, so a role glyph never fights the body beneath.
const badge = (inner, fill = '#fff') =>
  `<circle cx="13.6" cy="13.6" r="4" fill="${fill}"/>${inner}`;

// ----------------------------------------------------------------------
const ICONS = {
  // ============================== Tenant boundary
  // The one container in the set: a cloud with a building inside it, i.e.
  // "your organisation, hosted".
  tenant: [
    cloud(),
    `<path d="M6.6 13 v-4.2 h4.8 v4.2" fill="#fff"/>`,
    `<path d="M8.1 10.1 h0.9 M10 10.1 h0.9 M8.1 11.7 h0.9 M10 11.7 h0.9" stroke="${SLATE}" stroke-width="1"/>`,
  ],

  // ============================== Mail
  // Exchange Online is the *service*, so the cloud is the body and the mail
  // sits inside it. Outlook below is the client, so mail is the body there.
  'exchange-online': [cloud(), miniEnvelope(9, 9.7, 0.46)],
  outlook: [
    envelope(),
    // Mail *and* calendar — the pairing is what distinguishes the client
    // from the service it talks to.
    `<rect x="9.8" y="9.4" width="6.6" height="6" rx="1" fill="#fff"/>`,
    `<path d="M9.8 11.4 h6.6 M11.6 8.7 v1.4 M14.6 8.7 v1.4" stroke-linecap="round"/>`,
    `<path d="M11.4 13.4 h1.2" stroke="${SLATE}"/>`,
  ],
  'exchange-online-protection': [
    envelope(),
    mini(shield('#fff'), 9, 9.3, 9.4, 9.4, 0.46),
    `<path d="M7.9 9.4 l1 1 1.9-2.1" stroke="${GREEN}" stroke-linecap="round" stroke-linejoin="round"/>`,
  ],
  'exchange-hybrid': [chassis(), badge(miniCloud(13.6, 13.6, 0.4))],

  // ============================== Files & content
  // SharePoint is a *site collection* — linked pages, not one page. That
  // relationship is the thing worth drawing.
  sharepoint: [
    `<rect x="1.8" y="2.4" width="8.4" height="10.4" rx="1" fill="${WASH}"/>`,
    `<path d="M3.8 5.4 h4.4 M3.8 7.6 h4.4 M3.8 9.8 h2.8" stroke="${SLATE}"/>`,
    `<circle cx="13.4" cy="5.2" r="2.4" fill="#fff"/>`,
    `<circle cx="13.4" cy="13" r="2.4" fill="#fff"/>`,
    `<path d="M13.4 7.6 v3" stroke-linecap="round"/>`,
    `<path d="M10.2 11.4 l1.6 0.9" stroke-linecap="round"/>`,
  ],
  onedrive: [
    cloud(),
    // Sync arrow inside the cloud is what separates storage from "internet".
    `<path d="M9 12.4 v-4.6 M7.1 9.6 l1.9-1.9 1.9 1.9" stroke-linecap="round" stroke-linejoin="round"/>`,
  ],
  onenote: [
    `<rect x="3.4" y="2.2" width="11.2" height="13.6" rx="1.2" fill="${WASH}"/>`,
    `<path d="M6.8 2.2 v13.6" />`,
    `<path d="M3.4 5.2 h3.4 M3.4 8.2 h3.4 M3.4 11.2 h3.4" stroke="${SLATE}"/>`,
    `<path d="M8.8 6.4 h3.8 M8.8 9 h3.8 M8.8 11.6 h2.4" stroke="${SLATE}"/>`,
  ],
  loop: [
    // Three components orbiting one workspace — Loop's whole idea.
    `<circle cx="9" cy="9" r="2.2" fill="${WASH}"/>`,
    `<circle cx="9" cy="2.9" r="1.7" fill="#fff"/>`,
    `<circle cx="14.3" cy="12" r="1.7" fill="#fff"/>`,
    `<circle cx="3.7" cy="12" r="1.7" fill="#fff"/>`,
    `<path d="M9 4.6 v2.2 M10.9 10.1 l1.9 1.1 M7.1 10.1 l-1.9 1.1" stroke-linecap="round"/>`,
  ],

  // ============================== Teams
  // Teams is a *conversation with people in it*, so the bubble is the body.
  // Deliberately not a screen — `teams-room` owns the screen motif, and at
  // 18px two screen-based glyphs are indistinguishable.
  teams: [
    bubble(1.2, 2.6, 15.4, 10.6, WASH),
    person(6.2, 7.8, 0.82),
    person(11.8, 7.8, 0.82),
  ],
  'teams-chat': [
    bubble(1.2, 2.2, 11, 7.4, WASH),
    `<path d="M4.2 5 h5 M4.2 7 h3.2" stroke="${SLATE}"/>`,
    bubble(5.8, 8, 11, 6.6, '#fff'),
    `<path d="M8.8 10.8 h5 M8.8 12.6 h3.2" stroke="${SLATE}"/>`,
  ],
  'teams-meeting': [
    `<rect x="1.6" y="4.6" width="10" height="8.8" rx="1.4" fill="${WASH}"/>`,
    `<path d="M11.6 8.2 l4.8-2.8 v7.2 l-4.8-2.8 z" fill="#fff"/>`,
    person(6.6, 9.2, 0.78),
  ],
  'teams-phone': [
    `<rect x="2.4" y="2.4" width="13.2" height="13.2" rx="2.4" fill="${WASH}"/>`,
    `<path d="M6.2 6.4 c0 3.4 2 5.4 5.4 5.4 l1.2-1.8 -2.2-1.2 -1 1 c-0.9-0.5-1.5-1.1-2-2 l1-1 -1.2-2.2 z" fill="#fff" stroke-linejoin="round"/>`,
  ],
  'teams-room': [
    screen(),
    person(6.2, 7.4, 0.66),
    person(11.8, 7.4, 0.66),
    `<path d="M4.4 10.2 h9.2" stroke="${SLATE}"/>`,
  ],

  // ============================== Apps & AI
  apps: [
    tile(2.2, 2.2),
    tile(10.2, 2.2),
    tile(2.2, 10.2),
    tile(10.2, 10.2),
  ],
  copilot: [
    sparkle(7.8, 7.6, 5.4, WASH),
    sparkle(14, 13.2, 2.8, '#fff'),
    `<circle cx="7.8" cy="7.6" r="0.9" fill="${AMBER}" stroke="none"/>`,
  ],
  planner: [
    `<rect x="2.2" y="2.6" width="13.6" height="12.8" rx="1.2" fill="${WASH}"/>`,
    `<path d="M2.2 6 h13.6"/>`,
    `<path d="M5 8.6 l1 1 1.8-2" stroke="${GREEN}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="M9.4 8.8 h4" stroke="${SLATE}"/>`,
    `<path d="M5 12.4 l1 1 1.8-2" stroke="${GREEN}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="M9.4 12.6 h4" stroke="${SLATE}"/>`,
  ],
  forms: [
    page(),
    `<path d="M5.8 8.6 h1 M5.8 11 h1 M5.8 13.2 h1" stroke="${GREEN}" stroke-linecap="round"/>`,
    `<path d="M8.2 8.6 h3.6 M8.2 11 h3.6 M8.2 13.2 h2.4" stroke="${SLATE}"/>`,
  ],
  stream: [
    `<rect x="1.6" y="3.6" width="14.8" height="10.8" rx="1.4" fill="${WASH}"/>`,
    `<path d="M7.4 7 l4.2 2.6 -4.2 2.6 z" fill="#fff" stroke-linejoin="round"/>`,
  ],
  bookings: [
    `<rect x="2.2" y="3.4" width="13.6" height="12.2" rx="1.2" fill="${WASH}"/>`,
    `<path d="M2.2 7 h13.6 M6 2.2 v2.4 M12 2.2 v2.4" stroke-linecap="round"/>`,
    `<path d="M6.4 11.2 l1.4 1.4 3-3.2" stroke="${GREEN}" stroke-linecap="round" stroke-linejoin="round"/>`,
  ],
  viva: [
    person(9, 6.2, 1),
    person(4.4, 11.4, 0.8),
    person(13.6, 11.4, 0.8),
  ],
  'viva-engage': [
    `<path d="M3 7.4 l7.4-3.6 v10.4 L3 10.6 z" fill="${WASH}" stroke-linejoin="round"/>`,
    `<path d="M3 7.4 h-0.6 a1 1 0 0 0 -1 1 v1.2 a1 1 0 0 0 1 1 H3" fill="${WASH}"/>`,
    `<path d="M12.8 6.6 a3.6 3.6 0 0 1 0 4.8" stroke-linecap="round"/>`,
    `<path d="M15 4.8 a6 6 0 0 1 0 8.4" stroke-linecap="round" stroke="${SLATE}"/>`,
  ],

  // ============================== Power Platform
  'power-bi': [
    `<rect x="1.8" y="2.4" width="14.4" height="13.2" rx="1.2" fill="${WASH}"/>`,
    `<path d="M5.2 12.8 v-3.4 M9 12.8 v-6.4 M12.8 12.8 v-4.6" stroke-linecap="round" stroke="${AMBER}"/>`,
  ],
  'power-automate': [
    `<path d="M9.8 1.9 L4.2 9.8 h3.6 l-1.6 6.3 L15 8.2 h-3.6 z" fill="${WASH}" stroke-linejoin="round"/>`,
  ],
  'power-apps': [
    `<path d="M9 1.9 L16.1 9 L9 16.1 L1.9 9 z" fill="${WASH}" stroke-linejoin="round"/>`,
    `<path d="M9 5.6 L12.4 9 L9 12.4 L5.6 9 z" fill="#fff" stroke-linejoin="round"/>`,
  ],

  // ============================== Identity
  'entra-id': [
    shield(),
    person(9, 8.4, 0.94),
  ],
  'entra-connect': [
    // On-prem directory, cloud directory, and the sync between them.
    `<rect x="1.2" y="9.6" width="7" height="6.2" rx="1" fill="${WASH}"/>`,
    `<path d="M3 11.8 h3.4 M3 13.8 h3.4" stroke="${SLATE}"/>`,
    miniCloud(13.2, 5.4, 0.5),
    `<path d="M8.6 11 L11 8.6" stroke-dasharray="1.7 1.3" stroke-linecap="round"/>`,
    `<path d="M9.4 8.6 h1.6 v1.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  ],
  'conditional-access': [
    // A checkpoint barrier. Not another shield — this set already has three,
    // and the point of Conditional Access is the gate, not the armour.
    `<rect x="2.6" y="6.4" width="13.6" height="2.9" rx="0.9" fill="${WASH}"/>`,
    `<path d="M6 6.4 v2.9 M9.4 6.4 v2.9 M12.8 6.4 v2.9" stroke="${SLATE}" stroke-width="1"/>`,
    `<path d="M2.6 4.6 v11 M1.2 15.6 h2.8" stroke-linecap="round"/>`,
    `<path d="M7 12.4 l1.7 1.8 3.8-4.1" stroke="${GREEN}" stroke-linecap="round" stroke-linejoin="round"/>`,
  ],
  mfa: [
    `<rect x="3.4" y="1.8" width="8.2" height="14.4" rx="1.6" fill="${WASH}"/>`,
    `<path d="M6.4 3.6 h2.2" stroke-linecap="round" stroke="${SLATE}"/>`,
    badge(
      `<path d="M11.8 13.6 l1.3 1.4 2.5-2.9" stroke="${GREEN}" stroke-linecap="round" stroke-linejoin="round"/>`,
    ),
  ],

  // ============================== Security & compliance
  'defender-o365': [shield(), miniEnvelope(9, 8.8, 0.5)],
  'defender-cloud-apps': [shield(), miniCloud(9, 8.8, 0.54)],
  purview: [
    page(),
    `<rect x="9.4" y="10.4" width="5.8" height="4.4" rx="0.9" fill="#fff"/>`,
    `<path d="M10.7 10.4 V9.2 a1.6 1.6 0 0 1 3.2 0 v1.2"/>`,
  ],
  dlp: [
    page(),
    `<path d="M5.8 8.6 h4.4 M5.8 10.8 h2.6" stroke="${SLATE}"/>`,
    badge(`<path d="M11.7 13.6 h3.8 M13.6 11.7 v3.8" stroke="${RED}" stroke-linecap="round" transform="rotate(45 13.6 13.6)"/>`),
  ],
  intune: [
    // Managed estate: a laptop and a phone under one policy gear.
    `<path d="M2 11.4 v-6 a1 1 0 0 1 1-1 h6.4 a1 1 0 0 1 1 1 v6" fill="${WASH}"/>`,
    `<path d="M1 11.4 h10.4 l-0.8 1.6 H1.8 z" fill="#fff" stroke-linejoin="round"/>`,
    `<rect x="12" y="6.4" width="4.4" height="8.4" rx="1" fill="${WASH}"/>`,
    `<path d="M13.5 8 h1.4" stroke="${SLATE}" stroke-linecap="round"/>`,
  ],

  // ============================== Service & management
  admin: [
    screen(),
    `<circle cx="9" cy="7.6" r="2" fill="#fff"/>`,
    `<path d="M9 3.9 v1.1 M9 10.2 v1.1 M5.8 7.6 h1.2 M11 7.6 h1.2 M6.7 5.3 l0.9 0.9 M10.4 9 l0.9 0.9 M11.3 5.3 l-0.9 0.9 M7.6 9 l-0.9 0.9" stroke-linecap="round"/>`,
  ],
  // NB: named `health`, not `service-health`. `slugFromFilename()` in
  // build-icon-sprite.mjs strips a leading `NN-icon-service-` (the Azure V24
  // pack ships files called `01-icon-service-Virtual-Machine.svg`), so a file
  // named `..-icon-service-health.svg` silently becomes `health` anyway.
  health: [
    `<rect x="1.6" y="3.4" width="14.8" height="11.2" rx="1.4" fill="${WASH}"/>`,
    `<path d="M3.4 9 h2.6 l1.6-3.2 2.4 6.4 1.6-3.2 h3" stroke="${GREEN}" stroke-linecap="round" stroke-linejoin="round"/>`,
  ],
  endpoints: [
    // The published endpoint list is really "which FQDNs, in which category".
    `<circle cx="7.6" cy="9" r="6.2" fill="${WASH}"/>`,
    `<path d="M1.4 9 h12.4 M7.6 2.8 a9 9 0 0 1 0 12.4 a9 9 0 0 1 0-12.4"/>`,
    badge(`<path d="M11.6 12.6 h4 M11.6 14.6 h4" stroke="${SLATE}" stroke-linecap="round"/>`),
  ],
};

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const names = Object.keys(ICONS);
  let n = 0;
  for (const name of names) {
    n++;
    const parts = ICONS[name];
    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error(`Icon "${name}" produced no artwork`);
    }
    const body = parts.join('\n    ');
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">\n` +
      `  <g fill="none" stroke="${BLUE}" stroke-width="1.2" stroke-linejoin="round">\n` +
      `    ${body}\n` +
      `  </g>\n` +
      `</svg>\n`;
    const file = `${String(n).padStart(2, '0')}-icon-${name}.svg`;
    await writeFile(path.join(OUT, file), svg, 'utf8');
  }
  console.log(`Wrote ${names.length} icons → ${OUT}`);
  console.log(names.join(' '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
