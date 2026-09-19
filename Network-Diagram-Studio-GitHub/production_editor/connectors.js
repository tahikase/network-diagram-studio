(function () {
  'use strict';

  const HEAD = 'nds.connector.head';
  const ROUTE = 'nds.connector.route';
  const COPY = {
    en: ['Connector', 'Line', 'Arrow', 'Routing', 'Straight', 'Bent', 'Your choices also apply to new connections.'],
    ja: ['\u63a5\u7d9a\u7dda', '\u7dda', '\u77e2\u5370', '\u7dda\u306e\u7d4c\u8def', '\u76f4\u7dda', '\u6298\u308c\u7dda', '\u9078\u629e\u3057\u305f\u8a2d\u5b9a\u306f\u65b0\u3057\u3044\u63a5\u7d9a\u306b\u3082\u9069\u7528\u3055\u308c\u307e\u3059\u3002'],
    de: ['Verbindung', 'Linie', 'Pfeil', 'Verlauf', 'Gerade', 'Abgewinkelt', 'Ihre Auswahl gilt auch f\u00fcr neue Verbindungen.'],
    es: ['Conector', 'L\u00ednea', 'Flecha', 'Recorrido', 'Recto', 'Angular', 'Estas opciones tambi\u00e9n se aplican a las nuevas conexiones.'],
    fr: ['Connecteur', 'Ligne', 'Fl\u00e8che', 'Trac\u00e9', 'Droit', 'Coud\u00e9', 'Ces choix s\u2019appliquent aussi aux nouvelles connexions.'],
    pt: ['Conector', 'Linha', 'Seta', 'Trajeto', 'Reto', 'Angular', 'As op\u00e7\u00f5es tamb\u00e9m se aplicam a novas conex\u00f5es.'],
    ko: ['\uc5f0\uacb0\uc120', '\uc120', '\ud654\uc0b4\ud45c', '\uacbd\ub85c', '\uc9c1\uc120', '\uaebe\uc740\uc120', '\uc120\ud0dd\ud55c \uc124\uc815\uc740 \uc0c8 \uc5f0\uacb0\uc5d0\ub3c4 \uc801\uc6a9\ub429\ub2c8\ub2e4.'],
    zh: ['\u8fde\u63a5\u7ebf', '\u7ebf\u6761', '\u7bad\u5934', '\u8def\u5f84', '\u76f4\u7ebf', '\u6298\u7ebf', '\u8fd9\u4e9b\u9009\u62e9\u4e5f\u9002\u7528\u4e8e\u65b0\u8fde\u63a5\u3002']
  };
  let native;
  // Defaults are session-only, like the native lastEdgeLine preference.
  const next = { head: 'end', route: 'bent' };
  const headOf = data => data?.[HEAD] === 'none' ? 'none' : 'end';
  const routeOf = data => data?.[ROUTE] === 'straight' ? 'straight' : 'bent';

  function install(bridge) {
    if (!bridge?.store?.getState || !bridge.React?.createElement || typeof bridge.smoothStep !== 'function') {
      throw new Error('Production connectors require the native diagram/React/path bridge.');
    }
    native = bridge;
  }

  function defaults() {
    const data = {};
    if (next.head !== 'end') data[HEAD] = next.head;
    if (next.route !== 'bent') data[ROUTE] = next.route;
    return Object.keys(data).length ? { data } : {};
  }

  function route(data, options) {
    if (routeOf(data) !== 'straight') return native.smoothStep(options);
    const { sourceX: sx, sourceY: sy, targetX: tx, targetY: ty } = options;
    return [`M ${sx} ${sy} L ${tx} ${ty}`, (sx + tx) / 2, (sy + ty) / 2, Math.abs(tx - sx) / 2, Math.abs(ty - sy) / 2];
  }

  function marker(data, original) {
    return headOf(data) === 'none' ? undefined : original;
  }

  function dropHandles(target, point, zoom, backwards, refForDrop, handleKeyForAnchor) {
    if (target.kind !== 'shape') return {};
    // Shape handles cannot receive RF drops. Reuse the overlay's native
    // nearest-dot binding and 18-screen-pixel tolerance in the body fallback.
    const key = handleKeyForAnchor(refForDrop(target, point, 18 / zoom).anchor);
    return key ? { [backwards ? 'sourceHandle' : 'targetHandle']: (backwards ? 's-' : 't-') + key } : {};
  }

  function choose(id, attribute, value) {
    if (!(attribute === 'head' && ['none', 'end'].includes(value)) &&
        !(attribute === 'route' && ['straight', 'bent'].includes(value))) {
      throw new Error('Unsupported connector option.');
    }
    const state = native.store.getState();
    const edge = state.diagram.edges.find(item => item.id === id);
    if (!edge) throw new Error('The selected connection no longer exists.');
    next[attribute] = value;
    const current = attribute === 'head' ? headOf(edge.data) : routeOf(edge.data);
    if (current === value) return;
    // The existing schema preserves string-valued edge data through every
    // JSON path. Merge rather than replace it; kind/state/user data are semantic.
    const data = { ...edge.data };
    const key = attribute === 'head' ? HEAD : ROUTE;
    if (value === (attribute === 'head' ? 'end' : 'bent')) delete data[key];
    else data[key] = value;
    state.updateEdge(id, { data: Object.keys(data).length ? data : undefined });
  }

  function panel(edge) {
    const h = native.React.createElement;
    const words = COPY[document.documentElement.lang] || COPY.en;
    function preview(attribute, value) {
      const bent = attribute === 'route' && value === 'bent';
      const arrow = attribute === 'head' && value === 'end';
      return h('svg', { width: 28, height: 18, viewBox: '0 0 30 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true },
        h('path', { d: bent ? 'M3 4 H14 V16 H27' : 'M3 10 H27', strokeLinejoin: 'round' }),
        arrow ? h('path', { d: 'M21 5 L27 10 L21 15', strokeLinejoin: 'round' }) : null);
    }
    function row(attribute, label, options, current) {
      return h('div', { className: 'nds-connector-row', key: attribute },
        h('span', { className: 'nds-connector-caption' }, label),
        h('div', { role: 'group', 'aria-label': label, className: 'nds-connector-options' },
          ...options.map(([value, title]) => h('button', {
            key: value, type: 'button', title, 'aria-label': title, 'aria-pressed': current === value,
            ['data-nds-connector-' + attribute]: value,
            onClick: () => choose(edge.id, attribute, value)
          }, preview(attribute, value), h('span', null, title)))));
    }
    return h('section', { className: 'nds-connector-controls', 'data-nds-connector-controls': edge.id },
      row('head', words[0], [['none', words[1]], ['end', words[2]]], headOf(edge.data)),
      row('route', words[3], [['straight', words[4]], ['bent', words[5]]], routeOf(edge.data)),
      h('p', { className: 'nds-connector-hint' }, words[6]));
  }

  window.ndsProductionConnectors = Object.freeze({ install, defaults, route, marker, dropHandles, panel });
})();
