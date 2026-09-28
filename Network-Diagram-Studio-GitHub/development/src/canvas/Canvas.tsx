import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { shallow } from 'zustand/vanilla/shallow';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  Panel,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  type OnConnectEnd,
  type OnConnectStart,
} from '@xyflow/react';

import { AzureNode, type AzureNodeData } from './AzureNode';
import { GroupNode, type GroupNodeData } from './GroupNode';
import { ShapeAnchorNode } from './ShapeAnchorNode';
import { CONNECT_HANDLE_IDS } from './handles';
import { SmartLabelEdge } from './SmartLabelEdge';
import { edgeVisual, edgeDisplayLabel } from './edge-styles';
import { getResourceType } from '../model/resource-types';
import { buildEndpointIndex, endpointCenter, shapeEndpointBox, absoluteNodeBoxes } from '../model/endpoints';
import type { DiagramNode } from '../model/types';
import { collectCargo, shapeBBox, translateShapeGeometry, type BBox } from '../model/containment';
import {
  BIND_SLACK_PX,
  buildBindTargets,
  CONTAINER_EDGE_BAND_PX,
  pickTargetAt,
  refForDrop,
  handleKeyForAnchor,
  type NodeBox,
} from '../demo/shape-binding';

/** Reused so a cargo scan never allocates an empty Set per drag event. */
const EMPTY_ID_SET: ReadonlySet<string> = new Set<string>();

/**
 * Force a connect-handle id onto the END it is about to be stored as.
 *
 * Every connect dot is TWO handles at the very same pixel — `s-r75` and
 * `t-r75`. Under `ConnectionMode.Loose` React Flow will end a drag on
 * whichever twin happens to be on top, so `targetHandle` can legitimately
 * come back as `s-r75`. That id is real, but it is on the wrong end: the
 * router's `pinned()` requires a `t-…` id in a target slot, and React Flow
 * looks a handle up by id *and* type when it draws the edge. An id on the
 * wrong end is silently dropped, and the endpoint slides back to the side
 * midpoint — which is the "I aimed at that dot and it moved" bug.
 *
 * Swapping the prefix is a no-op geometrically: both twins are the same dot.
 */
function handleForEnd(
  id: string | null | undefined,
  end: 's' | 't'
): string | undefined {
  if (!id) return undefined;
  const body = id.startsWith('s-') || id.startsWith('t-') ? id.slice(2) : id;
  const normalized = `${end}-${body}`;
  return CONNECT_HANDLE_IDS.has(normalized) ? normalized : undefined;
}
import { leafFootprint } from '../model/professional-layout';
import { renderedSize, snapNodeSize } from '../model/size-match';
import { leafAppearance } from '../model/leaf-appearance';
import { useDiagramTextFactor } from '../theme/type-scale';
import { CONNECTION_LINE_STYLE } from '../theme/connection-line';
import { useDiagramStore } from '../store/diagram-store';
import { useTabsStore, viewportBridge, type Shape } from '../demo/tabs-store';
import { useAnnotationStore } from '../demo/annotation-store';
import { buildShapeFromVariantAt, findPreset } from '../demo/shape-presets';
import { iconSprite } from '../icons/sprite';
import { installImportedSymbols } from '../icons/imported-library';
import { runtimeExtensions } from '../runtime/extensions';
import { CANVAS_PLACEMENT_FEEDBACK } from '../env';
import { clearPlacementFeedback, isPreviewArrow, usePlacementFeedback } from '../demo/placement-feedback';

// Install the SVG symbol sprite exactly once, module-side, on the FIRST
// canvas mount. Moving it out of the Canvas render tree means:
//   1. React never diffs the 1.7 MB dangerouslySetInnerHTML on re-render.
//   2. Canvas unmount/remount (e.g. tab switches) does NOT re-inject the
//      sprite — it stays in <body> for the lifetime of the page.
//   3. <use href="#ic-…"> in every AzureNode still resolves globally.
let SPRITE_INSTALLED = false;function installSpriteOnce() {
  if (SPRITE_INSTALLED || typeof document === 'undefined') return;
  const host = document.createElement('div');
  host.setAttribute('data-nds-sprite', '1');
  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'absolute';
  host.style.width = '0';
  host.style.height = '0';
  host.style.overflow = 'hidden';
  host.innerHTML = iconSprite;
  document.body.appendChild(host);
  installImportedSymbols();
  SPRITE_INSTALLED = true;
}

/**
 * Options for EVERY fitView in this canvas.
 *
 * `maxZoom: 1` is the important part. React Flow's `fitView` prop defers
 * the initial fit until it has nodes to measure, so on a canvas that
 * starts empty it fires on the FIRST node the user adds — and with the
 * component's `maxZoom={2.5}`, framing one small card zoomed the canvas
 * to 2.5x. A freshly dropped 208x137 card rendered 520x343 and filled the
 * viewport, which read as "the default node size is enormous" even though
 * the node's own size was correct.
 *
 * Capping the fit at 1 means fitView may still zoom OUT to frame a large
 * diagram, but never zooms IN past 1:1. The user can still zoom in by
 * hand; nothing stops them.
 */
const FIT_VIEW_OPTIONS = { padding: 0.12, maxZoom: 1 } as const;

/**
 * MIME type used for palette → canvas drag-and-drop. Payload is a JSON
 * blob with a `kind` discriminator so both regular resource types and
 * ad-hoc "All icons" drops share a single drop handler.
 */
export const NDS_DRAG_MIME = 'application/x-nds-drag';
export type NdsDragPayload =
  | { kind: 'resource'; slug: string }
  | { kind: 'icon'; iconId: string; label: string }
  | { kind: 'shape'; variant: string };


const nodeTypes = {
  azure: AzureNode,
  azureGroup: GroupNode,
  // v0.9.29 — invisible stand-in that lets a real edge attach to an
  // annotation shape. See ShapeAnchorNode.tsx.
  shapeAnchor: ShapeAnchorNode,
};
// Override the default 'smoothstep' edge type with our SmartLabelEdge that
// portals the label into React Flow's overlay layer so it stays visible even
// when the natural label point falls inside a node card, and also shifts the
// label off any card when possible (see SmartLabelEdge.tsx).
const edgeTypes = { smoothstep: SmartLabelEdge };

/* Stable empty array for the shapes selector. Returning a fresh `[]` from a
   Zustand selector makes the snapshot differ on every store read and sends
   React into an infinite re-render. */
const EMPTY_SHAPES: Shape[] = [];

// Maximum characters shown on an edge label before truncation. Long labels
// stacked on top of each other are one of the top causes of unreadable
// diagrams — we truncate and rely on the Details panel for the full text.
const MAX_EDGE_LABEL = 42;

function truncateLabel(s: string): string {
  if (s.length <= MAX_EDGE_LABEL) return s;
  return s.slice(0, MAX_EDGE_LABEL - 1) + '…';
}

export interface CanvasProps {
  /** Which mouse buttons trigger canvas pan. Default = true (left button). */
  panOnDrag?: boolean | number[];
  /** When true, left-drag on empty pane starts ReactFlow's rubber-band
   *  selection. Requires panOnDrag to NOT be the left button (0). */
  selectionOnDrag?: boolean;
}

function stackFlowNodes(nodes: Node[]): Node[] {
  const groups = nodes.filter((node) => node.type === 'azureGroup');
  const area = (node: Node) => Number(node.style?.width ?? 0) * Number(node.style?.height ?? 0);
  groups.sort((a, b) => area(b) - area(a) || a.id.localeCompare(b.id));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  const ordered: Node[] = [];
  // Paint larger frames first, but keep explicit parents before their children.
  for (const node of [...groups, ...nodes.filter((node) => node.type !== 'azureGroup')]) {
    const chain: Node[] = [];
    let current: Node | undefined = node;
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.push(current);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    ordered.push(...chain.reverse());
  }
  let groupIndex = 0;
  return ordered.map((node) => node.type === 'azureGroup'
    ? { ...node, zIndex: 500 + groupIndex++ }
    : node.type === 'azure'
      ? { ...node, zIndex: 1000 + groups.length + (node.selected ? 1000 : 0) }
      : node);
}

export function Canvas(props: CanvasProps = {}) {
  const { panOnDrag = true, selectionOnDrag = false } = props;
  // Inject the icon sprite once for the lifetime of the page. Safe to
  // call on every mount — the module-level flag prevents duplicates.
  useEffect(installSpriteOnce, []);
  const diagram = useDiagramStore((s) => s.diagram);
  const groupCount = useMemo(
    () => diagram.nodes.filter((node) => getResourceType(node.type).isGroup).length,
    [diagram.nodes],
  );
  const selectedNodeId = useDiagramStore((s) => s.selectedNodeId);
  const selectedNodeIds = useDiagramStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useDiagramStore((s) => s.selectedEdgeIds);
  const moveNode = useDiagramStore((s) => s.moveNode);
  const beginGesture = useDiagramStore((s) => s.beginGesture);
  const commitGesture = useDiagramStore((s) => s.commitGesture);
  const updateNodeSize = useDiagramStore((s) => s.updateNodeSize);
  const removeNodes = useDiagramStore((s) => s.removeNodes);
  const removeEdges = useDiagramStore((s) => s.removeEdges);
  const addEdge = useDiagramStore((s) => s.addEdge);
  const setPendingEdgeLabelEditId = useDiagramStore(
    (s) => s.setPendingEdgeLabelEditId,
  );
  const selectNode = useDiagramStore((s) => s.selectNode);
  const selectEdge = useDiagramStore((s) => s.selectEdge);
  const applyNodeSelection = useDiagramStore((s) => s.applyNodeSelection);
  const applyEdgeSelection = useDiagramStore((s) => s.applyEdgeSelection);
  const addNode = useDiagramStore((s) => s.addNode);
  const addCustomIconNode = useDiagramStore((s) => s.addCustomIconNode);

  /**
   * v0.9.49 — what the node currently being dragged is carrying.
   *
   * A ref, not state: it is written on drag start and read on every
   * position event, and re-rendering the canvas mid-drag for it would cost
   * a frame without changing anything on screen.
   */
  const cargoRef = useRef<{
    anchorId: string;
    originX: number;
    originY: number;
    nodes: Array<{ id: string; x: number; y: number }>;
    shapes: Shape[];
  } | null>(null);

  // Drag-and-drop from the palette. `onDragOver` MUST call preventDefault
  // so the drop event is allowed to fire; `onDrop` reads the JSON payload
  // and calls the matching store action at the cursor's flow-space
  // coordinates (nudged so the icon centre — not top-left — lands under
  // the pointer).
  const rfInstance = useReactFlow();

  // Let the tabs store save/restore pan+zoom per tab. It can't call
  // useReactFlow itself (it isn't a component), so hand it the three
  // operations it needs for as long as this canvas is mounted.
  useEffect(() => {
    viewportBridge.get = () => rfInstance.getViewport();
    viewportBridge.set = (v) => rfInstance.setViewport(v, { duration: 0 });
    viewportBridge.fit = () => {
      // fitView has nothing to frame on a blank canvas and silently keeps
      // the current transform, so a new tab would open at the previous
      // tab's pan/zoom. Snap back to the origin at 1:1 instead.
      if (rfInstance.getNodes().length === 0) {
        rfInstance.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 0 });
        return;
      }
      rfInstance.fitView({ ...FIT_VIEW_OPTIONS, duration: 0 });
    };
    return () => {
      viewportBridge.get = null;
      viewportBridge.set = null;
      viewportBridge.fit = null;
    };
  }, [rfInstance]);

  // Frame any diagram that arrives as new content (Sample, Load JSON, New,
  // AI import). Deferred twice so React Flow has rendered AND measured the
  // incoming nodes — fitView can only frame nodes it has measured.
  const fitNonce = useDiagramStore((s) => s.fitNonce);
  useEffect(() => {
    if (fitNonce === 0) return;
    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) viewportBridge.fit?.();
      });
    });
    return () => {
      cancelled = true;
    };
  }, [fitNonce]);

  // Selecting a node mounts the property panel, which takes ~340px off the
  // right of the canvas — a node near the right edge would vanish behind it
  // the instant you click it. Nudge the viewport horizontally, but ONLY when
  // the selection actually ended up clipped, so nothing moves in the common
  // case.
  useEffect(() => {
    if (!selectedNodeId) return;
    let cancelled = false;
    // Two frames: one for the panel to mount, one for the browser to
    // re-layout the flex row and settle the canvas at its new width.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        const el = document.querySelector<HTMLElement>(
          `.react-flow__node[data-id="${CSS.escape(selectedNodeId)}"]`
        );
        const pane = el?.closest<HTMLElement>('.react-flow');
        if (!el || !pane) return;
        // Keep an inline field under the pointer/caret when selection opens
        // the inspector, including between the two clicks that start editing.
        if (el.contains(document.activeElement) &&
          document.activeElement?.matches('[data-nds-group-field], [data-nds-group-field-input]')) return;

        const MARGIN = 24;
        const nb = el.getBoundingClientRect();
        const pb = pane.getBoundingClientRect();
        const minDx = pb.left + MARGIN - nb.left; // shift needed to clear the left edge
        const maxDx = pb.right - MARGIN - nb.right; // shift allowed before clipping right

        let dx = 0;
        if (nb.width >= pb.width - MARGIN * 2) {
          // Node is wider than the viewport — can't show both edges, so
          // favour the left one (icon and name live there).
          dx = minDx;
        } else if (maxDx < 0) {
          dx = maxDx;
        } else if (minDx > 0) {
          dx = minDx;
        }
        if (Math.abs(dx) < 1) return;

        const vp = rfInstance.getViewport();
        rfInstance.setViewport({ ...vp, x: vp.x + dx }, { duration: 160 });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedNodeId, rfInstance]);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    // Only accept our own drags; anything else falls through so users
    // can still drop e.g. a file elsewhere.
    if (event.dataTransfer.types.includes(NDS_DRAG_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      if (CANVAS_PLACEMENT_FEEDBACK) {
        const variant = usePlacementFeedback.getState().paletteVariant;
        const shape = variant ? buildShapeFromVariantAt(variant, rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })) : null;
        usePlacementFeedback.setState({ paletteShape: shape && isPreviewArrow(shape) ? shape : null });
      }
    }
  }, [rfInstance]);
  useEffect(() => {
    if (!CANVAS_PLACEMENT_FEEDBACK) return;
    const clearNodes = () => {
      if (usePlacementFeedback.getState().nodeIds.length) usePlacementFeedback.setState({ nodeIds: [], carriedShapeIds: [] });
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') clearPlacementFeedback(); };
    window.addEventListener('dragstart', clearPlacementFeedback, true);
    window.addEventListener('dragend', clearPlacementFeedback);
    window.addEventListener('drop', clearPlacementFeedback);
    window.addEventListener('pointerup', clearNodes);
    window.addEventListener('pointercancel', clearNodes);
    window.addEventListener('blur', clearPlacementFeedback);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('dragstart', clearPlacementFeedback, true);
      window.removeEventListener('dragend', clearPlacementFeedback);
      window.removeEventListener('drop', clearPlacementFeedback);
      window.removeEventListener('pointerup', clearNodes);
      window.removeEventListener('pointercancel', clearNodes);
      window.removeEventListener('blur', clearPlacementFeedback);
      window.removeEventListener('keydown', escape);
      clearPlacementFeedback();
    };
  }, []);
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (CANVAS_PLACEMENT_FEEDBACK) clearPlacementFeedback();
      const raw = event.dataTransfer.getData(NDS_DRAG_MIME);
      if (!raw) return;
      event.preventDefault();
      let payload: NdsDragPayload;
      try {
        payload = JSON.parse(raw) as NdsDragPayload;
      } catch {
        return;
      }
      const p = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      // Icon centre lands under the cursor, not the top-left of the card.
      const pos = { x: Math.round(p.x - 90), y: Math.round(p.y - 75) };
      if (payload.kind === 'resource') {
        addNode(payload.slug, pos);
      } else if (payload.kind === 'icon') {
        addCustomIconNode(payload.iconId, payload.label, pos);
      } else if (payload.kind === 'shape') {
        // Palette Shapes tile: build the shape at the drop point (not
        // the nudged icon centre — shapes are already user-positioned
        // via the cursor), then commit it to the current tab. Text-box
        // variants also trigger inline text edit so the user can start
        // typing immediately. v0.7.15: auto-select the freshly-dropped
        // shape so the resize/rotation handles appear right away —
        // users no longer need to guess that shapes are clickable.
        const shape = buildShapeFromVariantAt(payload.variant, p);
        if (shape) {
          useTabsStore.getState().addShape(shape);
          const preset = findPreset(payload.variant);
          useAnnotationStore.getState().setTool('move');
          useAnnotationStore.getState().setSelectedShapes([shape.id]);
          if (preset?.isTextBox) {
            useAnnotationStore.getState().setPendingTextEditShapeId(shape.id);
          }
        }
      }
    },
    [rfInstance, addNode, addCustomIconNode]
  );

  const textFactor = useDiagramTextFactor();

  const resourceHitExclusions = useMemo(() => {
    const result = new Map<string, BBox[]>();
    const appearance = leafAppearance();
    if (!appearance) return result;
    const boxes = absoluteNodeBoxes(diagram.nodes.map(node => ({
      ...node, size: renderedSize(node, textFactor),
    })));
    const resources = diagram.nodes.filter(node => !getResourceType(node.type).isGroup);
    for (const node of resources) {
      if (appearance.isContainer(node.id)) continue;
      const box = boxes.get(node.id)!;
      const exclusions: BBox[] = [];
      for (const other of resources) {
        if (node.id === other.id) continue;
        const peer = boxes.get(other.id)!;
        const x = Math.max(box.x, peer.x), y = Math.max(box.y, peer.y);
        const w = Math.min(box.x + box.w, peer.x + peer.w) - x;
        const h = Math.min(box.y + box.h, peer.y + peer.h) - y;
        if (w > 0 && h > 0) exclusions.push({ x: x - box.x, y: y - box.y, w, h });
      }
      if (exclusions.length) result.set(node.id, exclusions);
    }
    return result;
  }, [diagram.nodes, textFactor]);

  /* v0.9.29 — shapes on the ACTIVE tab that an edge may attach to.
     Per-tab on purpose: a shape only exists on its own tab, so an edge into
     it can only be drawn there. On any other tab the endpoint simply isn't
     present and React Flow drops the edge from the render — which is the
     behaviour we want, and costs no filtering of our own. */
  const activeTabShapes = useTabsStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0];
    return tab?.shapes ?? EMPTY_SHAPES;
  });
  /* v0.9.29 — an invisible anchor node per shape that an edge actually uses.
     Built ONLY for shapes an edge references, so a diagram whose shapes are
     pure annotation adds nothing to React Flow's node list and behaves
     exactly as it did before this version.

     zIndex 0 keeps them under every card, and `selectable`/`draggable`/
     `focusable` are all off because ShapeOverlay — which is mounted ABOVE
     the flow — owns every shape interaction. An anchor that accepted a click
     would steal it from the shape it stands for. */
  const shapeAnchors = useMemo<Node[]>(() => {
    const referenced = new Set<string>();
    for (const e of diagram.edges) {
      referenced.add(e.source);
      referenced.add(e.target);
    }
    const out: Node[] = [];
    for (const s of activeTabShapes) {
      if (!referenced.has(s.id)) continue;
      const box = shapeEndpointBox(s);
      if (!box) continue;
      out.push({
        id: box.id,
        type: 'shapeAnchor',
        position: { x: box.x, y: box.y },
        style: { width: box.w, height: box.h },
        selectable: false,
        draggable: false,
        focusable: false,
        connectable: false,
        deletable: false,
        data: {},
        zIndex: 0,
      } as Node);
    }
    return out;
  }, [diagram.edges, activeTabShapes]);

  const shapeAnchorIds = useMemo(
    () => new Set(shapeAnchors.map((n) => n.id)),
    [shapeAnchors],
  );

  const previousFlowNodes = useRef(new Map<string, Node>());
  const nodes = useMemo<Node[]>(
    () => {
      /* v0.9.62 — selection is a SET, not a single id. Deriving `selected`
         from `selectedNodeId` alone overwrote React Flow's own
         multi-selection on the very next render, which is why Shift+click
         and the marquee could never hold more than one card and Delete only
         ever removed one. */
      const picked = new Set(selectedNodeIds);
      const multi = selectedNodeIds.length > 1;
      // Keep imported parent relationships, but do not use `extent: 'parent'`:
      // grouping must not lock cards or nested containers inside a frame.
      const resourceNodes = diagram.nodes.map((n) => {
        const rt = getResourceType(n.type);
        const isGroup = rt.isGroup === true;

        if (isGroup) {
          const size = n.size ?? { w: 260, h: 200 };
          const groupData: GroupNodeData = {
            name: n.data.name,
            typeSlug: n.type,
            state: n.data.state,
            iconId: n.data.iconId,
            typeLabel: n.data.typeLabel,
            fields: n.data.fields,
            notes: n.data.notes,
            textScale: n.data.textScale,
            multiSelected: multi,
          };
          return {
            id: n.id,
            type: 'azureGroup',
            position: n.position,
            parentId: n.parent,
            selected: picked.has(n.id),
            // Selection replaces the RF node before it is remeasured. Keep
            // header scaling stable so the second click hits the same field.
            width: size.w,
            height: size.h,
            style: { width: size.w, height: size.h },
            data: groupData as unknown as Record<string, unknown>,
            zIndex: 500,
          } as Node;
        }

        const azureData: AzureNodeData = {
          name: n.data.name,
          subtitle: n.data.subtitle,
          state: n.data.state,
          typeSlug: n.type,
          iconId: n.data.iconId,
          iconSize: n.data.iconSize,
          typeLabel: n.data.typeLabel,
          typeCaption: n.data.typeCaption,
          fields: n.data.fields,
          notes: n.data.notes,
          textScale: n.data.textScale,
          multiSelected: multi,
          hitExclusions: resourceHitExclusions.get(n.id),
        };
        // NodeResizer needs an explicit width/height on the React Flow
        // wrapper. `leafFootprint` is the SAME function the layout packer
        // uses, so a card is exactly as tall as the content it will draw —
        // no clipped notes, and no dead space inflating the diagram (which
        // would make fit-view zoom out and shrink every label).
        const defaultLeafSize = n.size ?? leafFootprint(n, textFactor);
        return {
          id: n.id,
          type: 'azure',
          position: n.position,
          parentId: n.parent,
          selected: picked.has(n.id),
          style: {
            width: n.size?.w ?? defaultLeafSize.w,
            height: n.size?.h ?? defaultLeafSize.h,
            ...(azureData.hitExclusions ? { pointerEvents: 'none' as const } : {}),
          },
          className: azureData.hitExclusions ? 'nds-resource-overlap' : undefined,
          data: azureData as unknown as Record<string, unknown>,
          zIndex: 1000,
        } as Node;
      });

      const next = stackFlowNodes([...resourceNodes, ...shapeAnchors]).map(node => {
        const previous = previousFlowNodes.current.get(node.id);
        if (!previous) return node;
        // An unchanged card must retain its data and node identities while
        // another object moves, including through React Flow's internals.
        const candidate = {
          ...node,
          data: shallow(previous.data, node.data) ? previous.data : node.data,
          style: shallow(previous.style, node.style) ? previous.style : node.style,
          position: shallow(previous.position, node.position) ? previous.position : node.position,
        };
        return shallow(previous, candidate) ? previous : candidate;
      });
      previousFlowNodes.current = new Map(next.map(node => [node.id, node]));
      return next;
    },
    [diagram.nodes, shapeAnchors, selectedNodeIds, textFactor, resourceHitExclusions]
  );

  const edges = useMemo<Edge[]>(() => {
    const connectors = runtimeExtensions().ndsNonProductionConnectors;
    const selectedEdgeZ = 900 + groupCount;
    const pickedEdges = new Set(selectedEdgeIds);
    // Compute absolute (root-space) centers so we can pick source/target
    // handles based on relative geometry — vertical neighbors use Top↔Bottom,
    // horizontal neighbors use Left↔Right. Without this, every edge exits
    // Right and enters Left, causing L-shaped wraps that stack on top of
    // each other with unreadable labels in dense templates.
    //
    // v0.9.29 — the index covers shapes too, so a shape endpoint routes by
    // exactly the same rules as a resource one.
    const endpoints = buildEndpointIndex(diagram.nodes, activeTabShapes);
    const groupControls = diagram.nodes.flatMap((node) => {
      const box = endpoints.get(node.id);
      return box && selectedNodeIds.includes(node.id) && getResourceType(node.type).isGroup ? [box] : [];
    });
    const absCenter = (id: string): { x: number; y: number; w: number; h: number } | null => {
      const b = endpoints.get(id);
      if (!b) return null;
      const c = endpointCenter(b);
      return { x: c.x, y: c.y, w: b.w, h: b.h };
    };

    type SideMap = { src: string; tgt: string };
    const pickHandles = (
      s: { x: number; y: number },
      t: { x: number; y: number },
    ): SideMap => {
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      // Prefer horizontal routing unless vertical distance clearly dominates
      // (bias factor 1.2 to avoid flickering near diagonals).
      if (Math.abs(dx) * 1.2 >= Math.abs(dy)) {
        return dx >= 0
          ? { src: 's-r', tgt: 't-l' }
          : { src: 's-l', tgt: 't-r' };
      }
      return dy >= 0
        ? { src: 's-b', tgt: 't-t' }
        : { src: 's-t', tgt: 't-b' };
    };

    // Group edges by (route-direction, source-handle, target-handle) so we
    // can stagger offsets when multiple parallel edges pick the same route
    // — prevents them from overlapping on the exact same path.
    //
    // v0.9.41 — PINNED vs FLOATING endpoints. `pickHandles` above is the
    // *floating* route: it re-derives the facing sides from live geometry on
    // every render. That is the right default, but it used to be the ONLY
    // behaviour, which meant an arrow the user deliberately dragged out of
    // the 25 % dot snapped back to the side midpoint the instant it was
    // committed — the dot they aimed at was purely decorative. An endpoint
    // whose dot the user actually chose is now honoured instead.
    //
    // Two guards, both load-bearing:
    //   • the id must be one this build renders (`CONNECT_HANDLE_IDS`) and
    //     must be on the right END — a `t-…` id in `sourceHandle` would
    //     leave React Flow hunting for a handle that isn't there, and the
    //     edge would collapse onto the node's origin;
    //   • that is now the ONLY guard. Until v0.9.56 a shape endpoint was
    //     also forced onto the floating route, because `ShapeAnchorNode`
    //     carried the four midpoint pairs alone and a quarter id would have
    //     pointed at a handle that did not exist. The anchor now renders the
    //     same twelve points a resource card does, so a dot the user aimed
    //     at on a SHAPE is honoured exactly like one on a card.
    const pinned = (
      handleId: string | undefined,
      end: 's' | 't',
    ): string | undefined =>
      handleId && handleId.startsWith(`${end}-`) && CONNECT_HANDLE_IDS.has(handleId)
        ? handleId
        : undefined;

    const groupIndex = new Map<string, number>();
    const perEdgeSides = new Map<string, SideMap>();
    for (const e of diagram.edges) {
      const s = absCenter(e.source);
      const t = absCenter(e.target);
      if (!s || !t) continue;
      const auto = pickHandles(s, t);
      const sides: SideMap = {
        src: pinned(e.sourceHandle, 's') ?? auto.src,
        tgt: pinned(e.targetHandle, 't') ?? auto.tgt,
      };
      perEdgeSides.set(e.id, sides);
      const key = `${sides.src}->${sides.tgt}|${e.source}-${e.target}`;
      groupIndex.set(key, (groupIndex.get(key) ?? 0) + 1);
    }
    const seenPerGroup = new Map<string, number>();

    return diagram.edges.map((e) => {
      const vis = edgeVisual(e.kind, e.color, e.line);
      const rawLabel = edgeDisplayLabel(e.kind, e.label);
      const sides = perEdgeSides.get(e.id);
      // Stagger the smoothstep offset for parallel edges between the same pair
      // of nodes so they don't overlap. Base 20, +/-14 per extra edge.
      let offset = 20;
      if (sides) {
        const key = `${sides.src}->${sides.tgt}|${e.source}-${e.target}`;
        const seen = seenPerGroup.get(key) ?? 0;
        seenPerGroup.set(key, seen + 1);
        const total = groupIndex.get(key) ?? 1;
        if (total > 1) {
          const step = 14;
          const spread = (total - 1) * step;
          offset = 20 + (seen * step - spread / 2);
        }
      }
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: sides?.src,
        targetHandle: sides?.tgt,
        type: 'smoothstep',
        label: truncateLabel(rawLabel),
        style: vis.style,
        markerEnd: connectors ? connectors.marker(e.data, vis.markerEnd) : vis.markerEnd,
        selected: pickedEdges.has(e.id),
        // The CSS edge layer sits between group frames and resource cards.
        // Within that layer, selected connectors rise above other connectors.
        // Labels use their own overlay above the resource cards.
        zIndex: pickedEdges.has(e.id) ? selectedEdgeZ : 100,
        data: {
          connector: e.data,
          groupControls,
          kind: e.kind,
          state: e.state ?? 'ok',
          color: e.color,
          line: e.line,
          textScale: e.textScale,
          borderRadius: 12,
          offset,
        },
      } as Edge;
    });
  }, [diagram.edges, diagram.nodes, activeTabShapes, selectedEdgeIds, selectedNodeIds, groupCount]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      /* Removals and selection changes are collected and applied once per
         batch, not once per change. React Flow sends the whole marquee — or
         every node of a multi-selection Delete — in a single call, and
         handling them one at a time pushed one undo frame per element. */
      const removeIds: string[] = [];
      const selectChanges: { id: string; selected: boolean }[] = [];
      for (const c of changes) {
        /* v0.9.29 — shape anchors are React Flow nodes that are NOT diagram
           nodes. React Flow still emits `dimensions` changes for them as it
           measures, and feeding those to the diagram store would push undo
           frames for a node that does not exist. Drop them here, at the one
           place every change arrives. */
        if ('id' in c && shapeAnchorIds.has(c.id)) continue;
        if (c.type === 'position' && 'position' in c && c.position) {
          moveNode(c.id, c.position);
          const cargo = cargoRef.current;
          if (cargo && c.id === cargo.anchorId) {
            // Deltas are measured from the drag-start snapshot rather than
            // accumulated per event, so a dropped or coalesced move can
            // never leave the cargo drifting behind the container.
            const boxes = absoluteNodeBoxes(useDiagramStore.getState().diagram.nodes);
            const now = boxes.get(cargo.anchorId);
            if (now) {
              const dx = now.x - cargo.originX;
              const dy = now.y - cargo.originY;
              for (const n of cargo.nodes) moveNode(n.id, { x: n.x + dx, y: n.y + dy });
              if (cargo.shapes.length) {
                useTabsStore
                  .getState()
                  .updateShapes(cargo.shapes.map((sh) => translateShapeGeometry(sh, dx, dy)));
              }
            }
          }
        } else if (c.type === 'dimensions' && 'dimensions' in c && c.dimensions) {
          const raw = { w: c.dimensions.width, h: c.dimensions.height };
          /* v0.9.61 — snap a HAND-DRIVEN resize to a neighbour's width or
             height so two VNets can be made the same size without aiming.
             `resizeHint` is what distinguishes the two kinds of `dimensions`
             change that arrive here: a grip drag (snap it, and report what it
             locked onto) versus React Flow measuring a node it just mounted
             (leave it alone — snapping a measurement would resize nodes
             nobody touched, on load). Read live via `getState` so the
             callback identity stays stable across the gesture. */
          const st = useDiagramStore.getState();
          if (st.resizeHint?.nodeId === c.id) {
            const snap = snapNodeSize(c.id, raw, st.diagram.nodes, textFactor);
            st.setResizeHint({
              nodeId: c.id,
              w: snap.size.w,
              h: snap.size.h,
              matchId: snap.matchId,
              matchName: snap.matchName,
            });
            updateNodeSize(c.id, snap.size);
          } else {
            updateNodeSize(c.id, raw);
          }
        } else if (c.type === 'remove') {
          removeIds.push(c.id);
        } else if (c.type === 'select') {
          selectChanges.push({ id: c.id, selected: c.selected });
        }
      }
      if (selectChanges.length) applyNodeSelection(selectChanges);
      if (removeIds.length) removeNodes(removeIds);
    },
    [
      moveNode,
      updateNodeSize,
      removeNodes,
      applyNodeSelection,
      shapeAnchorIds,
      textFactor,
    ]
  );

  // Bracket the whole drag so history gets ONE frame holding the
  // pre-drag positions. The old code called `updateNode` here instead,
  // which snapshotted the diagram AFTER `moveNode` had already written
  // the final position — so every drag stored a frame identical to the
  // current state and Undo appeared to do nothing.
  const onNodeDragStart = useCallback(
    (event: React.MouseEvent | MouseEvent | TouchEvent, node: Node, nodes?: Node[]) => {
      beginGesture();
      cargoRef.current = null;
      if (CANVAS_PLACEMENT_FEEDBACK) usePlacementFeedback.setState({
        nodeIds: nodes?.length ? nodes.map(item => item.id) : [node.id], carriedShapeIds: [],
      });
      // Ctrl (Cmd on macOS) is the escape hatch: move the frame on its
      // own. NOT Alt — ShapeOverlay's `rootCaptures` flips the overlay
      // to `pointerEvents: auto` while Alt is held so it can run the
      // shape marquee, which swallows the pointer before React Flow
      // ever sees it and makes an Alt+node drag a no-op.
      if (!('ctrlKey' in event) || event.ctrlKey || event.metaKey) return;

      const diag = useDiagramStore.getState().diagram;
      const shapesNow = useTabsStore.getState().activeTab()?.shapes ?? [];
      const boxes = absoluteNodeBoxes(diag.nodes);
      const container = boxes.get(node.id);
      if (!container) return;

      // Everything React Flow will already move on its own has to be
      // excluded, or it travels twice as far as the container:
      //   - nodes in this drag's own selection get their own delta;
      //   - nodes with a real `parent` chain into the container are moved
      //     natively by React Flow's parent-relative positioning.
      const skip = new Set<string>((nodes ?? []).map((n) => n.id));
      skip.add(node.id);
      const byId = new Map(diag.nodes.map((n) => [n.id, n]));
      for (const n of diag.nodes) {
        let cur: DiagramNode | undefined = n;
        const guard = new Set<string>();
        while (cur?.parent && !guard.has(cur.parent)) {
          guard.add(cur.parent);
          if (cur.parent === node.id) {
            skip.add(n.id);
            break;
          }
          cur = byId.get(cur.parent);
        }
      }

      const carried = collectCargo(
        container,
        diag.nodes,
        (n) => boxes.get(n.id) ?? null,
        skip
      );
      // A child whose parent is also cargo already follows it — it is
      // rendered at a position relative to that parent — so translating it
      // again here would move it twice as far.
      const carriedIds = new Set(carried.map((n) => n.id));
      const nodeCargo = carried
        .filter((n) => !n.parent || !carriedIds.has(n.parent))
        .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));

      const shapeCargo = collectCargo(container, shapesNow, shapeBBox, EMPTY_ID_SET);

      if (nodeCargo.length === 0 && shapeCargo.length === 0) return;
      cargoRef.current = {
        anchorId: node.id,
        originX: container.x,
        originY: container.y,
        nodes: nodeCargo,
        shapes: shapeCargo,
      };
      if (CANVAS_PLACEMENT_FEEDBACK) usePlacementFeedback.setState(state => ({
        nodeIds: [...new Set([...state.nodeIds, ...nodeCargo.map(item => item.id)])],
        carriedShapeIds: shapeCargo.map(shape => shape.id),
      }));
    },
    [beginGesture]
  );

  const onNodeDragStop = useCallback(() => {
    cargoRef.current = null;
    if (CANVAS_PLACEMENT_FEEDBACK) clearPlacementFeedback();
    commitGesture();
  }, [commitGesture]);

  // A marquee/selection drag moves every selected node itself, so there is
  // nothing left to carry — it only needs the undo bracket.
  const onSelectionDragStart = useCallback((_event: React.MouseEvent, selectedNodes: Node[]) => {
    cargoRef.current = null;
    beginGesture();
    if (CANVAS_PLACEMENT_FEEDBACK) usePlacementFeedback.setState({ nodeIds: selectedNodes.map(node => node.id), carriedShapeIds: [] });
  }, [beginGesture]);

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removeIds: string[] = [];
      const selectChanges: { id: string; selected: boolean }[] = [];
      for (const c of changes) {
        if (c.type === 'remove') removeIds.push(c.id);
        else if (c.type === 'select') selectChanges.push({ id: c.id, selected: c.selected });
      }
      if (selectChanges.length) applyEdgeSelection(selectChanges);
      if (removeIds.length) removeEdges(removeIds);
    },
    [removeEdges, applyEdgeSelection]
  );

  /**
   * v0.9.56 — is a connection drag in flight?
   *
   * Drives the `nds-connecting` class on the canvas wrapper, which is what
   * reveals EVERY connect dot on EVERY node for the duration of the drag.
   *
   * A CSS-only version is not possible. `.nds-connect-handle` is revealed by
   * `.react-flow__node:hover`, and the handle you started the drag from has
   * pointer capture — so the browser stops updating `:hover` on the node you
   * are dragging *towards*. The target's dots therefore stayed at
   * `opacity: 0` until the pointer was already on top of one, which is the
   * "I cannot see where I am connecting the line to" report. React Flow's
   * own `.connectingfrom` / `.connectingto` classes do not help either: they
   * mark only the handle the drag started from and the single handle
   * currently under the cursor, never the rest of the target's dots.
   */
  const [isConnecting, setIsConnecting] = useState(false);

  const onConnectStart = useCallback<OnConnectStart>(() => {
    setIsConnecting(true);
  }, []);

  const onConnect = useCallback(
    (conn: Connection) => {
      if (conn.source && conn.target) {
        // Pin the edge to the dots the drag actually used. React Flow hands
        // us the exact handle ids; discarding them (as this did before
        // v0.9.41) is what made every arrow snap back to a side midpoint no
        // matter which dot the user aimed at. `edges` validates them.
        //
        // v0.9.56 — normalise each id onto its own end first. In Loose mode
        // a drop may land on the SOURCE twin of the target dot, which would
        // otherwise be discarded downstream and undo the pin.
        const newEdgeId = addEdge(conn.source, conn.target, {
          sourceHandle: handleForEnd(conn.sourceHandle, 's'),
          targetHandle: handleForEnd(conn.targetHandle, 't'),
        });
        // Auto-open the inline label editor on the freshly drawn edge so the
        // user can name it in one flow, no trip to the property panel
        // required. v0.9.53: un-gated from IS_DEMO along with the editor
        // itself in SmartLabelEdge — prod could not edit edge labels at all.
        if (newEdgeId) {
          selectEdge(newEdgeId);
          setPendingEdgeLabelEditId(newEdgeId);
        }
      }
    },
    [addEdge, selectEdge, setPendingEdgeLabelEditId]
  );

  /**
   * v0.9.55 — finish a connection React Flow itself threw away.
   *
   * React Flow can only complete a connection on one of its own **handles**,
   * and it only sees a handle within `connectionRadius` of the pointer. Two
   * everyday gestures therefore did nothing at all:
   *
   *   1. **resource handle → shape.** A shape is not a React Flow node and
   *      has no handles, so the drop was discarded every time — even though
   *      the *reverse* gesture (a shape's connect anchor onto a resource)
   *      has created a real `DiagramEdge` since v0.9.29, and even though
   *      `ShapeOverlay` paints a drop ring the whole way there. The
   *      affordance promised a connection the canvas could not make.
   *   2. **resource handle → the BODY of another card.** The centre of a
   *      180x150 card is ~90 px from its nearest handle, so releasing where
   *      the user is actually looking missed at any zoom below ~2x.
   *
   * Every other connect gesture on this canvas binds to a target's **body**,
   * via `pickTargetAt` — the same predicate the shape overlay uses, with the
   * same container edge-band and the same `BIND_SLACK_PX` forgiveness. This
   * handler applies it to the release point once React Flow has given up, so
   * all four combinations of {resource, shape} × {resource, shape} finally
   * behave identically.
   *
   * A drop that React Flow *did* accept never reaches the body of this
   * function — `isValid` short-circuits first — so `onConnect` keeps
   * handling the handle-to-handle case exactly as before.
   */
  const onConnectEnd = useCallback<OnConnectEnd>(
    (_event, connectionState) => {
      // The drag is over however it ends — drop the reveal class first, so
      // none of the early returns below can leave every dot lit up.
      setIsConnecting(false);
      // React Flow accepted the drop: `onConnect` has already made the edge.
      if (connectionState.isValid) return;
      const fromNode = connectionState.fromNode;
      const to = connectionState.to;
      if (!fromNode || !to) return;

      // `connectionState.to` is in RENDERER space — pixels relative to the
      // top-left of the `.react-flow` container, NOT world coordinates. React
      // Flow's connection line divides it back out by the viewport transform
      // before drawing, so the line looks correct on screen while the raw
      // value is off by exactly the pan/zoom. Bind targets live in world
      // space, so undo the transform before hit-testing or nothing matches.
      const { x: vx, y: vy, zoom: rawZoom } = rfInstance.getViewport();
      const zoom = Math.max(0.1, rawZoom);
      const releasedAt = { x: (to.x - vx) / zoom, y: (to.y - vy) / zoom };

      // The same target set the shape overlay's ring is driven from, so the
      // affordance and the outcome cannot disagree. Node geometry comes from
      // `absoluteNodeBoxes` (which unwinds parent chains) rather than from
      // React Flow, because a nested card's own `position` is relative.
      const nodes = useDiagramStore.getState().diagram.nodes;
      const boxes = absoluteNodeBoxes(nodes);
      const nodeBoxes: NodeBox[] = [];
      for (const n of nodes) {
        const b = boxes.get(n.id);
        if (!b) continue;
        nodeBoxes.push({
          id: n.id,
          x: b.x,
          y: b.y,
          w: b.w,
          h: b.h,
          // A VNet / subnet / region is background you draw *inside*, so only
          // a band along its outline attaches. Same rule as a shape arrow.
          container: getResourceType(n.type).isGroup === true,
        });
      }
      const hit = pickTargetAt(
        releasedAt,
        buildBindTargets(activeTabShapes, nodeBoxes),
        null,
        CONTAINER_EDGE_BAND_PX / zoom,
        BIND_SLACK_PX / zoom,
      );
      // Releasing back on the card the drag started from is a cancelled
      // gesture, not a self-loop. `excludeId` is deliberately NOT used for
      // this: excluding the source would let the drop fall through to the
      // container *behind* it and mint an edge the user never asked for.
      if (!hit || hit.id === fromNode.id) return;

      // Dragging out of a TARGET handle draws the edge backwards, which is
      // exactly how React Flow would have recorded it had the drop landed on
      // a handle.
      const backwards = connectionState.fromHandle?.type === 'target';
      // The drag STARTED on a dot, so that end is pinned; it ENDED on a bare
      // card body, so the other end has no dot to honour and keeps floating.
      const fromHandleId = connectionState.fromHandle?.id ?? undefined;
      const newEdgeId = addEdge(
        backwards ? hit.id : fromNode.id,
        backwards ? fromNode.id : hit.id,
        {
          ...(backwards ? { targetHandle: fromHandleId } : { sourceHandle: fromHandleId }),
          ...runtimeExtensions().ndsNonProductionConnectors?.dropHandles(
            hit, releasedAt, zoom, backwards, refForDrop, handleKeyForAnchor
          ),
        },
      );
      if (!newEdgeId) return;
      selectNode(null);
      selectEdge(newEdgeId);
      setPendingEdgeLabelEditId(newEdgeId);
    },
    [
      rfInstance,
      activeTabShapes,
      addEdge,
      selectNode,
      selectEdge,
      setPendingEdgeLabelEditId,
    ]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    selectEdge(null);
  }, [selectNode, selectEdge]);

  // ---------- Fullscreen ----------
  // We target the closest ancestor marked with `data-nds-fullscreen-target`
  // so overlays that live as SIBLINGS of Canvas (like the demo's
  // AnnotationOverlay / AnnotationToolbar / TabBar) come along into
  // fullscreen. If no marker is found (e.g., a test harness), we fall
  // back to our own wrapper.
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const resolveFullscreenTarget = useCallback((): HTMLElement | null => {
    const el = wrapperRef.current;
    if (!el) return null;
    const marked = el.closest('[data-nds-fullscreen-target]') as HTMLElement | null;
    return marked ?? el;
  }, []);

  useEffect(() => {
    const onChange = () => {
      const target = resolveFullscreenTarget();
      setIsFullscreen(!!document.fullscreenElement && document.fullscreenElement === target);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [resolveFullscreenTarget]);

  const toggleFullscreen = useCallback(async () => {
    const target = resolveFullscreenTarget();
    if (!target) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await target.requestFullscreen();
    }
  }, [resolveFullscreenTarget]);

  return (
    <div
      ref={wrapperRef}
      className={`w-full h-full relative bg-slate-50${isConnecting ? ' nds-connecting' : ''}`}
      style={{ '--nds-group-count': groupCount } as React.CSSProperties}
      onDoubleClickCapture={(event) => runtimeExtensions().ndsTextDock?.createText(event, rfInstance, buildShapeFromVariantAt)}
      onDragOver={onDragOver}
      onDragLeave={event => {
        if (CANVAS_PLACEMENT_FEEDBACK && (!(event.relatedTarget instanceof window.Node) || !event.currentTarget.contains(event.relatedTarget))) {
          usePlacementFeedback.setState({ paletteShape: null });
        }
      }}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        elevateNodesOnSelect={false}
        /* stackFlowNodes owns the layer order, including nested-node selection. */
        zIndexMode="manual"
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onSelectionDragStart={onSelectionDragStart}
        onSelectionDragStop={onNodeDragStop}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onPaneClick={onPaneClick}
        /* v0.9.56 — every connect dot is a source handle and a target handle
           stacked on the same pixel, and in the default `strict` mode only
           the opposite-type twin can end a drag. Whether the right twin was
           on top came down to paint order and a `z-index` tie-break, so some
           dots accepted a drop and some silently refused — reported as
           "connecting the dots doesn't work properly". `Loose` lets a drag
           end on ANY dot of another node; `handleForEnd` then rewrites the
           id onto the correct end so the pin still resolves. */
        connectionMode={ConnectionMode.Loose}
        /* v0.9.30 — the in-flight line must be visible on both themes and
           identical to the one a shape's connect anchor draws. See
           theme/connection-line.ts. */
        connectionLineStyle={CONNECTION_LINE_STYLE}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.1}
        maxZoom={2.5}
        /* RF's default deleteKeyCode is 'Backspace' alone, so this stays
           explicit — dropping it would silently retire the Delete key. */
        deleteKeyCode={['Delete', 'Backspace']}
        multiSelectionKeyCode={['Shift']}
        /* v0.9.50 — RF's default connectionRadius is 20 px, measured from
           the pointer to a handle. Reported as "connecting resources and
           shapes is very difficult": at anything below 100 % zoom a 20 px
           radius around a handle that is itself only 16 px is a very small
           place to let go. 45 is wide enough to forgive a normal release
           and still narrower than the gap between two adjacent handles on
           the smallest card the layout produces. */
        connectionRadius={45}
        panOnDrag={panOnDrag}
        selectionOnDrag={selectionOnDrag}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--nds-grid)" />
        <Controls position="bottom-left" showInteractive={false} />
        <Panel position="top-left">
          <button
            type="button"
            onClick={toggleFullscreen}
            data-nds-fullscreen
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="nds-canvas-chrome flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-slate-700 text-xs font-medium transition-colors"
          >
            {isFullscreen ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                  <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                  <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                  <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                </svg>
                Exit fullscreen
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8V5a2 2 0 0 1 2-2h3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
                </svg>
                Fullscreen
              </>
            )}
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
