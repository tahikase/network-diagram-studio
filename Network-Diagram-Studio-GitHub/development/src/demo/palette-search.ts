// Palette-wide search: one query across resources, icons and shapes.
//
// The per-section search boxes stay exactly as they were — this sits ABOVE
// them and answers the "I know what I want, I just don't know which drawer
// it's in" case. A user hunting for "firewall" shouldn't have to guess
// whether it's a Resource, an on-prem Icon, or a Shape; it's all three.
//
// Deliberately store-free and free of React so the ranking can be reasoned
// about (and tested) without mounting a palette.
import { RESOURCE_TYPES, type ResourceType } from '../model/resource-types';
import { type IconEntry } from '../icons/manifest';
import { paletteIcons } from '../icons/imported-library';
import { PALETTE_SHAPE_PRESETS, type ShapePreset } from './shape-presets';
import { searchLearnDiagrams, type LearnDiagram } from './learn-diagram-search';
import { DEMO_FEATURES } from '../env';

export type PaletteHitKind = 'resource' | 'icon' | 'shape' | 'diagram';

interface HitBase {
  /** Unique within its kind — the resource slug, icon id, shape variant. */
  id: string;
  label: string;
  /** Secondary line: the catalogue category the item came from. */
  sub: string;
  score: number;
}

export type PaletteHit =
  | (HitBase & { kind: 'resource'; rt: ResourceType })
  | (HitBase & { kind: 'icon'; icon: IconEntry })
  | (HitBase & { kind: 'shape'; preset: ShapePreset })
  | (HitBase & { kind: 'diagram'; diagram: LearnDiagram });

export interface PaletteSearchGroup {
  kind: PaletteHitKind;
  /** Hits to render — already capped. */
  hits: PaletteHit[];
  /** How many matched in total, before the cap. */
  total: number;
}

/**
 * Per-group cap. There are ~800 icons against ~137 resources, so without a
 * cap a generic query like "network" renders a wall of icons and the handful
 * of genuinely relevant resources scroll off the top.
 */
export const GROUP_CAP = 24;

/**
 * Rank a single candidate. Lower is better; `null` means no match.
 *
 * `primary` is the user-visible name and is weighted far above `secondary`
 * (category, slug, keywords, description) — matching the word someone can
 * actually see beats matching hidden metadata.
 */
function rankTerm(q: string, primary: string, secondary: string[]): number | null {
  const p = primary.toLowerCase();
  if (p === q) return 0;
  if (p.startsWith(q)) return 1;
  // Word-boundary hit: "gateway" should rank "NAT gateway" above "Gatewayed".
  if (new RegExp(`\\b${escapeRe(q)}`).test(p)) return 2;
  if (p.includes(q)) return 3;
  for (const s of secondary) {
    if (s && s.toLowerCase().includes(q)) return 4;
  }
  return null;
}

/**
 * Score a whole query, which may be several words.
 *
 * A global search bar invites natural multi-word queries, and a plain
 * substring match fails them badly: "hub and spoke" doesn't literally occur
 * in "Hub-and-Spoke (Firewall + Bastion)" once the user types spaces. So a
 * multi-word query falls back to requiring EVERY token to match somewhere.
 *
 * Tokens shorter than two characters are dropped rather than required —
 * they're the "&" and "+" a user types in "hub & spoke", and demanding them
 * would reject the very phrasing they came from.
 */
function rank(query: string, primary: string, secondary: string[]): number | null {
  const whole = rankTerm(query, primary, secondary);
  if (whole !== null) return whole;

  const tokens = query.split(/\s+/).filter((tk) => tk.length >= 2);
  if (tokens.length < 2) return null;

  let worst = 0;
  for (const tk of tokens) {
    const r = rankTerm(tk, primary, secondary);
    if (r === null) return null;
    worst = Math.max(worst, r);
  }
  // Always ranks below any whole-phrase match, so an item that literally
  // contains what the user typed still comes first.
  return 5 + worst;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Search every catalogue at once.
 *
 * Returns groups in a fixed order (shapes → resources → icons → diagrams)
 * rather than interleaving by score: a mixed list reads as noise, and the
 * user almost always knows which *kind* of thing they want even when they
 * don't know which section holds it.
 *
 * Matches the current Palette order. Retired shapes remain loadable but
 * must not reappear as creation choices through search.
 */
export function searchPalette(query: string, catalog: readonly IconEntry[] = paletteIcons()): PaletteSearchGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const resources: PaletteHit[] = [];
  for (const rt of RESOURCE_TYPES) {
    const score = rank(q, rt.label, [rt.category, rt.slug, rt.defaultName]);
    if (score !== null) {
      resources.push({ kind: 'resource', id: rt.slug, label: rt.label, sub: rt.category, score, rt });
    }
  }

  const icons: PaletteHit[] = [];
  for (const icon of catalog) {
    const score = rank(q, icon.label, [icon.category, icon.id]);
    if (score !== null) {
      icons.push({ kind: 'icon', id: icon.id, label: icon.label, sub: icon.category, score, icon });
    }
  }

  const shapes: PaletteHit[] = [];
  for (const preset of PALETTE_SHAPE_PRESETS) {
    const score = rank(q, preset.label, [preset.category, preset.variant]);
    if (score !== null) {
      shapes.push({
        kind: 'shape', id: preset.variant, label: preset.label, sub: preset.category, score, preset,
      });
    }
  }

  const byScoreThenLabel = (a: PaletteHit, b: PaletteHit) =>
    a.score - b.score || a.label.localeCompare(b.label);

  // Learn diagrams are references, not things you can drop on a canvas, so
  // they rank LAST — a query that matches a real resource should never bury
  // it under doc links. Ships in neither build, matching the palette section.
  const diagrams: PaletteHit[] = [];
  if (DEMO_FEATURES) {
    for (const d of searchLearnDiagrams(q, GROUP_CAP * 4)) {
      diagrams.push({
        kind: 'diagram',
        id: d.id,
        label: d.title,
        sub: d.service,
        // Ranked by searchLearnDiagrams already; a flat score preserves that
        // order through `byScoreThenLabel`'s stable sort.
        score: 0,
        diagram: d,
      });
    }
  }

  return ([
    { kind: 'shape', all: shapes },
    { kind: 'resource', all: resources },
    { kind: 'icon', all: icons },
    { kind: 'diagram', all: diagrams },
  ] as const)
    .filter((g) => g.all.length > 0)
    .map((g) => ({
      kind: g.kind,
      total: g.all.length,
      hits: g.all.sort(byScoreThenLabel).slice(0, GROUP_CAP),
    }));
}

/** Total across all groups, before the per-group cap. */
export function countPaletteHits(groups: PaletteSearchGroup[]): number {
  return groups.reduce((n, g) => n + g.total, 0);
}
