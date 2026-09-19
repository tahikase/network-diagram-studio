(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const PRESENTATION = [
    'color', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width',
    'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
    'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'stop-color',
    'stop-opacity', 'flood-color', 'flood-opacity', 'lighting-color',
    'clip-path', 'clip-rule', 'mask', 'filter', 'marker-start', 'marker-mid',
    'marker-end', 'paint-order', 'vector-effect', 'visibility', 'display',
    'transform', 'transform-origin', 'transform-box',
    'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor',
    'dominant-baseline', 'letter-spacing', 'word-spacing'
  ];
  const NON_INHERITED = new Set([
    'opacity', 'stop-color', 'stop-opacity', 'flood-color', 'flood-opacity',
    'lighting-color', 'clip-path', 'mask', 'filter', 'vector-effect', 'display',
    'transform', 'transform-origin', 'transform-box'
  ]);
  let serial = 0;

  // Called only by html-to-image's native decorate step, after root styles
  // have been copied. Never patch DOM prototypes or insert a live sprite.
  function prepareSvg(source, clone) {
    if (source.namespaceURI !== SVG_NS || source.localName !== 'svg') return clone;
    if (clone.isConnected || source === clone) {
      throw new Error('Production capture requires a detached SVG clone.');
    }
    if (source.closest('[data-nds-sprite]')) return clone;

    const doc = source.ownerDocument;
    const prefix = 'nds-capture-' + (++serial) + '-';
    const copies = new Map();
    const ids = new Map();
    const scopes = new Map();
    const styles = new Map();
    const queue = [];
    const missing = new Set();
    let definitions;
    let nextId = 0;

    function styleOf(node) {
      if (!styles.has(node)) styles.set(node, doc.defaultView.getComputedStyle(node));
      return styles.get(node);
    }

    function remember(original, copy, isRoot) {
      copies.set(original, copy);
      queue.push([original, copy]);
      if (original.id) {
        const id = prefix + (++nextId);
        ids.set(original, id);
        copy.id = id;
      }
      // html-to-image deep-clones SVG without styling its descendants.
      // Freeze CSS presentation differences, not the hidden sprite's default
      // fill/color: an unstyled symbol must still inherit from its <use>.
      if (!isRoot && original.namespaceURI === SVG_NS && copy.style &&
          original.localName !== 'style') {
        const current = styleOf(original);
        const parent = original.parentElement && styleOf(original.parentElement);
        for (const property of PRESENTATION) {
          const authored = original.style.getPropertyValue(property) ||
            original.getAttribute(property) || '';
          if (/\bcurrentcolor\b|\bvar\(/i.test(authored)) continue;
          const value = current.getPropertyValue(property);
          if (value && parent &&
              (NON_INHERITED.has(property) || value !== parent.getPropertyValue(property))) {
            copy.style.setProperty(property, value);
          }
        }
      }
      const originals = original.children;
      const children = copy.children;
      for (let i = 0; i < originals.length; i++) remember(originals[i], children[i], false);
    }

    function inScope(scope, id) {
      if (!scopes.has(scope)) {
        const map = new Map();
        if (scope.id) map.set(scope.id, scope);
        for (const element of scope.querySelectorAll('[id]')) {
          if (!map.has(element.id)) map.set(element.id, element);
        }
        scopes.set(scope, map);
      }
      return scopes.get(scope).get(id);
    }

    function lookup(original, id) {
      // Prefer the containing symbol/inline SVG. Different vendor icons may
      // legitimately call their own gradient "a"; global lookup cross-wires it.
      for (let scope = original; scope; scope = scope.parentElement) {
        if (scope.namespaceURI === SVG_NS &&
            (scope.localName === 'svg' || scope.localName === 'symbol')) {
          const found = inScope(scope, id);
          if (found) return found;
        }
      }
      return doc.getElementById(id);
    }

    function fragment(value) {
      const raw = value.trim();
      if (raw.startsWith('#')) return raw.slice(1);
      // Computed CSS can expand url(#id) into the document's absolute URL.
      // Only collapse this same-document form; never fetch external resources.
      if (!raw.includes('#')) return null;
      const url = URL.parse(raw, doc.baseURI);
      const current = URL.parse(doc.URL);
      if (!url || !current || !url.hash) return null;
      const hash = url.hash.slice(1);
      url.hash = '';
      current.hash = '';
      return url.href === current.href ? decodeURIComponent(hash) : null;
    }

    function reference(original, id) {
      const target = lookup(original, id);
      if (!target || target.namespaceURI !== SVG_NS) {
        if (!missing.has(id)) {
          missing.add(id);
          console.warn('Production capture: unresolved SVG reference #' + id);
        }
        return null;
      }
      if (!copies.has(target)) {
        const copy = target.cloneNode(true);
        remember(target, copy, false);
        if (!definitions) {
          definitions = doc.createElementNS(SVG_NS, 'defs');
          clone.insertBefore(definitions, clone.firstChild);
        }
        definitions.appendChild(copy);
      }
      return ids.get(target);
    }

    function urls(value, original) {
      return value.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/gi,
        (whole, doubleQuoted, singleQuoted, bare) => {
          const id = fragment(doubleQuoted ?? singleQuoted ?? bare);
          if (!id) return whole;
          const replacement = reference(original, id);
          return replacement ? 'url(#' + replacement + ')' : whole;
        });
    }

    remember(source, clone, true);
    // Processing the growing queue closes nested <use>, chained gradients,
    // clips, masks and filters. Copies are registered before traversing them,
    // so shared definitions and cycles cannot cause unbounded cloning.
    for (let i = 0; i < queue.length; i++) {
      const [original, copy] = queue[i];
      if (original.localName === 'style' && original.namespaceURI === SVG_NS) {
        // Presentation was frozen above; retaining document-global selectors
        // would let one imported vendor stylesheet recolor another icon.
        copy.remove();
        continue;
      }
      for (const attribute of Array.from(copy.attributes)) {
        if (attribute.localName === 'id') continue;
        let value = urls(attribute.value, original);
        if (attribute.localName === 'href') {
          const id = fragment(value);
          const replacement = id && reference(original, id);
          if (replacement) value = '#' + replacement;
        } else if (attribute.localName === 'aria-labelledby' ||
                   attribute.localName === 'aria-describedby') {
          value = value.split(/\s+/).map(id => reference(original, id) || id).join(' ');
        }
        if (value !== attribute.value) {
          copy.setAttributeNS(attribute.namespaceURI, attribute.name, value);
        }
      }
    }
    return clone;
  }

  Object.defineProperty(window, '__ndsProductionCapture', {
    value: Object.freeze({ prepareSvg }),
    configurable: true
  });
})();
