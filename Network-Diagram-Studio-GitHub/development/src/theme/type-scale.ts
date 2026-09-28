// Diagram typography — the single source of truth for every font size that
// appears ON THE CANVAS (node cards, group containers, edge labels).
//
// Why this exists
// ---------------
// These sizes used to be hard-coded literals scattered across AzureNode,
// GroupNode and SmartLabelEdge — 9px field labels, 10px notes, 14px names.
// That was legible at 100% zoom on a small diagram, but a realistic Azure
// topology (region > resource group > VNet > subnet) fits on screen only at
// 50-65% zoom, which rendered those 9px captions at ~5px. Effectively
// nobody could read the detail rows without zooming in on every card.
//
// The baseline below is therefore set so the SMALLEST text on a card is
// 11px rather than 9px, and everything else moves up with it. Anything
// smaller than 11px should not be added here.
//
// Four multipliers compose, in this order:
//   1. this baseline            — the shared design scale
//   2. the global size factor   — pinned to XL (see DEFAULT_SIZE below)
//   3. the per-node text scale  — the A- / A+ toolbar on a selected node
//   4. the node's box scale     — how far the card was dragged past the
//                                 natural size `leafFootprint` computes for
//                                 its data (node cards only, capped at 2.5x)
//
// so a node at 120% renders its name at 17 x 1.3 x 1.2 px.
import { create } from 'zustand';

/** Baseline font sizes in px, at a global factor of 1.0. */
export const DIAGRAM_TYPE_SCALE = {
  // Node card
  nodeName: 17,
  nodeType: 12,
  nodeSubtitle: 13,
  nodeBadge: 12,
  fieldLabel: 11,
  fieldValue: 12,
  notesLabel: 12,
  notesBody: 13,
  // Group container
  groupName: 15,
  groupType: 12,
  groupChip: 12,
  groupNotes: 13,
  // Edge label chip
  edgeLabel: 13,
} as const;

export type DiagramTextSize = 'compact' | 'standard' | 'large' | 'xlarge';

/**
 * Multipliers on the baseline. "Standard" is 1.0 by definition — it IS the
 * scale above.
 */
export const TEXT_SIZE_FACTOR: Record<DiagramTextSize, number> = {
  compact: 0.85,
  standard: 1,
  large: 1.15,
  xlarge: 1.3,
};

/**
 * The size everyone gets. This used to be a four-way S/M/L/XL picker in
 * Settings, but it was solving the same problem twice: now that dragging a
 * card bigger scales the text inside it (multiplier 4 above), per-card sizing
 * is the better control — it's direct, it's visible, and it doesn't force one
 * global compromise across a diagram that mixes a hero VNet with a dozen
 * supporting cards. So the global knob is gone and the baseline is pinned to
 * the largest, most legible setting.
 *
 * Nothing is persisted: a stale `nds.diagramTextSize` from the old picker
 * would otherwise strand a user at S with no UI left to change it.
 */
const DEFAULT_SIZE: DiagramTextSize = 'xlarge';

interface DiagramTextState {
  size: DiagramTextSize;
  /** Cached `TEXT_SIZE_FACTOR[size]` so components don't recompute per render. */
  factor: number;
  setSize: (s: DiagramTextSize) => void;
}

/**
 * `setSize` has no UI behind it any more, but it stays as the seam the
 * Playwright regression sweep uses to re-check every template for clipped
 * cards at each factor.
 */
export const useDiagramTextStore = create<DiagramTextState>((set) => ({
  size: DEFAULT_SIZE,
  factor: TEXT_SIZE_FACTOR[DEFAULT_SIZE],
  setSize: (s) => set({ size: s, factor: TEXT_SIZE_FACTOR[s] }),
}));

/** Reactive accessor for canvas components. */
export function useDiagramTextFactor(): number {
  return useDiagramTextStore((s) => s.factor);
}

/**
 * Non-reactive accessor for the layout engine. Card footprints are computed
 * once at generate/re-layout time, so the packer reads the factor imperatively
 * and sizes boxes to match — that way "Large" produces roomier cards on a
 * freshly generated diagram instead of overflowing cards sized for 1.0.
 */
export function currentTextFactor(): number {
  return useDiagramTextStore.getState().factor;
}

// Testing hook — mirrors theme-store so Playwright checks can change the size
// without driving the Settings popover.
if (typeof window !== 'undefined') {
  (
    window as unknown as { __nds_diagramTextStore?: typeof useDiagramTextStore }
  ).__nds_diagramTextStore = useDiagramTextStore;
}
