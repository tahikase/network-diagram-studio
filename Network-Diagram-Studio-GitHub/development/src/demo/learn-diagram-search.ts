// Search + grouping over the harvested Microsoft Learn diagram catalog.
//
// Deliberately store-free and React-free, exactly like `palette-search.ts`,
// so the ranking can be reasoned about without mounting a palette.
//
// The catalog is 600+ entries covering 20+ services, so unlike the template
// registry it is NEVER rendered unfiltered: `browseLearnDiagrams` caps each
// service group. Someone scrolling 631 rows is not browsing, they're lost.
import { LEARN_DIAGRAMS, type LearnDiagram } from './learn-diagrams.generated';

export interface LearnDiagramGroup {
  service: string;
  items: LearnDiagram[];
  /** Matches in this service before the per-group cap. */
  total: number;
}

/** Rows rendered per service before the "+n more" affordance takes over. */
export const SERVICE_CAP = 12;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Lower is better; `null` means no match. Mirrors palette-search's ladder. */
function rankTerm(q: string, d: LearnDiagram): number | null {
  const title = d.title.toLowerCase();
  if (title === q) return 0;
  if (title.startsWith(q)) return 1;
  if (new RegExp(`\\b${escapeRe(q)}`).test(title)) return 2;
  if (title.includes(q)) return 3;
  if (d.service.toLowerCase().includes(q)) return 4;
  if (d.article.toLowerCase().includes(q)) return 5;
  if (d.keywords.some((k) => k.includes(q))) return 6;
  return null;
}

function rank(query: string, d: LearnDiagram): number | null {
  const whole = rankTerm(query, d);
  if (whole !== null) return whole;

  // Multi-word queries ("hub and spoke") rarely occur verbatim in an alt-text
  // derived title, so fall back to requiring every meaningful token.
  const tokens = query.split(/\s+/).filter((tk) => tk.length >= 2);
  if (tokens.length < 2) return null;
  let worst = 0;
  for (const tk of tokens) {
    const r = rankTerm(tk, d);
    if (r === null) return null;
    worst = Math.max(worst, r);
  }
  return 7 + worst;
}

/**
 * Browse or search the catalog, grouped by Azure service.
 *
 * An empty query returns every service with its group capped — the "just show
 * me what's here" case. A query filters first, then groups, so a service with
 * no hits disappears entirely rather than rendering an empty heading.
 */
export function browseLearnDiagrams(query: string): LearnDiagramGroup[] {
  const q = query.trim().toLowerCase();

  const scored: Array<{ d: LearnDiagram; score: number }> = [];
  for (const d of LEARN_DIAGRAMS) {
    if (!q) {
      scored.push({ d, score: 0 });
      continue;
    }
    const score = rank(q, d);
    if (score !== null) scored.push({ d, score });
  }

  const map = new Map<string, Array<{ d: LearnDiagram; score: number }>>();
  for (const hit of scored) {
    const arr = map.get(hit.d.service) ?? [];
    arr.push(hit);
    map.set(hit.d.service, arr);
  }

  // With a query, the service whose best hit ranks highest leads. Without one,
  // services are alphabetical so the list is a stable place to browse.
  const services = [...map.keys()].sort((a, b) => {
    if (q) {
      const bestA = Math.min(...map.get(a)!.map((h) => h.score));
      const bestB = Math.min(...map.get(b)!.map((h) => h.score));
      if (bestA !== bestB) return bestA - bestB;
    }
    return a.localeCompare(b);
  });

  return services.map((service) => {
    const all = map
      .get(service)!
      .sort((x, y) => x.score - y.score || x.d.title.localeCompare(y.d.title));
    return {
      service,
      total: all.length,
      items: all.slice(0, SERVICE_CAP).map((h) => h.d),
    };
  });
}

/** Total matches across all groups, before the per-service cap. */
export function countLearnDiagrams(groups: LearnDiagramGroup[]): number {
  return groups.reduce((n, g) => n + g.total, 0);
}

/** Flat ranked search, capped — used by the palette-wide search bar. */
export function searchLearnDiagrams(query: string, limit: number): LearnDiagram[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: Array<{ d: LearnDiagram; score: number }> = [];
  for (const d of LEARN_DIAGRAMS) {
    const score = rank(q, d);
    if (score !== null) scored.push({ d, score });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.d.title.localeCompare(b.d.title))
    .slice(0, limit)
    .map((h) => h.d);
}

export { LEARN_DIAGRAMS };
export type { LearnDiagram };
