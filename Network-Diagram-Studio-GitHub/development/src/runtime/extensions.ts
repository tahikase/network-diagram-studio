import type * as React from 'react';
import type { jsx } from 'react/jsx-runtime';
import type { Edge, getSmoothStepPath, ReactFlowInstance } from '@xyflow/react';
import type { AzureNodeData } from '../canvas/AzureNode';
import type { BindTarget, handleKeyForAnchor, refForDrop } from '../demo/shape-binding';
import type { buildShapeFromVariantAt } from '../demo/shape-presets';
import type { Point, Shape, ShapeRect } from '../demo/tabs-store';
import type { IconEntry } from '../icons/manifest';
import type { Diagram, DiagramEdge, DiagramNode } from '../model/types';
import type { LeafAppearance } from '../model/leaf-appearance';
import type { NodeClipboardPayload } from '../model/node-clipboard';
import type { getResourceType, ResourceType } from '../model/resource-types';
import type { refitNode, useDiagramStore } from '../store/diagram-store';

type NativeStore = typeof useDiagramStore;
type CollectNodes = (diagram: Diagram, roots: string[]) => NodeClipboardPayload;
type NodeSize = (node: DiagramNode) => { w: number; h: number };
type NativeBridge = { store: NativeStore; React: typeof React };

export interface ShortcutGroup {
  label: string;
  rows: { keys: string; label: string }[];
}

export interface GuideGroup {
  label: string;
  items: { term: string; desc: string; translateTerm: boolean }[];
}

export interface RuntimeExtensions {
  ndsNonProductionConnectors?: {
    install(bridge: NativeBridge & { smoothStep: typeof getSmoothStepPath }): void;
    defaults(): { data?: DiagramEdge['data'] };
    route(data: DiagramEdge['data'], options: Parameters<typeof getSmoothStepPath>[0]): ReturnType<typeof getSmoothStepPath>;
    marker(data: DiagramEdge['data'], original: Edge['markerEnd']): Edge['markerEnd'];
    panel(edge: DiagramEdge): React.ReactNode;
    dropHandles(
      target: BindTarget, point: Point, zoom: number, backwards: boolean,
      ref: typeof refForDrop, key: typeof handleKeyForAnchor
    ): { sourceHandle?: string; targetHandle?: string };
  };
  ndsNonProductionCaptions?: {
    install(bridge: NativeBridge & { refit: typeof refitNode; resourceType: typeof getResourceType }): void;
    caption(props: { id: string; data: AzureNodeData; fontSize: number }): React.ReactNode;
    panel(node: DiagramNode): React.ReactNode;
    lineCount(text: string, width: number, factor: number): number;
  };
  ndsArmResourceIds?: {
    install(bridge: NativeBridge & { resourceType: typeof getResourceType }): void;
    panel(node: DiagramNode): React.ReactNode;
  };
  ndsNonProductionGroupCopy?: (
    collect: CollectNodes, isGroup: (node: DiagramNode) => boolean, sizeOf: NodeSize
  ) => CollectNodes;
  ndsNonProductionGroupPaste?: (
    paste: ReturnType<NativeStore['getState']>['pasteNodes'],
    isGroup: (node: DiagramNode) => boolean, sizeOf: NodeSize, diagram: () => Diagram
  ) => ReturnType<NativeStore['getState']>['pasteNodes'];
  ndsNonProductionVendors?: {
    register(native: {
      icons: IconEntry[]; iconsById: Record<string, IconEntry>; iconCategories: string[];
      resourceTypes: ResourceType[]; resourceTypesBySlug: Record<string, ResourceType>;
      resourceTypeByIcon: Record<string, ResourceType>; resourceCategories: string[];
      sprite: string;
    }): string;
  };
  ndsLeafAppearance?: LeafAppearance;
  ndsTextDock?: {
    createText(event: React.MouseEvent, flow: ReactFlowInstance, build: typeof buildShapeFromVariantAt): void;
  };
  ndsCanvasImages?: {
    validPng(value: string): boolean;
    render(
      create: typeof jsx, shape: ShapeRect, selected: boolean,
      onPointerDown: (event: React.PointerEvent, shape: Shape) => void, interactive: boolean
    ): React.ReactNode;
    blocked(target: EventTarget | null): boolean;
    installClipboard(copy: () => boolean, paste: () => void): () => void;
    autoSaveFailed(error: unknown): void;
    captureHost(fallback: HTMLElement | null): HTMLElement | null;
  };
  ndsNotesLayout?: {
    widthHandleProps(): React.HTMLAttributes<HTMLDivElement>;
    heightHandleProps(setHeight: (value: number) => void, preferred: number): React.HTMLAttributes<HTMLDivElement>;
    prepareExport(source: Element, clone: Element): void;
  };
  ndsSettingsHelp?: {
    install(dictionaries: Partial<Record<string, Record<string, string>>>): void;
    shortcuts(original: ShortcutGroup[]): ShortcutGroup[];
    guides(): GuideGroup[];
    platformNote(): string;
  };
  __ndsNonProdCapture?: {
    prepareSvg(source: SVGElement, clone: SVGElement): void;
  };
}

declare global {
  interface Window extends RuntimeExtensions {}
}

// Source-only development can run without the packaged extensions.
export function runtimeExtensions(): RuntimeExtensions {
  return typeof window === 'undefined' ? {} : window;
}
