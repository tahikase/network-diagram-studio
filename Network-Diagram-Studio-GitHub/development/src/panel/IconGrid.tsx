import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, type IconEntry } from '../icons/manifest';
import { paletteIcons, useImportedIcons } from '../icons/imported-library';
import { useT } from '../i18n/useT';

interface IconGridProps {
  onSelect: (icon: IconEntry) => void;
  onCancel?: () => void;
  /** Optional CSS class for the outer scroll container. */
  scrollClassName?: string;
  /** Flow into an existing palette scroller instead of creating a nested one. */
  scrollMode?: 'contained' | 'flow';
  /** Grid column count. Default 4 for the palette panel; use 6-8 in a modal. */
  columns?: number;
  autoFocusSearch?: boolean;
  /**
   * When provided, each tile becomes draggable and this function returns
   * the (mimeType, serialized payload) pair to attach to the drag event.
   * Callers that don't want drag support (e.g. the icon-override picker
   * modal) can leave this undefined.
   */
  dragPayloadFor?: (icon: IconEntry) => { mime: string; payload: string } | null;
  /**
   * When both callbacks are provided, each tile shows a star (☆/★) in its
   * top-right corner. Clicking the star toggles favorite membership WITHOUT
   * triggering `onSelect` (which would drop a node). Callers that don't
   * want the star (e.g. the icon-override picker modal) leave these
   * undefined.
   */
  isFavorite?: (iconId: string) => boolean;
  onToggleFavorite?: (iconId: string) => void;
  /**
   * When provided, restricts the visible icons to just this subset (by id).
   * Used by the Favorites tab to render only pinned icons in the same
   * grid layout used elsewhere.
   */
  restrictToIds?: Set<string>;
  /** Optional empty-state message shown when no icons match the filter. */
  emptyMessage?: string;
}

/**
 * Star (☆/★) pinned to the top-right of a square tile. Exported because the
 * shape palette needs the identical affordance — a tile is a tile, and a
 * second visual language for "pin this" would be worse than a shared import.
 */
export function StarToggle({
  filled,
  onToggle,
}: {
  filled: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onMouseDown={(e) => {
        // Prevent the outer button from receiving focus / handling the click.
        e.stopPropagation();
      }}
      onDragStart={(e) => {
        // Star sits on top of a draggable tile — don't start an unintended drag.
        e.preventDefault();
        e.stopPropagation();
      }}
      title={filled ? t('Remove from Favorites') : t('Add to Favorites')}
      aria-label={filled ? t('Remove from Favorites') : t('Add to Favorites')}
      className={`absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center transition ${
        filled ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-amber-500'
      }`}
    >
      <svg width={12} height={12} viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 1.6 L9.9 5.7 L14.4 6.3 L11.1 9.4 L12 13.9 L8 11.7 L4 13.9 L4.9 9.4 L1.6 6.3 L6.1 5.7 Z"
          fill={filled ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function IconTile({
  icon,
  onSelect,
  columns,
  dragPayloadFor,
  isFavorite,
  onToggleFavorite,
}: {
  icon: IconEntry;
  onSelect: (i: IconEntry) => void;
  columns: number;
  dragPayloadFor?: (icon: IconEntry) => { mime: string; payload: string } | null;
  isFavorite?: (iconId: string) => boolean;
  onToggleFavorite?: (iconId: string) => void;
}) {
  // Icon size scales inverse to column count so the tile stays roughly 60-72px wide.
  const size = columns >= 6 ? 28 : 32;
  const drag = dragPayloadFor?.(icon);
  const showStar = !!(isFavorite && onToggleFavorite);
  const starred = showStar ? isFavorite!(icon.id) : false;
  return (
    <button
      type="button"
      data-nds-icon-tile={icon.id}
      draggable={!!drag}
      onDragStart={
        drag
          ? (e) => {
              e.dataTransfer.setData(drag.mime, drag.payload);
              e.dataTransfer.effectAllowed = 'copy';
            }
          : undefined
      }
      onClick={() => onSelect(icon)}
      title={`${icon.label} · ${icon.category}`}
      className={`relative flex flex-col items-center gap-1 px-1 py-2 rounded-md border border-transparent bg-white hover:bg-slate-100 hover:border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 ${drag ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {showStar && (
        <StarToggle filled={starred} onToggle={() => onToggleFavorite!(icon.id)} />
      )}
      <svg width={size} height={size} aria-hidden="true">
        <use href={`#ic-${icon.id}`} />
      </svg>
      <span
        className="text-[10px] leading-tight text-slate-700 line-clamp-2 text-center"
        style={{ wordBreak: 'break-word' }}
      >
        {icon.label}
      </span>
    </button>
  );
}

export function IconGrid({
  onSelect,
  onCancel,
  scrollClassName = 'nds-scroll',
  scrollMode = 'contained',
  columns = 4,
  autoFocusSearch = false,
  dragPayloadFor,
  isFavorite,
  onToggleFavorite,
  restrictToIds,
  emptyMessage,
}: IconGridProps) {
  const t = useT();
  const [query, setQuery] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const flow = scrollMode === 'flow';
  const importedItems = useImportedIcons(s => s.items);
  const icons = useMemo(() => paletteIcons(importedItems), [importedItems]);

  useLayoutEffect(() => {
    const grid = gridRef.current, search = searchRef.current;
    if (!flow || !grid || !search) return;
    const measure = () => grid.style.setProperty('--nds-icon-search-height', `${search.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(search);
    return () => observer.disconnect();
  }, [flow]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const scoped = restrictToIds ? icons.filter((i) => restrictToIds.has(i.id)) : icons;
    if (!q) return scoped;
    return scoped.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
    );
  }, [query, restrictToIds, icons]);

  const grouped = useMemo(() => {
    const map = new Map<string, IconEntry[]>();
    for (const i of filtered) {
      const arr = map.get(i.category) ?? [];
      arr.push(i);
      map.set(i.category, arr);
    }
    // Preserve manifest category order.
    return [...new Set([...CATEGORIES, ...map.keys()])].filter((c) => map.has(c)).map((c) => ({
      name: c,
      items: (map.get(c) ?? []).sort((a, b) => a.label.localeCompare(b.label)),
    }));
  }, [filtered]);

  return (
    <div ref={gridRef} className={flow ? 'min-w-0' : 'flex flex-col h-full min-h-0'} data-nds-icon-grid={scrollMode}>
      <div ref={searchRef} data-nds-icon-search
        className={`px-3 py-2 border-b bg-white${flow ? ' sticky top-0 z-20' : ''}`}
        style={{ borderColor: 'var(--color-slate-200)' }}>
        <div className="flex items-center gap-2">
          <input
            autoFocus={autoFocusSearch}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${t('Search all icons')} (${icons.length})`}
            className="flex-1 min-w-0 h-8 px-2 text-sm border rounded-md"
            style={{ borderColor: 'var(--color-slate-300)' }}
          />
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="h-8 px-2 text-xs border rounded-md hover:bg-slate-100"
              style={{ borderColor: 'var(--color-slate-300)' }}
            >
              {t('Cancel')}
            </button>
          )}
        </div>
        <div className="mt-1 text-[10px] text-slate-500 uppercase tracking-wide">
          {t('Showing')} {filtered.length} {t('of')} {icons.length}
        </div>
      </div>

      <div data-nds-icon-list className={flow ? undefined : `flex-1 overflow-y-auto ${scrollClassName}`}>
        {grouped.length === 0 && (
          <div className="p-4 text-sm text-slate-500">
            {emptyMessage ?? t('No matches. Try a different keyword.')}
          </div>
        )}
        {grouped.map((section) => (
          <div key={section.name}>
            <div data-nds-icon-category={section.name}
              className="sticky top-0 z-10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200"
              style={flow ? { top: 'var(--nds-icon-search-height)' } : undefined}>
              {section.name === 'Imported icons' ? t('Imported icons') : section.name} · {section.items.length}
            </div>
            <div
              className="p-2 grid gap-1"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {section.items.map((icon) => (
                <IconTile
                  key={icon.id}
                  icon={icon}
                  onSelect={onSelect}
                  columns={columns}
                  dragPayloadFor={dragPayloadFor}
                  isFavorite={isFavorite}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
