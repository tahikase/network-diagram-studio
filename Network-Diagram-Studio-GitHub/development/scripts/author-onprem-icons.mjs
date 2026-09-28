// One-shot authoring script for the On-premises icon set.
//
// Every path here is drawn from scratch against the same 18x18 grid and
// house style as `custom-svg/People & UI/`. No third-party stencil artwork
// (Cisco, Visio, draw.io) is copied — only the *conventional motif* each
// symbol uses, which is what makes a network diagram readable at a glance.
//
// Run:  node scripts/author-onprem-icons.mjs
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const OUT = 'src/icons/custom-svg/On-premises';

// House palette.
const BLUE = '#0078d4'; // primary stroke
const WASH = '#e6f0fb'; // light fill
const SLATE = '#94a3b8'; // secondary detail
const INK = '#0f172a'; // dark accent
const GREEN = '#22c55e'; // status LED
const RED = '#ef4444'; // security accent

// --- shared motif fragments -------------------------------------------
// A Cisco-style "puck": the squat cylinder that means *routing happens
// here*. Everything that routes is built on this so the family reads as
// one group.
const puck = (fill = WASH) =>
  `<path d="M2 11 v2.4 a7 2.6 0 0 0 14 0 v-2.4 z" fill="${fill}"/>` +
  `<ellipse cx="9" cy="11" rx="7" ry="2.6" fill="#fff"/>`;

// A flat box: the "switching happens here" body.
const flatBox = (fill = WASH) => `<rect x="1.5" y="9.5" width="15" height="6" rx="1" fill="${fill}"/>`;

// Arrow helpers, in the vertical band above a body.
const arrowUp = (x) => `<path d="M${x} 8 v-5.5 M${x - 1.3} 3.8 l1.3-1.3 1.3 1.3"/>`;
const arrowDown = (x) => `<path d="M${x} 2.5 v5.5 M${x - 1.3} 6.7 l1.3 1.3 1.3-1.3"/>`;

// A generic 3U server chassis, used as the base for every server role so
// the roles differ only by the badge in the corner.
const chassis = (rows = 3) => {
  let s = '';
  const h = rows === 3 ? 3.6 : 5.6;
  for (let i = 0; i < rows; i++) {
    const y = 2.6 + i * (h + 0.7);
    s +=
      `<rect x="2.5" y="${y}" width="13" height="${h}" rx="0.7" fill="${WASH}"/>` +
      `<circle cx="4.5" cy="${y + h / 2}" r="0.5" fill="${GREEN}" stroke="none"/>` +
      `<path d="M6.4 ${y + h / 2} h6.8" stroke="${SLATE}"/>`;
  }
  return s;
};

// Badge disc in the bottom-right, so role glyphs never fight the chassis.
const badge = (inner, fill = '#fff') =>
  `<circle cx="13.4" cy="13.4" r="4.1" fill="${fill}"/>${inner}`;

// A cloud outline. `d` is reused by every WAN symbol.
const CLOUD =
  'M4.9 13.4 A3.1 3.1 0 0 1 5.3 7.3 A3.9 3.9 0 0 1 12.7 6.4 ' +
  'A3.1 3.1 0 0 1 13.3 13.4 Z';

// The same cloud shrunk into the badge band above a puck. Stroke width is
// pre-divided by the scale so it still lands on 1.2 after transform.
const miniCloud = (tx, ty, s, fill = '#fff') =>
  `<g transform="translate(${tx} ${ty}) scale(${s})" stroke-width="${(1.2 / s).toFixed(2)}">` +
  `<path d="${CLOUD}" fill="${fill}"/></g>`;

// A building footprint, used by every facility symbol.
const building = (x, w, y) =>
  `<path d="M${x} 15.5 v-${15.5 - y} h${w} v${15.5 - y} z" fill="${WASH}"/>`;

// ----------------------------------------------------------------------
const ICONS = {
  // ============================== Routing & switching
  router: [
    puck(),
    `<path d="M5.4 7.6 v-5.2 M3.9 3.9 l1.5-1.5 1.5 1.5"/>`,
    `<path d="M12.6 2.4 v5.2 M11.1 6.1 l1.5 1.5 1.5-1.5"/>`,
  ],
  'edge-router': [
    puck(),
    `<path d="M5.4 7.6 v-5.2 M3.9 3.9 l1.5-1.5 1.5 1.5"/>`,
    `<path d="M12.6 2.4 v5.2 M11.1 6.1 l1.5 1.5 1.5-1.5"/>`,
    `<path d="M0.8 11 v4" stroke="${RED}" stroke-dasharray="1.4 1.1"/>`,
    `<path d="M17.2 11 v4" stroke="${RED}" stroke-dasharray="1.4 1.1"/>`,
  ],
  // CE vs PE differ by *which side of the demarc they belong to*, so the
  // badge says it: CE wears the customer premises, PE wears the carrier
  // cloud. Same puck underneath — they are both just routers.
  'customer-edge-router': [
    puck(),
    `<path d="M5.2 8.2 v-3.3 L9 2.1 l3.8 2.8 v3.3 z" fill="#fff"/>`,
    `<path d="M8.1 8.2 v-2.1 h1.8 v2.1" stroke="${SLATE}"/>`,
  ],
  'provider-edge-router': [puck(), miniCloud(4.5, 1.1, 0.5)],
  switch: [flatBox(), arrowUp(4.2), arrowDown(7.4), arrowUp(10.6), arrowDown(13.8)],
  'l3-switch': [
    flatBox(),
    `<path d="M3.4 7.8 L 8.2 2.9 M6.3 2.9 h2 v2" stroke-linecap="round"/>`,
    `<path d="M14.6 3.1 L 9.8 8 M11.7 8 h-2 v-2" stroke-linecap="round"/>`,
  ],
  'core-switch': [
    flatBox(),
    arrowUp(4.2),
    arrowDown(7.4),
    arrowUp(10.6),
    arrowDown(13.8),
    `<path d="M4.2 12.5 h9.6" stroke="${BLUE}"/>`,
    `<circle cx="15" cy="12.5" r="0.7" fill="${GREEN}" stroke="none"/>`,
  ],
  'switch-stack': [
    `<rect x="2" y="11.6" width="14" height="3.4" rx="0.8" fill="${WASH}"/>`,
    `<rect x="2" y="7.7" width="14" height="3.4" rx="0.8" fill="${WASH}"/>`,
    `<rect x="2" y="3.8" width="14" height="3.4" rx="0.8" fill="${WASH}"/>`,
    `<path d="M4.2 5.5 h7.6 M4.2 9.4 h7.6 M4.2 13.3 h7.6" stroke="${SLATE}"/>`,
    `<circle cx="14" cy="5.5" r="0.55" fill="${GREEN}" stroke="none"/>`,
    `<circle cx="14" cy="9.4" r="0.55" fill="${GREEN}" stroke="none"/>`,
    `<circle cx="14" cy="13.3" r="0.55" fill="${GREEN}" stroke="none"/>`,
  ],
  'tor-switch': [
    `<rect x="1.5" y="2.5" width="15" height="4" rx="0.8" fill="${WASH}"/>`,
    `<path d="M3.6 4.5 h9" stroke="${SLATE}"/>`,
    `<circle cx="14.6" cy="4.5" r="0.6" fill="${GREEN}" stroke="none"/>`,
    `<path d="M4.5 6.5 v3 M9 6.5 v3 M13.5 6.5 v3" stroke="${SLATE}"/>`,
    `<rect x="2.5" y="9.5" width="13" height="6" rx="0.8" fill="#fff"/>`,
    `<path d="M4.6 11.5 h8.8 M4.6 13.5 h8.8" stroke="${SLATE}"/>`,
  ],
  hub: [flatBox(), arrowUp(4.2), arrowUp(9), arrowUp(13.8)],
  bridge: [
    `<path d="M1.5 13.5 a7.5 6 0 0 1 15 0" fill="${WASH}"/>`,
    `<path d="M1.5 13.5 h15" stroke-linecap="round"/>`,
    `<path d="M5.4 13.5 v-3.1 M9 13.5 v-4.4 M12.6 13.5 v-3.1" stroke="${SLATE}"/>`,
  ],
  modem: [
    `<rect x="1.5" y="8.5" width="15" height="6.5" rx="1" fill="${WASH}"/>`,
    `<circle cx="4.2" cy="11.8" r="0.6" fill="${GREEN}" stroke="none"/>`,
    `<circle cx="6.4" cy="11.8" r="0.6" fill="${GREEN}" stroke="none"/>`,
    `<path d="M9.4 11.8 h5" stroke="${SLATE}"/>`,
    `<path d="M6.6 6.3 a4.2 4.2 0 0 1 4.8 0"/>`,
    `<path d="M4.7 3.9 a7.6 7.6 0 0 1 8.6 0"/>`,
  ],
  'patch-panel': [
    `<rect x="1.5" y="4.5" width="15" height="9" rx="1" fill="${WASH}"/>`,
    `<path d="M3.4 6.6 h1.6 v1.9 h-1.6 z M6.6 6.6 h1.6 v1.9 h-1.6 z M9.8 6.6 h1.6 v1.9 h-1.6 z M13 6.6 h1.6 v1.9 h-1.6 z" fill="#fff" stroke="${SLATE}"/>`,
    `<path d="M3.4 9.9 h1.6 v1.9 h-1.6 z M6.6 9.9 h1.6 v1.9 h-1.6 z M9.8 9.9 h1.6 v1.9 h-1.6 z M13 9.9 h1.6 v1.9 h-1.6 z" fill="#fff" stroke="${SLATE}"/>`,
  ],
  nic: [
    `<rect x="2" y="5" width="14" height="8" rx="0.8" fill="${WASH}"/>`,
    `<path d="M5.5 13 v2 M12.5 13 v2" stroke="${SLATE}"/>`,
    `<rect x="6.4" y="7" width="5.2" height="4" rx="0.5" fill="#fff" stroke="${SLATE}"/>`,
    `<path d="M8 7 v-1.2 M10 7 v-1.2" stroke="${SLATE}"/>`,
  ],

  // ============================== Security
  firewall: [
    `<rect x="1.5" y="3.5" width="15" height="11" rx="0.8" fill="${WASH}"/>`,
    `<path d="M1.5 7.2 h15 M1.5 10.8 h15"/>`,
    `<path d="M6.5 3.5 v3.7 M11.5 3.5 v3.7"/>`,
    `<path d="M4 7.2 v3.6 M9 7.2 v3.6 M14 7.2 v3.6"/>`,
    `<path d="M6.5 10.8 v3.7 M11.5 10.8 v3.7"/>`,
  ],
  'next-gen-firewall': [
    `<rect x="1.5" y="3.5" width="15" height="11" rx="0.8" fill="${WASH}"/>`,
    `<path d="M1.5 7.2 h15 M1.5 10.8 h15"/>`,
    `<path d="M6.5 3.5 v3.7 M4 7.2 v3.6 M6.5 10.8 v3.7"/>`,
    badge(
      `<path d="M13.4 10.1 l3.1 1.3 v2.1 a3.4 3.4 0 0 1 -3.1 3.1 a3.4 3.4 0 0 1 -3.1-3.1 v-2.1 z" fill="${RED}" stroke="${RED}"/>` +
        `<path d="M11.9 13.4 l1 1 1.9-2" stroke="#fff" stroke-linecap="round"/>`,
    ),
  ],
  'ids-ips': [
    `<rect x="1.5" y="3.5" width="15" height="11" rx="0.8" fill="${WASH}"/>`,
    `<path d="M1.5 7.2 h15 M1.5 10.8 h15" stroke="${SLATE}"/>`,
    `<path d="M6.5 3.5 v3.7 M4 7.2 v3.6" stroke="${SLATE}"/>`,
    `<circle cx="11.4" cy="9.2" r="3.4" fill="#fff"/>`,
    `<path d="M13.9 11.7 L16.4 14.4" stroke-linecap="round"/>`,
  ],
  proxy: [
    `<rect x="5.6" y="4.4" width="6.8" height="9.2" rx="1" fill="${WASH}"/>`,
    `<path d="M0.8 7 h4.8 M4 5.7 l1.6 1.3 -1.6 1.3" stroke-linecap="round"/>`,
    `<path d="M12.4 11 h4.8 M15.6 9.7 l1.6 1.3 -1.6 1.3" stroke-linecap="round"/>`,
    `<path d="M9 8.2 v1.6" stroke="${SLATE}"/>`,
  ],
  'vpn-concentrator': [
    puck(),
    `<rect x="6.2" y="4.4" width="5.6" height="4" rx="0.8" fill="#fff"/>`,
    `<path d="M7.4 4.4 v-1.2 a1.6 1.6 0 0 1 3.2 0 v1.2"/>`,
    `<circle cx="9" cy="6.4" r="0.7" fill="${BLUE}" stroke="none"/>`,
  ],
  'ipsec-tunnel': [
    `<path d="M1.2 15 v-3.6 a7.8 7.8 0 0 1 15.6 0 v3.6" fill="${WASH}"/>`,
    `<path d="M5.1 15 v-3.6 a3.9 3.9 0 0 1 7.8 0 v3.6" fill="#fff"/>`,
    `<path d="M3.2 15 h11.6" stroke="${SLATE}"/>`,
    `<path d="M6.6 12.6 h4.8 M10 11.2 l1.4 1.4 -1.4 1.4" stroke-linecap="round"/>`,
  ],
  dmz: [
    `<rect x="1" y="5" width="16" height="8" rx="1" fill="${WASH}"/>`,
    `<path d="M6 5 v8 M12 5 v8" stroke-dasharray="1.6 1.2"/>`,
    `<circle cx="3.5" cy="9" r="1.3" fill="#fff" stroke="${SLATE}"/>`,
    `<circle cx="9" cy="9" r="1.3" fill="#fff"/>`,
    `<circle cx="14.5" cy="9" r="1.3" fill="#fff" stroke="${SLATE}"/>`,
  ],
  'load-balancer': [
    `<rect x="1.5" y="6.4" width="6" height="5.2" rx="1" fill="${WASH}"/>`,
    `<path d="M7.5 9 h2.4"/>`,
    `<path d="M9.9 9 v-5.2 h1.9 M9.9 9 h1.9 M9.9 9 v5.2 h1.9" stroke="${SLATE}"/>`,
    `<circle cx="13.6" cy="3.8" r="1.7" fill="#fff"/>`,
    `<circle cx="13.6" cy="9" r="1.7" fill="#fff"/>`,
    `<circle cx="13.6" cy="14.2" r="1.7" fill="#fff"/>`,
  ],
  'radius-server': [
    chassis(2),
    badge(
      `<circle cx="12.4" cy="12.6" r="1.9" fill="none" stroke="${BLUE}"/>` +
        `<path d="M13.9 13.6 L16.6 16.3 M15.2 14.9 l-0.9 0.9" stroke="${BLUE}" stroke-linecap="round"/>`,
    ),
  ],

  // ============================== WAN / connectivity
  'wan-cloud': [`<path d="${CLOUD}" fill="${WASH}"/>`],
  'internet-cloud': [
    `<path d="${CLOUD}" fill="${WASH}"/>`,
    `<circle cx="9" cy="9.9" r="3.1" fill="#fff"/>`,
    `<path d="M5.9 9.9 h6.2 M9 6.8 a4.4 4.4 0 0 1 0 6.2 a4.4 4.4 0 0 1 0-6.2" stroke="${SLATE}"/>`,
  ],
  'mpls-cloud': [
    `<path d="${CLOUD}" fill="${WASH}"/>`,
    `<path d="M5.4 8.4 h4.6 l1.9 1.9 -1.9 1.9 h-4.6 z" fill="#fff"/>`,
    `<circle cx="7" cy="10.3" r="0.6" fill="${BLUE}" stroke="none"/>`,
  ],
  'leased-line': [
    `<rect x="0.8" y="6.6" width="4.4" height="4.8" rx="0.8" fill="${WASH}"/>`,
    `<rect x="12.8" y="6.6" width="4.4" height="4.8" rx="0.8" fill="${WASH}"/>`,
    `<path d="M5.2 9 h7.6" stroke-width="1.6"/>`,
    `<path d="M9 6 v6" stroke="${SLATE}" stroke-dasharray="1.2 1"/>`,
  ],
  'demarcation-point': [
    `<path d="M9 1.5 v15" stroke-dasharray="1.8 1.3"/>`,
    `<rect x="1" y="6.4" width="6" height="5.2" rx="0.8" fill="${WASH}"/>`,
    `<path d="M11 9 a3 3 0 0 1 6 0 a3 3 0 0 1 -6 0" fill="${WASH}"/>`,
    `<path d="M7 9 h2 M9 9 h2" stroke="${SLATE}"/>`,
  ],
  'cross-connect': [
    `<rect x="1" y="2.5" width="4" height="13" rx="0.8" fill="${WASH}"/>`,
    `<rect x="13" y="2.5" width="4" height="13" rx="0.8" fill="${WASH}"/>`,
    `<path d="M5 5.6 L13 12.4" stroke-linecap="round"/>`,
    `<path d="M5 12.4 L13 5.6" stroke-linecap="round"/>`,
  ],
  // A carrier trunk running through the provider cloud. The first draft
  // put a triangle here, which just read as the letter "A".
  'telco-carrier': [
    `<path d="${CLOUD}" fill="${WASH}"/>`,
    `<path d="M4 10.2 h10" stroke-width="1.8" stroke-linecap="round"/>`,
    `<path d="M6.2 8.4 v3.6 M9 8.4 v3.6 M11.8 8.4 v3.6" stroke="${SLATE}"/>`,
  ],
  'cell-tower': [
    `<path d="M6.6 15.5 L8.2 6.6 h1.6 L11.4 15.5" fill="${WASH}"/>`,
    `<path d="M7.4 11.5 h3.2 M7 13.5 h4" stroke="${SLATE}"/>`,
    `<path d="M6.2 5.4 a4 4 0 0 1 5.6 0"/>`,
    `<path d="M4.4 3.2 a7.2 7.2 0 0 1 9.2 0"/>`,
  ],
  'satellite-dish': [
    `<path d="M2.6 12.6 A7.4 7.4 0 0 1 12.6 2.6 z" fill="${WASH}"/>`,
    `<path d="M7.6 7.6 L12.4 12.4" stroke="${SLATE}"/>`,
    `<path d="M9.6 14.8 h5.4 M12.3 14.8 v-3.4" stroke-linecap="round"/>`,
    `<circle cx="12.3" cy="10.4" r="1.1" fill="#fff"/>`,
  ],
  'sd-wan': [
    `<path d="${CLOUD}" fill="${WASH}"/>`,
    `<circle cx="6" cy="10.4" r="1.3" fill="#fff"/>`,
    `<circle cx="12" cy="10.4" r="1.3" fill="#fff"/>`,
    `<circle cx="9" cy="6.6" r="1.3" fill="#fff"/>`,
    `<path d="M7.3 10.4 h3.4 M6.8 9.3 L8.2 7.6 M11.2 9.3 L9.8 7.6" stroke="${SLATE}"/>`,
  ],
  'pstn-cloud': [
    `<path d="${CLOUD}" fill="${WASH}"/>`,
    `<path d="M6.4 12.2 v-2.4 a2.7 2.2 0 0 1 5.2 0 v2.4" fill="#fff"/>`,
    `<path d="M6.4 12.2 h1.5 v-1.2 h-1.5 z M10.1 12.2 h1.5 v-1.2 h-1.5 z" fill="${BLUE}"/>`,
  ],
  // The Microsoft Enterprise Edge router. There is no official icon — the
  // convention is a CE/PE-style puck sitting at the Azure boundary, so
  // this is a puck wearing the Azure corner mark.
  msee: [
    puck(),
    `<path d="M9 2.2 L13.4 8.4 h-2.6 L9 5.4 L7.2 8.4 h-2.6 z" fill="${BLUE}" stroke="${BLUE}"/>`,
    `<path d="M4.6 8.4 h8.8" stroke="${SLATE}"/>`,
  ],
  'peering-location': [
    `<rect x="1.2" y="3.4" width="15.6" height="11.2" rx="1" fill="#fff" stroke-dasharray="2 1.4"/>`,
    `<path d="M3.4 12.6 v-5.2 h4.4 v5.2 z" fill="${WASH}" stroke="${BLUE}"/>`,
    `<path d="M10.2 12.6 v-5.2 h4.4 v5.2 z" fill="${WASH}" stroke="${BLUE}"/>`,
    `<path d="M7.8 10 h2.4" stroke-width="1.6"/>`,
  ],
  'nat-device': [
    flatBox(),
    `<path d="M3.4 12.5 h9" stroke="${SLATE}"/>`,
    `<path d="M2.6 4.2 h9.4 M10.4 2.8 l1.6 1.4 -1.6 1.4" stroke-linecap="round"/>`,
    `<path d="M15.4 7.6 h-9.4 M7.6 6.2 l-1.6 1.4 1.6 1.4" stroke-linecap="round"/>`,
  ],

  // ============================== Servers by role
  'rack-server': [chassis(3)],
  'tower-server': [
    `<rect x="5" y="1.8" width="8" height="14.4" rx="1" fill="${WASH}"/>`,
    `<path d="M6.8 3.8 h4.4 M6.8 5.8 h4.4" stroke="${SLATE}"/>`,
    `<rect x="6.8" y="7.8" width="4.4" height="3.4" rx="0.5" fill="#fff" stroke="${SLATE}"/>`,
    `<circle cx="7.9" cy="13.6" r="0.6" fill="${GREEN}" stroke="none"/>`,
    `<path d="M9.6 13.6 h1.6" stroke="${SLATE}"/>`,
  ],
  'adfs-server': [
    chassis(2),
    badge(
      `<path d="M13.4 10.1 l3.1 1.3 v2 a3.4 3.4 0 0 1 -3.1 3.1 a3.4 3.4 0 0 1 -3.1-3.1 v-2 z" fill="#fff" stroke="${BLUE}"/>` +
        `<path d="M13.4 12 v2.6 M12.1 13.3 h2.6" stroke="${BLUE}" stroke-linecap="round"/>`,
    ),
  ],
  'blade-server': [
    `<rect x="1.5" y="2.5" width="15" height="13" rx="1" fill="${WASH}"/>`,
    `<path d="M4 4.4 h1.8 v9.2 h-1.8 z M7 4.4 h1.8 v9.2 h-1.8 z M10 4.4 h1.8 v9.2 h-1.8 z M13 4.4 h1.8 v9.2 h-1.8 z" fill="#fff" stroke="${SLATE}"/>`,
  ],
  mainframe: [
    `<rect x="3" y="1.8" width="12" height="14.4" rx="1" fill="${WASH}"/>`,
    `<path d="M5.2 4.2 h7.6 M5.2 6.6 h7.6 M5.2 9 h7.6" stroke="${SLATE}"/>`,
    `<rect x="5.2" y="11" width="7.6" height="3.4" rx="0.5" fill="#fff" stroke="${SLATE}"/>`,
    `<circle cx="6.8" cy="12.7" r="0.6" fill="${GREEN}" stroke="none"/>`,
  ],
  hypervisor: [
    `<rect x="1.5" y="10.6" width="15" height="4.9" rx="1" fill="${WASH}"/>`,
    `<path d="M3.6 13 h8.4" stroke="${SLATE}"/>`,
    `<circle cx="14.4" cy="13" r="0.6" fill="${GREEN}" stroke="none"/>`,
    `<rect x="2" y="2.5" width="4.4" height="6.4" rx="0.7" fill="#fff"/>`,
    `<rect x="6.8" y="2.5" width="4.4" height="6.4" rx="0.7" fill="#fff"/>`,
    `<rect x="11.6" y="2.5" width="4.4" height="6.4" rx="0.7" fill="#fff"/>`,
  ],
  'domain-controller': [
    chassis(2),
    badge(
      `<circle cx="12.2" cy="12.4" r="1.8" fill="none" stroke="${BLUE}"/>` +
        `<path d="M13.6 13.6 L16.4 16.4 M15.1 15.1 l1-1" stroke="${BLUE}" stroke-linecap="round"/>`,
    ),
  ],
  'dns-server': [
    chassis(2),
    badge(
      `<circle cx="13.4" cy="13.4" r="3.1" fill="#fff" stroke="${BLUE}"/>` +
        `<path d="M10.3 13.4 h6.2 M13.4 10.3 a4.4 4.4 0 0 1 0 6.2 a4.4 4.4 0 0 1 0-6.2" stroke="${SLATE}"/>`,
    ),
  ],
  'dhcp-server': [
    chassis(2),
    badge(
      `<rect x="10" y="11.6" width="6.8" height="3.6" rx="0.7" fill="#fff" stroke="${BLUE}"/>` +
        `<path d="M11.2 13.4 h4.4" stroke="${SLATE}"/>`,
    ),
  ],
  'ntp-server': [
    chassis(2),
    badge(
      `<circle cx="13.4" cy="13.4" r="3.1" fill="#fff" stroke="${BLUE}"/>` +
        `<path d="M13.4 11.3 v2.1 h1.8" stroke="${BLUE}" stroke-linecap="round"/>`,
    ),
  ],
  'mail-server': [
    chassis(2),
    badge(
      `<rect x="10.1" y="11.3" width="6.6" height="4.4" rx="0.6" fill="#fff" stroke="${BLUE}"/>` +
        `<path d="M10.1 11.6 l3.3 2.4 3.3-2.4" stroke="${BLUE}"/>`,
    ),
  ],
  'web-server': [
    chassis(2),
    badge(
      `<rect x="10.1" y="11.1" width="6.6" height="4.8" rx="0.6" fill="#fff" stroke="${BLUE}"/>` +
        `<path d="M10.1 12.7 h6.6" stroke="${BLUE}"/>` +
        `<circle cx="11.3" cy="11.9" r="0.4" fill="${SLATE}" stroke="none"/>`,
    ),
  ],
  'file-server': [
    chassis(2),
    badge(
      `<path d="M10.1 15.7 v-4.6 h2.4 l0.9 1.1 h3.3 v3.5 z" fill="#fff" stroke="${BLUE}"/>`,
    ),
  ],
  'print-server': [
    chassis(2),
    badge(
      `<rect x="10.2" y="12.2" width="6.4" height="3.2" rx="0.6" fill="#fff" stroke="${BLUE}"/>` +
        `<path d="M11.7 12.2 v-1.4 h3.4 v1.4" stroke="${BLUE}"/>`,
    ),
  ],
  'database-server': [
    `<path d="M3.5 4.4 v9.2 a5.5 2.2 0 0 0 11 0 v-9.2 z" fill="${WASH}"/>`,
    `<ellipse cx="9" cy="4.4" rx="5.5" ry="2.2" fill="#fff"/>`,
    `<path d="M3.5 7.8 a5.5 2.2 0 0 0 11 0" stroke="${SLATE}"/>`,
    `<path d="M3.5 11 a5.5 2.2 0 0 0 11 0" stroke="${SLATE}"/>`,
  ],
  'backup-server': [
    chassis(2),
    badge(
      `<path d="M16.2 13.4 a2.8 2.8 0 1 1 -0.9-2" fill="none" stroke="${BLUE}" stroke-linecap="round"/>` +
        `<path d="M15.4 8.8 v2.8 h-2.8" stroke="${BLUE}" stroke-linecap="round"/>`,
    ),
  ],
  'jump-box': [
    chassis(2),
    badge(
      `<circle cx="11.9" cy="12.2" r="1.7" fill="none" stroke="${BLUE}"/>` +
        `<path d="M13.2 13.5 L16.4 16.7 M15 15.3 l1-1" stroke="${BLUE}" stroke-linecap="round"/>` +
        `<path d="M9.6 9.6 h2" stroke="${GREEN}"/>`,
    ),
  ],

  // ============================== Storage
  nas: [
    `<rect x="2.5" y="2.5" width="13" height="13" rx="1" fill="${WASH}"/>`,
    `<path d="M4.6 4.6 h4 v8.8 h-4 z" fill="#fff" stroke="${SLATE}"/>`,
    `<path d="M10 5.4 h3.4 M10 7.6 h3.4 M10 9.8 h3.4" stroke="${SLATE}"/>`,
    `<circle cx="11.7" cy="12.4" r="0.6" fill="${GREEN}" stroke="none"/>`,
  ],
  // A SAN is a *fabric* plus a disk shelf — drawing only the shelf makes it
  // indistinguishable from a rack server, which is exactly the mistake the
  // first draft made.
  san: [
    `<rect x="4.5" y="2.2" width="9" height="3.2" rx="0.8" fill="#fff"/>`,
    `<path d="M6.4 3.8 h4.4" stroke="${SLATE}"/>`,
    `<circle cx="12.2" cy="3.8" r="0.55" fill="${GREEN}" stroke="none"/>`,
    `<path d="M6.6 5.4 L4.6 9.2 M11.4 5.4 L13.4 9.2" stroke="${SLATE}"/>`,
    `<rect x="1.5" y="9.4" width="15" height="6.2" rx="1" fill="${WASH}"/>`,
    `<path d="M3.4 11.2 h2.2 v2.6 h-2.2 z M6.5 11.2 h2.2 v2.6 h-2.2 z M9.6 11.2 h2.2 v2.6 h-2.2 z M12.7 11.2 h2.2 v2.6 h-2.2 z" fill="#fff" stroke="${SLATE}"/>`,
  ],
  'tape-library': [
    `<rect x="1.5" y="3.5" width="15" height="11" rx="1" fill="${WASH}"/>`,
    `<circle cx="6.4" cy="9" r="2.6" fill="#fff"/>`,
    `<circle cx="11.6" cy="9" r="2.6" fill="#fff"/>`,
    `<circle cx="6.4" cy="9" r="0.8" fill="${SLATE}" stroke="none"/>`,
    `<circle cx="11.6" cy="9" r="0.8" fill="${SLATE}" stroke="none"/>`,
  ],
  'disk-array': [
    `<rect x="2.5" y="2.5" width="13" height="13" rx="1" fill="${WASH}"/>`,
    `<path d="M4.6 4.6 h2.4 v8.8 h-2.4 z M7.8 4.6 h2.4 v8.8 h-2.4 z M11 4.6 h2.4 v8.8 h-2.4 z" fill="#fff" stroke="${SLATE}"/>`,
  ],

  // ============================== Facility
  datacenter: [
    building(2, 14, 4.5),
    `<path d="M2 4.5 L9 1.2 L16 4.5" fill="${SLATE}"/>`,
    `<rect x="4.2" y="6.6" width="9.6" height="2.4" rx="0.4" fill="#fff" stroke="${SLATE}"/>`,
    `<rect x="4.2" y="10.2" width="9.6" height="2.4" rx="0.4" fill="#fff" stroke="${SLATE}"/>`,
    `<circle cx="5.8" cy="7.8" r="0.5" fill="${GREEN}" stroke="none"/>`,
    `<circle cx="5.8" cy="11.4" r="0.5" fill="${GREEN}" stroke="none"/>`,
  ],
  'branch-office': [
    building(4, 10, 6.5),
    `<path d="M3 6.5 L9 2.6 L15 6.5" fill="${SLATE}"/>`,
    `<rect x="6" y="8.6" width="2.4" height="2.4" fill="#fff" stroke="${SLATE}"/>`,
    `<rect x="9.6" y="8.6" width="2.4" height="2.4" fill="#fff" stroke="${SLATE}"/>`,
    `<path d="M7.8 15.5 v-2.4 h2.4 v2.4" fill="#fff"/>`,
  ],
  'corporate-hq': [
    building(2.5, 6, 3),
    building(9.5, 6, 6.5),
    `<path d="M4 5 h3 M4 7.4 h3 M4 9.8 h3 M4 12.2 h3" stroke="${SLATE}"/>`,
    `<path d="M11 8.4 h3 M11 10.8 h3 M11 13.2 h3" stroke="${SLATE}"/>`,
  ],
  rack: [
    `<rect x="3.5" y="1.8" width="11" height="14.4" rx="0.8" fill="${WASH}"/>`,
    `<path d="M5.2 3.8 h8.6 v2 h-8.6 z M5.2 6.6 h8.6 v2 h-8.6 z M5.2 9.4 h8.6 v2 h-8.6 z M5.2 12.2 h8.6 v2 h-8.6 z" fill="#fff" stroke="${SLATE}"/>`,
  ],
  ups: [
    `<rect x="3.5" y="2.5" width="11" height="13" rx="1" fill="${WASH}"/>`,
    `<path d="M9.6 4.8 L6.6 9.6 h2.4 l-0.6 3.8 3-4.8 h-2.4 z" fill="${GREEN}" stroke="${GREEN}" stroke-linejoin="round"/>`,
    `<path d="M5.6 14 h6.8" stroke="${SLATE}"/>`,
  ],
  pdu: [
    `<rect x="6.4" y="1.2" width="5.2" height="15.6" rx="1" fill="${WASH}"/>`,
    `<path d="M7.9 3 h2.2 v2 h-2.2 z M7.9 6.4 h2.2 v2 h-2.2 z M7.9 9.8 h2.2 v2 h-2.2 z M7.9 13.2 h2.2 v2 h-2.2 z" fill="#fff" stroke="${SLATE}"/>`,
  ],
  kvm: [
    `<rect x="2" y="2.8" width="14" height="8.4" rx="1" fill="${WASH}"/>`,
    `<path d="M4 5 h10 v3.8 h-10 z" fill="#fff" stroke="${SLATE}"/>`,
    `<path d="M2 13.4 h14 v1.8 h-14 z" fill="${SLATE}"/>`,
    `<path d="M9 11.2 v2.2" stroke="${SLATE}"/>`,
  ],

  // ============================== Wireless
  'access-point': [
    `<rect x="4.5" y="11.4" width="9" height="3.2" rx="1.4" fill="${WASH}"/>`,
    `<circle cx="6.6" cy="13" r="0.55" fill="${GREEN}" stroke="none"/>`,
    `<path d="M6.4 9.2 a3.7 3.7 0 0 1 5.2 0"/>`,
    `<path d="M4.4 6.6 a6.6 6.6 0 0 1 9.2 0"/>`,
    `<path d="M2.4 4 a9.4 9.4 0 0 1 13.2 0" stroke="${SLATE}"/>`,
  ],
  'wireless-controller': [
    flatBox(),
    `<path d="M4 12.5 h7.4" stroke="${SLATE}"/>`,
    `<circle cx="14" cy="12.5" r="0.6" fill="${GREEN}" stroke="none"/>`,
    `<path d="M6.4 7.2 a3.7 3.7 0 0 1 5.2 0"/>`,
    `<path d="M4.4 4.6 a6.6 6.6 0 0 1 9.2 0"/>`,
  ],
  antenna: [
    `<path d="M9 15.5 v-9"/>`,
    `<path d="M6.4 15.5 h5.2" stroke-linecap="round"/>`,
    `<circle cx="9" cy="5.4" r="1.3" fill="${WASH}"/>`,
    `<path d="M5.8 3.4 a4.6 4.6 0 0 1 6.4 0" stroke="${SLATE}"/>`,
    `<path d="M7.2 8.4 h3.6" stroke="${SLATE}"/>`,
  ],

  // ============================== End-user devices
  workstation: [
    `<rect x="1.5" y="2.8" width="15" height="9.4" rx="1" fill="${WASH}"/>`,
    `<path d="M3.6 4.9 h10.8 v5.2 h-10.8 z" fill="#fff" stroke="${SLATE}"/>`,
    `<path d="M9 12.2 v2.2 M6 14.6 h6" stroke-linecap="round"/>`,
  ],
  'thin-client': [
    `<rect x="2" y="3.4" width="10.4" height="7.4" rx="0.8" fill="${WASH}"/>`,
    `<path d="M7.2 10.8 v1.8 M4.8 12.6 h4.8" stroke-linecap="round"/>`,
    `<rect x="13.2" y="8.4" width="3.2" height="7" rx="0.7" fill="#fff"/>`,
    `<circle cx="14.8" cy="10.2" r="0.5" fill="${GREEN}" stroke="none"/>`,
  ],
  'ip-phone': [
    `<path d="M2.5 15.2 v-5.4 h13 v5.4 z" fill="${WASH}"/>`,
    `<path d="M4.4 11.2 h4 M4.4 13.2 h4" stroke="${SLATE}"/>`,
    `<rect x="10" y="10.8" width="4" height="3.6" rx="0.6" fill="#fff" stroke="${SLATE}"/>`,
    `<path d="M3.6 9.8 v-2.6 a5.4 4.4 0 0 1 10.8 0 v2.6" fill="#fff"/>`,
    `<path d="M6.6 7.4 h4.8" stroke="${SLATE}"/>`,
  ],
  'pbx-voice-gateway': [
    `<rect x="1.5" y="4.5" width="15" height="9" rx="1" fill="${WASH}"/>`,
    `<path d="M4 11.6 v-2.4 a3.4 2.8 0 0 1 6.8 0 v2.4" fill="#fff"/>`,
    `<path d="M4 11.6 h1.9 v-1.4 h-1.9 z M8.9 11.6 h1.9 v-1.4 h-1.9 z" fill="${BLUE}"/>`,
    `<circle cx="13.6" cy="7.4" r="0.6" fill="${GREEN}" stroke="none"/>`,
    `<path d="M12.4 10.4 h2.4" stroke="${SLATE}"/>`,
  ],
  printer: [
    `<path d="M4.4 6.6 v-3.4 h9.2 v3.4" fill="#fff"/>`,
    `<rect x="1.5" y="6.6" width="15" height="5.6" rx="1" fill="${WASH}"/>`,
    `<circle cx="13.8" cy="8.6" r="0.6" fill="${GREEN}" stroke="none"/>`,
    `<path d="M4.4 12.2 v3.4 h9.2 v-3.4 z" fill="#fff"/>`,
    `<path d="M6.2 13.8 h5.6" stroke="${SLATE}"/>`,
  ],
  scanner: [
    `<rect x="1.5" y="8" width="15" height="6" rx="1" fill="${WASH}"/>`,
    `<path d="M3.4 8 v-4.4 h11.2 v4.4" fill="#fff"/>`,
    `<path d="M3.4 11 h11.2" stroke="${RED}"/>`,
    `<path d="M5.6 5.6 h5.6" stroke="${SLATE}"/>`,
  ],

  // ============================== Ops / management
  monitoring: [
    `<rect x="1.5" y="2.8" width="15" height="10.4" rx="1" fill="${WASH}"/>`,
    `<path d="M3.6 10.4 l2.8-3.4 2.2 2 2.4-3.4 3.4 4.8" fill="none" stroke="${GREEN}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="M9 13.2 v2.2 M6 15.4 h6" stroke-linecap="round"/>`,
  ],
  syslog: [
    `<path d="M3.5 15.5 v-13 h7.4 l3.6 3.6 v9.4 z" fill="${WASH}"/>`,
    `<path d="M10.9 2.5 v3.6 h3.6" fill="#fff"/>`,
    `<path d="M5.6 8.6 h6.8 M5.6 10.8 h6.8 M5.6 13 h4.4" stroke="${SLATE}"/>`,
  ],
  'jump-host-console': [
    `<rect x="1.5" y="3" width="15" height="12" rx="1" fill="${INK}" stroke="${INK}"/>`,
    `<path d="M4 7 l2.2 2 -2.2 2" stroke="${GREEN}" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="M8.2 11.4 h5.4" stroke="${GREEN}" stroke-linecap="round"/>`,
  ],
};

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const names = Object.keys(ICONS);
  let n = 0;
  for (const name of names) {
    n++;
    const body = ICONS[name].join('\n    ');
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
