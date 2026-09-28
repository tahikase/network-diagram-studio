import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useT } from '../i18n/useT';
import { useTabsStore } from './tabs-store';

const TAB_MIME = 'application/x-nds-diagram-tab';
type DropTarget = { id: string; side: 'before' | 'after' };

export function useTabReorder(bar: RefObject<HTMLDivElement | null>, order: string) {
  const t = useT();
  const sourceRef = useRef<string | null>(null);
  const allowedPress = useRef<string | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const clickBlocked = useRef(false);
  const clickTimer = useRef<number | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const stopScroll = useCallback(() => {
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = null;
    pointer.current = null;
  }, []);
  const cancel = useCallback(() => {
    sourceRef.current = null;
    allowedPress.current = null;
    setSource(null);
    setTarget(null);
    stopScroll();
    if (clickTimer.current !== null) clearTimeout(clickTimer.current);
    clickTimer.current = window.setTimeout(() => {
      clickBlocked.current = false;
      clickTimer.current = null;
    }, 0);
  }, [stopScroll]);

  const focusTab = useCallback((id: string) => {
    requestAnimationFrame(() => {
      const area = bar.current;
      const tab = area?.querySelector<HTMLElement>(`[data-nds-tab="${CSS.escape(id)}"]`);
      if (!area || !tab) return;
      tab.focus({ preventScroll: true });
      const bounds = tab.getBoundingClientRect(), visible = area.getBoundingClientRect();
      // Import ARM stays pinned over the left end of the compact scrolling strip.
      const pinned = area.querySelector<HTMLElement>('#nds-arm-open');
      const left = pinned && getComputedStyle(pinned).position === 'sticky'
        ? Math.max(visible.left, pinned.getBoundingClientRect().right) : visible.left;
      if (bounds.left < left + 4) area.scrollLeft -= left + 4 - bounds.left;
      else if (bounds.right > visible.right - 4) area.scrollLeft += bounds.right - visible.right + 4;
    });
  }, [bar]);

  const end = useCallback(() => {
    if (sourceRef.current) setAnnouncement(t('Tab reordering cancelled.'));
    cancel();
  }, [cancel, t]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !sourceRef.current) return;
      const id = sourceRef.current;
      event.preventDefault();
      end();
      focusTab(id);
    };
    const outside = (event: DragEvent) => {
      if (!sourceRef.current || (event.target instanceof Node && bar.current?.contains(event.target))) return;
      stopScroll();
      setTarget(null);
    };
    window.addEventListener('keydown', escape);
    window.addEventListener('blur', end);
    window.addEventListener('dragend', end);
    window.addEventListener('drop', end);
    window.addEventListener('dragover', outside);
    return () => {
      window.removeEventListener('keydown', escape);
      window.removeEventListener('blur', end);
      window.removeEventListener('dragend', end);
      window.removeEventListener('drop', end);
      window.removeEventListener('dragover', outside);
      stopScroll();
      if (clickTimer.current !== null) clearTimeout(clickTimer.current);
    };
  }, [bar, end, focusTab, stopScroll]);
  useEffect(() => { cancel(); }, [order, cancel]);

  const targetAt = (x: number, y: number): DropTarget | null => {
    const area = bar.current;
    if (!area || !sourceRef.current) return null;
    const bounds = area.getBoundingClientRect();
    if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return null;
    const tabs = [...area.querySelectorAll<HTMLElement>('[data-nds-tab]')].map(element => {
      const id = element.dataset.ndsTab;
      if (!id) throw new Error('A diagram tab has no identifier.');
      return { id, box: element.getBoundingClientRect() };
    });
    const hit = tabs.find(tab => x >= tab.box.left && x <= tab.box.right);
    if (hit) return hit.id === sourceRef.current ? null :
      { id: hit.id, side: x < hit.box.left + hit.box.width / 2 ? 'before' : 'after' };
    const next = tabs.find(tab => tab.id !== sourceRef.current && x < tab.box.left);
    const last = tabs.filter(tab => tab.id !== sourceRef.current).at(-1);
    return next ? { id: next.id, side: 'before' } : last ? { id: last.id, side: 'after' } : null;
  };
  const indicate = (next: DropTarget | null) => {
    setTarget(previous => previous?.id === next?.id && previous?.side === next?.side ? previous : next);
  };
  const move = (id: string, destination: DropTarget) => {
    const store = useTabsStore.getState();
    if (store.moveTab(id, destination.id, destination.side)) {
      const tabs = useTabsStore.getState().tabs;
      const index = tabs.findIndex(tab => tab.id === id);
      setAnnouncement(t('Moved {tab} to position {position} of {count}.')
        .replace('{position}', String(index + 1)).replace('{count}', String(tabs.length))
        .replace('{tab}', () => tabs[index].name));
    }
    focusTab(id);
  };
  const press = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
    allowedPress.current = event.button === 0 && event.target instanceof Element &&
      !event.target.closest('button, input, textarea, select, [contenteditable="true"]') ? id : null;
  };
  const start = (event: React.DragEvent<HTMLDivElement>, id: string) => {
    if (allowedPress.current !== id || useTabsStore.getState().tabs.length < 2) {
      event.preventDefault();
      return;
    }
    if (clickTimer.current !== null) clearTimeout(clickTimer.current);
    clickTimer.current = null;
    clickBlocked.current = true;
    sourceRef.current = id;
    setSource(id);
    setTarget(null);
    setAnnouncement('');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(TAB_MIME, id);
    event.stopPropagation();
  };
  const accepts = (event: React.DragEvent) =>
    sourceRef.current !== null && event.dataTransfer.types.includes(TAB_MIME);
  const over = (event: React.DragEvent<HTMLDivElement>) => {
    if (!accepts(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    pointer.current = { x: event.clientX, y: event.clientY };
    indicate(targetAt(event.clientX, event.clientY));
    if (scrollFrame.current !== null) return;
    const tick = () => {
      scrollFrame.current = null;
      const area = bar.current, point = pointer.current;
      if (!area || !point || !sourceRef.current) return;
      const box = area.getBoundingClientRect();
      if (point.x < box.left || point.x > box.right || point.y < box.top || point.y > box.bottom) return;
      const speed = point.x < box.left + 36 ? -Math.min(14, (box.left + 36 - point.x) / 3)
        : point.x > box.right - 36 ? Math.min(14, (point.x - box.right + 36) / 3) : 0;
      if (!speed) return;
      const before = area.scrollLeft;
      area.scrollLeft += speed;
      indicate(targetAt(point.x, point.y));
      if (area.scrollLeft !== before) scrollFrame.current = requestAnimationFrame(tick);
    };
    scrollFrame.current = requestAnimationFrame(tick);
  };
  const leave = (event: React.DragEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    stopScroll();
    setTarget(null);
  };
  const drop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!accepts(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const id = sourceRef.current;
    const destination = targetAt(event.clientX, event.clientY);
    cancel();
    if (id && destination) move(id, destination);
  };
  const key = (event: React.KeyboardEvent<HTMLDivElement>, id: string): boolean => {
    if (!event.altKey || event.ctrlKey || event.metaKey ||
        !['ArrowLeft', 'ArrowRight'].includes(event.key)) return false;
    event.preventDefault();
    event.stopPropagation();
    cancel();
    const tabs = useTabsStore.getState().tabs;
    const index = tabs.findIndex(tab => tab.id === id) + (event.key === 'ArrowLeft' ? -1 : 1);
    if (index >= 0 && index < tabs.length) {
      move(id, { id: tabs[index].id, side: event.key === 'ArrowLeft' ? 'before' : 'after' });
    }
    return true;
  };
  const suppressClick = (event: React.MouseEvent): boolean => {
    if (!clickBlocked.current) return false;
    event.preventDefault();
    event.stopPropagation();
    return true;
  };

  return { source, target, announcement, press, start, over, leave, drop, key, focusTab, suppressClick };
}
