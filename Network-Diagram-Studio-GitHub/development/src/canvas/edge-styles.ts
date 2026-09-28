import { MarkerType, type EdgeMarker } from '@xyflow/react';
import type { EdgeKind, EdgeLineStyle } from '../model/types';
import { paintColor } from '../theme/palette';

interface EdgeKindMeta {
  label: string;
  color: string;
  dash?: string;
  width: number;
  icon?: string;
}

// Colours are indirected through CSS variables (defined in index.css) rather
// than written as literals so dark mode can brighten every stroke without a
// React re-render. React Flow renders arrow markers with a `style` object
// too, so the marker picks up the same value automatically.
export const EDGE_KIND_META: Record<EdgeKind, EdgeKindMeta> = {
  peering:         { label: 'Peering',          color: 'var(--nds-edge-azure)', width: 2.5 },
  vpn:             { label: 'VPN tunnel',       color: 'var(--nds-edge-azure)', dash: '6 3', width: 2,    icon: '🔒' },
  expressroute:    { label: 'ExpressRoute',     color: 'var(--nds-edge-er)', width: 3,   icon: '⚡' },
  privateendpoint: { label: 'Private Endpoint', color: 'var(--nds-edge-azure)', dash: '2 3', width: 1.75 },
  backend:         { label: 'Backend',          color: 'var(--nds-edge-backend)', width: 1.75 },
  dns:             { label: 'DNS',              color: 'var(--nds-edge-dns)', dash: '2 4', width: 1.5,  icon: '🌐' },
  internet:        { label: 'Internet',         color: 'var(--nds-edge-muted)', width: 2 },
  link:            { label: 'Link',             color: 'var(--nds-edge-muted)', width: 1.5 },
};

// `solid` maps to `undefined`, which is a real value here and not "unset" —
// picking Solid on a VPN tunnel must *clear* the kind's '6 3'. So the dash is
// resolved by asking whether `line` was set, never with `??` on the result.
const EDGE_LINE_DASH: Record<EdgeLineStyle, string | undefined> = {
  solid: undefined,
  dashed: '6 3',
  dotted: '2 3',
};

/** UI order for the line-style picker. `undefined` = follow the kind. */
export const EDGE_LINE_STYLES: ReadonlyArray<{
  id: EdgeLineStyle | undefined;
  label: string;
  /** Preview dash for an 18px swatch; `''` renders a solid line. */
  preview: string;
}> = [
  { id: undefined, label: 'Auto', preview: '' },
  { id: 'solid', label: 'Solid', preview: '' },
  { id: 'dashed', label: 'Dashed', preview: '5 3' },
  { id: 'dotted', label: 'Dotted', preview: '1.5 2.5' },
];

/** The dash pattern actually painted, given a kind and an optional override. */
export function resolveEdgeDash(kind: EdgeKind, line?: EdgeLineStyle): string | undefined {
  if (line) return EDGE_LINE_DASH[line];
  return (EDGE_KIND_META[kind] ?? EDGE_KIND_META.link).dash;
}

export interface EdgeVisual {
  style: React.CSSProperties;
  markerEnd: EdgeMarker;
}

/**
 * Resolve an edge's stroke. Precedence, highest first:
 *   1. `color` — an explicit per-edge override.
 *   2. the `kind` default.
 *
 * `state` used to outrank both, painting a degraded edge amber and a broken
 * one red with an extra 0.75px of width, on the grounds that a diagnosis must
 * survive a cosmetic choice. v0.9.60 removed every status colour from the
 * canvas — resource rings went the same way — so an edge is now coloured by
 * what it IS, never by how it is doing. `state` still round-trips through the
 * file and the schema; it simply reaches no pixel.
 *
 * The dash pattern is unaffected, as it always was: it follows `line`, else
 * the kind, which is what keeps a solid primary distinguishable from a dashed
 * backup.
 */
export function edgeVisual(
  kind: EdgeKind,
  color?: string,
  line?: EdgeLineStyle,
): EdgeVisual {
  const base = EDGE_KIND_META[kind] ?? EDGE_KIND_META.link;
  // v0.9.30 — an explicit override goes through `paintColor` so the Black and
  // White swatches mean INK and PAPER on an edge exactly as they do on a
  // hand-drawn shape. Without it, the same palette produces an edge that
  // vanishes on one theme and a shape that survives both.
  const stroke = paintColor(color) || base.color;
  return {
    style: {
      stroke,
      strokeWidth: base.width,
      strokeDasharray: resolveEdgeDash(kind, line),
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: stroke,
      width: 18,
      height: 18,
    },
  };
}

export function edgeDisplayLabel(kind: EdgeKind, label?: string): string {
  const icon = EDGE_KIND_META[kind].icon;
  if (icon && label) return `${icon} ${label}`;
  if (icon) return icon;
  return label ?? '';
}
