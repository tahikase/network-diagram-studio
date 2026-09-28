// Non-prod: browse every Azure Networking diagram published on Microsoft Learn.
//
// This is the answer to "instead of hand-authored templates, can we just use
// Microsoft's own diagrams?" — yes, as REFERENCES. The catalog in
// `learn-diagrams.generated.ts` is harvested from the two CC BY 4.0 doc repos
// by `scripts/harvest-learn-diagrams.mjs`; nothing is mirrored into the
// bundle. Thumbnails and the preview lightbox hot-link learn.microsoft.com,
// so:
//   * the single-file bundle stays ~3.4 MB instead of ~20 MB
//   * every diagram is whatever Microsoft published this morning
//   * Microsoft stays the host of Microsoft's artwork
//
// What this tab is NOT: a way to get Microsoft's ARTWORK onto the canvas. A
// PNG has no nodes. What it can do — since v0.9.52 — is rebuild the STRUCTURE:
// every `:::image type="complex":::` doc block carries a screen-reader long
// description naming the frames, their contents, and the labelled lines
// between them, and that prose converts cleanly into nodes and edges. See
// `learn-topology-build.ts`. Diagrams without such a description still open,
// as a clearly-labelled generic starter for their service — the badge and the
// draft's own notes say which of the two you got, because a user mistaking a
// starter for Microsoft's design is the one failure mode this must avoid.
import { useEffect, useMemo, useState } from 'react';
import { useT } from '../i18n/useT';
import { useI18nStore, learnUrl } from '../i18n/i18n-store';
import { useFavoritesStore } from './favorites-store';
import { useTabsStore } from './tabs-store';
import { buildLearnDiagram, topologyFor } from './learn-topology-build';
import {
  browseLearnDiagrams,
  countLearnDiagrams,
  LEARN_DIAGRAMS,
  type LearnDiagram,
} from './learn-diagram-search';

/** Open a doc URL in the user's browser, never in this SPA. */
export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Open a catalog entry as an editable draft in a new tab.
 *
 * Shared by the row button and the preview footer so the two can never drift
 * apart on the thing that matters — which fidelity tier the user is getting.
 */
export function useOpenLearnDraft() {
  const addTabWithDiagram = useTabsStore((s) => s.addTabWithDiagram);
  return (diagram: LearnDiagram) => {
    const built = buildLearnDiagram(diagram);
    if (!built) return false;
    addTabWithDiagram(diagram.title, built);
    return true;
  };
}

function LearnBadge() {
  return (
    <span
      className="shrink-0 px-1 py-px rounded text-[9px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200"
      aria-hidden="true"
    >
      Learn
    </span>
  );
}

/**
 * Says which fidelity tier a draft is, in the list and in the preview.
 *
 * Deliberately different colours, not just different words: 'Rebuilt' is
 * Microsoft's structure recovered from Microsoft's own description, 'Starter'
 * is ours. Somebody skimming has to be able to tell them apart without
 * reading.
 */
function FidelityBadge({ fidelity }: { fidelity: 'described' | 'outline' }) {
  const t = useT();
  const described = fidelity === 'described';
  return (
    <span
      title={
        described
          ? t('Rebuilt from the accessibility description Microsoft publishes with this diagram.')
          : t('Auto-generated starting point for this service — not a reproduction of the published diagram.')
      }
      className={`shrink-0 px-1 py-px rounded text-[9px] font-bold uppercase tracking-wide border ${
        described
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
      data-nds-learn-fidelity={fidelity}
    >
      {described ? t('Rebuilt') : t('Starter')}
    </span>
  );
}

/**
 * Thumbnail for one catalog row.
 *
 * Loads straight from learn.microsoft.com. That means it is the ONE part of
 * this app that needs the network, so failure has to be quiet: an offline
 * user, a proxy that blocks the CDN, or a diagram Microsoft has since renamed
 * all land on `onError`, which swaps in a neutral placeholder rather than the
 * broken-image glyph.
 */
function DiagramThumb({ diagram }: { diagram: LearnDiagram }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [diagram.imageUrl]);

  if (failed) {
    return (
      <div className="w-14 h-10 rounded bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-400">
        <svg width={14} height={14} viewBox="0 0 16 16" aria-hidden="true">
          <rect x="1.5" y="3" width="13" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <path d="M3.5 11 L6.5 7.5 L8.5 9.5 L10.5 7 L12.5 11 Z" fill="currentColor" opacity="0.5" />
        </svg>
      </div>
    );
  }
  return (
    <img
      src={diagram.imageUrl}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="w-14 h-10 rounded border border-slate-200 bg-white object-contain flex-shrink-0"
    />
  );
}

function DiagramRow({
  diagram,
  starred,
  onToggleStar,
  onPreview,
}: {
  diagram: LearnDiagram;
  starred: boolean;
  onToggleStar: () => void;
  onPreview: () => void;
}) {
  const t = useT();
  const lang = useI18nStore((s) => s.lang);
  const openDraft = useOpenLearnDraft();
  const topo = topologyFor(diagram.id);
  return (
    <div className="w-full flex items-start gap-1 rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-100 group">
      <button
        type="button"
        onClick={onPreview}
        title={`${diagram.title} — ${t('Preview the diagram')}`}
        data-nds-learn-diagram={diagram.id}
        className="flex-1 text-left px-2 py-2 flex items-start gap-2 min-w-0"
      >
        <DiagramThumb diagram={diagram} />
        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-800 leading-tight line-clamp-2">{diagram.title}</div>
          <div className="mt-0.5 flex items-center gap-1 min-w-0">
            <LearnBadge />
            {topo && <FidelityBadge fidelity={topo.fidelity} />}
            <span className="text-[11px] text-slate-500 truncate">{diagram.article}</span>
          </div>
        </div>
      </button>
      <div className="pt-2 pr-1 flex items-center gap-0.5">
        {topo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDraft(diagram);
            }}
            title={t('Open as an editable draft')}
            aria-label={t('Open as an editable draft')}
            data-nds-learn-draft={diagram.id}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-emerald-700"
          >
            <svg width={12} height={12} viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.5 2.5 L13.5 5.5 L6 13 L2.5 13.5 L3 10 Z" />
              <path d="M9 4 L12 7" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openExternal(learnUrl(diagram.docUrl, lang));
          }}
          title={t('Open the article on Microsoft Learn')}
          aria-label={t('Open the article on Microsoft Learn')}
          data-nds-learn-doc={diagram.id}
          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-blue-700"
        >
          <svg width={12} height={12} viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 2.5 h4.5 v4.5" />
            <path d="M13.5 2.5 L7.5 8.5" />
            <path d="M12 9.5 v3.5 a0.5 0.5 0 0 1 -0.5 0.5 h-8.5 a0.5 0.5 0 0 1 -0.5 -0.5 v-8.5 a0.5 0.5 0 0 1 0.5 -0.5 h3.5" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          title={starred ? t('Remove from Favorites') : t('Add to Favorites')}
          aria-label={starred ? t('Remove from Favorites') : t('Add to Favorites')}
          data-nds-fav-learn-diagram={diagram.id}
          className={`w-5 h-5 rounded flex items-center justify-center transition ${
            starred ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-amber-500'
          }`}
        >
          <svg width={12} height={12} viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 1.6 L9.9 5.7 L14.4 6.3 L11.1 9.4 L12 13.9 L8 11.7 L4 13.9 L4.9 9.4 L1.6 6.3 L6.1 5.7 Z"
              fill={starred ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Full-size preview.
 *
 * A 56x40 thumbnail is enough to recognise a diagram you already know and
 * useless for one you don't, and bouncing to the browser for every candidate
 * makes "which of these six is the one" needlessly expensive. So the row
 * click previews in place, and the article is one deliberate click further.
 */
export function LearnDiagramPreview({
  diagram,
  onClose,
}: {
  diagram: LearnDiagram;
  onClose: () => void;
}) {
  const t = useT();
  const lang = useI18nStore((s) => s.lang);
  const [failed, setFailed] = useState(false);
  const openDraft = useOpenLearnDraft();
  const topo = topologyFor(diagram.id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-6"
      style={{ background: 'rgba(15,23,42,0.55)' }}
      onClick={onClose}
      data-nds-learn-preview={diagram.id}
      role="dialog"
      aria-modal="true"
      aria-label={diagram.title}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-[92vw] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b flex items-start gap-3" style={{ borderColor: 'var(--color-slate-200)' }}>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-slate-800">{diagram.title}</div>
            <div className="text-[11px] text-slate-500 truncate">
              {diagram.service} · {diagram.article}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            title={t('Close')}
            aria-label={t('Close')}
            className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100"
          >
            <svg width={14} height={14} viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M4 4 L12 12 M12 4 L4 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto nds-scroll p-4 bg-slate-50 flex items-center justify-center">
          {failed ? (
            <div className="text-sm text-slate-500 text-center py-12 px-8">
              {t('The diagram could not be loaded. Open the article on Microsoft Learn instead.')}
            </div>
          ) : (
            <img
              src={diagram.imageUrl}
              alt={diagram.title}
              onError={() => setFailed(true)}
              className="max-w-full max-h-[62vh] object-contain bg-white rounded"
            />
          )}
        </div>

        {topo && (
          <div
            className={`px-4 py-2 border-t text-[11px] flex items-start gap-2 ${
              topo.fidelity === 'described'
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-amber-50 text-amber-800'
            }`}
            style={{ borderColor: 'var(--color-slate-200)' }}
            data-nds-learn-preview-fidelity={topo.fidelity}
          >
            <FidelityBadge fidelity={topo.fidelity} />
            <span>
              {topo.fidelity === 'described'
                ? t('Rebuilt from the accessibility description Microsoft publishes with this diagram.')
                : t('Auto-generated starting point for this service — not a reproduction of the published diagram.')}
            </span>
          </div>
        )}

        <div className="px-4 py-3 border-t flex items-center gap-2 flex-wrap" style={{ borderColor: 'var(--color-slate-200)' }}>
          {topo && (
            <button
              type="button"
              onClick={() => {
                if (openDraft(diagram)) onClose();
              }}
              title={t('Open as an editable draft')}
              className="h-8 px-3 rounded-md text-sm bg-emerald-600 text-white hover:bg-emerald-700"
              data-nds-learn-preview-draft
            >
              {t('Open as an editable draft')}
            </button>
          )}
          <button
            type="button"
            onClick={() => openExternal(learnUrl(diagram.docUrl, lang))}
            className="h-8 px-3 rounded-md text-sm bg-blue-600 text-white hover:bg-blue-700"
            data-nds-learn-preview-doc
          >
            {t('Open the article on Microsoft Learn')}
          </button>
          {diagram.vsdxUrl && (
            <button
              type="button"
              onClick={() => openExternal(diagram.vsdxUrl!)}
              title={t('Download the official Visio file of this architecture')}
              className="h-8 px-3 rounded-md text-sm border border-slate-300 text-slate-700 hover:bg-slate-50"
              data-nds-learn-preview-visio
            >
              {t('Visio file')}
            </button>
          )}
          <span className="ml-auto text-[10px] text-slate-400">
            {/* Proper nouns and a license identifier — deliberately not run
                through t(), there is nothing here to translate. */}
            © Microsoft · Microsoft Learn · CC BY 4.0
          </span>
        </div>
      </div>
    </div>
  );
}

export function LearnDiagramsTab() {
  const t = useT();
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<LearnDiagram | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const favDiagrams = useFavoritesStore((s) => s.diagrams);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const groups = useMemo(() => browseLearnDiagrams(query), [query]);
  const total = countLearnDiagrams(groups);

  return (
    <div>
      <div className="px-3 py-2 border-b bg-white" style={{ borderColor: 'var(--color-slate-200)' }}>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setExpanded(new Set());
          }}
          placeholder={t('Search Microsoft Learn diagrams (e.g. hub-spoke, ExpressRoute)…')}
          className="w-full h-8 px-2 text-sm border rounded-md"
          style={{ borderColor: 'var(--color-slate-300)' }}
          data-nds-learn-search
        />
        <div className="mt-1 text-[11px] text-slate-500" data-nds-learn-count={total}>
          {total} of {LEARN_DIAGRAMS.length} · {t('Published by Microsoft on Microsoft Learn')}
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto nds-scroll py-2">
        {groups.map((section) => {
          const showAll = expanded.has(section.service);
          const items = showAll
            ? // Re-query rather than caching every service's full list: an
              // expanded section is one at a time, and the filter is cheap.
              browseLearnDiagramsAll(query, section.service)
            : section.items;
          return (
            <div key={section.service} className="mb-2">
              <div className="px-3 py-1 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {section.service}
                </span>
                <span className="text-[10px] text-slate-400">{section.total}</span>
              </div>
              <div className="px-1 space-y-0.5">
                {items.map((d) => (
                  <DiagramRow
                    key={d.id}
                    diagram={d}
                    starred={favDiagrams.has(d.id)}
                    onToggleStar={() => toggleFavorite('diagram', d.id)}
                    onPreview={() => setPreview(d)}
                  />
                ))}
                {!showAll && section.total > section.items.length && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((prev) => new Set(prev).add(section.service))
                    }
                    className="w-full px-2 py-1.5 text-left text-[11px] text-slate-500 hover:text-blue-700 hover:underline"
                    data-nds-learn-more={section.service}
                  >
                    {t('+{n} more').replace('{n}', String(section.total - section.items.length))}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {groups.length === 0 && (
          <div className="p-4 text-sm text-slate-500">
            {t('No matching diagrams. Try a broader keyword.')}
          </div>
        )}
      </div>

      {preview && <LearnDiagramPreview diagram={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

/** Every match in one service, uncapped — backs the "+n more" expansion. */
function browseLearnDiagramsAll(query: string, service: string): LearnDiagram[] {
  const group = browseLearnDiagrams(query).find((g) => g.service === service);
  if (!group) return [];
  if (group.total === group.items.length) return group.items;
  return LEARN_DIAGRAMS.filter((d) => d.service === service && groupHas(query, d));
}

function groupHas(query: string, d: LearnDiagram): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    d.title.toLowerCase().includes(q) ||
    d.article.toLowerCase().includes(q) ||
    d.service.toLowerCase().includes(q) ||
    d.keywords.some((k) => k.includes(q)) ||
    q
      .split(/\s+/)
      .filter((tk) => tk.length >= 2)
      .every(
        (tk) =>
          d.title.toLowerCase().includes(tk) ||
          d.article.toLowerCase().includes(tk) ||
          d.keywords.some((k) => k.includes(tk)),
      )
  );
}
