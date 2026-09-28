import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { PALETTE_SECTION_REORDER } from '../env';
import { useT } from '../i18n/useT';
import { PALETTE_SECTION_LABELS, useLayoutStore, type PaletteTab } from './layout-store';

const SECTION_MIME = 'application/x-nds-palette-section';
type DropTarget = { id: PaletteTab; side: 'before' | 'after' };

export function usePaletteReorder(scroller: RefObject<HTMLDivElement | null>, searching: boolean) {
  const t = useT();
  const sourceRef = useRef<PaletteTab | null>(null);
  const pointerY = useRef<number | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const [source, setSource] = useState<PaletteTab | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const stopScroll = useCallback(() => {
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = null;
    pointerY.current = null;
  }, []);
  const cancel = useCallback(() => {
    sourceRef.current = null;
    setSource(null);
    setTarget(null);
    stopScroll();
  }, [stopScroll]);

  useEffect(() => {
    if (!PALETTE_SECTION_REORDER) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel(); };
    const outside = (event: DragEvent) => {
      if (!sourceRef.current) return;
      if (!(event.target instanceof Node) || !scroller.current?.contains(event.target)) {
        stopScroll();
        setTarget(null);
      }
    };
    window.addEventListener('dragend', cancel);
    window.addEventListener('drop', cancel);
    window.addEventListener('blur', cancel);
    window.addEventListener('keydown', escape);
    window.addEventListener('dragover', outside);
    return () => {
      window.removeEventListener('dragend', cancel);
      window.removeEventListener('drop', cancel);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('keydown', escape);
      window.removeEventListener('dragover', outside);
      sourceRef.current = null;
      stopScroll();
    };
  }, [cancel, scroller, stopScroll]);
  useEffect(() => { if (searching) cancel(); }, [searching, cancel]);

  const accepts = (event: React.DragEvent) =>
    PALETTE_SECTION_REORDER && sourceRef.current !== null && event.dataTransfer.types.includes(SECTION_MIME);
  const dropTarget = (event: React.DragEvent<HTMLElement>, id: PaletteTab): DropTarget => ({
    id,
    side: event.clientY < event.currentTarget.getBoundingClientRect().top + event.currentTarget.offsetHeight / 2
      ? 'before' : 'after',
  });
  const announce = (id: PaletteTab) => {
    const order = useLayoutStore.getState().paletteOrder;
    setAnnouncement(t('Moved {section} to position {position} of {count}.')
      .replace('{section}', t(PALETTE_SECTION_LABELS[id]))
      .replace('{position}', String(order.indexOf(id) + 1)).replace('{count}', String(order.length)));
  };
  const move = (id: PaletteTab, destination: DropTarget) => {
    if (useLayoutStore.getState().movePaletteSection(id, destination.id, destination.side)) announce(id);
    requestAnimationFrame(() => {
      const area = scroller.current;
      const header = area?.querySelector<HTMLButtonElement>(`[data-nds-accordion-header="${id}"]`);
      if (!area || !header) return;
      header.focus({ preventScroll: true });
      const bounds = header.getBoundingClientRect(), visible = area.getBoundingClientRect();
      if (bounds.top < visible.top) area.scrollTop -= visible.top - bounds.top;
      else if (bounds.bottom > visible.bottom) area.scrollTop += bounds.bottom - visible.bottom;
    });
  };

  const start = (event: React.DragEvent<HTMLElement>, id: PaletteTab) => {
    if (!PALETTE_SECTION_REORDER) return;
    sourceRef.current = id;
    setSource(id);
    setTarget(null);
    setAnnouncement('');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(SECTION_MIME, id);
  };
  const over = (event: React.DragEvent<HTMLElement>, id: PaletteTab) => {
    if (!accepts(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const next = id === sourceRef.current ? null : dropTarget(event, id);
    setTarget(previous => previous?.id === next?.id && previous?.side === next?.side ? previous : next);
  };
  const leave = (event: React.DragEvent<HTMLElement>, id: PaletteTab) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setTarget(previous => previous?.id === id ? null : previous);
  };
  const drop = (event: React.DragEvent<HTMLElement>, id: PaletteTab) => {
    if (!accepts(event)) return;
    event.preventDefault();
    const moving = sourceRef.current;
    if (moving) move(moving, dropTarget(event, id));
    cancel();
  };
  const key = (event: React.KeyboardEvent<HTMLElement>, id: PaletteTab) => {
    if (!PALETTE_SECTION_REORDER || !event.altKey || event.ctrlKey || event.metaKey ||
      !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    cancel();
    const order = useLayoutStore.getState().paletteOrder;
    const index = order.indexOf(id) + (event.key === 'ArrowUp' ? -1 : 1);
    if (index >= 0 && index < order.length) {
      move(id, { id: order[index], side: event.key === 'ArrowUp' ? 'before' : 'after' });
    }
  };
  const scroll = (event: React.DragEvent<HTMLDivElement>) => {
    if (!accepts(event)) return;
    event.preventDefault();
    if (!(event.target instanceof Element) || !event.target.closest('[data-nds-accordion-header]')) setTarget(null);
    pointerY.current = event.clientY;
    if (scrollFrame.current !== null) return;
    const tick = () => {
      scrollFrame.current = null;
      const element = scroller.current;
      if (!element || !sourceRef.current || pointerY.current === null) return;
      const box = element.getBoundingClientRect();
      const y = pointerY.current;
      const speed = y < box.top + 40 ? -Math.min(14, (box.top + 40 - y) / 3)
        : y > box.bottom - 40 ? Math.min(14, (y - box.bottom + 40) / 3) : 0;
      if (!speed) return;
      const before = element.scrollTop;
      element.scrollTop += speed;
      if (element.scrollTop !== before) scrollFrame.current = requestAnimationFrame(tick);
    };
    scrollFrame.current = requestAnimationFrame(tick);
  };

  const reset = () => {
    cancel();
    useLayoutStore.getState().resetPaletteOrder();
    setAnnouncement(t('Palette order reset.'));
    requestAnimationFrame(() => scroller.current?.querySelector<HTMLButtonElement>('[data-nds-accordion-header]')?.focus());
  };

  return { source, target, announcement, start, over, leave, drop, key, scroll, reset };
}
