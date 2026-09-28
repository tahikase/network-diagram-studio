// Typed access to the `appearance.js` sidecar.
//
// The two portable builds load an ordered set of sidecar scripts from
// `dist/production_*` and `dist/non_production_*` (see
// `scripts/patch-sidecars.mjs`). One of them, `appearance.js`, installs
// `window.ndsLeafAppearance`: the plain-icon leaf card. Production uses a
// horizontal row; non-production places the icon above centered text.
//
// It is a SIDECAR, not a module, so it is deliberately optional. When it is
// absent — `npm run dev`, or a bundle opened without its sidecar folder —
// every accessor here returns undefined and the callers keep the built-in
// card. Nothing may assume it is present.
//
// Sizing, history, resizing and detached exports use the same contract as
// rendering, so a source rebuild cannot restore the skin but lose behavior.
//
// The skin itself is `appearance.css`, which keys off the `nds-leaf-row`
// class and the three CSS custom properties `variables()` returns. Both have
// to be on the card element or the rules do not match, which is why
// `AzureNode` applies them together.
import type { CSSProperties } from 'react';
import type { Diagram, DiagramNode } from './types';
import type { ResourceType } from './resource-types';
import { runtimeExtensions } from '../runtime/extensions';

type ResourceLookup = (slug: string) => ResourceType;
type CustomLabel = (key: string) => string;

export interface LeafAppearance {
  /** True when other nodes name `id` as their parent, so it draws as a
   *  container and must keep the plain box rather than the row card. */
  isContainer(id: string): boolean;
  /** Alternate layouts may omit a caption that repeats the node name. */
  showTypeCaption?(data: Pick<DiagramNode['data'], 'name' | 'typeLabel' | 'typeCaption'>, fallback: string): boolean;
  /** `--nds-d-text`, `--nds-d-icon`, `--nds-d-glyph` for the card element. */
  variables(factor: number, textScale?: number, iconSize?: number): CSSProperties & Record<`--nds-d-${string}`, string | number>;
  /** Narrowest the card can be drawn at this scale without clipping. */
  minimumWidth(factor: number, textScale?: number, iconSize?: number): number;
  /** The card's rendered size, measured from real shaped glyphs. */
  footprint(
    node: DiagramNode,
    factor: number,
    boxWidth: number | undefined,
    resourceType: ResourceLookup,
    customLabel: CustomLabel
  ): { w: number; h: number };
  growNode(node: DiagramNode, factor: number, resourceType: ResourceLookup, customLabel: CustomLabel): DiagramNode['size'];
  fitChanges(previous: Diagram | null, next: Diagram, factor: number, resourceType: ResourceLookup, customLabel: CustomLabel, loaded?: boolean): Diagram;
  resize(diagram: Diagram, id: string, size: { w: number; h: number }, factor: number, resourceType: ResourceLookup, customLabel: CustomLabel): Diagram | null;
  prepareExport(source: Element, clone: Element): void;
}

/** The sidecar's API, or undefined when it was not loaded. */
export function leafAppearance(): LeafAppearance | undefined {
  return runtimeExtensions().ndsLeafAppearance;
}
