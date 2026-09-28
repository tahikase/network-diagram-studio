// EmptyCanvasState
//
// Shown over the canvas ONLY while the active tab is genuinely empty — no
// nodes AND no annotation content (shapes or pencil strokes). A blank grid
// gives a first-time user nothing to act on — the previous build left the
// sole guidance as four lines of small print in the far-right property
// panel, which is the last place anyone looks. This surfaces the real ways
// into the app, in the order we want people to try them.
//
// v0.9.1 — the emptiness test used to look at nodes only, so dropping a
// shape from the Shapes palette left the placeholder sitting on top of the
// user's own drawing. Anything the user has put on the canvas counts.
//
// v0.9.45 — the text-generator call to action was removed along with the
// generator itself.
//
// v0.9.50 — "Load a sample" went too. The sample topology is a canned
// AppGW → VM diagram, and someone starting a real case diagram had to
// clear it before they could use the canvas, so the one button we showed
// first was the one action nobody wanted. What is left is a heading and
// the sentence that names the thing you actually do: click a resource in
// the palette.
//
// It is pointer-events:none throughout so it never blocks a drag-and-drop
// from the palette onto the canvas underneath. It also carries
// data-nds-empty-state so exporters.ts can hide it, though in practice an
// empty diagram is never exported.
import { useDiagramStore } from '../store/diagram-store';
import { useTabsStore } from '../demo/tabs-store';
import { useT } from '../i18n/useT';

export function EmptyCanvasState() {
  const noNodes = useDiagramStore((s) => s.diagram.nodes.length === 0);
  // Subscribe to counts, not to the arrays themselves — returning a new
  // object from the selector on every store write would re-render this
  // component on every pointer-move of a shape drag.
  const shapeCount = useTabsStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab ? tab.shapes.length : 0;
  });
  const strokeCount = useTabsStore((s) => {
    const tab = s.tabs.find((t) => t.id === s.activeTabId);
    return tab ? tab.strokes.length : 0;
  });
  const t = useT();

  if (!noNodes || shapeCount > 0 || strokeCount > 0) return null;

  return (
    <div
      data-nds-empty-state
      className="absolute inset-0 z-10 grid place-items-center pointer-events-none"
    >
      <div className="max-w-[460px] px-6 text-center">
        <h2 className="text-lg font-semibold text-slate-700">
          {t('Start your network diagram')}
        </h2>

        <p className="mt-3 text-xs text-slate-400">
          {t('Click any resource in the left palette to drop it here.')}
        </p>
      </div>
    </div>
  );
}
