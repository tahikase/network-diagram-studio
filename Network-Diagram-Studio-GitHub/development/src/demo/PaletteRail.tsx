// Demo v0.6.1: PaletteRail — the collapsed form of DemoPalette.
//
// When the user clicks the collapse chevron in DemoPalette's header, the
// palette disappears and this rail takes its place. The rail is a thin
// vertical strip (~40px) that stays on the left edge of the canvas area
// so the "there's a palette here" affordance never fully hides.
//
// The rail contains:
//   - An expand chevron button at the top (mirrors the collapse chevron).
//   - Mini-tab icons (Favorites / Shapes / Resources / All icons). Clicking
//     any of them BOTH expands the palette AND switches to that tab.
//   - A vertical "Palette" label so the strip is still legible when
//     the user glances at it.
//
// The rail owns no data of its own — the palette's active tab is passed
// in as a controlled value via props from DemoApp.tsx. That way the
// palette and rail agree on which tab is current even across expand/
// collapse cycles.
import { useLayoutStore, type PaletteTab } from './layout-store';
import { useT } from '../i18n/useT';
import { paletteIcons, useImportedIcons } from '../icons/imported-library';
import { LEARN_DIAGRAMS } from './learn-diagrams.generated';
import { DEMO_FEATURES, IMPORTED_ICONS } from '../env';
import { useFavoritesStore, favTotalSelector } from './favorites-store';

export type { PaletteTab } from './layout-store';

interface Props {
  activeTab: PaletteTab;
  onSelectTab: (t: PaletteTab) => void;
}

function RailButton({
  active,
  section,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  section?: PaletteTab;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      data-nds-rail-section={section}
      onClick={onClick}
      className={`w-8 h-8 rounded-md flex items-center justify-center border transition
        ${
          active
            ? 'bg-white text-slate-800 border-slate-300 shadow-sm'
            : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200 hover:text-slate-700'
        }`}
    >
      {children}
    </button>
  );
}

export function PaletteRail({ activeTab, onSelectTab }: Props) {
  const importedItems = useImportedIcons(s => s.items);
  const setCollapsed = useLayoutStore((s) => s.setPaletteCollapsed);
  const sectionOrder = useLayoutStore(s => s.paletteOrder);
  const t = useT();
  const favCount = useFavoritesStore(favTotalSelector);

  const expandAndSelect = (tab: PaletteTab) => {
    onSelectTab(tab);
    setCollapsed(false);
  };

  return (
    <aside
      data-nds-palette-rail
      className="h-full flex flex-col items-center bg-white border-r"
      style={{ borderColor: 'var(--color-slate-200)', width: 44, flexShrink: 0 }}
    >
      {/* Expand chevron — mirrors the collapse chevron shown in DemoPalette. */}
      <div className="w-full flex justify-center pt-2 pb-2 border-b" style={{ borderColor: 'var(--color-slate-200)' }}>
        <RailButton
          title={t('Show palette')}
          onClick={() => setCollapsed(false)}
        >
          {/* Chevron pointing right = expand */}
          <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M5 3 L9 7 L5 11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </RailButton>
      </div>

      {/* Mini tab icons */}
      <div className="flex flex-col items-center gap-1.5 pt-2">
        {sectionOrder.map(section => {
          switch (section) {
            case 'favorites': return (
              <RailButton key={section} section={section}
                active={activeTab === 'favorites'}
                title={`${t('Favorites')} (${favCount})`}
                onClick={() => expandAndSelect('favorites')}
              >
                {/* Solid star when items are pinned; outline star when empty */}
                <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
                  <path
                    d="M8 1.6 L9.9 5.7 L14.4 6.3 L11.1 9.4 L12 13.9 L8 11.7 L4 13.9 L4.9 9.4 L1.6 6.3 L6.1 5.7 Z"
                    fill={favCount > 0 ? 'var(--color-amber-500)' : 'none'}
                    stroke={favCount > 0 ? 'var(--color-amber-700)' : 'currentColor'}
                    strokeWidth="1.25"
                    strokeLinejoin="round"
                  />
                </svg>
              </RailButton>
            );
            case 'shapes': return (
              <RailButton key={section} section={section}
                active={activeTab === 'shapes'}
                title={t('Shapes')}
                onClick={() => expandAndSelect('shapes')}
              >
                {/* shapes glyph — arrow + rect + ellipse trio */}
                <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1.5" y="2" width="6" height="5" rx="0.8" />
                  <ellipse cx="12" cy="4.5" rx="2.75" ry="2.25" />
                  <path d="M2 13 L12 13" />
                  <path d="M10 11 L12 13 L10 15" />
                </svg>
              </RailButton>
            );
            case 'resources': return (
              <RailButton key={section} section={section}
                active={activeTab === 'resources'}
                title={t('Resources')}
                onClick={() => expandAndSelect('resources')}
              >
                {/* stacked-blocks glyph */}
                <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
                  <rect x="2" y="2" width="5" height="5" rx="1" fill="currentColor" opacity="0.8" />
                  <rect x="9" y="2" width="5" height="5" rx="1" fill="currentColor" opacity="0.5" />
                  <rect x="2" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.5" />
                  <rect x="9" y="9" width="5" height="5" rx="1" fill="currentColor" opacity="0.8" />
                </svg>
              </RailButton>
            );
            case 'imported': return IMPORTED_ICONS && (
              <RailButton key={section} section={section}
                active={activeTab === 'imported'}
                title={`${t('Imported icons')} (${importedItems.length})`}
                onClick={() => expandAndSelect('imported')}
              >
                <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M8 1v8m-3-3 3 3 3-3M2 9v5h12V9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </RailButton>
            );
            case 'learn': return DEMO_FEATURES && (
              <RailButton key={section} section={section}
                active={activeTab === 'learn'}
                title={`${t('Learn diagrams')} (${LEARN_DIAGRAMS.length})`}
                onClick={() => expandAndSelect('learn')}
              >
                {/* framed-picture glyph — a published diagram, not an editable one */}
                <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
                  <rect x="1.75" y="3" width="12.5" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M3.5 11 L6.5 7.25 L8.75 9.75 L10.75 7 L12.5 11 Z" fill="currentColor" opacity="0.7" />
                </svg>
              </RailButton>
            );
            case 'icons': return (
              <RailButton key={section} section={section}
                active={activeTab === 'icons'}
                title={`${t('All icons')} (${paletteIcons().length})`}
                onClick={() => expandAndSelect('icons')}
              >
                {/* grid glyph */}
                <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="4" cy="4" r="1.5" fill="currentColor" />
                  <circle cx="8" cy="4" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="4" r="1.5" fill="currentColor" />
                  <circle cx="4" cy="8" r="1.5" fill="currentColor" />
                  <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="8" r="1.5" fill="currentColor" />
                  <circle cx="4" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="8" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </RailButton>
            );
          }
        })}
      </div>

      {/* Vertical "Palette" label — very subtle so the collapsed rail
          still reads as "this is where the palette lives" without
          visually competing with the toolbar / canvas. */}
      <div
        className="mt-auto mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 select-none"
        style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
        }}
      >
        Palette
      </div>
    </aside>
  );
}
