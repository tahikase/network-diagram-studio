// Copy/paste support for diagram nodes.
//
// Kept free of React and of any store import so it can be reasoned about and
// tested on its own — the clipboard is the one place where getting the id
// remapping subtly wrong silently corrupts a diagram (orphaned children,
// edges pointing at the original instead of the copy).
import type { Diagram, DiagramEdge, DiagramNode } from './types';
import { isGroupNode, renderedSize } from './size-match';
import { runtimeExtensions } from '../runtime/extensions';

export interface NodeClipboardPayload {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

function cloneNode(n: DiagramNode): DiagramNode {
  return {
    ...n,
    position: { ...n.position },
    size: n.size ? { ...n.size } : undefined,
    data: { ...n.data, fields: { ...n.data.fields } },
  };
}

/**
 * `rootIds` plus every node nested inside them, to any depth.
 *
 * Copying a VNet has to bring its subnets and their VMs along — pasting an
 * empty container would look like the copy silently failed. Note this is a
 * *transitive* walk, unlike `removeNode`, which only detaches direct children.
 */
export function expandWithDescendants(nodes: DiagramNode[], rootIds: string[]): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    if (!n.parent) continue;
    const kids = childrenOf.get(n.parent);
    if (kids) kids.push(n.id);
    else childrenOf.set(n.parent, [n.id]);
  }
  const out: string[] = [];
  const seen = new Set<string>();
  const walk = (id: string) => {
    // `seen` also guards against a corrupt parent cycle, which would
    // otherwise recurse until the stack blows.
    if (seen.has(id)) return;
    seen.add(id);
    out.push(id);
    for (const child of childrenOf.get(id) ?? []) walk(child);
  };
  for (const id of rootIds) walk(id);
  return out;
}

/**
 * Deep-copy `rootIds` and their descendants, plus every edge whose **both**
 * endpoints are inside the copied set.
 *
 * Edges with one foot outside are deliberately dropped: re-pointing them at
 * the copy would silently rewire the user's topology, and duplicating them
 * onto the original would double every link. draw.io drops them too.
 */
function collectNativeSubtree(diagram: Diagram, rootIds: string[]): NodeClipboardPayload {
  const ids = new Set(expandWithDescendants(diagram.nodes, rootIds));
  return {
    nodes: diagram.nodes.filter((n) => ids.has(n.id)).map(cloneNode),
    edges: diagram.edges
      .filter((e) => ids.has(e.source) && ids.has(e.target))
      .map((e) => ({ ...e })),
  };
}

export function collectNodeSubtree(diagram: Diagram, rootIds: string[]): NodeClipboardPayload {
  const extend = runtimeExtensions().ndsNonProductionGroupCopy;
  const collect = extend
    ? extend(collectNativeSubtree, isGroupNode, renderedSize)
    : collectNativeSubtree;
  return collect(diagram, rootIds);
}
