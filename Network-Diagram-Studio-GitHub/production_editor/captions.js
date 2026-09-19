(function () {
  'use strict';

  const COPY = {
    en: ['Type caption', 'Double-click to edit type caption', 'Use default caption', 'Leave empty to hide. This does not change the resource type.', 'Default', 'Custom', 'Hidden'],
    ja: ['\u7a2e\u985e\u306e\u8868\u793a\u540d', '\u30c0\u30d6\u30eb\u30af\u30ea\u30c3\u30af\u3067\u7a2e\u985e\u306e\u8868\u793a\u540d\u3092\u7de8\u96c6', '\u65e2\u5b9a\u306e\u8868\u793a\u540d\u3092\u4f7f\u7528', '\u7a7a\u6b04\u3067\u975e\u8868\u793a\u3002\u30ea\u30bd\u30fc\u30b9\u306e\u7a2e\u985e\u306f\u5909\u308f\u308a\u307e\u305b\u3093\u3002', '\u65e2\u5b9a', '\u30ab\u30b9\u30bf\u30e0', '\u975e\u8868\u793a'],
    de: ['Typbeschriftung', 'Doppelklicken, um die Typbeschriftung zu bearbeiten', 'Standardbeschriftung verwenden', 'Zum Ausblenden leer lassen. Der Ressourcentyp bleibt unver\u00e4ndert.', 'Standard', 'Benutzerdefiniert', 'Ausgeblendet'],
    es: ['R\u00f3tulo de tipo', 'Haz doble clic para editar el r\u00f3tulo de tipo', 'Usar r\u00f3tulo predeterminado', 'D\u00e9jalo vac\u00edo para ocultarlo. No cambia el tipo de recurso.', 'Predeterminado', 'Personalizado', 'Oculto'],
    fr: ['Libell\u00e9 du type', 'Double-cliquez pour modifier le libell\u00e9 du type', 'Utiliser le libell\u00e9 par d\u00e9faut', 'Laissez vide pour masquer. Le type de ressource reste inchang\u00e9.', 'Par d\u00e9faut', 'Personnalis\u00e9', 'Masqu\u00e9'],
    pt: ['Legenda do tipo', 'Clique duas vezes para editar a legenda do tipo', 'Usar legenda padr\u00e3o', 'Deixe vazio para ocultar. O tipo de recurso n\u00e3o muda.', 'Padr\u00e3o', 'Personalizado', 'Oculto'],
    ko: ['\uc720\ud615 \ucea1\uc158', '\ub450 \ubc88 \ud074\ub9ad\ud558\uc5ec \uc720\ud615 \ucea1\uc158 \ud3b8\uc9d1', '\uae30\ubcf8 \ucea1\uc158 \uc0ac\uc6a9', '\ube44\uc6cc \ub450\uba74 \uc228\uaca8\uc9d1\ub2c8\ub2e4. \ub9ac\uc18c\uc2a4 \uc720\ud615\uc740 \ubcc0\uacbd\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.', '\uae30\ubcf8\uac12', '\uc0ac\uc6a9\uc790 \uc9c0\uc815', '\uc228\uae40'],
    zh: ['\u7c7b\u578b\u6807\u9898', '\u53cc\u51fb\u7f16\u8f91\u7c7b\u578b\u6807\u9898', '\u4f7f\u7528\u9ed8\u8ba4\u6807\u9898', '\u7559\u7a7a\u5373\u53ef\u9690\u85cf\u3002\u4e0d\u4f1a\u66f4\u6539\u8d44\u6e90\u7c7b\u578b\u3002', '\u9ed8\u8ba4', '\u81ea\u5b9a\u4e49', '\u5df2\u9690\u85cf']
  };
  let native;
  const stop = event => event.stopPropagation();
  const valueOf = (data, fallback) => data.typeCaption ?? data.typeLabel ?? fallback;
  const lineCache = new Map();

  function lineCount(text, boxWidth, factor) {
    if (!text || boxWidth <= 24) return 1;
    const fontSize = 12 * factor;
    const fontFamily = getComputedStyle(document.body).fontFamily;
    const key = JSON.stringify([text, boxWidth, fontSize, fontFamily]);
    if (lineCache.has(key)) return lineCache.get(key);
    // Native average-width estimates undercount wide glyphs and word wrapping.
    // Measure only explicit captions, with the actual label's CSS and chrome.
    const probe = document.createElement('div');
    Object.assign(probe.style, {
      position: 'fixed', visibility: 'hidden', pointerEvents: 'none',
      left: '0', top: '0', width: Math.max(1, boxWidth - 24) + 'px',
      padding: '0', border: '0', margin: '0',
      fontFamily, fontSize: fontSize + 'px', fontWeight: '600',
      lineHeight: '1.25', letterSpacing: '.025em', textTransform: 'uppercase',
      whiteSpace: 'normal', overflowWrap: 'anywhere'
    });
    probe.textContent = text;
    document.body.appendChild(probe);
    const lines = Math.max(1, Math.ceil(probe.getBoundingClientRect().height / (fontSize * 1.25) - .01));
    probe.remove();
    if (lineCache.size >= 256) lineCache.clear();
    lineCache.set(key, lines);
    return lines;
  }

  function install(bridge) {
    if (!bridge?.React?.createElement || !bridge.store?.getState ||
        typeof bridge.refit !== 'function' || typeof bridge.resourceType !== 'function') {
      throw new Error('Production captions require the native React, store and sizing bridge.');
    }
    native = bridge;
  }

  function useWords() {
    const lang = window.__nds_i18nStore(state => state.lang);
    return COPY[lang] || COPY.en;
  }

  function write(id, caption) {
    if (caption !== undefined && typeof caption !== 'string') throw new Error('Invalid type caption.');
    const state = native.store.getState();
    const node = state.diagram.nodes.find(item => item.id === id);
    if (!node) throw new Error('The caption resource no longer exists.');
    if (node.data.typeCaption === caption) return;
    const data = { typeCaption: caption };
    const nodes = state.diagram.nodes.map(item => item.id === id ? { ...item, data: { ...item.data, ...data } } : item);
    const fitted = native.refit(nodes, id).find(item => item.id === id);
    // The existing native mutation owns undo, timestamps and persistence.
    // Unlike typeLabel, this optional display field survives icon replacement.
    state.updateNode(id, { data, ...(fitted.size ? { size: fitted.size } : {}) });
  }

  function Caption({ id, data, fontSize }) {
    const { createElement: h, useState, useEffect, useRef } = native.React;
    const words = useWords();
    const value = valueOf(data, native.resourceType(data.typeSlug).label);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const input = useRef(null);
    const active = useRef(false);
    const dirty = useRef(false);
    useEffect(() => {
      if (editing) {
        input.current?.focus();
        input.current?.select();
      }
    }, [editing]);
    function finish(save) {
      if (!active.current) return;
      active.current = false;
      if (save && dirty.current) write(id, draft.trim());
      dirty.current = false;
      setEditing(false);
    }
    if (!editing && value === '') return null;
    return h('div', {
      className: 'nds-type-caption nodrag nopan font-semibold uppercase tracking-wide leading-tight',
      'data-nds-type-caption': id,
      style: { color: 'var(--color-slate-500)', fontSize },
      title: words[1],
      onPointerDown: stop, onMouseDown: stop, onClick: stop,
      onDoubleClick: event => {
        event.stopPropagation();
        native.store.getState().selectNode(id);
        setDraft(value);
        active.current = true;
        dirty.current = false;
        setEditing(true);
      }
    }, editing ? h('input', {
      ref: input, type: 'text', value: draft,
      'aria-label': words[0], 'data-nds-caption-inline': id,
      className: 'nds-caption-input nds-caption-inline',
      onChange: event => { dirty.current = true; setDraft(event.target.value); },
      onBlur: () => finish(true),
      onKeyDown: event => {
        event.stopPropagation();
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          finish(event.key === 'Enter');
        }
      },
      onPointerDown: stop, onMouseDown: stop, onClick: stop, onDoubleClick: stop
    }) : value);
  }

  function Panel({ node }) {
    const { createElement: h, useState, useEffect, useRef } = native.React;
    const words = useWords();
    const value = valueOf(node.data, native.resourceType(node.type).label);
    const [draft, setDraft] = useState(value);
    const dirty = useRef(false);
    useEffect(() => {
      dirty.current = false;
      setDraft(value);
    }, [node.id, value]);
    const status = node.data.typeCaption === undefined ? words[4] : value === '' ? words[6] : words[5];
    function finish(save) {
      if (dirty.current && save) {
        write(node.id, draft.trim());
        setDraft(draft.trim());
      }
      if (!save) setDraft(value);
      dirty.current = false;
    }
    return h('section', { className: 'nds-caption-panel', 'data-nds-caption-panel': node.id },
      h('div', { className: 'nds-caption-heading' },
        h('label', { htmlFor: 'nds-type-caption-' + node.id }, words[0]),
        h('span', { className: 'nds-caption-status' }, status)),
      h('input', {
        id: 'nds-type-caption-' + node.id, type: 'text', value: draft,
        'data-nds-caption-input': node.id, className: 'nds-caption-input',
        'aria-describedby': 'nds-caption-hint-' + node.id,
        onChange: event => { dirty.current = true; setDraft(event.target.value); },
        onBlur: () => finish(true),
        onKeyDown: event => {
          event.stopPropagation();
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault();
            finish(event.key === 'Enter');
            event.currentTarget.blur();
          }
        }
      }),
      h('div', { className: 'nds-caption-footer' },
        h('p', { id: 'nds-caption-hint-' + node.id }, words[3]),
        h('button', {
          type: 'button', 'data-nds-caption-reset': node.id,
          disabled: node.data.typeCaption === undefined && !dirty.current,
          onMouseDown: event => event.preventDefault(),
          onClick: () => {
            dirty.current = false;
            setDraft(node.data.typeLabel ?? native.resourceType(node.type).label);
            write(node.id, undefined);
          }
        }, words[2])));
  }

  const caption = props => native.React.createElement(Caption, { ...props, key: props.id });
  const panel = node => native.React.createElement(Panel, { node, key: node.id });
  window.ndsProductionCaptions = Object.freeze({ install, caption, panel, lineCount });
})();
