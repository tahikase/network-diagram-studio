(function () {
  'use strict';

  const cache = new Map();
  function isContainer(id) {
    return window.__nds_diagramStore?.getState().diagram.nodes.some(node => node.parent === id) || false;
  }
  const scale = (factor, textScale) => factor / 1.3 *
    (Number.isFinite(textScale) ? Math.max(.5, Math.min(3, textScale)) : 1);
  const baseIconSize = value => Number.isFinite(value) ? Math.max(16, Math.min(256, value)) : 56;
  function showTypeCaption(data, fallback) {
    const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
    const caption = normalize(data.typeCaption ?? data.typeLabel ?? fallback);
    return caption !== '' && caption !== normalize(data.name);
  }
  function minimumWidth(factor, textScale, iconSize) {
    return Math.max(140, Math.ceil(24 + Math.max(112, baseIconSize(iconSize)) * scale(factor, textScale)));
  }
  function variables(factor, textScale, iconSize) {
    const size = scale(factor, textScale);
    return {
      '--nds-d-text': size,
      '--nds-d-icon': baseIconSize(iconSize) * size + 'px',
      '--nds-d-glyph': baseIconSize(iconSize) * size + 'px'
    };
  }
  function fieldsOf(node, resourceType, customLabel) {
    const values = node.data.fields || {};
    const defs = resourceType(node.type).fields;
    const known = new Set(defs.map(def => def.key));
    return [
      ...defs.map(def => [def.label, values[def.key]]),
      ...Object.entries(values).filter(([key]) => !known.has(key)).map(([key, value]) => [customLabel(key), value])
    ].filter(([, value]) => value && String(value).trim() !== '').map(([label, value]) => [label, String(value)]);
  }
  function element(tag, className, text, parent) {
    const el = document.createElement(tag);
    el.className = className;
    if (text !== undefined) el.textContent = text;
    parent?.appendChild(el);
    return el;
  }
  function footprint(node, factor, boxWidth, resourceType, customLabel) {
    const data = node.data;
    const fallback = resourceType(node.type).label;
    const caption = showTypeCaption(data, fallback) ? data.typeCaption ?? data.typeLabel ?? fallback : '';
    const fields = fieldsOf(node, resourceType, customLabel);
    const font = getComputedStyle(document.body).fontFamily;
    const key = JSON.stringify([factor, boxWidth, font, caption, data.name, data.subtitle, fields, data.notes, data.textScale, data.iconSize]);
    if (cache.has(key)) return { ...cache.get(key) };
    const card = element('div', 'nds-leaf-row border flex flex-col');
    Object.assign(card.style, {
      position: 'fixed', left: '0', top: '0', visibility: 'hidden',
      pointerEvents: 'none', fontFamily: font, boxSizing: 'border-box'
    });
    for (const [key, value] of Object.entries(variables(factor, data.textScale, data.iconSize))) card.style.setProperty(key, value);
    card.setAttribute('aria-hidden', 'true');
    const content = element('div', 'flex-1', undefined, card);
    element('div', 'rounded-full', undefined, content);
    const identity = element('div', 'text-center w-full', undefined, content);
    if (caption !== '') element('div', 'nds-type-caption font-semibold uppercase tracking-wide', caption, identity);
    element('div', 'font-semibold', data.name ?? '', identity);
    if (data.subtitle) element('div', 'truncate mt-0.5', data.subtitle, identity);
    if (fields.length) {
      const block = element('div', 'w-full flex flex-col gap-[1px]', undefined, content);
      for (const [label, value] of fields) {
        const row = element('div', 'items-baseline', undefined, block);
        element('span', 'uppercase tracking-wide font-semibold', label, row);
        element('span', '', value, row);
      }
    }
    if (data.notes?.trim()) {
      const notes = element('div', 'w-full', undefined, content);
      if (fields.length) notes.style.borderTop = '1px solid var(--nds-node-border)';
      element('div', 'uppercase tracking-wide font-semibold', 'NOTES', notes);
      element('div', 'italic', data.notes, notes).setAttribute('data-nds-node-notes', '1');
    }
    document.body.appendChild(card);
    let width = boxWidth;
    if (!Number.isFinite(width)) {
      // Measure real shaped glyphs, not average character widths. Wrapping is
      // measured below at the final width using the renderer's own CSS.
      card.style.width = 'max-content';
      identity.style.width = 'max-content';
      const identityWidth = identity.getBoundingClientRect().width;
      const detailed = fields.length || data.notes?.trim();
      width = Math.ceil(Math.min((detailed ? 480 : 280) * factor / 1.3, Math.max(
        detailed ? 280 : 140,
        identityWidth + 22
      )));
      identity.style.removeProperty('width');
    }
    width = Math.max(minimumWidth(factor, data.textScale, data.iconSize), width);
    card.style.width = width + 'px';
    const height = Math.ceil(content.getBoundingClientRect().height + 2) + 4;
    card.remove();
    const result = { w: width, h: height };
    if (cache.size >= 512) cache.clear();
    cache.set(key, result);
    return { ...result };
  }
  function growNode(node, factor, resourceType, customLabel) {
    if (resourceType(node.type).isGroup) return node.size;
    const needed = footprint(node, factor, node.size?.w, resourceType, customLabel);
    return { w: Math.max(node.size?.w || 0, needed.w), h: Math.max(node.size?.h || 0, needed.h) };
  }
  const sameSize = (a, b) => a?.w === b?.w && a?.h === b?.h;
  function contain(nodes, changed) {
    const byId = new Map(nodes.map(node => [node.id, node]));
    const affected = new Map();
    for (const id of changed) {
      const chain = [];
      let node = byId.get(id);
      while (node) {
        if (chain.includes(node.id)) throw new Error('Cannot fit a cyclic resource hierarchy.');
        chain.push(node.id);
        node = byId.get(node.parent);
      }
      chain.forEach((id, index) => affected.set(id, chain.length - index));
    }
    for (const [id] of [...affected].sort((a, b) => b[1] - a[1])) {
      const node = byId.get(id);
      if (!node?.parent || !node.size) continue;
      const parent = byId.get(node.parent);
      if (!parent?.size) continue;
      // Grow right/bottom only. Saved positions and child coordinate systems
      // must never be repacked as a side effect of editing a caption or note.
      const size = {
        w: Math.max(parent.size.w, node.position.x + node.size.w + 28),
        h: Math.max(parent.size.h, node.position.y + node.size.h + 28)
      };
      if (sameSize(size, parent.size)) continue;
      byId.set(parent.id, { ...parent, size });
    }
    return nodes.map(node => byId.get(node.id));
  }
  function fitChanges(previous, next, factor, resourceType, customLabel, loaded = false) {
    if (previous?.nodes === next.nodes) return next;
    const before = new Map((previous?.nodes || []).map(node => [node.id, node]));
    const parents = new Set(next.nodes.map(node => node.parent));
    const changed = new Set();
    const nodes = next.nodes.map(node => {
      const old = before.get(node.id);
      if (parents.has(node.id) || resourceType(node.type).isGroup || (loaded && !node.size)) return node;
      if (old && old.data === node.data && old.type === node.type && sameSize(old.size, node.size)) return node;
      const size = growNode(node, factor, resourceType, customLabel);
      // Restoring an unchanged card must not grow its group around an
      // intentionally out-of-frame position.
      const previousSize = old?.size ?? (loaded ? node.size : undefined);
      if (!sameSize(previousSize, size)) changed.add(node.id);
      return sameSize(size, node.size) ? node : { ...node, size };
    });
    const fitted = contain(nodes, changed);
    return fitted.every((node, index) => node === next.nodes[index]) ? next : { ...next, nodes: fitted };
  }
  function resize(diagram, id, raw, factor, resourceType, customLabel) {
    const node = diagram.nodes.find(node => node.id === id);
    if (!node || resourceType(node.type).isGroup || diagram.nodes.some(child => child.parent === id)) return null;
    const need = footprint(node, factor, raw.w, resourceType, customLabel);
    const size = { w: need.w, h: Math.max(raw.h, need.h) };
    if (sameSize(node.size, size)) return diagram;
    const nodes = diagram.nodes.map(node => node.id === id ? { ...node, size } : node);
    return { ...diagram, nodes: contain(nodes, [id]) };
  }
  function prepareExport(source, clone) {
    if (source.matches?.('.nds-leaf-row')) {
      if (source === clone || clone.isConnected) throw new Error('Appearance export requires a detached clone.');
      clone.style.setProperty('outline', 'none', 'important');
      clone.style.setProperty('box-shadow', 'none', 'important');
    }
    if (!source.matches?.('.react-flow__handle,.react-flow__resize-control,.react-flow__node-toolbar,[data-nds-size-readout]')) return;
    if (source === clone || clone.isConnected) throw new Error('Appearance export requires a detached clone.');
    clone.style.setProperty('display', 'none', 'important');
  }
  window.ndsLeafAppearance = Object.freeze({ isContainer, showTypeCaption, variables, minimumWidth, footprint, growNode, fitChanges, resize, prepareExport });
})();
