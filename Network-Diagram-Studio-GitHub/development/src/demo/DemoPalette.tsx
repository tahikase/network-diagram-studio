// Demo v0.6: palette (Resources / All icons / Shapes).
//
// Prod uses `src/panel/Palette.tsx` (2 tabs: Resources + All icons).
// The demo build swaps in this component. The Resources and All-icons tabs
// intentionally mirror the prod behavior (add-to-canvas on click) so the
// muscle memory doesn't change.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { CATEGORIES_ORDER, RESOURCE_TYPES, type ResourceType } from '../model/resource-types';
import { paletteIcons, useImportedIcons } from '../icons/imported-library';
import { useDiagramStore } from '../store/diagram-store';
import { IconGrid } from '../panel/IconGrid';
import { useTabsStore } from './tabs-store';
import { ResizableAside } from '../panel/ResizableAside';
import { DEFAULT_PALETTE_ORDER, useLayoutStore, type PaletteTab } from './layout-store';
import { usePaletteReorder } from './use-palette-reorder';
import { useFavoritesStore, favTotalSelector } from './favorites-store';
import { getFlowViewportCenter } from '../canvas/viewport-utils';
import { NDS_DRAG_MIME, type NdsDragPayload } from '../canvas/Canvas';
import { PaletteShapesSection, ShapePresetTile } from './PaletteShapesSection';
import { LearnDiagramsTab, LearnDiagramPreview, openExternal } from './LearnDiagramsTab';
import { LEARN_DIAGRAMS } from './learn-diagrams.generated';
import { DEMO_FEATURES, IMPORTED_ICONS, PALETTE_SECTION_REORDER } from '../env';
import { ImportedIconsSection } from './ImportedIconsSection';
import { ImportIconsButton } from './IconLibraryActions';
import { useShapeDropper } from './use-shape-dropper';
import { buildShapeFromVariantAt, PALETTE_SHAPE_PRESETS, SHAPE_TILE_PRESETS } from './shape-presets';
import { useAnnotationStore } from './annotation-store';
import { APP_VERSION } from '../version';
import { useUpdatesStore } from '../updates/updates-store';
import {
  countPaletteHits,
  searchPalette,
  type PaletteHit,
  type PaletteHitKind,
} from './palette-search';
import { useT } from '../i18n/useT';
import { useI18nStore, learnUrl } from '../i18n/i18n-store';
import type { LearnDiagram } from './learn-diagram-search';

function IconPreview({ iconId }: { iconId: string }) {
  return (
    <svg width={20} height={20} aria-hidden="true" className="flex-shrink-0">
      <use href={`#ic-${iconId}`} />
    </svg>
  );
}

/**
 * Small star toggle used to pin items to the Favorites tab. Renders as an
 * absolutely-positioned overlay so it doesn't disturb row layout. Click
 * stops propagation so the parent (row / tile) doesn't also handle it.
 */
function RowStar({
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
      onMouseDown={(e) => e.stopPropagation()}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      title={filled ? t('Remove from Favorites') : t('Add to Favorites')}
      aria-label={filled ? t('Remove from Favorites') : t('Add to Favorites')}
      className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition ${
        filled ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-amber-500'
      }`}
    >
      <svg width={12} height={12} viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 1.6 L9.9 5.7 L14.4 6.3 L11.1 9.4 L12 13.9 L8 11.7 L4 13.9 L4.9 9.4 L1.6 6.3 L6.1 5.7 Z"
          fill={filled ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

type TabKey = PaletteTab;

/**
 * Vertical accordion section header + body. Multiple sections can be open
 * simultaneously — clicking the header toggles just that one. Body is
 * unmounted when the section is closed so heavy grids (like all 722
 * icons) aren't rendered until the user opens them.
 */
function AccordionSection({
  id,
  title,
  count,
  open,
  onToggle,
  reorder,
  children,
}: {
  id: TabKey;
  title: React.ReactNode;
  count?: number;
  open: boolean;
  onToggle: () => void;
  reorder: ReturnType<typeof usePaletteReorder>;
  children: React.ReactNode;
}) {
  const t = useT();
  const bodyId = `section-body-${id}`;
  const dropSide = reorder.target?.id === id ? reorder.target.side : undefined;
  return (
    <div
      id={`section-${id}`}
      data-nds-accordion-section={id}
      className="border-b border-slate-200"
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        data-nds-accordion-header={id}
        draggable={PALETTE_SECTION_REORDER}
        onDragStart={event => reorder.start(event, id)}
        onDragOver={event => reorder.over(event, id)}
        onDragLeave={event => reorder.leave(event, id)}
        onDrop={event => reorder.drop(event, id)}
        onKeyDown={event => reorder.key(event, id)}
        title={PALETTE_SECTION_REORDER ? t('Drag to reorder. Use Alt+Up/Down to move.') : undefined}
        aria-describedby={PALETTE_SECTION_REORDER ? 'nds-palette-order-hint' : undefined}
        aria-keyshortcuts={PALETTE_SECTION_REORDER ? 'Alt+ArrowUp Alt+ArrowDown' : undefined}
        data-nds-section-drop={dropSide}
        data-nds-section-dragging={reorder.source === id ? '1' : undefined}
        style={PALETTE_SECTION_REORDER ? {
          cursor: reorder.source === id ? 'grabbing' : 'default',
          opacity: reorder.source === id ? .55 : undefined,
          boxShadow: dropSide ? `inset 0 ${dropSide === 'before' ? 3 : -3}px 0 var(--nds-accent-text)` : undefined,
        } : undefined}
        className="w-full flex items-center gap-2 px-3 py-2 text-left select-none hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-400"
      >
        <svg
          width={10}
          height={10}
          viewBox="0 0 10 10"
          aria-hidden="true"
          className={`text-slate-500 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
          style={{ transitionDuration: '150ms' }}
        >
          <path
            d="M3 1 L7 5 L3 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700 flex-1">
          {title}
        </span>
        {typeof count === 'number' && count > 0 && (
          <span className="text-[10px] text-slate-500 font-medium">{count}</span>
        )}
        {PALETTE_SECTION_REORDER && <svg width={10} height={14} viewBox="0 0 10 14"
          data-nds-section-grip={id} aria-hidden="true" className="shrink-0 text-slate-400" style={{ pointerEvents: 'none' }}>
          {[3, 7, 11].flatMap(y => [3, 7].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r={1} fill="currentColor" />))}
        </svg>}
      </button>
      {open && (
        <div id={bodyId} role="region" aria-labelledby={`section-${id}`}>
          {children}
        </div>
      )}
    </div>
  );
}

function TabButton(_props: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  // v0.7.12: replaced by AccordionSection above. Kept as a no-op stub so
  // this module has a stable export shape even if a stale build cache
  // still references it. Never rendered.
  return null;
}
// Reference the stub so `noUnusedLocals` stays happy without adding it
// to the public export list.
void TabButton;

// --------------------------------------------------------------------------
// Resources tab (unchanged behavior vs prod)
// --------------------------------------------------------------------------
/**
 * Resource tile for the 4-across Resources grid.
 *
 * v0.9.59 — Resources used to render as one tall single-column list of
 * `PaletteRow`s. With 177 entries that is a very long scroll, and it looked
 * nothing like the All-icons and Shapes sections directly beneath it, which
 * are both 4-across tile grids. This mirrors `IconTile` in
 * `src/panel/IconGrid.tsx` so the three catalogues scan identically.
 *
 * Structure note: the star is a SIBLING of the tile button, not a child of
 * it. Nesting a <button> inside a <button> is invalid HTML; the wrapper div
 * carries the hover styling so the tile still highlights as one unit.
 */
function PaletteTile({
  rt,
  onAdd,
  starred,
  onToggleStar,
}: {
  rt: ResourceType;
  onAdd: (slug: string) => void;
  starred: boolean;
  onToggleStar: () => void;
}) {
  const t = useT();
  return (
    <div
      className={`relative flex rounded-md border bg-white hover:bg-slate-100 hover:border-slate-200 ${
        // Containers are drop targets rather than leaf resources. A dashed
        // outline is the same language the canvas uses for a group boundary.
        rt.isGroup ? 'border-dashed border-slate-300' : 'border-transparent'
      }`}
    >
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          const payload: NdsDragPayload = { kind: 'resource', slug: rt.slug };
          e.dataTransfer.setData(NDS_DRAG_MIME, JSON.stringify(payload));
          e.dataTransfer.effectAllowed = 'copy';
        }}
        onClick={() => onAdd(rt.slug)}
        title={`${rt.label}${rt.isGroup ? ` · ${t('Container')}` : ''} — ${t('Click to drop at centre, or drag onto the canvas')}`}
        className="flex-1 min-w-0 flex flex-col items-center gap-1 px-1 py-2 rounded-md cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        <svg width={28} height={28} aria-hidden="true" className="flex-shrink-0">
          <use href={`#ic-${rt.iconId}`} />
        </svg>
        <span
          className="text-[10px] leading-tight text-slate-700 line-clamp-2 text-center"
          style={{ wordBreak: 'break-word' }}
        >
          {rt.label}
        </span>
      </button>
      <div className="absolute top-0.5 right-0.5">
        <RowStar filled={starred} onToggle={onToggleStar} />
      </div>
    </div>
  );
}

function ResourcesTab() {
  const addNode = useDiagramStore((s) => s.addNode);
  const rf = useReactFlow();
  const t = useT();
  const [query, setQuery] = useState('');
  const favResources = useFavoritesStore((s) => s.resources);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  // Track how many center-drops have happened in a row so consecutive
  // clicks fan out a bit and don't stack on top of each other invisibly.
  const dropCountRef = useRef(0);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? RESOURCE_TYPES.filter(
          (r) => r.label.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q)
        )
      : RESOURCE_TYPES;
    const map = new Map<string, ResourceType[]>();
    for (const r of filtered) {
      const arr = map.get(r.category) ?? [];
      arr.push(r);
      map.set(r.category, arr);
    }
    return CATEGORIES_ORDER.filter((c) => map.has(c)).map((c) => ({
      name: c,
      // v0.9.59 — NO alphabetical sort. `RESOURCE_TYPES` is hand-ordered so
      // the entries most likely to be reached for sit at the top of their
      // category (People & UI leads with Client, Admin, Azure Portal, not
      // Admin, Azure Portal, Client). A `localeCompare` here silently threw
      // that curation away, which is what "we had the order where the items
      // that will most likely be used will go in order" refers to.
      items: map.get(c) ?? [],
    }));
  }, [query]);

  const handleAdd = (slug: string) => {
    // Small diagonal fan-out so back-to-back clicks stack slightly instead
    // of piling on the exact same pixel.
    const i = dropCountRef.current++ % 6;
    const offset = { dx: i * 24, dy: i * 24 };
    const p = getFlowViewportCenter(rf, offset);
    // Nudge so the icon center (not top-left) lands on the viewport center.
    addNode(slug, { x: Math.round(p.x - 90), y: Math.round(p.y - 75) });
  };

  return (
    <div>
      <div className="px-3 py-2 border-b bg-white" style={{ borderColor: 'var(--color-slate-200)' }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('Search resources…')}
          className="w-full h-8 px-2 text-sm border rounded-md"
          style={{ borderColor: 'var(--color-slate-300)' }}
        />
      </div>
      {/* v0.9.80 — no nested scrollbox. This used to be
          `max-h-[380px] overflow-y-auto`, a 380-px window inside the ~550-px
          accordion scroller: the wheel stopped at the inner edge, the outer
          scrollbar no longer described the palette, and the categories below
          were unreachable without first finding the inner track. The section
          now flows into the one scroller that owns the panel, which is what
          makes `CATEGORIES_ORDER` worth ordering at all. */}
      <div className="py-2" data-nds-resources-flow="1">
        {grouped.map((section) => (
          <div key={section.name} className="mb-2">
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50">
              {section.name}
            </div>
            <div className="p-2 grid grid-cols-4 gap-1">
              {section.items.map((rt) => (
                <PaletteTile
                  key={rt.slug}
                  rt={rt}
                  onAdd={handleAdd}
                  starred={favResources.has(rt.slug)}
                  onToggleStar={() => toggleFavorite('resource', rt.slug)}
                />
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="p-4 text-sm text-slate-500">{t('No matches. Try a different keyword.')}</div>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// All icons tab
// --------------------------------------------------------------------------
function AllIconsTab() {
  const addCustomIconNode = useDiagramStore((s) => s.addCustomIconNode);
  const rf = useReactFlow();
  const dropCountRef = useRef(0);
  const favIcons = useFavoritesStore((s) => s.icons);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  return (
    <IconGrid
      scrollMode="flow"
      columns={4}
      onSelect={(icon) => {
        const i = dropCountRef.current++ % 6;
        const p = getFlowViewportCenter(rf, { dx: i * 24, dy: i * 24 });
        addCustomIconNode(icon.id, icon.label, {
          x: Math.round(p.x - 90),
          y: Math.round(p.y - 75),
        });
      }}
      dragPayloadFor={(icon) => {
        const payload: NdsDragPayload = { kind: 'icon', iconId: icon.id, label: icon.label };
        return { mime: NDS_DRAG_MIME, payload: JSON.stringify(payload) };
      }}
      isFavorite={(id) => favIcons.has(id)}
      onToggleFavorite={(id) => toggleFavorite('icon', id)}
    />
  );
}

// --------------------------------------------------------------------------
// Global search — one query across every catalogue
// --------------------------------------------------------------------------

const HIT_KIND_LABEL: Record<PaletteHitKind, string> = {
  resource: 'Resources',
  icon: 'All icons',
  shape: 'Shapes',
  diagram: 'Learn diagrams',
};

/** Which accordion section a hit belongs to, for the "jump there" affordance. */
const HIT_KIND_SECTION: Record<PaletteHitKind, TabKey> = {
  resource: 'resources',
  icon: 'icons',
  shape: 'shapes',
  diagram: 'learn',
};

function HitThumb({ hit }: { hit: PaletteHit }) {
  if (hit.kind === 'resource') return <IconPreview iconId={hit.rt.iconId} />;
  if (hit.kind === 'icon') return <IconPreview iconId={hit.icon.id} />;
  if (hit.kind === 'diagram') {
    return (
      <div className="w-6 h-6 rounded bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 text-blue-700">
        <svg width={13} height={13} viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1.75" y="3" width="12.5" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M3.5 11 L6.5 7.25 L8.75 9.75 L10.75 7 L12.5 11 Z" fill="currentColor" opacity="0.7" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600">
      <svg width={13} height={13} viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="4" width="12" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </div>
  );
}

function SearchHitRow({
  hit,
  onActivate,
  starred,
  onToggleStar,
}: {
  hit: PaletteHit;
  onActivate: () => void;
  starred?: boolean;
  onToggleStar?: () => void;
}) {
  const t = useT();
  const hint =
    hit.kind === 'diagram'
      ? t('Preview the diagram')
      : t('Click to drop at centre, or drag onto the canvas');
  return (
    <div className="w-full flex items-center gap-1 rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-100">
      <button
        type="button"
        // Learn diagrams are references, so they have nothing meaningful to
        // drop on the canvas — every other kind is draggable.
        draggable={hit.kind !== 'diagram'}
        onDragStart={(e) => {
          const payload: NdsDragPayload | null =
            hit.kind === 'resource'
              ? { kind: 'resource', slug: hit.rt.slug }
              : hit.kind === 'icon'
                ? { kind: 'icon', iconId: hit.icon.id, label: hit.icon.label }
                : hit.kind === 'shape'
                  ? { kind: 'shape', variant: hit.preset.variant }
                  : null;
          if (!payload) return;
          e.dataTransfer.setData(NDS_DRAG_MIME, JSON.stringify(payload));
          e.dataTransfer.effectAllowed = 'copy';
          if (payload.kind === 'shape') beginPalettePreview(payload.variant);
        }}
        onClick={onActivate}
        title={`${hit.label} — ${hint}`}
        data-nds-search-hit={hit.id}
        data-nds-search-hit-kind={hit.kind}
        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-left min-w-0 cursor-grab active:cursor-grabbing"
      >
        <HitThumb hit={hit} />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-800 truncate">{hit.label}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wide truncate">{hit.sub}</div>
        </div>
      </button>
      {onToggleStar ? (
        <RowStar filled={!!starred} onToggle={onToggleStar} />
      ) : (
        <div className="w-6" />
      )}
      <div className="w-1" />
    </div>
  );
}

function PaletteSearchResults({
  query,
  onJumpToSection,
}: {
  query: string;
  onJumpToSection: (sec: TabKey) => void;
}) {
  const t = useT();
  const rf = useReactFlow();
  const addNode = useDiagramStore((s) => s.addNode);
  const addCustomIconNode = useDiagramStore((s) => s.addCustomIconNode);
  const setTool = useAnnotationStore((s) => s.setTool);
  const setSelectedShapes = useAnnotationStore((s) => s.setSelectedShapes);
  const setPendingTextEditShapeId = useAnnotationStore((s) => s.setPendingTextEditShapeId);

  const favResources = useFavoritesStore((s) => s.resources);
  const favIcons = useFavoritesStore((s) => s.icons);
  const favShapes = useFavoritesStore((s) => s.shapes);
  const favDiagrams = useFavoritesStore((s) => s.diagrams);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  // A Learn diagram hit opens the same lightbox the Learn section uses, so a
  // global-search result behaves identically to browsing to it.
  const [diagramPreview, setDiagramPreview] = useState<LearnDiagram | null>(null);

  const dropCountRef = useRef(0);
  const importedItems = useImportedIcons(s => s.items);
  const groups = useMemo(() => searchPalette(query, paletteIcons(importedItems)), [query, importedItems]);
  const total = countPaletteHits(groups);

  // Same diagonal fan-out the individual sections use, so repeated clicks
  // don't pile on the same pixel.
  const nextCentre = () => {
    const i = dropCountRef.current++ % 6;
    return getFlowViewportCenter(rf, { dx: i * 24, dy: i * 24 });
  };

  const activate = (hit: PaletteHit) => {
    if (hit.kind === 'resource') {
      const p = nextCentre();
      addNode(hit.rt.slug, { x: Math.round(p.x - 90), y: Math.round(p.y - 75) });
      return;
    }
    if (hit.kind === 'icon') {
      const p = nextCentre();
      addCustomIconNode(hit.icon.id, hit.icon.label, {
        x: Math.round(p.x - 90),
        y: Math.round(p.y - 75),
      });
      return;
    }

    if (hit.kind === 'diagram') {
      setDiagramPreview(hit.diagram);
      return;
    }
    // Shape — mirror PaletteShapesSection.onDropVariant exactly, including
    // the auto-select that makes the resize handles appear.
    const shape = buildShapeFromVariantAt(hit.preset.variant, nextCentre());
    if (!shape) return;
    useTabsStore.getState().addShape(shape);
    setTool('move');
    setSelectedShapes([shape.id]);
    if (hit.preset.variant === 'text-box') setPendingTextEditShapeId(shape.id);
  };

  const starOf = (hit: PaletteHit): { starred: boolean; toggle: () => void } | undefined => {
    if (hit.kind === 'resource')
      return { starred: favResources.has(hit.id), toggle: () => toggleFavorite('resource', hit.id) };
    if (hit.kind === 'icon')
      return { starred: favIcons.has(hit.id), toggle: () => toggleFavorite('icon', hit.id) };
    if (hit.kind === 'diagram')
      return { starred: favDiagrams.has(hit.id), toggle: () => toggleFavorite('diagram', hit.id) };
    return { starred: favShapes.has(hit.id), toggle: () => toggleFavorite('shape', hit.id) };
  };

  if (total === 0) {
    return (
      <div className="px-4 py-8 text-center" data-nds-search-empty="1">
        <div className="text-sm text-slate-600 mb-1">{t('No matches across the palette.')}</div>
        <div className="text-xs text-slate-500">{t('Try a shorter or more general keyword.')}</div>
      </div>
    );
  }

  return (
    <div className="py-1" data-nds-search-results="1" data-nds-search-total={total}>
      {groups.map((g) => (
        <div key={g.kind} className="mb-2">
          <div className="px-3 py-1 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {t(HIT_KIND_LABEL[g.kind])}
            </span>
            <button
              type="button"
              onClick={() => onJumpToSection(HIT_KIND_SECTION[g.kind])}
              title={t('Clear the search and open this section')}
              className="text-[10px] text-slate-500 hover:text-blue-700 hover:underline"
              data-nds-search-group-count={g.kind}
            >
              {g.total}
            </button>
          </div>
          <div className="px-1">
            {g.hits.map((hit) => {
              const star = starOf(hit);
              return (
                <SearchHitRow
                  key={`${hit.kind}:${hit.id}`}
                  hit={hit}
                  onActivate={() => activate(hit)}
                  starred={star?.starred}
                  onToggleStar={star?.toggle}
                />
              );
            })}
            {g.total > g.hits.length && (
              <button
                type="button"
                onClick={() => onJumpToSection(HIT_KIND_SECTION[g.kind])}
                className="w-full px-2 py-1.5 text-left text-[11px] text-slate-500 hover:text-blue-700 hover:underline"
              >
                {t('+{n} more — open the full section').replace('{n}', String(g.total - g.hits.length))}
              </button>
            )}
          </div>
        </div>
      ))}
      {diagramPreview && (
        <LearnDiagramPreview diagram={diagramPreview} onClose={() => setDiagramPreview(null)} />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Favorites tab — session-pinned resources + icons + shapes in one view
// --------------------------------------------------------------------------
function FavoritesTab({ onExpandSection }: { onExpandSection: (tab: TabKey) => void }) {
  const importedItems = useImportedIcons(s => s.items);
  const addNode = useDiagramStore((s) => s.addNode);
  const addCustomIconNode = useDiagramStore((s) => s.addCustomIconNode);
  const rf = useReactFlow();
  const t = useT();
  const dropCountRef = useRef(0);

  const favResources = useFavoritesStore((s) => s.resources);
  const favIcons = useFavoritesStore((s) => s.icons);
  const favShapes = useFavoritesStore((s) => s.shapes);
  const favDiagrams = useFavoritesStore((s) => s.diagrams);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const clearAll = useFavoritesStore((s) => s.clearAll);
  const dropShape = useShapeDropper();
  const lang = useI18nStore((s) => s.lang);

  const resourceItems = useMemo(
    () => RESOURCE_TYPES.filter((r) => favResources.has(r.slug)),
    [favResources],
  );
  const iconItems = useMemo(
    () =>
      paletteIcons(importedItems)
        .filter(icon => favIcons.has(icon.id))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [favIcons, importedItems],
  );

  const shapeItems = useMemo(
    // Match the creation catalogue and its order without deleting legacy pins.
    () => PALETTE_SHAPE_PRESETS.filter((p) => favShapes.has(p.variant)),
    [favShapes],
  );

  const diagramItems = useMemo(
    () => (DEMO_FEATURES ? LEARN_DIAGRAMS.filter((d) => favDiagrams.has(d.id)) : []),
    [favDiagrams],
  );

  const totalCount =
    resourceItems.length +
    iconItems.length +
    shapeItems.length +
    diagramItems.length;

  const handleAddResource = (slug: string) => {
    const i = dropCountRef.current++ % 6;
    const p = getFlowViewportCenter(rf, { dx: i * 24, dy: i * 24 });
    addNode(slug, { x: Math.round(p.x - 90), y: Math.round(p.y - 75) });
  };
  const handleAddIcon = (id: string, label: string) => {
    const i = dropCountRef.current++ % 6;
    const p = getFlowViewportCenter(rf, { dx: i * 24, dy: i * 24 });
    addCustomIconNode(id, label, {
      x: Math.round(p.x - 90),
      y: Math.round(p.y - 75),
    });
  };

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
          <svg width={22} height={22} viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 1.6 L9.9 5.7 L14.4 6.3 L11.1 9.4 L12 13.9 L8 11.7 L4 13.9 L4.9 9.4 L1.6 6.3 L6.1 5.7 Z"
              fill="var(--color-amber-500)"
              stroke="var(--color-amber-700)"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="text-sm font-medium text-slate-700 mb-1">{t('No favorites yet')}</div>
        <div className="text-xs text-slate-500 leading-snug mb-4">
          {t('Click the ☆ on any resource, icon, or shape to pin it here for quick access.')}
        </div>
        <div className="flex flex-col gap-1 w-full max-w-[200px]">
          <button
            type="button"
            onClick={() => onExpandSection('shapes')}
            className="h-8 text-xs font-medium border rounded-md bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
          >
            {t('Browse Shapes')}
          </button>
          <button
            type="button"
            onClick={() => onExpandSection('resources')}
            className="h-8 text-xs font-medium border rounded-md bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
          >
            {t('Browse Resources')}
          </button>
          <button
            type="button"
            onClick={() => onExpandSection('icons')}
            className="h-8 text-xs font-medium border rounded-md bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
          >
            {t('Browse All icons')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-2 border-b bg-white flex items-center justify-between" style={{ borderColor: 'var(--color-slate-200)' }}>
        <div className="text-[11px] text-slate-500">
          {totalCount} {t('pinned · resets on new tab')}
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm(t('Clear all favorites?'))) clearAll();
          }}
          className="text-[11px] text-slate-500 hover:text-slate-800 underline"
        >
          {t('Clear all')}
        </button>
      </div>
      {/* v0.9.80 — flows into the palette scroller, same as Resources. */}
      <div className="py-2">
        {shapeItems.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50">
              {t('Shapes')} · {shapeItems.length}
            </div>
            <div className="p-2 grid grid-cols-4 gap-1.5">
              {shapeItems.map((p) => (
                <ShapePresetTile
                  key={p.variant}
                  preset={p}
                  onDrop={() => dropShape(p.variant)}
                  starred
                  onToggleStar={() => toggleFavorite('shape', p.variant)}
                />
              ))}
            </div>
          </div>
        )}
        {resourceItems.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50">
              {t('Resources')} · {resourceItems.length}
            </div>
            <div className="p-2 grid grid-cols-4 gap-1">
              {resourceItems.map((rt) => (
                <PaletteTile
                  key={rt.slug}
                  rt={rt}
                  onAdd={handleAddResource}
                  starred
                  onToggleStar={() => toggleFavorite('resource', rt.slug)}
                />
              ))}
            </div>
          </div>
        )}
        {iconItems.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50">
              {t('Icons')} · {iconItems.length}
            </div>
            <div
              className="p-2 grid gap-1"
              style={{ gridTemplateColumns: `repeat(4, minmax(0, 1fr))` }}
            >
              {iconItems.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    const payload: NdsDragPayload = {
                      kind: 'icon',
                      iconId: icon.id,
                      label: icon.label,
                    };
                    e.dataTransfer.setData(NDS_DRAG_MIME, JSON.stringify(payload));
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => handleAddIcon(icon.id, icon.label)}
                  title={`${icon.label} · ${icon.category}`}
                  className="relative flex flex-col items-center gap-1 px-1 py-2 rounded-md border border-transparent bg-white hover:bg-slate-100 hover:border-slate-200 cursor-grab active:cursor-grabbing"
                >
                  <RowStarOverlay onToggle={() => toggleFavorite('icon', icon.id)} />
                  <svg width={32} height={32} aria-hidden="true">
                    <use href={`#ic-${icon.id}`} />
                  </svg>
                  <span
                    className="text-[10px] leading-tight text-slate-700 line-clamp-2 text-center"
                    style={{ wordBreak: 'break-word' }}
                  >
                    {icon.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {diagramItems.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-50">
              {t('Learn diagrams')} · {diagramItems.length}
            </div>
            <div className="px-1 space-y-0.5">
              {diagramItems.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => openExternal(learnUrl(d.docUrl, lang))}
                  title={`${d.title} — ${t('Open the article on Microsoft Learn')}`}
                  data-nds-fav-learn-diagram={d.id}
                  className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-100 text-left min-w-0"
                >
                  <div className="w-6 h-6 rounded bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0 text-blue-700 mt-0.5">
                    <svg width={13} height={13} viewBox="0 0 16 16" aria-hidden="true">
                      <rect x="1.75" y="3" width="12.5" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M3.5 11 L6.5 7.25 L8.75 9.75 L10.75 7 L12.5 11 Z" fill="currentColor" opacity="0.7" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-800 leading-tight line-clamp-2">{d.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">{d.service}</div>
                  </div>
                  <RowStar filled onToggle={() => toggleFavorite('diagram', d.id)} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Filled star overlay positioned in the top-right of an icon tile in the
 * Favorites tab. Click removes the pin.
 */
function RowStarOverlay({ onToggle }: { onToggle: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      title={t('Remove from Favorites')}
      aria-label={t('Remove from Favorites')}
      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-amber-500 hover:text-amber-600"
    >
      <svg width={12} height={12} viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 1.6 L9.9 5.7 L14.4 6.3 L11.1 9.4 L12 13.9 L8 11.7 L4 13.9 L4.9 9.4 L1.6 6.3 L6.1 5.7 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

// --------------------------------------------------------------------------
// Palette shell
// --------------------------------------------------------------------------
interface DemoPaletteProps {
  /** Controlled active tab. If omitted, the palette manages its own state
   *  (used for the prod-parity fallback). */
  activeTab?: TabKey;
  onSelectTab?: (t: TabKey) => void;
}

export function DemoPalette({ activeTab: controlledTab, onSelectTab }: DemoPaletteProps = {}) {
  const importedItems = useImportedIcons(s => s.items);
  const [uncontrolledTab, setUncontrolledTab] = useState<TabKey>('resources');
  const tab = controlledTab ?? uncontrolledTab;
  const setTab = (sec: TabKey) => {
    if (onSelectTab) onSelectTab(sec);
    else setUncontrolledTab(sec);
  };

  const t = useT();

  const setCollapsed = useLayoutStore((s) => s.setPaletteCollapsed);
  const expandedSections = useLayoutStore((s) => s.expandedSections);
  const toggleSection = useLayoutStore((s) => s.toggleSection);
  const expandSection = useLayoutStore((s) => s.expandSection);
  const sectionOrder = useLayoutStore(s => s.paletteOrder);
  const orderError = useLayoutStore(s => s.paletteOrderError);

  const favTotal = useFavoritesStore(favTotalSelector);

  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  // `focusedSection` is used purely for the bottom hint text — it is NOT
  // the same thing as `tab`. Accordion clicks bump this locally without
  // propagating up to `paletteTab` in DemoApp, so the useEffect below
  // (which reacts to `controlledTab`) doesn't re-fire on every toggle
  // and re-expand a section the user just closed.
  const [focusedSection, setFocusedSection] = useState<TabKey>(tab);

  // When the parent (typically PaletteRail's Favorites / Resources / …
  // buttons on the collapsed rail) flips `controlledTab`, expand that
  // section AND scroll it into view. This is what makes the rail
  // category buttons feel like "jump to this drawer" rather than
  // "switch to this tab". Intentionally driven by `controlledTab`,
  // NOT by internal accordion clicks — the ref below suppresses the
  // effect when we mutate the tab from within the palette itself.
  const lastControlledSeen = useRef<TabKey | undefined>(controlledTab);
  useEffect(() => {
    if (controlledTab === undefined) return;
    if (controlledTab === lastControlledSeen.current) return;
    lastControlledSeen.current = controlledTab;
    expandSection(controlledTab);
    setFocusedSection(controlledTab);
    const raf = requestAnimationFrame(() => {
      const container = scrollAreaRef.current;
      const target = document.getElementById(`section-${controlledTab}`);
      if (!container || !target) return;
      const containerTop = container.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      container.scrollTo({
        top: container.scrollTop + (targetTop - containerTop),
        behavior: 'smooth',
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [controlledTab, expandSection]);

  const isOpen = (sec: TabKey) => expandedSections.has(sec);

  // Global search sits above the accordion. While it has text, the accordion
  // is replaced by a unified result list — the per-section search boxes are
  // untouched and still work once the global query is cleared.
  const [globalQuery, setGlobalQuery] = useState('');
  const searching = globalQuery.trim().length > 0;
  const reorder = usePaletteReorder(scrollAreaRef, searching);
  const customOrder = sectionOrder.some((id, index) => id !== DEFAULT_PALETTE_ORDER[index]);

  // Called from the Favorites empty-state "Browse X" buttons and by
  // accordion headers themselves. This DOES NOT update `paletteTab` at
  // the DemoApp level (avoids the re-expand loop). It just opens the
  // section, bumps the local focused hint, and scrolls to it.
  const openSectionLocal = (sec: TabKey) => {
    expandSection(sec);
    setFocusedSection(sec);
    requestAnimationFrame(() => {
      const container = scrollAreaRef.current;
      const target = document.getElementById(`section-${sec}`);
      if (!container || !target) return;
      const containerTop = container.getBoundingClientRect().top;
      const targetTop = target.getBoundingClientRect().top;
      container.scrollTo({
        top: container.scrollTop + (targetTop - containerTop),
        behavior: 'smooth',
      });
    });
  };

  // Reference `setTab` and `tab` so noUnusedLocals stays happy — these
  // are used implicitly through `controlledTab` and `uncontrolledTab`,
  // but the linter can't see that. This is a safety valve if we ever
  // need to write `paletteTab` back to parent (e.g., from a future
  // right-click context menu action).
  void setTab;
  void tab;

  const sections: Record<TabKey, { title: React.ReactNode; count: number; content: React.ReactNode } | null> = {
    favorites: {
      title: <span className="inline-flex items-center gap-1.5">
        <svg width={11} height={11} viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 1.6 L9.9 5.7 L14.4 6.3 L11.1 9.4 L12 13.9 L8 11.7 L4 13.9 L4.9 9.4 L1.6 6.3 L6.1 5.7 Z"
            fill={favTotal > 0 ? 'var(--color-amber-500)' : 'none'}
            stroke={favTotal > 0 ? 'var(--color-amber-700)' : 'currentColor'}
            strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        {t('Favorites')}
      </span>,
      count: favTotal, content: <FavoritesTab onExpandSection={openSectionLocal} />,
    },
    shapes: { title: t('Shapes'), count: SHAPE_TILE_PRESETS.length, content: <PaletteShapesSection /> },
    resources: { title: t('Resources'), count: RESOURCE_TYPES.length, content: <ResourcesTab /> },
    imported: IMPORTED_ICONS
      ? { title: t('Imported icons'), count: importedItems.length, content: <ImportedIconsSection /> } : null,
    learn: DEMO_FEATURES
      ? { title: t('Learn diagrams'), count: LEARN_DIAGRAMS.length, content: <LearnDiagramsTab /> } : null,
    icons: { title: t('All icons'), count: paletteIcons().length, content: <AllIconsTab /> },
  };

  return (
    <ResizableAside
      side="right"
      storageKey="nds.paletteWidth"
      defaultWidth={300}
      minWidth={180}
      maxWidth={520}
      className="h-full flex flex-col bg-white border-r"
      style={{ borderColor: 'var(--color-slate-200)' }}
    >
      <div className="px-3 pt-2 pb-2 border-b bg-white" style={{ borderColor: 'var(--color-slate-200)' }}>
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('Palette')}
          </div>
          <div className="flex items-center gap-1">
          {PALETTE_SECTION_REORDER && (customOrder || orderError) && <button type="button"
            data-nds-palette-order-reset onClick={reorder.reset}
            title={t('Reset palette order')} aria-label={t('Reset palette order')}
            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition">
            <svg width={14} height={14} viewBox="0 0 16 16" aria-hidden="true" fill="none"
              stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6a5 5 0 1 1 0 4M3 2v4h4" />
            </svg>
          </button>}
          <button
            type="button"
            title={t('Hide palette')}
            aria-label={t('Hide palette')}
            data-nds-palette-collapse
            onClick={() => setCollapsed(true)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition"
          >
            {/* Chevron pointing left = collapse */}
            <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M9 3 L5 7 L9 11"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          </div>
        </div>

        {/* Search everything — resources, icons and shapes at once. */}
        <div className="relative mt-2">
          <svg
            width={13}
            height={13}
            viewBox="0 0 16 16"
            aria-hidden="true"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          >
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M10.5 10.5 L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setGlobalQuery('');
            }}
            placeholder={t('Search everything…')}
            aria-label={t('Search the whole palette')}
            data-nds-palette-search-all
            className="w-full h-8 pl-7 pr-7 text-sm border rounded-md"
            style={{ borderColor: 'var(--color-slate-300)' }}
          />
          {searching && (
            <button
              type="button"
              onClick={() => setGlobalQuery('')}
              title={t('Clear search')}
              aria-label={t('Clear search')}
              data-nds-palette-search-clear
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <svg width={11} height={11} viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M2 2 L10 10 M10 2 L2 10"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
        {!searching && (
          <div className="mt-1 text-[10px] text-slate-400 leading-tight">
            {t('Searches resources, icons and shapes.')}
          </div>
        )}
        {PALETTE_SECTION_REORDER && orderError && <div role="alert" data-nds-palette-order-error
          className="mt-2 text-xs" style={{ color: 'var(--nds-broken)' }}>
          {orderError === 'read' ? t('Palette order could not be loaded. Showing the default order.')
            : t('Palette order could not be saved. It will reset after reload.')}
        </div>}
      </div>

      <div
        ref={scrollAreaRef}
        className="flex-1 min-h-0 overflow-y-auto nds-scroll"
        data-nds-palette-accordion
        onDragOver={reorder.scroll}
      >
        {PALETTE_SECTION_REORDER && <>
          <span id="nds-palette-order-hint" className="sr-only">{t('Drag to reorder. Use Alt+Up/Down to move.')}</span>
          <span role="status" aria-live="polite" className="sr-only" data-nds-palette-order-status>{reorder.announcement}</span>
        </>}
        {searching ? (
          <PaletteSearchResults
            query={globalQuery}
            onJumpToSection={(sec) => {
              // Clearing the query restores the accordion, then we open and
              // scroll to the section the user asked for.
              setGlobalQuery('');
              openSectionLocal(sec);
            }}
          />
        ) : (
          sectionOrder.map(id => {
            const section = sections[id];
            return section && <AccordionSection key={id} id={id} title={section.title} count={section.count}
              open={isOpen(id)} reorder={reorder} onToggle={() => {
                toggleSection(id);
                setFocusedSection(id);
              }}>
              {section.content}
            </AccordionSection>;
          })
        )}
      </div>

      <div
        className={`px-3 py-1.5 border-t text-[10px] text-slate-500 bg-slate-50 flex ${IMPORTED_ICONS ? 'flex-col items-stretch gap-1' : 'items-center gap-2'}`}
        style={{ borderColor: 'var(--color-slate-200)' }}
        data-nds-palette-focused-section={focusedSection}
      >
        {IMPORTED_ICONS ? (
          <ImportIconsButton onImport={() => {
            setGlobalQuery('');
            openSectionLocal('imported');
          }} />
        ) : <div className="flex-1 min-w-0">
        {searching ? (
          t('Esc clears the search. Click a group count to open that section.')
        ) : (
          <>
        {focusedSection === 'favorites' && t('Star ☆ any item to pin it here.')}
        {focusedSection === 'resources' &&
          t('Click to drop at centre, or drag onto the canvas.')}
        {focusedSection === 'learn' &&
          t('Microsoft’s own published diagrams. Click to preview; open the article to read the guidance.')}
        {focusedSection === 'icons' &&
          t('Click any icon to drop it as a Custom node — rename and connect after.')}
        {focusedSection === 'shapes' &&
          t('Click a shape tile to drop it, then edit style from the diagram or right panel.')}
          </>
        )}
        </div>}
        {/* Build number. Lives here rather than in the header because the
            header is working space and this strip is already the palette's
            quiet caption line — it is on screen the whole session without
            ever competing with the canvas. Repeated in Settings for anyone
            who works with the palette collapsed. */}
        <UpdatesLink />
      </div>
    </ResizableAside>
  );
}
import { beginPalettePreview } from './placement-feedback';

function UpdatesLink() {
  const t = useT();
  const unread = useUpdatesStore(state => state.unread);
  const show = useUpdatesStore(state => state.show);
  return <button type="button" className="nds-updates-entry" data-nds-updates-open="palette"
    aria-haspopup="dialog" aria-controls="nds-update-history"
    title={t('Release history and before/after images')}
    onClick={event => show(event.currentTarget)}>
    <span>{t("What's new")}</span>
    {unread && <span className="nds-updates-new" data-nds-updates-unread>{t('New updates')}</span>}
    <span data-nds-app-version={APP_VERSION} className="tabular-nums text-slate-500">v{APP_VERSION}</span>
  </button>;
}
