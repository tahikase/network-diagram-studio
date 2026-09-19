(() => {
  'use strict';

  function worldBounds(nodes, sizeOf) {
    const byId = new Map(nodes.map(node => [node.id, node]));
    const bounds = new Map();
    function boundsOf(node, visiting = new Set()) {
      if (bounds.has(node.id)) return bounds.get(node.id);
      if (visiting.has(node.id)) throw new Error('Cannot copy a cyclic resource hierarchy.');
      visiting.add(node.id);
      const parent = byId.get(node.parent);
      const origin = parent ? boundsOf(parent, visiting) : { x: 0, y: 0 };
      const box = { x: origin.x + node.position.x, y: origin.y + node.position.y, ...sizeOf(node) };
      visiting.delete(node.id);
      bounds.set(node.id, box);
      return box;
    }
    return boundsOf;
  }

  // The hand-built canvas uses geometric nesting. Preserve the existing
  // clipboard's cloning, parent links, internal edges, and paste/undo behavior.
  window.ndsProductionGroupCopy = (collectSubtree, isGroup, sizeOf) => (diagram, roots) => {
    const byId = new Map(diagram.nodes.map(node => [node.id, node]));
    const boundsOf = worldBounds(diagram.nodes, sizeOf);
    let payload = collectSubtree(diagram, roots);
    const included = new Set(payload.nodes.map(node => node.id));
    const inspected = new Set();
    while (true) {
      const groups = payload.nodes.filter(node => isGroup(node) && !inspected.has(node.id));
      if (!groups.length) return payload;
      for (const group of groups) {
        inspected.add(group.id);
        const outer = boundsOf(byId.get(group.id));
        for (const node of diagram.nodes) {
          if (included.has(node.id) || (node.parent && !included.has(node.parent))) continue;
          const inner = boundsOf(node);
          if (inner.x >= outer.x && inner.y >= outer.y &&
              inner.x + inner.w <= outer.x + outer.w &&
              inner.y + inner.h <= outer.y + outer.h &&
              inner.w * inner.h < outer.w * outer.h) included.add(node.id);
        }
      }
      payload = collectSubtree(diagram, [...included]);
      for (const node of payload.nodes) included.add(node.id);
    }
  };

  window.ndsProductionGroupPaste = (pasteNodes, isGroup, sizeOf, getDiagram) => (payload, offset) => {
    if (!payload.nodes.some(isGroup)) return pasteNodes(payload, offset);
    const existing = getDiagram().nodes;
    const boundsOf = worldBounds(payload.nodes, sizeOf);
    const boxes = payload.nodes.map(node => boundsOf(node));
    const left = Math.min(...boxes.map(box => box.x));
    const top = Math.min(...boxes.map(box => box.y));
    const width = Math.max(...boxes.map(box => box.x + box.w)) - left;
    const height = Math.max(...boxes.map(box => box.y + box.h)) - top;
    const existingBounds = worldBounds(existing, sizeOf);
    const occupied = existing.map(node => existingBounds(node)).sort((a, b) => a.x - b.x);
    let x = offset.x;
    // Overlapping flat containers can carry each other's resources on drag.
    // Place a group copy in clear space so moving it never moves the original.
    for (const box of occupied) {
      if (left + x < box.x + box.w && left + x + width > box.x &&
          top + offset.y < box.y + box.h && top + offset.y + height > box.y) {
        x = box.x + box.w + 40 - left;
      }
    }
    return pasteNodes(payload, { ...offset, x });
  };
})();
