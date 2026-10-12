import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAnnotationStore, type PickedCanvasObject } from '../demo/annotation-store';
import { SHAPE_PRESETS } from '../demo/shape-presets';
import { useTabsStore, type Shape } from '../demo/tabs-store';
import { useDiagramStore } from '../store/diagram-store';
import { getResourceType } from '../model/resource-types';
import { useT } from '../i18n/useT';
import { shapeHitsAt, svgHitContains, type ScreenPoint } from './shape-hit-test';

interface Choice extends PickedCanvasObject {
  label: string;
  type: string;
}
interface Menu {
  x: number;
  y: number;
  choices: Choice[];
}

function inside(point: ScreenPoint, box: DOMRect): boolean {
  return point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom;
}

function shapeName(shape: Shape, t: (source: string) => string): string {
  if (shape.kind === 'rect' && shape.canvasImage !== undefined) return t('Image');
  if (shape.text?.trim()) return shape.text.trim();
  if (shape.kind === 'rect' && shape.geom) {
    return SHAPE_PRESETS.find(preset => preset.overrides?.geom === shape.geom)?.label ?? shape.geom;
  }
  return t(shape.kind === 'rect' ? 'Rectangle' : shape.kind === 'ellipse' ? 'Ellipse' :
    shape.kind === 'arrow' ? 'Arrow' : 'Callout');
}

export function ObjectPicker() {
  const t = useT();
  const layerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const picked = useAnnotationStore(state => state.pickedObject);
  const shapeIds = useAnnotationStore(state => state.selectedShapeIds);
  const tool = useAnnotationStore(state => state.tool);
  const nodeIds = useDiagramStore(state => state.selectedNodeIds);
  const edgeIds = useDiagramStore(state => state.selectedEdgeIds);
  const diagram = useDiagramStore(state => state.diagram);
  const activeTabId = useTabsStore(state => state.activeTabId);
  const shapes = useTabsStore(state => state.activeTab().shapes);

  useEffect(() => {
    if (!picked) return;
    const ids = picked.kind === 'shape' ? shapeIds : picked.kind === 'node' ? nodeIds : edgeIds;
    const exists = picked.kind === 'shape' ? shapes.some(shape => shape.id === picked.id) :
      picked.kind === 'node' ? diagram.nodes.some(node => node.id === picked.id) : diagram.edges.some(edge => edge.id === picked.id);
    if (tool !== 'move' || ids.length !== 1 || ids[0] !== picked.id || !exists) {
      useAnnotationStore.getState().setPickedObject(null);
    }
  }, [picked, shapeIds, nodeIds, edgeIds, tool, shapes, diagram]);

  useEffect(() => {
    setMenu(null);
    useAnnotationStore.getState().setPickedObject(null);
  }, [activeTabId]);

  useEffect(() => { setMenu(null); }, [diagram, shapes, tool]);

  useEffect(() => {
    const host = layerRef.current?.closest<HTMLElement>('[data-nds-fullscreen-target]');
    if (!host) return;
    let rightDown: ScreenPoint | null = null;
    let panned = false;
    const onDown = (event: PointerEvent) => {
      if (event.button === 2) {
        rightDown = { x: event.clientX, y: event.clientY };
        panned = false;
      }
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenu(null);
    };
    const onMove = (event: PointerEvent) => {
      if (rightDown && (event.buttons & 2) && Math.hypot(event.clientX - rightDown.x, event.clientY - rightDown.y) > 4) {
        panned = true;
        setMenu(null);
      }
    };
    const onContext = (event: MouseEvent) => {
      if (useAnnotationStore.getState().tool !== 'move' || !(event.target instanceof Element)) return;
      if (event.target.closest('button, input, textarea, select, [contenteditable="true"], [data-nds-object-picker], [data-nds-annotation-toolbar], [data-nds-tab]')) return;
      if (panned) { event.preventDefault(); return; }
      const point = { x: event.clientX, y: event.clientY };
      const graph = useDiagramStore.getState().diagram;
      const shapesNow = useTabsStore.getState().activeTab().shapes;
      const shapeById = new Map(shapesNow.map(shape => [shape.id, shape]));
      const choices: Choice[] = [];
      for (const id of [...shapeHitsAt(host, point, true)].reverse()) {
        const shape = shapeById.get(id);
        if (shape) choices.push({ kind: 'shape', id, label: shapeName(shape, t), type: t('Shape') });
      }
      const nodes = new Map(graph.nodes.map(node => [node.id, node]));
      const elements = [...host.querySelectorAll<HTMLElement>('.react-flow__node')]
        .filter(element => nodes.has(element.dataset.id ?? '') && (inside(point, element.getBoundingClientRect()) ||
          [...element.querySelectorAll<SVGRectElement>('[data-nds-resource-padding]')]
            .some(region => svgHitContains(region, point, 'fill'))))
        .sort((a, b) => Number(getComputedStyle(b).zIndex) - Number(getComputedStyle(a).zIndex));
      for (const element of elements) {
        const node = nodes.get(element.dataset.id ?? '');
        if (!node) continue;
        choices.push({ kind: 'node', id: node.id, label: node.data.name,
          type: t(getResourceType(node.type).isGroup ? 'Container' : 'Resource') });
      }
      for (const edge of graph.edges) {
        const path = host.querySelector<SVGPathElement>(`[data-nds-edge-hit="${CSS.escape(edge.id)}"]`);
        const label = host.querySelector<HTMLElement>(`[data-nds-edge-label="${CSS.escape(edge.id)}"]`);
        if ((path && svgHitContains(path, point, 'stroke')) || (label && inside(point, label.getBoundingClientRect()))) {
          choices.push({ kind: 'edge', id: edge.id, label: edge.label || t('Connector'), type: t('Connector') });
        }
      }
      if (!choices.length) return;
      event.preventDefault();
      event.stopPropagation();
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const bounds = host.getBoundingClientRect();
      setMenu({ x: point.x - bounds.left, y: point.y - bounds.top, choices });
    };
    const close = () => setMenu(null);
    host.addEventListener('contextmenu', onContext, true);
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('blur', close);
    window.addEventListener('resize', close);
    host.addEventListener('wheel', close, { passive: true });
    return () => {
      host.removeEventListener('contextmenu', onContext, true);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('blur', close);
      window.removeEventListener('resize', close);
      host.removeEventListener('wheel', close);
    };
  }, [t]);

  useLayoutEffect(() => {
    const element = menuRef.current, host = layerRef.current;
    if (!menu || !element || !host) return;
    element.style.left = `${Math.max(4, Math.min(menu.x, host.clientWidth - element.offsetWidth - 4))}px`;
    element.style.top = `${Math.max(4, Math.min(menu.y, host.clientHeight - element.offsetHeight - 4))}px`;
    element.querySelector<HTMLButtonElement>('button')?.focus();
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setMenu(null);
      previousFocus.current?.focus();
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [menu]);

  const choose = (choice: Choice) => {
    const annotation = useAnnotationStore.getState();
    const graph = useDiagramStore.getState();
    annotation.setTool('move');
    if (choice.kind === 'shape') {
      graph.selectNode(null);
      annotation.setSelectedShapes([choice.id]);
    } else if (choice.kind === 'node') graph.selectNode(choice.id);
    else graph.selectEdge(choice.id);
    annotation.setPickedObject({ id: choice.id, kind: choice.kind });
    setMenu(null);
    previousFocus.current?.focus();
  };

  return <div ref={layerRef} className="absolute inset-0 z-50 pointer-events-none" data-nds-object-picker-layer>
    {menu && <dialog ref={menuRef} open data-nds-object-picker aria-label={t('Select object')}
      className="absolute m-0 flex flex-col overflow-hidden rounded-lg border border-slate-300 bg-white text-slate-900 shadow-xl pointer-events-auto"
      style={{ left: menu.x, top: menu.y, width: 300, maxWidth: 'calc(100% - 8px)', maxHeight: 'calc(100% - 8px)', padding: 4 }}
      onPointerDown={event => event.stopPropagation()}
      onKeyDown={event => {
        event.stopPropagation();
        if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'd', 'v', 'x', 'y', 'z'].includes(event.key.toLowerCase())) {
          event.preventDefault();
          return;
        }
        if (event.key === 'Tab') { setMenu(null); return; }
        const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
        const index = items.findIndex(item => item === document.activeElement);
        const next = event.key === 'ArrowDown' ? (index + 1) % items.length :
          event.key === 'ArrowUp' ? (index + items.length - 1) % items.length :
          event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : null;
        if (next !== null) { event.preventDefault(); items[next]?.focus(); }
      }}>
      <div className="shrink-0 px-2 py-1 text-sm font-semibold">{t('Select object')}</div>
      <div role="menu" aria-label={t('Select object')} className="min-h-0 overflow-auto" style={{ maxHeight: 280 }}>
        {menu.choices.map((choice, index) => <button key={`${choice.kind}:${choice.id}`} type="button" role="menuitem"
          data-nds-pick-id={choice.id} data-nds-pick-kind={choice.kind}
          className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-slate-100 focus:bg-slate-100 focus:outline-2 focus:outline-blue-500"
          onClick={() => choose(choice)}>
          <span className="text-slate-500 tabular-nums">{index + 1}.</span>
          <span className="flex-1 min-w-0 break-words">{choice.label}</span>
          <span className="text-xs text-slate-500">{choice.type}</span>
        </button>)}
      </div>
      <div className="shrink-0 px-2 py-1 text-xs text-slate-500">{t('Select an object to move or edit.')}</div>
    </dialog>}
  </div>;
}
