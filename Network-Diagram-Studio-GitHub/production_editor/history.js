(function () {
  'use strict';

  // Every edit made on the diagram is journalled, but the two halves are not
  // treated alike. Nodes and edges live in the diagram store, which has a real
  // past/future pair. Pencil strokes, the eraser and the shape tools live in the
  // tabs store, which records an undo stack and nothing else: undo() pops the
  // entry and throws it away, so annotation redo was never possible, and the
  // header buttons only ever consulted the diagram store, so annotation work
  // left them greyed out.
  //
  // This add-on keeps the discarded entries. Every entry the tabs store records
  // already carries both directions (stroke-add keeps the stroke, shape-update
  // keeps shape and prevShape, a delete keeps the detached edges), so replaying
  // one forward is exact, not a re-simulation of the gesture.
  //
  // Which store the next step belongs to is not this add-on's judgement call:
  // the bundle already keeps an interleaved journal of sources on
  // window.__nds_undoRouter, and that journal is the single source of order.
  // The redo stack here is kept subordinate to it — pruned to the number of
  // 'annotation' entries the journal still holds — so any action that clears the
  // router's redo journal clears this stack too, with no bookkeeping of its own.

  const MAX = 100;
  const UNDO_TITLE = 'Ctrl+Z';
  const REDO_TITLE = 'Ctrl+Y';
  const ROLES = { undo: 'data-nds-history-undo', redo: 'data-nds-history-redo' };

  let redoStack = [];
  let stores = null;
  let observer = null;

  function ready() {
    if (stores) return stores;
    const tabs = window.__nds_tabsStore;
    const diagram = window.__nds_diagramStore;
    const router = window.__nds_undoRouter;
    if (!tabs || !diagram || !router) return null;
    stores = { tabs, diagram, router };
    return stores;
  }

  // The tabs store's own undo stays authoritative; this only keeps the entry it
  // is about to drop. Wrapping the action rather than replacing it means the
  // annotation toolbar's undo button and any other caller are covered too.
  function keepUndoneEntries(s) {
    const state = s.tabs.getState();
    if (state.ndsAnnotationRedo) return;
    const nativeUndo = state.undo;
    if (typeof nativeUndo !== 'function') return;
    s.tabs.setState({
      ndsAnnotationRedo: true,
      undo: () => {
        const before = s.tabs.getState().undoStack;
        const entry = before[before.length - 1];
        nativeUndo();
        if (!entry || s.tabs.getState().undoStack.length >= before.length) return;
        redoStack.push(entry);
        if (redoStack.length > MAX) redoStack.shift();
        sync();
      }
    });
  }

  function annotationRedoDepth(s) {
    let depth = 0;
    for (const source of s.router.snapshot().redoJournal) if (source === 'annotation') depth += 1;
    return depth;
  }

  function prune(s) {
    const live = new Set(s.tabs.getState().tabs.map(tab => tab.id));
    if (redoStack.some(entry => !live.has(entry.tabId))) {
      redoStack = redoStack.filter(entry => live.has(entry.tabId));
    }
    const depth = annotationRedoDepth(s);
    if (redoStack.length > depth) redoStack.length = depth;
  }

  function canUndo(s) {
    return s.diagram.getState().history.past.length > 0 || s.tabs.getState().undoStack.length > 0;
  }

  function canRedo(s) {
    prune(s);
    return s.diagram.getState().history.future.length > 0 || redoStack.length > 0;
  }

  // Walk the journal from its tail, dropping sources that can no longer honour a
  // step (a cleared diagram history, a reset annotation stack) exactly as the
  // bundle's own keyboard router does, and fall back to whichever store still
  // has something when the journal runs out.
  function pick(s, direction) {
    const journal = direction === 'undo'
      ? s.router.snapshot().undoJournal
      : s.router.snapshot().redoJournal;
    const diagramReady = () => (direction === 'undo'
      ? s.diagram.getState().history.past.length
      : s.diagram.getState().history.future.length) > 0;
    const annotationReady = () => (direction === 'undo'
      ? s.tabs.getState().undoStack.length
      : redoStack.length) > 0;
    for (let step = 0; step <= journal.length; step += 1) {
      const tail = direction === 'undo' ? s.router.peekUndo() : s.router.peekRedo();
      if (!tail) break;
      if (tail === 'diagram' && diagramReady()) return 'diagram';
      if (tail === 'annotation' && annotationReady()) return 'annotation';
      if (direction === 'undo') s.router.dropTailUndo(); else s.router.dropTailRedo();
    }
    if (diagramReady()) return 'diagram';
    if (annotationReady()) return 'annotation';
    return null;
  }

  function replay(tab, entry) {
    if (entry.kind === 'stroke-add' && entry.stroke) {
      return { ...tab, strokes: [...tab.strokes, entry.stroke] };
    }
    if (entry.kind === 'stroke-erase' && entry.stroke) {
      return { ...tab, strokes: tab.strokes.filter(stroke => stroke.id !== entry.stroke.id) };
    }
    if (entry.kind === 'shape-add' && entry.shape) {
      return { ...tab, shapes: [...tab.shapes, entry.shape] };
    }
    if (entry.kind === 'shape-add-many' && entry.shapes) {
      return { ...tab, shapes: [...tab.shapes, ...entry.shapes] };
    }
    if (entry.kind === 'shape-delete' && entry.shape) {
      return { ...tab, shapes: tab.shapes.filter(shape => shape.id !== entry.shape.id) };
    }
    if (entry.kind === 'shape-delete-many' && entry.shapes) {
      const gone = new Set(entry.shapes.map(shape => shape.id));
      return { ...tab, shapes: tab.shapes.filter(shape => !gone.has(shape.id)) };
    }
    if (entry.kind === 'shape-update' && entry.shape) {
      return { ...tab, shapes: tab.shapes.map(shape => (shape.id === entry.shape.id ? entry.shape : shape)) };
    }
    if (entry.kind === 'shape-update-many' && entry.shapes) {
      const next = new Map(entry.shapes.map(shape => [shape.id, shape]));
      return { ...tab, shapes: tab.shapes.map(shape => next.get(shape.id) ?? shape) };
    }
    return tab;
  }

  function redoAnnotation(s) {
    const entry = redoStack.pop();
    if (!entry) return false;
    // Deleting a shape detaches the edges that pointed at it, and undo put them
    // back. Redo has to take them away again, and has to record the edges it
    // actually removed so the next undo restores that same set.
    const detached = entry.kind === 'shape-delete' && entry.shape ? [entry.shape.id]
      : entry.kind === 'shape-delete-many' && entry.shapes ? entry.shapes.map(shape => shape.id)
        : null;
    const replayed = detached
      ? { ...entry, edges: s.diagram.getState().detachEdgesFor(detached) }
      : entry;
    s.tabs.setState(state => ({
      tabs: state.tabs.map(tab => (tab.id === replayed.tabId ? replay(tab, replayed) : tab)),
      undoStack: [...state.undoStack, replayed].slice(-MAX)
    }));
    s.router.commitRedo();
    return true;
  }

  function undo() {
    const s = ready();
    if (!s) return false;
    const source = pick(s, 'undo');
    if (source === 'diagram') s.diagram.getState().undo();
    else if (source === 'annotation') s.tabs.getState().undo();
    else return false;
    sync();
    return true;
  }

  function redo() {
    const s = ready();
    if (!s) return false;
    prune(s);
    const source = pick(s, 'redo');
    if (source === 'diagram') s.diagram.getState().redo();
    else if (source === 'annotation') { if (!redoAnnotation(s)) return false; }
    else return false;
    sync();
    return true;
  }

  function editable(node) {
    if (!(node instanceof HTMLElement)) return false;
    const tag = node.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
  }

  function onKeyDown(event) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = (event.key || '').toLowerCase();
    if (key !== 'z' && key !== 'y') return;
    if (editable(event.target)) return;
    // The screenshot editor and the ARM dialog run their own history. Leaving
    // the event alone there keeps the native handler in charge, unchanged.
    if (document.querySelector('dialog[open]')) return;
    if (!ready()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (key === 'y' || event.shiftKey) redo(); else undo();
  }

  function headerButtons() {
    const found = [];
    for (const button of document.querySelectorAll('header button[title]')) {
      const title = button.getAttribute('title') || '';
      if (title.includes(UNDO_TITLE)) found.push([button, 'undo']);
      else if (title.includes(REDO_TITLE)) found.push([button, 'redo']);
    }
    return found;
  }

  // React owns the disabled attribute and recomputes it from the diagram store
  // alone, so it is re-applied on every render. Writing only when the value
  // actually differs keeps the observer that watches for those renders from
  // feeding itself.
  function sync() {
    const s = ready();
    if (!s) return;
    const undoable = canUndo(s);
    const redoable = canRedo(s);
    for (const [button, role] of headerButtons()) {
      if (!button.hasAttribute(ROLES[role])) button.setAttribute(ROLES[role], '1');
      const enabled = role === 'undo' ? undoable : redoable;
      if (button.disabled === enabled) button.disabled = !enabled;
      if (enabled) {
        if (button.getAttribute('data-nds-history-live') !== '1') button.setAttribute('data-nds-history-live', '1');
      } else if (button.hasAttribute('data-nds-history-live')) {
        button.removeAttribute('data-nds-history-live');
      }
    }
  }

  function onClick(event) {
    const button = event.target instanceof Element
      ? event.target.closest('[' + ROLES.undo + '],[' + ROLES.redo + ']')
      : null;
    if (!button || button.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (button.hasAttribute(ROLES.undo)) undo(); else redo();
  }

  function install() {
    const s = ready();
    if (!s) return false;
    keepUndoneEntries(s);
    s.diagram.subscribe(sync);
    s.tabs.subscribe(sync);
    observer = new MutationObserver(sync);
    const header = document.querySelector('header');
    if (header) observer.observe(header, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled', 'class', 'title'] });
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('click', onClick, true);
    sync();
    return true;
  }

  function waitForStores() {
    if (install()) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (install() || tries > 600) window.clearInterval(timer);
    }, 60);
  }

  window.ndsHistory = {
    undo,
    redo,
    sync,
    canUndo: () => { const s = ready(); return !!s && canUndo(s); },
    canRedo: () => { const s = ready(); return !!s && canRedo(s); },
    pendingRedo: () => redoStack.length,
    journal: () => { const s = ready(); return s ? s.router.snapshot() : null; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForStores, { once: true });
  } else {
    waitForStores();
  }
}());
