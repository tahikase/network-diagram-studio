// Tier-aware layout — turns a raw Diagram into a "professional" one.
//
// Consumed by `relayoutForNoOverlap` in auto-layout.ts as its packer of
// choice when a parent needs to be re-arranged. The existing skip-if-
// clean logic in auto-layout.ts still decides WHEN to relayout, so hand-
// arranged user diagrams round-trip untouched.
//
// The core idea: instead of packing children in insertion order via a
// naive row-flow (which puts WAF next to VMs and DNS between Storage
// and Bastion), we classify every leaf into a semantic ROLE, group into
// TIERS, then stack tiers top-to-bottom with row-flow within each tier.
// This is how a professional Azure architecture diagram is drawn: the
// user's eye moves top-to-bottom following the packet path from edge
// through security through compute to data.

import type { DiagramNode } from './types';
import { getResourceType } from './resource-types';
import { customFieldLabel } from './custom-fields';
import { leafAppearance } from './leaf-appearance';
import { runtimeExtensions } from '../runtime/extensions';
import { DIAGRAM_TYPE_SCALE } from '../theme/type-scale';
import { measureTextPx, wrappedLineCount } from './text-metrics';

// ── Role classification ────────────────────────────────────────────────
//
// One role per slug. Roles are grouped into tiers by TIER_OF below.

export type Role =
  | 'external'
  | 'edge-ingress'
  | 'security'
  | 'network'
  | 'endpoint'
  | 'compute'
  | 'data'
  | 'dns'
  | 'observability'
  | 'management'
  | 'unknown';

const SLUG_ROLE: Record<string, Role> = {
  // Groups — handled separately as containers, but we still classify so
  // sub-groups (e.g. a subnet inside a VNet) get placed in the right tier.
  'group-region': 'external',
  'group-subscription': 'external',
  'group-rg': 'external',
  'group-onprem': 'external',
  'group-vnet': 'network',
  'group-subnet': 'network',

  // External / people
  user: 'external',
  internet: 'external',
  'people-client': 'external',
  'people-admin': 'external',
  'people-mobile': 'external',
  'people-laptop': 'external',
  'people-server': 'external',
  'people-stick-figure': 'external',
  'people-terminal': 'external',
  'people-azure-portal': 'external',

  // Edge / ingress (public-facing entry points)
  'front-door': 'edge-ingress',
  'traffic-manager': 'edge-ingress',
  appgw: 'edge-ingress',
  'appgw-containers': 'edge-ingress',
  lb: 'edge-ingress',
  pip: 'edge-ingress',
  'pip-prefix': 'edge-ingress',
  nat: 'edge-ingress',
  'vpn-gw': 'edge-ingress',
  'er-gw': 'edge-ingress',
  'er-circuit': 'edge-ingress',
  'local-gw': 'edge-ingress',
  connection: 'edge-ingress',
  vwan: 'edge-ingress',
  'vwan-hub': 'edge-ingress',

  // Security
  firewall: 'security',
  'firewall-policy': 'security',
  'waf-policy': 'security',
  bastion: 'security',
  'ddos-plan': 'security',
  nva: 'security',
  'network-watcher': 'security',

  // Network plumbing
  nsg: 'network',
  asg: 'network',
  udr: 'network',
  nic: 'network',
  'ip-group': 'network',

  // Endpoint
  'private-endpoint': 'endpoint',
  'private-link-service': 'endpoint',

  // Compute
  vm: 'compute',
  vmss: 'compute',
  aks: 'compute',
  'app-service': 'compute',
  'function-app': 'compute',
  'container-instance': 'compute',
  'container-registry': 'compute',
  'api-management': 'compute',

  // Data
  storage: 'data',
  'sql-db': 'data',
  cosmos: 'data',
  'key-vault': 'data',

  // DNS
  'dns-zone': 'dns',
  'dns-resolver': 'dns',
};

// ── Tier ordering ──────────────────────────────────────────────────────
//
// Smaller number = closer to the top. Tiers with no children collapse
// (do not consume vertical space).
const TIER_OF: Record<Role, number> = {
  external: 0,
  'edge-ingress': 1,
  security: 2,
  network: 3,
  endpoint: 4,
  compute: 5,
  data: 6,
  dns: 7,
  observability: 8,
  management: 9,
  unknown: 10,
};

/** Best-effort role for an arbitrary slug. */
export function roleOf(slug: string): Role {
  if (slug in SLUG_ROLE) return SLUG_ROLE[slug];
  // Category-based fallback for slugs we don't explicitly know.
  try {
    const rt = getResourceType(slug);
    switch (rt.category) {
      case 'External': return 'external';
      case 'People & UI': return 'external';
      case 'Networking': return 'network';
      case 'Compute': return 'compute';
      case 'Storage': return 'data';
      case 'Database': return 'data';
      case 'Security': return 'security';
      case 'Group': return 'network';
      default: return 'unknown';
    }
  } catch {
    return 'unknown';
  }
}

export function tierOf(slug: string): number {
  return TIER_OF[roleOf(slug)];
}

// ── Layout constants ───────────────────────────────────────────────────
// Card footprints, BEFORE the global text factor (pinned to XL = 1.3, see
// src/theme/type-scale.ts).
//
// Two footprints, because the two cases have genuinely different needs:
//
//   * A BARE card (no properties, no notes) shows only an icon, a type
//     caption and a name. At the old 200x124 it rendered 260x161 with
//     ~165px of empty width around a ~95px label — a five-node diagram
//     looked like a poster, and fit-view zoomed out far enough to shrink
//     every label. 160x105 => 208x137 hugs the content instead.
//
//   * A DETAIL card renders two-column property rows, and each value
//     column is about half the card width. Narrowing it to 160 truncated
//     values that used to fit ("pip-appgw-bnf", "wafpol-agw-bnf"), so it
//     keeps the original 200x124 => 260x161.
//
// Keep LEAF_W >= ~160: below that, long type captions ("APPLICATION
// GATEWAY") wrap to two lines and `typeCaptionLines` adds the height
// straight back, so the card gets narrower without getting smaller.
//
// Both are FLOORS, not fixed widths. `leafFootprint` measures the name,
// subtitle and property rows and widens the card up to `LEAF_MAX_W` so the
// text it will draw actually fits — see the note there.
export const LEAF_W = 160;
export const LEAF_BASE_H = 105;
export const LEAF_DETAIL_W = 200;
export const LEAF_DETAIL_BASE_H = 124;
/**
 * Ceiling on content-driven widening.
 *
 * A card is allowed to grow to fit its own label, but not without limit: one
 * 80-character FQDN must not stretch a card to 900px and drag the whole
 * diagram's scale down with it. At the 1.3 text factor this is ~440px
 * rendered. Longer names wrap onto as many lines as needed instead of
 * stretching a card across the diagram.
 */
export const LEAF_MAX_W = 340;
export const GROUP_MIN_W = 300;
export const GROUP_MIN_H = 200;
export const GAP_X = 40;
export const GAP_Y = 40;         // between siblings in the same tier column
export const TIER_GAP_X = 80;    // between different tier columns (LTR)
export const TIER_GAP_Y = 40;    // legacy — kept for row-flow-simple
// NOTE: the container padding constants used to live here as 64/32/32, but
// nothing imported them — `auto-layout.ts` has always used its own 28/22 plus
// the dynamic `resolveParentPadTop()`. They were deleted rather than corrected
// so a future caller cannot pick up values the layout does not honour.
/** Maximum leaves stacked vertically in one tier column before wrapping
 *  to a second sub-column within the same tier. 4 keeps the diagram
 *  from getting excessively tall while still allowing a full compute
 *  tier (VM + VMSS + AKS + App Service) to fit in a single column. */
export const MAX_ROWS_PER_TIER_COL = 4;

// ── Group container header ─────────────────────────────────────────────
//
// The container header is an absolutely-positioned pill at the box's top-left
// (icon + name + type + field chips), optionally followed by a 2-line notes
// preview. It floats OVER the container, so the layout has to reserve enough
// vertical room above the first child for whatever height the pill actually
// takes — see `groupHeaderClearance`.
//
// The icon used to be a hard-coded 16px that ignored the text factor entirely,
// so as the rest of the canvas type grew it turned into a speck next to a
// much larger name. It is a token now, and deliberately larger than the name:
// the glyph is what makes a container recognisable at a glance.

/** Header icon size at a text factor of 1.0. */
export const GROUP_ICON_PX = 20;

/**
 * Ceiling on how far a container's header grows with its box.
 *
 * Containers differ from leaf cards: a leaf is only big because the user
 * dragged it, but a container is big because of what it HOLDS, so the raw
 * box ratio is far too aggressive (a region holding a dozen subnets is 5x
 * its minimum). The ratio is therefore damped by an exponent and capped, so
 * dragging a small container bigger gives immediate feedback while a huge
 * one settles at a sane label size instead of a billboard.
 */
export const GROUP_HEADER_MAX_SCALE = 1.5;
const GROUP_HEADER_DAMP = 0.45;

// Measured DOM cost of the header, at a text factor of 1.0.
const PILL_TOP = 6;      // `top-1.5`
const PILL_PAD_Y = 4;    // `py-0.5`, both edges
const PILL_LINE = 1.4;   // line box of the name span
const NOTES_GAP = 3;     // breather between pill and notes preview
const NOTES_PAD_Y = 4;   // `py-0.5`, both edges
const NOTES_LINE = 1.3;  // `leading-tight`
// Horizontal chrome around the group notes preview: `left-2` + the
// `max-w-[calc(100%-1rem)]` inset (16), `px-1.5` (12) and the 1px border
// on each side (2).
const NOTES_CHROME_X = 30;
const HEADER_BREATHER = 5; // gutter between the header and the first child

/**
 * How many lines a notes block actually renders on.
 *
 * Notes are drawn with `whitespace-pre-wrap`, so the newlines the user typed
 * are honoured AND each of those paragraphs wraps on its own. The total is
 * therefore the SUM of the per-paragraph wrap counts — measuring the whole
 * string in one call undercounts badly, because it treats a 3-line note as
 * one long line that happens to fit.
 *
 * There is deliberately no cap. Clamping the render is what produced the
 * "…" in the middle of a diagram; the container is grown to fit instead.
 */
export function notesLineCount(
  notes: string | undefined,
  fontPx: number,
  avail: number
): number {
  if (!notes || notes.trim() === '') return 0;
  let lines = 0;
  for (const para of notes.replace(/\r/g, '').split('\n')) {
    lines += para.trim() === '' ? 1 : wrappedLineCount(para, fontPx, avail);
  }
  return Math.max(1, lines);
}

/** How much a container's header scales up, given its rendered box. */
export function groupHeaderScale(w: number, h: number): number {
  const raw = Math.min(w / GROUP_MIN_W, h / GROUP_MIN_H);
  if (!Number.isFinite(raw) || raw <= 1) return 1;
  return Math.min(GROUP_HEADER_MAX_SCALE, Math.pow(raw, GROUP_HEADER_DAMP));
}

interface GroupHeaderContent {
  name?: string;
  fields?: Record<string, string>;
  notes?: string;
  boxW?: number;
}

export const GROUP_FIELDS_MAX_FRACTION = 0.6;

/** Shared sizing for the name on the left and field chips on the right. */
export function groupPillLayout(factor: number, scale: number, content?: GroupHeaderContent) {
  const f = factor * scale;
  const avail = Math.max(1, (content?.boxW ?? GROUP_MIN_W) - 31);
  const icon = Math.round(GROUP_ICON_PX * f);
  const font = DIAGRAM_TYPE_SCALE.groupName * f;
  const chipFont = DIAGRAM_TYPE_SCALE.groupChip * f;
  const chipWidths = Object.values(content?.fields ?? {})
    .filter(value => value && String(value).trim())
    .map(value => String(value).length * chipFont * 0.61);
  const fieldsWidth = Math.min(avail * GROUP_FIELDS_MAX_FRACTION,
    Math.max(0, avail - icon - font - 12),
    chipWidths.reduce((total, width) => total + Math.ceil(width + 10), 0) +
      Math.max(0, chipWidths.length - 1) * 6);
  const nameWidth = Math.max(1, avail - icon - 6 - (fieldsWidth > 0 ? fieldsWidth + 6 : 0));
  const lines = wrappedLineCount(content?.name ?? '', font, nameWidth, 600, true);
  const nameHeight = Math.max(icon, lines * font * PILL_LINE);
  let rowWidth = 0, rowHeight = 0, fieldsHeight = chipWidths.length ? 2 : 0;
  for (const textWidth of chipWidths) {
    const width = Math.min(fieldsWidth, Math.ceil(textWidth + 10));
    const chipHeight = 2 + Math.max(1, Math.ceil(textWidth / Math.max(1, width - 10))) * chipFont * 1.5;
    if (rowWidth > 0 && rowWidth + 6 + width > fieldsWidth) {
      fieldsHeight += rowHeight + 6;
      rowWidth = width;
      rowHeight = chipHeight;
    } else {
      rowWidth += (rowWidth > 0 ? 6 : 0) + width;
      rowHeight = Math.max(rowHeight, chipHeight);
    }
  }
  return { height: PILL_PAD_Y + Math.max(nameHeight, fieldsHeight + rowHeight) };
}

/** Y offset where the notes preview starts, measured from the box top. */
export function groupNotesTop(factor: number, scale: number, content?: GroupHeaderContent): number {
  return Math.ceil(PILL_TOP + groupPillLayout(factor, scale, content).height + NOTES_GAP);
}

/**
 * Vertical space a container must reserve above its first child, for a given
 * header scale. Pass `GROUP_HEADER_MAX_SCALE` when the box size isn't known
 * yet and you need a guaranteed-safe ceiling.
 *
 * Pass `opts.notes` + `opts.boxW` to reserve room for the note's REAL height.
 * Without them this assumes a single line, which is only safe for callers
 * that have no note text to measure.
 */
export function groupHeaderClearance(
  factor: number,
  hasNotes: boolean,
  scale: number,
  opts?: GroupHeaderContent
): number {
  let h = PILL_TOP + groupPillLayout(factor, scale, opts).height;
  if (hasNotes) {
    const fontPx = DIAGRAM_TYPE_SCALE.groupNotes * factor * scale;
    const avail =
      opts?.boxW !== undefined ? Math.max(40, opts.boxW - NOTES_CHROME_X) : 0;
    const lines =
      opts?.notes && avail > 0
        ? notesLineCount(opts.notes, fontPx, avail)
        : 1;
    h += NOTES_GAP + NOTES_PAD_Y + lines * fontPx * NOTES_LINE;
  }
  return Math.round(h + HEADER_BREATHER);
}

// ── Leaf card footprint ────────────────────────────────────────────────
//
// One function owns how big a leaf card is, and BOTH the packer and the
// renderer call it. They used to disagree: Canvas.tsx rendered a flat
// "has any field definitions? 175 : 150" box while the packer estimated a
// data-driven height, so a card with three properties rendered 40px taller
// than its content and a card with notes rendered ~60px SHORTER, clipping
// the note. Over-sized cards are not just untidy — they inflate the whole
// diagram, which makes fit-view zoom further out and shrinks every label on
// screen. That was the main reason canvas text was hard to read.
//
// Heights below are the measured DOM cost of each block at
// DIAGRAM_TYPE_SCALE with a text factor of 1.0.
const H_SUBTITLE = 18;
const H_FIELD_ROW = 15;
const H_FIELD_BLOCK = 6;  // the block's own gap + top margin
const H_NOTES_CHROME = 33;  // NOTES caption + divider + block margins
const H_NOTES_LINE = 13 * 1.3; // notesBody at `leading-tight`
// Horizontal chrome around a leaf card's notes block: the card's own
// `CARD_CHROME_X` padding already covers it.
/**
 * AzureNode drops the icon ring from 64px to 52px once a card shows detail.
 *
 * This is now an exact figure. The ring used to also inflate with the card
 * box (`min(w, h) * 0.36`), which made the real rendered size depend on the
 * very height being computed here — a short 3-field card rendered a ~56px
 * ring while a tall card with notes rendered ~72px. That circularity is
 * gone: the ring is a flat 52 / 64 scaled by the text factor.
 */
const H_COMPACT_RING = -12;
/** Each extra wrapped line of the uppercase type caption. */
const H_TYPE_LINE = 14;
/**
 * Each extra wrapped line of the NAME.
 *
 * `DIAGRAM_TYPE_SCALE.nodeName` (17) at `leading-tight` (1.25). Added before
 * the factor multiply, like every other constant in this block.
 */
const H_NAME_LINE = DIAGRAM_TYPE_SCALE.nodeName * 1.25;

/**
 * Horizontal chrome between the card's outer box and its text.
 *
 * `padding: 2px` on the wrapper + a 1px border + `px-2` (8px) on the content
 * column, both edges. `typeCaptionLines` has always used this figure.
 */
const CARD_CHROME_X = 24;
/** `gap-1.5` between a property row's label and its value. */
const FIELD_GAP = 6;
/** Tailwind `tracking-wide`, as an em fraction. */
const TRACKING_WIDE = 0.025;

/**
 * Width the card's own text needs, before clamping.
 *
 * Covers the three things that can overflow horizontally:
 *
 *   * the NAME — the headline, and the one users complained about. Measured
 *     at its real font size and weight rather than estimated, because the
 *     names in play ("ocisoaiu1nexagg1-k08-goldengate-vm") are nothing like
 *     average-width text.
 *   * the SUBTITLE, same treatment one size down.
 *   * each PROPERTY ROW, which is a fixed-width uppercase label plus a
 *     right-aligned value, so the row needs `label + gap + value`.
 *
 * The type caption is excluded on purpose: it is the one label allowed to
 * wrap, and `typeCaptionLines` already buys the height for it. Forcing width
 * for "NETWORK VIRTUAL APPLIANCE" would widen every NVA card for a caption
 * that reads fine on two lines.
 *
 * Notes are excluded for the same reason — they wrap to three clamped lines
 * and reflow into whatever width the card ends up with.
 */
function contentWidth(node: DiagramNode, factor: number): number {
  const d = node.data;
  let need = 0;

  need = Math.max(
    need,
    measureTextPx(d.name ?? '', DIAGRAM_TYPE_SCALE.nodeName * factor, 600)
  );
  if (d.subtitle) {
    need = Math.max(
      need,
      measureTextPx(d.subtitle, DIAGRAM_TYPE_SCALE.nodeSubtitle * factor, 400)
    );
  }

  const values = d.fields;
  if (values) {
    let rt;
    try {
      rt = getResourceType(node.type);
    } catch {
      rt = undefined;
    }
    if (rt && !rt.isGroup) {
      const labelOf = new Map(rt.fields.map((f) => [f.key, f.label]));
      for (const [key, value] of Object.entries(values)) {
        const v = value == null ? '' : String(value).trim();
        if (v === '') continue;
        const label = (labelOf.get(key) ?? key).toUpperCase();
        const rowW =
          measureTextPx(label, DIAGRAM_TYPE_SCALE.fieldLabel * factor, 600, TRACKING_WIDE) +
          FIELD_GAP +
          measureTextPx(v, DIAGRAM_TYPE_SCALE.fieldValue * factor, 400);
        need = Math.max(need, rowW);
      }
    }
  }

  return need + CARD_CHROME_X;
}

/**
 * How many lines the uppercase type caption will wrap onto.
 *
 * Like the name, the caption can wrap. A long one like "NETWORK
 * VIRTUAL APPLIANCE" takes two lines and pushes everything below it down,
 * so the footprint has to know about it or the card clips.
 *
 * Uppercase glyphs plus the `tracking-wide` letter-spacing average out at
 * roughly 0.66em; the caption sits inside `px-1` within the card's `px-2`.
 */
function typeCaptionLines(node: DiagramNode, boxW: number, factor: number): number {
  const captions = runtimeExtensions().ndsNonProductionCaptions;
  if (captions && node.data.typeCaption !== undefined) {
    return captions.lineCount(node.data.typeCaption, boxW, factor);
  }
  let label: string;
  try {
    const rt = getResourceType(node.type);
    if (rt.isGroup) return 1;
    label = rt.label;
  } catch {
    return 1;
  }
  if (!label) return 1;
  const avail = boxW - 24;
  if (avail <= 0) return 1;
  const charW = DIAGRAM_TYPE_SCALE.nodeType * factor * 0.66;
  return Math.max(1, Math.ceil((label.length * charW) / avail));
}

/** Number of properties that will actually render on the card. */
function countFilledFields(node: DiagramNode): number {
  const values = node.data.fields;
  if (!values) return 0;
  let rt;
  try {
    rt = getResourceType(node.type);
  } catch {
    return 0;
  }
  if (rt.isGroup) return 0;
  const known = new Set<string>();
  let filled = 0;
  for (const def of rt.fields) {
    known.add(def.key);
    const v = values[def.key];
    if (v && String(v).trim() !== '') filled++;
  }
  // Custom keys added from the property panel render too.
  for (const [key, value] of Object.entries(values)) {
    if (known.has(key)) continue;
    if (value && String(value).trim() !== '') filled++;
  }
  return filled;
}

/**
 * Preferred container width for its header, bounded so long names wrap.
 *
 * The pill is `icon + name + one chip per filled field`, and only the name is
 * allowed to shrink — everything else is `shrink-0`. So a VNet called
 * "soai-u1n-goldengate-vnet1-prod" inside a 300px container rendered
 * "soai-u1n-…" no matter how much empty space sat below it, because the
 * container is sized by what it HOLDS and nothing ever consulted its label.
 *
 * v0.9.74: the uppercase TYPE caption was removed from the header, so no
 * width is reserved for it any more. Leaving that term in would size every
 * container for text it no longer draws — the same bug this function exists
 * to fix, only inverted.
 *
 * Returns the preferred width at `scale`, capped at the normal group width.
 * Callers take the max of this and the packed-children width; names and chips
 * wrap into the available space rather than forcing unlimited widening.
 */
export function groupHeaderWidth(
  node: DiagramNode,
  factor: number,
  scale = 1
): number {
  const f = factor * scale;
  const d = node.data;

  // `left-2` + `max-w-[calc(100%-1rem)]` => 16px of box outside the pill,
  // then `px-1.5` on the pill itself.
  const PILL_OUTSIDE = 16;
  const PILL_PAD_X = 12;
  const GAP = 6; // `gap-1.5`, between every child of the pill

  let w = GROUP_ICON_PX * f;
  let items = 1;

  if (d.name) {
    w += measureTextPx(d.name, DIAGRAM_TYPE_SCALE.groupName * f, 600);
    items++;
  }

  let rt;
  try {
    rt = getResourceType(node.type);
  } catch {
    rt = undefined;
  }

  // Field chips render at their full value — they are `shrink-0`, so a long
  // CIDR pushes the name out of the pill rather than clipping itself.
  const values = d.fields;
  if (values && rt) {
    const known = new Set(rt.fields.map((x) => x.key));
    for (const [key, value] of Object.entries(values)) {
      const v = value == null ? '' : String(value).trim();
      if (v === '') continue;
      if (!known.has(key) && !rt.fields.length) continue;
      // `px-1` + a 1px border on each side, monospace at ~0.6em per char.
      w += v.length * DIAGRAM_TYPE_SCALE.groupChip * f * 0.6 + 10;
      items++;
    }
  }

  return Math.min(Math.ceil(GROUP_MIN_W * factor),
    Math.ceil(w + (items - 1) * GAP + PILL_PAD_X + PILL_OUTSIDE));
}

/**
 * Content-driven group width, bounded by the wrapping header policy.
 *
 * Solving this needs an iteration, because the two quantities feed each
 * other: `groupHeaderScale` grows the header's type size with the box, so
 * widening a container to fit its name makes the name bigger and it no
 * longer fits. A container sized to 526px for a 19.5px name was then grown
 * to 632px by its children, which pushed the name to 25.7px and truncated
 * it again — three pixels short, which is exactly the kind of miss a
 * single-pass calculation produces.
 *
 * Converges quickly and always terminates: the scale is sublinear in the
 * width (exponent 0.45) and hard-capped at `GROUP_HEADER_MAX_SCALE`, so the
 * sequence is monotone increasing and bounded.
 */
export function groupBoxWidthForHeader(
  node: DiagramNode,
  factor: number,
  boxW: number,
  boxH: number
): number {
  let w = boxW;
  let grew = false;
  for (let i = 0; i < 6; i++) {
    const need = groupHeaderWidth(node, factor, groupHeaderScale(w, boxH));
    if (need <= w) break;
    w = need;
    grew = true;
  }
  // Only pad a box we actually had to widen.
  //
  // Every caller takes `max(currentWidth, thisResult)`, so returning
  // `boxW + 4` for a box that ALREADY fits its header makes the function
  // non-idempotent: each call ratchets the container 4px wider than the
  // last. That is a slow corruption — every save/load round trip, and
  // every page reload, grew every container by 4px with no upper bound.
  //
  // Flex distributes sub-pixel remainders to the shrinkable child (the
  // name), so a box we DID have to grow still lands a couple of pixels
  // clear of the boundary.
  return grew ? Math.ceil(w) + 4 : boxW;
}

/**
 * How many lines the full name needs, including unbroken resource identifiers.
 */
export function nameLines(node: DiagramNode, boxW: number, factor: number): number {
  const name = node.data.name;
  if (!name) return 1;
  return wrappedLineCount(name, DIAGRAM_TYPE_SCALE.nodeName * factor,
    Math.max(1, boxW - CARD_CHROME_X), 600, true);
}

/**
 * The rendered size of a leaf card, derived from the data it will show.
 * `factor` is the user's "Diagram text size" multiplier so a workspace set
 * to Large gets proportionally roomier cards instead of clipped ones.
 *
 * WIDTH is content-driven as of v0.9.5. It used to be one of two constants,
 * which meant a card was exactly as tall as its data but never as wide as
 * it, and every long name truncated to an ellipsis. The card now grows to
 * fit its name, subtitle and property rows, bounded by `LEAF_MAX_W`; past
 * that bound the full name wraps onto additional lines.
 */
export function leafFootprint(
  node: DiagramNode,
  factor = 1,
  boxW?: number
): { w: number; h: number } {
  // The row-card sidecar measures the real rendered card instead of adding
  // up constants, so when it is loaded it owns the answer — and it has to,
  // or the packer would reserve the tall card's box for a card drawn as a
  // row. This is the only leaf size in the app: the renderer, the packer,
  // `size-match` and the resizer all arrive here.
  const appearance = leafAppearance();
  if (appearance && !getResourceType(node.type).isGroup && !appearance.isContainer(node.id)) {
    return appearance.footprint(node, factor, boxW, getResourceType, customFieldLabel);
  }

  const d = node.data;
  const filled = countFilledFields(node);
  const hasNotes = !!(d.notes && String(d.notes).trim() !== '');
  // A card with nothing but an icon and a name gets the compact footprint;
  // anything rendering property rows keeps the roomier one so the value
  // column stays wide enough to read. See the LEAF_W comment above.
  const bare = filled === 0 && !hasNotes;
  let h = bare ? LEAF_BASE_H : LEAF_DETAIL_BASE_H;
  if (d.subtitle) h += H_SUBTITLE;
  if (filled > 0) h += filled * H_FIELD_ROW + H_FIELD_BLOCK;
  if (filled > 0 || hasNotes) h += H_COMPACT_RING;

  const floor = Math.round((bare ? LEAF_W : LEAF_DETAIL_W) * factor);
  const w = Math.max(
    floor,
    Math.min(Math.round(LEAF_MAX_W * factor), Math.ceil(contentWidth(node, factor)))
  );

  // Wrap calculations use the ACTUAL box when the caller knows it (the
  // renderer does; the packer is asking what the box should be), so a card
  // the user dragged narrower still reserves height for the extra lines
  // that narrowing causes.
  const measureW = boxW ?? w;
  h += (typeCaptionLines(node, measureW, factor) - 1) * H_TYPE_LINE;
  h += (nameLines(node, measureW, factor) - 1) * H_NAME_LINE;
  // Notes are measured against the real box too, and every line is reserved.
  // This used to be a flat 72px for "3 clamped lines", so a 5-line note was
  // silently ellipsized instead of making the card taller.
  if (hasNotes) {
    h +=
      H_NOTES_CHROME +
      notesLineCount(
        String(d.notes),
        DIAGRAM_TYPE_SCALE.notesBody * factor,
        Math.max(40, measureW - CARD_CHROME_X)
      ) *
        H_NOTES_LINE;
  }
  return { w, h: Math.round(h * factor) };
}

export interface Sized {
  node: DiagramNode;
  w: number;
  h: number;
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Tier-aware LTR packer with SCREEN-FIT WRAPPING. Groups sized children
 * by role → tier, then places each tier as a **vertical column** inside
 * the parent. Tiers march **left-to-right** in TIER_OF order (external
 * → edge-ingress → security → … → data → dns), matching Microsoft Learn
 * architecture diagrams where the packet flows left-to-right from client
 * to backend.
 *
 * Screen-fit wrapping: when the cumulative tier width would exceed
 * `TARGET_INNER_WIDTH` (default ~1200 px), the packer WRAPS the next
 * tier to a second tier-row inside the same container. This keeps the
 * container's width bounded so it fits on a typical laptop screen
 * without horizontal scroll, while preserving the LTR structure inside
 * each tier-row band.
 *
 * Wrapping within a single tier: when a single tier has more than
 * MAX_ROWS_PER_TIER_COL items, the extras spill into a second (or
 * third) sub-column INSIDE that same tier column before the next tier
 * begins. This keeps the diagram compact vertically.
 *
 * `innerWidth`, when passed by the caller, is respected as the wrap
 * threshold (max of TARGET_INNER_WIDTH and innerWidth-hint). This lets
 * a parent with a wider author-hinted size take advantage of the extra
 * room instead of wrapping too aggressively.
 */
export const TARGET_INNER_WIDTH = 1200;

/**
 * Target width-to-height ratio for one tier's block of sub-columns.
 *
 * Why this exists: `MAX_ROWS_PER_TIER_COL` caps a column by *count*, but
 * containers are not all the same height. Three subnets — each ~245px
 * tall once their own children are packed — sat in a single 800px column
 * while ~1100px of the parent's width went unused. Because the canvas
 * frames a diagram with `fitView`, a tall-and-narrow diagram is zoomed
 * out far more than a balanced one of the same area, and every card's
 * text shrinks with it, so balancing the axes is a *legibility* fix.
 *
 * Note this is a target, not a maximum: packing every tier as wide as it
 * will go is just as bad as stacking it, because the diagram then runs
 * out of horizontal room instead. Measured on a 4-level nested case,
 * the all-stacked layout framed at 0.581 zoom and the all-wide layout at
 * 0.490; scoring candidates against a ratio near the canvas's own beats
 * both. Slightly wider than a typical viewport (~1.15) because external
 * bands and container padding add height the packer can't see.
 */
const TIER_COL_ASPECT = 1.3;

function chunkColumns(items: Sized[], rows: number): Sized[][] {
  const out: Sized[][] = [];
  for (let i = 0; i < items.length; i += rows) out.push(items.slice(i, i + rows));
  return out;
}

function measureColumns(subCols: Sized[][]): { width: number; height: number } {
  let width = 0;
  let height = 0;
  subCols.forEach((col, idx) => {
    width += Math.max(...col.map((s) => s.w)) + (idx > 0 ? GAP_X : 0);
    height = Math.max(
      height,
      col.reduce((h, s) => h + s.h, 0) + GAP_Y * (col.length - 1)
    );
  });
  return { width, height };
}

/**
 * Split one tier's items into sub-columns, choosing the arrangement whose
 * aspect ratio lands closest to `TIER_COL_ASPECT` without exceeding the
 * parent's usable width. Falls back to the legacy fixed-count chunking
 * when every candidate is too wide.
 */
function splitTierColumns(items: Sized[], wrapAt: number): Sized[][] {
  const n = items.length;
  if (n <= 1) return [items];

  let chosen: Sized[][] | null = null;
  let bestScore = Infinity;
  for (let rows = 1; rows <= n; rows++) {
    const cand = chunkColumns(items, rows);
    const m = measureColumns(cand);
    if (m.width > wrapAt) continue;
    const score = Math.abs(Math.log(m.width / m.height) - Math.log(TIER_COL_ASPECT));
    if (score < bestScore) {
      bestScore = score;
      chosen = cand;
    }
  }
  return chosen ?? chunkColumns(items, Math.min(n, MAX_ROWS_PER_TIER_COL));
}

export function packTiered(
  sized: Sized[],
  innerWidth: number
): {
  positions: Map<string, { x: number; y: number }>;
  totalW: number;
  totalH: number;
} {
  const positions = new Map<string, { x: number; y: number }>();
  const wrapAt = Math.max(TARGET_INNER_WIDTH, innerWidth || 0);

  // Bucket by tier.
  const buckets = new Map<number, Sized[]>();
  for (const s of sized) {
    const tier = tierOf(s.node.type);
    const arr = buckets.get(tier) ?? [];
    arr.push(s);
    buckets.set(tier, arr);
  }

  // Fine ordering within a tier — keeps typical hero paths readable.
  const SLUG_PRIORITY: Record<string, number> = {
    'front-door': 0, 'traffic-manager': 1, appgw: 2, 'appgw-containers': 3,
    lb: 4, pip: 5, 'pip-prefix': 6, nat: 7,
    'vpn-gw': 8, 'er-gw': 9, 'er-circuit': 10, 'local-gw': 11, connection: 12,
    vwan: 13, 'vwan-hub': 14,
    firewall: 0, 'firewall-policy': 1, 'waf-policy': 2,
    bastion: 3, 'ddos-plan': 4, nva: 5, 'network-watcher': 6,
    nsg: 0, asg: 1, udr: 2, nic: 3, 'ip-group': 4,
    'private-endpoint': 0, 'private-link-service': 1,
    'app-service': 0, 'function-app': 1, aks: 2, 'container-instance': 3,
    'container-registry': 4, 'api-management': 5, vmss: 6, vm: 7,
    storage: 0, 'sql-db': 1, cosmos: 2, 'key-vault': 3,
    'dns-zone': 0, 'dns-resolver': 1,
  };

  const tierKeys = [...buckets.keys()].sort((a, b) => a - b);

  // First pass: precompute each tier's (subCols, width, height) so we
  // can decide row-wrapping without repeating work.
  interface TierBlock {
    tier: number;
    items: Sized[];
    subCols: Sized[][];
    width: number;
    height: number;
  }
  const blocks: TierBlock[] = tierKeys.map((tier) => {
    const items = buckets.get(tier)!;
    items.sort((a, b) => {
      const pa = SLUG_PRIORITY[a.node.type] ?? 99;
      const pb = SLUG_PRIORITY[b.node.type] ?? 99;
      if (pa !== pb) return pa - pb;
      return 0;
    });
    const subCols = splitTierColumns(items, wrapAt);
    let width = 0;
    let height = 0;
    subCols.forEach((col, idx) => {
      const colW = Math.max(...col.map((s) => s.w));
      const colH = col.reduce((h, s) => h + s.h, 0) + GAP_Y * (col.length - 1);
      width += colW + (idx > 0 ? GAP_X : 0);
      height = Math.max(height, colH);
    });
    return { tier, items, subCols, width, height };
  });

  // Second pass: lay out tier blocks LTR with wrapping to a new
  // tier-row band when cumulative width would exceed wrapAt.
  let x = 0;
  let bandY = 0;
  let bandMaxH = 0;
  let overallW = 0;
  let overallH = 0;

  for (const block of blocks) {
    // Would this tier push us past the wrap threshold?
    if (x > 0 && x + block.width > wrapAt) {
      // Wrap to next tier-row band.
      bandY += bandMaxH + TIER_GAP_Y;
      x = 0;
      bandMaxH = 0;
    }

    // Lay out block at (x, bandY).
    let tierX = x;
    for (const col of block.subCols) {
      let y = bandY;
      const colW = Math.max(...col.map((s) => s.w));
      for (const s of col) {
        positions.set(s.node.id, { x: tierX, y });
        y += s.h + GAP_Y;
      }
      tierX += colW + GAP_X;
    }
    // Advance x past this tier (subtract trailing GAP_X, add TIER_GAP_X)
    x = tierX - GAP_X + TIER_GAP_X;
    bandMaxH = Math.max(bandMaxH, block.height);
    overallW = Math.max(overallW, x - TIER_GAP_X);
    overallH = Math.max(overallH, bandY + bandMaxH);
  }

  return { positions, totalW: overallW, totalH: overallH };
}

// ── Legacy row-flow packer, kept for callers that opt out of tiering ──
// (e.g. inside subnets where nodes are all the same role and tiering is
// noise.)
export function packRowFlowSimple(
  sized: Sized[],
  innerWidth: number
): {
  positions: Map<string, { x: number; y: number }>;
  totalW: number;
  totalH: number;
} {
  const positions = new Map<string, { x: number; y: number }>();
  let x = 0;
  let y = 0;
  let rowH = 0;
  let maxRowW = 0;
  const minRow = Math.max(innerWidth, ...sized.map((s) => s.w));
  for (const s of sized) {
    if (x > 0 && x + s.w > minRow) {
      y += rowH + GAP_Y;
      x = 0;
      rowH = 0;
    }
    positions.set(s.node.id, { x, y });
    x += s.w + GAP_X;
    rowH = Math.max(rowH, s.h);
    maxRowW = Math.max(maxRowW, x - GAP_X);
  }
  return { positions, totalW: maxRowW, totalH: y + rowH };
}

/**
 * True when the children under a parent contain nodes from ≥2 different
 * tiers. Tiering only makes sense in that case — otherwise a plain
 * row-flow (single tier all in one row) is fine.
 */
export function shouldTier(children: DiagramNode[]): boolean {
  const tiers = new Set<number>();
  for (const c of children) tiers.add(tierOf(c.type));
  return tiers.size >= 2;
}
