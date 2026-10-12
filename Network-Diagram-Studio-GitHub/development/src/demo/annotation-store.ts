// Demo v0.5: DRAWING TOOL SESSION STATE (which tool is picked, which pen
// color is picked). Per-tab data (strokes, tabs, undo) lives in tabs-store.
//
// Demo v0.6: also owns "current style variant" per shape/pen tool so that
// the split-button dropdowns in the toolbar (see AnnotationToolbar.tsx +
// ShapeStyleDropdown.tsx) can persist the user's preferred dash/head/
// corner/fill/thickness across strokes. When a new shape or pen stroke is
// created, its optional style fields are populated from these slots.
import { create } from 'zustand';

export type Tool =
  | 'move'
  | 'pan'
  | 'pen'
  | 'eraser'
  | 'shape-arrow'
  | 'shape-rect'
  | 'shape-ellipse'
  | 'shape-callout';

export interface PickedCanvasObject {
  kind: 'shape' | 'node' | 'edge';
  id: string;
}

// Re-exported so existing demo imports keep working; the palette itself now
// lives in `theme/palette.ts` so prod code can use it without pulling this
// store in. See the note there.
export { PEN_COLORS, type PenColorKey } from '../theme/palette';

/**
 * Default color for every newly-drawn annotation shape (arrow, rect,
 * ellipse, callout, pen).
 *
 * Black — the first swatch in `PEN_COLORS`. It used to default to the
 * Azure blue of `EDGE_KIND_META.peering` so a drawn arrow blended with a
 * diagram edge, but blue reads as "this is an Azure link" and made every
 * hand-drawn box look like a resource. Neutral ink is the safer default:
 * it never implies a meaning the user did not intend, and it is what every
 * other diagramming tool starts you on. Users can still pick any of the
 * other palette colors before or after drawing.
 */
const DEFAULT_SHAPE_COLOR = '#0f172a';

// ---------- Demo v0.6: shape / pen style variants ----------
export type DashStyle = 'solid' | 'dashed' | 'dotted';
export type ArrowHead = 'none' | 'end' | 'both' | 'dot';
export type CornerStyle = 'sharp' | 'rounded';
export type FillStyle = 'none' | 'tint' | 'solid';
/** Demo v0.6.2: arrow line-shape variants. */
export type ArrowShape = 'straight' | 'step' | 'curved' | 'elbow';

export interface ArrowStyle {
  dash: DashStyle;
  head: ArrowHead;
  thickness: number; // px
  shape: ArrowShape;
  textSize: number; // px — default label size for newly-drawn arrows
}
export interface BoxStyle { // rect / callout
  dash: DashStyle;
  corner: CornerStyle;
  fill: FillStyle;
  thickness: number;
  textSize: number;
}
export interface EllipseStyle {
  dash: DashStyle;
  fill: FillStyle;
  thickness: number;
  textSize: number;
}
export interface PenStyle {
  dash: DashStyle;
  thickness: number;
}
export interface CalloutStyle {
  dash: DashStyle;
  corner: CornerStyle;
  thickness: number;
  textSize: number;
}

/**
 * Default caption size for every newly drawn shape, in flow px.
 *
 * 14 was far too small next to the rest of the canvas: node cards render at
 * the `xlarge` baseline (see `theme/type-scale.ts`), so a card's NAME lands
 * at 17 × 1.3 ≈ 22 px and even its body text at ≈ 16 px. A shape caption at
 * a flat 14 px with no scale factor applied therefore read as the smallest
 * text on the diagram — the exact complaint. 24 px clears a card's name, so
 * an annotation reads as a label ON the diagram rather than as part of it.
 *
 * Must stay one of `SHAPE_TEXT_SIZES` in `model/shape-text.ts`, or the size
 * picker opens with nothing selected.
 *
 * Only NEW shapes are affected. The `?? 14` fallbacks on the render path are
 * deliberately left alone: a diagram saved before this change omits
 * `textSize` precisely because 14 was the default when it was drawn, so
 * raising the fallback would silently reflow every old file.
 */
export const DEFAULT_SHAPE_TEXT_PX = 24;

const DEFAULT_ARROW: ArrowStyle = { dash: 'solid', head: 'end', thickness: 2, shape: 'straight', textSize: DEFAULT_SHAPE_TEXT_PX };
const DEFAULT_RECT: BoxStyle = { dash: 'solid', corner: 'rounded', fill: 'tint', thickness: 2, textSize: DEFAULT_SHAPE_TEXT_PX };
const DEFAULT_ELLIPSE: EllipseStyle = { dash: 'solid', fill: 'tint', thickness: 2, textSize: DEFAULT_SHAPE_TEXT_PX };
const DEFAULT_CALLOUT: CalloutStyle = { dash: 'dashed', corner: 'rounded', thickness: 2, textSize: DEFAULT_SHAPE_TEXT_PX };
const DEFAULT_PEN: PenStyle = { dash: 'solid', thickness: 3 };

interface AnnotationState {
  tool: Tool;
  color: string;
  width: number;
  // Shape editing session state — array so multi-select works.
  // Order is preserved: last-clicked is at the end.
  selectedShapeIds: string[];
  pickedObject: PickedCanvasObject | null;
  setPickedObject: (object: PickedCanvasObject | null) => void;
  // Demo v0.6: per-tool style variants that new shapes / strokes inherit.
  arrowStyle: ArrowStyle;
  rectStyle: BoxStyle;
  ellipseStyle: EllipseStyle;
  calloutStyle: CalloutStyle;
  penStyle: PenStyle;
  /**
   * Bridge slot: when the toolbar drops a Text-box shape it stores the new
   * shape's id here so `ShapeOverlay` can open its inline text editor
   * automatically on the next frame. `ShapeOverlay` clears this back to
   * `null` after consuming it.
   */
  pendingTextEditShapeId: string | null;
  setTool: (tool: Tool) => void;
  setColor: (hex: string) => void;
  setSelectedShapes: (ids: string[]) => void;
  toggleShapeSelected: (id: string) => void;
  clearShapeSelection: () => void;
  setArrowStyle: (patch: Partial<ArrowStyle>) => void;
  setRectStyle: (patch: Partial<BoxStyle>) => void;
  setEllipseStyle: (patch: Partial<EllipseStyle>) => void;
  setCalloutStyle: (patch: Partial<CalloutStyle>) => void;
  setPenStyle: (patch: Partial<PenStyle>) => void;
  setPendingTextEditShapeId: (id: string | null) => void;
}

// Helpers so external code can classify a tool without repeating switches.
const SHAPE_TOOLS: readonly Tool[] = [
  'shape-arrow',
  'shape-rect',
  'shape-ellipse',
  'shape-callout',
];
export function isShapeTool(t: Tool): boolean {
  return (SHAPE_TOOLS as readonly string[]).includes(t);
}

export const useAnnotationStore = create<AnnotationState>((set) => ({
  tool: 'move',
  color: DEFAULT_SHAPE_COLOR,
  width: 3,
  selectedShapeIds: [],
  pickedObject: null,
  setPickedObject: (pickedObject) => set({ pickedObject }),
  arrowStyle: DEFAULT_ARROW,
  rectStyle: DEFAULT_RECT,
  ellipseStyle: DEFAULT_ELLIPSE,
  calloutStyle: DEFAULT_CALLOUT,
  penStyle: DEFAULT_PEN,
  pendingTextEditShapeId: null,
  setTool: (tool) => set({ tool, selectedShapeIds: [] }),
  // Color chip stays sticky when a shape tool is active; only jumps to pen
  // if you were on Move/Eraser (matches the original v0.5 behaviour).
  setColor: (hex) =>
    set((s) => ({
      color: hex,
      tool: isShapeTool(s.tool) ? s.tool : 'pen',
    })),
  setSelectedShapes: (ids) => set({ selectedShapeIds: ids }),
  toggleShapeSelected: (id) =>
    set((s) => {
      if (s.selectedShapeIds.includes(id)) {
        return { selectedShapeIds: s.selectedShapeIds.filter((x) => x !== id) };
      }
      return { selectedShapeIds: [...s.selectedShapeIds, id] };
    }),
  clearShapeSelection: () => set({ selectedShapeIds: [] }),
  // Style setters — merge the patch so only the changed field is written.
  // Also update the legacy global `width` when a pen thickness is picked so
  // the pencil path immediately reflects the new stroke width.
  setArrowStyle: (patch) => set((s) => ({ arrowStyle: { ...s.arrowStyle, ...patch } })),
  setRectStyle: (patch) => set((s) => ({ rectStyle: { ...s.rectStyle, ...patch } })),
  setEllipseStyle: (patch) => set((s) => ({ ellipseStyle: { ...s.ellipseStyle, ...patch } })),
  setCalloutStyle: (patch) => set((s) => ({ calloutStyle: { ...s.calloutStyle, ...patch } })),
  setPenStyle: (patch) =>
    set((s) => {
      const next = { ...s.penStyle, ...patch };
      return { penStyle: next, width: next.thickness };
    }),
  setPendingTextEditShapeId: (id) => set({ pendingTextEditShapeId: id }),
}));

// Testing hook — mirrors `window.__nds_diagramStore`. Playwright scripts
// can drive tool / color / style state changes directly instead of
// simulating clicks on the toolbar chrome.
if (typeof window !== 'undefined') {
  (window as unknown as { __nds_annotationStore?: typeof useAnnotationStore }).__nds_annotationStore =
    useAnnotationStore;
}

// ---------- Demo v0.6: dash → SVG dasharray helper ----------
// Multiplied by stroke width so the pattern scales with thickness. Returns
// `undefined` for 'solid' so the SVG omits the attribute entirely.
export function dashArrayFor(dash: DashStyle | undefined, width: number): string | undefined {
  if (!dash || dash === 'solid') return undefined;
  const w = Math.max(1, width);
  if (dash === 'dashed') return `${w * 4} ${w * 3}`;
  return `${w * 0.1} ${w * 2}`; // dotted — very short dash + gap
}
