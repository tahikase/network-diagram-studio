// Core topology model. This is the source of truth persisted to JSON.
import type { Shape, Stroke } from '../demo/tabs-store';
import type { NoteComment, NoteImage } from './schema';
import type { ImportedIconAsset } from '../icons/imported-assets';

export type StateColor = 'ok' | 'degraded' | 'broken' | 'unknown';

export type EdgeKind =
  | 'peering'
  | 'vpn'
  | 'expressroute'
  | 'privateendpoint'
  | 'backend'
  | 'dns'
  | 'internet'
  | 'link';

export type AnnotationKind = 'note' | 'warning' | 'question';

/* Line pattern for a connection. Each `kind` already implies one (VPN is
   dashed, DNS dotted, Peering solid), but a diagram often needs the SAME kind
   drawn two ways — e.g. a solid "Primary" path and a dashed "Backup" path
   between the same pair of devices. `DiagramEdge.line` overrides the kind's
   pattern without changing what the connection means. */
export type EdgeLineStyle = 'solid' | 'dashed' | 'dotted';

export interface DiagramMeta {
  title: string;
  caseId?: string;
  author?: string;
  createdUtc: string;
  updatedUtc: string;
  notes?: string;
}

export interface DiagramNode {
  id: string;
  /** Slug from resource-types.ts (e.g. "appgw", "vnet"). */
  type: string;
  /** Optional parent for grouping (nesting subnets inside VNets etc). */
  parent?: string;
  position: { x: number; y: number };
  /** Persisted dimensions for resource cards and containers. */
  size?: { w: number; h: number };
  data: {
    name: string;
    subtitle?: string;
    state?: StateColor;
    /** Optional icon override: built-in catalog id or an imported artwork id. */
    iconId?: string;
    /** Base image-box size; absent preserves the original icon sizing. */
    iconSize?: number;
    /** Optional per-node type label override (small caption above the name). */
    typeLabel?: string;
    /** Independent display caption; an empty string explicitly hides it. */
    typeCaption?: string;
    armId?: string;
    armOrigin?: string;
    armExtra?: string;
    armScope?: string;
    /** Free-form fields exposed in the side panel (SKU, IP, etc). */
    fields: Record<string, string>;
    notes?: string;
    /**
     * Multiplier applied to the node's name + type-label font sizes. 1.0
     * is the default. Persisted so users can shrink or enlarge text on a
     * per-node basis directly from the canvas.
     */
    textScale?: number;
  };
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  kind: EdgeKind;
  label?: string;
  state?: StateColor;
  /* Explicit stroke override. When unset the edge is coloured by its `kind`
     (and `state`, which signals degraded/broken and outranks the kind). Set
     it to give one connection its own colour without changing what the
     connection *means*. Any CSS colour; the UI offers the shared pen
     palette. */
  color?: string;
  /* Explicit line pattern override. Unset = use the kind's own pattern. */
  line?: EdgeLineStyle;
  /**
   * Multiplier applied to this edge's LABEL font size. 1.0 (or absent) is
   * the default. Same 0.5..3 clamp as `DiagramNode.data.textScale`, and the
   * key is dropped when it is 1 so a default-sized edge serialises to
   * exactly the bytes it always did.
   */
  textScale?: number;
  /* v0.9.41 — "fixed" connection points, draw.io's term for the same thing.
     The connect dot the user actually dragged from / dropped on, e.g.
     `s-b25` or `t-l`. Unset = "floating": `Canvas.pickHandles` re-picks the
     facing sides from live geometry on every render, which is the right
     default and stays the behaviour for edges drawn body-to-body.

     Set, the endpoint is PINNED and survives the peer moving elsewhere —
     the user chose that dot, so we do not quietly move their arrow. Only
     resource-card and shape endpoints can be pinned: `ShapeAnchorNode`
     carries the same twelve midpoint/quarter-point positions. */
  sourceHandle?: string;
  targetHandle?: string;
  data?: Record<string, string>;
}

export interface DiagramAnnotation {
  id: string;
  position: { x: number; y: number };
  text: string;
  kind: AnnotationKind;
  targetId?: string;
}

export interface Diagram {
  version: 1;
  meta: DiagramMeta;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  annotations: DiagramAnnotation[];
}

/**
 * What actually gets written to a `.json` file (v0.9.26+).
 *
 * A `Diagram` describes the topology only. Shapes and pencil strokes live on
 * the tabs-store, so saving the Diagram alone silently discarded them — this
 * type is what puts them in the file.
 *
 * Both keys are optional: a file written before v0.9.26 has neither and must
 * still load, and a diagram with no annotations still serialises to exactly
 * the bytes it always did.
 *
 * The `import type` below is erased at build time, so the apparent cycle with
 * `demo/tabs-store` (which imports `Diagram` from here, also type-only) does
 * not exist at runtime.
 */
export interface StudioFile extends Diagram {
  /** Only artwork referenced by this diagram; never the entire personal library. */
  iconAssets?: ImportedIconAsset[];
  shapes?: Shape[];
  strokes?: Stroke[];
  /** v0.9.35 — the tab's Notes page, as Markdown. Omitted when empty. */
  notes?: string;
  /**
   * v0.9.65 — comment threads anchored into `notes`. Omitted when empty.
   *
   * The highlight itself is NOT written here, and is not written into `notes`
   * either: it lives only in the editor's DOM. Each thread stores the text it
   * quoted, which is re-found on load. See `demo/notes-comments.ts`.
   */
  comments?: NoteComment[];
  /**
   * v0.9.66 — screenshots referenced from `notes`. Omitted when empty.
   *
   * The note holds only `![caption](nds-img:id)`; the bytes are here. Only
   * images the note still references are written, so this array never carries
   * a picture the reader cannot see.
   */
  images?: NoteImage[];
}
