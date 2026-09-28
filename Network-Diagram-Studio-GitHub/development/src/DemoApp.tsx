// Demo v0.5 entry point.
//
// This composes the SAME shared Header + Palette + Canvas + PropertyPanel
// that prod uses, but wraps the canvas area with:
//   - <AnnotationToolbar/>  — top-right floating pencil / eraser / color picker
//   - <AnnotationOverlay/>  — transparent SVG that captures strokes on the
//                              active tab, anchored to diagram coords
//   - <TabBar/>             — bottom-center tab strip, each tab is a
//                              separate layer of strokes over the same
//                              diagram
//
// Prod build (App.tsx) does NOT import anything from ./demo/*, so none of
// this ends up in `dist/index.html`.
import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Header } from './panel/Header';
import { DemoPalette } from './demo/DemoPalette';
import { PaletteRail, type PaletteTab } from './demo/PaletteRail';
import { PropertyPanel } from './panel/PropertyPanel';
import { Canvas } from './canvas/Canvas';
import { EmptyCanvasState } from './canvas/EmptyCanvasState';
import { useKeyboardShortcuts } from './canvas/useKeyboardShortcuts';
import { AnnotationToolbar } from './demo/AnnotationToolbar';
import { AnnotationOverlay } from './demo/AnnotationOverlay';
import { ShapeOverlay } from './demo/ShapeOverlay';
import { TabBar } from './demo/TabBar';
import { NotesPanel } from './demo/NotesPanel';
import { CaptureLayer } from './demo/NotesScreenshot';
import { ScreenshotEditor } from './demo/ScreenshotEditor';
import { useTabsStore } from './demo/tabs-store';
import { useAnnotationShortcuts } from './demo/useAnnotationShortcuts';
import { useDemoUndoShortcut } from './demo/useDemoUndoShortcut';
import { useClipboardShortcuts } from './demo/useClipboardShortcuts';
import { useAnnotationStore } from './demo/annotation-store';
import { useLayoutStore } from './demo/layout-store';
import { useAutoSave } from './persistence/useAutoSave';
import { AutoSaveIndicator } from './persistence/AutoSaveIndicator';
import { UpdatesDialog } from './updates/UpdatesDialog';

function DemoApp() {
  const [paletteTab, setPaletteTab] = useState<PaletteTab>('resources');
  const tool = useAnnotationStore((s) => s.tool);
  const paletteCollapsed = useLayoutStore((s) => s.paletteCollapsed);

  // Shape selection is per-tab data held in a global store, so a selection
  // made on one tab would otherwise survive the switch and point at shapes
  // that don't exist on the incoming tab (stray resize handles, and a
  // style dropdown editing nothing).
  const activeTabId = useTabsStore((s) => s.activeTabId);
  useEffect(() => {
    useAnnotationStore.getState().clearShapeSelection();
    useAnnotationStore.getState().setPendingTextEditShapeId(null);
  }, [activeTabId]);
  useKeyboardShortcuts();
  useAnnotationShortcuts();
  useDemoUndoShortcut();
  useClipboardShortcuts();
  const autoSave = useAutoSave();

  // Canvas gesture routing depends purely on the active tool. Both prod and
  // demo behave the same way:
  //   Hand tool → left-drag pans the canvas (classic behaviour).
  //   Move tool → left-drag makes a marquee (ReactFlow selects nodes/edges;
  //               ShapeOverlay selects shapes in parallel). Middle / right
  //               mouse still pans.
  //   Other tools (pencil / eraser / shape-*) don't need canvas gestures;
  //               their overlays capture the pointer. We still hand pan to
  //               middle/right mouse so the user can navigate mid-draw.
  const panOnDrag = tool === 'pan' ? true : [1, 2];
  const selectionOnDrag = tool === 'move';

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col bg-slate-100">
        <Header rightSlot={<AutoSaveIndicator state={autoSave} />} />
        <div className="flex-1 flex overflow-hidden">
          {paletteCollapsed ? (
            <PaletteRail activeTab={paletteTab} onSelectTab={setPaletteTab} />
          ) : (
            <DemoPalette activeTab={paletteTab} onSelectTab={setPaletteTab} />
          )}
          <main
            className="flex-1 min-w-0 relative bg-slate-50"
            data-nds-fullscreen-target
          >
            <Canvas panOnDrag={panOnDrag} selectionOnDrag={selectionOnDrag} />
            {/* First-run guidance. Only renders while the diagram is empty. */}
            <EmptyCanvasState />
            {/* Shape overlay renders arrows / rects / ellipses / callouts.
                Sits UNDER AnnotationOverlay so pencil strokes stay on top. */}
            <ShapeOverlay />
            {/* AnnotationOverlay sits on top of the flow but is
                pointer-events:none unless a drawing tool is active. */}
            <AnnotationOverlay />
            <AnnotationToolbar />
            <TabBar />
          </main>
          <PropertyPanel />
          {/* Notes — the outermost right-hand column, so the property panel
              stays adjacent to the canvas it edits. */}
          <NotesPanel />
        </div>
        {/* Outside the flex row and fixed to the viewport: the selector has to
            be able to dim the header and the panels, not just the canvas. */}
        <CaptureLayer />
        <ScreenshotEditor />
        <UpdatesDialog />
      </div>
    </ReactFlowProvider>
  );
}

export default DemoApp;
