/*
 * Azure resource IDs — inspector block plus drawer.
 *
 * Shows the full ARM resource ID of the selected node and of every node nested
 * inside it. IDs that came through verbatim from an imported template are
 * tagged FROM TEMPLATE; IDs assembled from the subscription and resource group
 * the operator typed are tagged DERIVED, because an exported template.json
 * carries no scope of its own and the import engine never infers one.
 */
(function () {
  'use strict';
  if (window.ndsArmResourceIds) return;

  const messages = {
    en: {
      heading: 'Azure resource IDs', show: 'Show {n} resource IDs', showOne: 'Show resource ID',
      copyAll: 'Copy all', copy: 'Copy', copied: 'Copied', close: 'Close',
      insideHint: 'Every resource inside this {label}, including itself.',
      selfHint: 'The resource ID for this {label}.',
      count: '{n} resources', countOne: '1 resource',
      derived: 'DERIVED', template: 'FROM TEMPLATE',
      foot: 'Placeholders in braces were not in the template. Re-import with a Subscription ID to fill them in.',
      footFound: 'The subscription was read from a resource reference in the template, not supplied. Confirm it is the subscription that hosts this resource group.',
      empty: 'This resource has no Azure resource ID. Import a template.json to add them.'
    },
    ja: {
      heading: 'Azure リソース ID', show: '{n} 件のリソース ID を表示', showOne: 'リソース ID を表示',
      copyAll: 'すべてコピー', copy: 'コピー', copied: 'コピーしました', close: '閉じる',
      insideHint: 'この{label}内のすべてのリソース (自身を含む)。',
      selfHint: 'この{label}のリソース ID。',
      count: '{n} 件のリソース', countOne: '1 件のリソース',
      derived: '推定', template: 'テンプレート由来',
      foot: '波かっこのプレースホルダーはテンプレートに含まれていません。サブスクリプション ID を入力して再インポートすると補完されます。',
      footFound: 'サブスクリプションは入力値ではなく、テンプレート内のリソース参照から読み取った値です。このリソースグループを保持するサブスクリプションかご確認ください。',
      empty: 'このリソースには Azure リソース ID がありません。template.json をインポートしてください。'
    },
    es: {
      heading: 'ID de recursos de Azure', show: 'Mostrar {n} ID de recursos', showOne: 'Mostrar ID de recurso',
      copyAll: 'Copiar todo', copy: 'Copiar', copied: 'Copiado', close: 'Cerrar',
      insideHint: 'Todos los recursos dentro de este {label}, incluido él mismo.',
      selfHint: 'El ID de recurso de este {label}.',
      count: '{n} recursos', countOne: '1 recurso',
      derived: 'DERIVADO', template: 'DE LA PLANTILLA',
      foot: 'Los marcadores entre llaves no estaban en la plantilla. Vuelve a importar con un ID de suscripción para completarlos.',
      footFound: 'La suscripción se leyó de una referencia de recurso en la plantilla, no se introdujo. Confirma que es la suscripción que aloja este grupo de recursos.',
      empty: 'Este recurso no tiene ID de recurso de Azure. Importa un template.json para añadirlos.'
    },
    fr: {
      heading: 'ID de ressources Azure', show: 'Afficher {n} ID de ressources', showOne: 'Afficher l’ID de ressource',
      copyAll: 'Tout copier', copy: 'Copier', copied: 'Copié', close: 'Fermer',
      insideHint: 'Toutes les ressources dans ce {label}, y compris lui-même.',
      selfHint: 'L’ID de ressource de ce {label}.',
      count: '{n} ressources', countOne: '1 ressource',
      derived: 'DÉDUIT', template: 'DU MODÈLE',
      foot: 'Les espaces réservés entre accolades ne figuraient pas dans le modèle. Réimportez avec un ID d’abonnement pour les compléter.',
      footFound: 'L’abonnement a été lu dans une référence de ressource du modèle, il n’a pas été saisi. Vérifiez qu’il héberge bien ce groupe de ressources.',
      empty: 'Cette ressource n’a pas d’ID de ressource Azure. Importez un template.json pour les ajouter.'
    },
    de: {
      heading: 'Azure-Ressourcen-IDs', show: '{n} Ressourcen-IDs anzeigen', showOne: 'Ressourcen-ID anzeigen',
      copyAll: 'Alle kopieren', copy: 'Kopieren', copied: 'Kopiert', close: 'Schließen',
      insideHint: 'Alle Ressourcen in diesem {label}, einschließlich sich selbst.',
      selfHint: 'Die Ressourcen-ID dieses {label}.',
      count: '{n} Ressourcen', countOne: '1 Ressource',
      derived: 'ABGELEITET', template: 'AUS VORLAGE',
      foot: 'Platzhalter in geschweiften Klammern fehlten in der Vorlage. Mit einer Abonnement-ID erneut importieren, um sie zu füllen.',
      footFound: 'Das Abonnement stammt aus einem Ressourcenverweis in der Vorlage und wurde nicht eingegeben. Prüfen Sie, ob es diese Ressourcengruppe enthält.',
      empty: 'Diese Ressource hat keine Azure-Ressourcen-ID. Importieren Sie eine template.json, um sie hinzuzufügen.'
    },
    pt: {
      heading: 'IDs de recursos do Azure', show: 'Mostrar {n} IDs de recursos', showOne: 'Mostrar ID do recurso',
      copyAll: 'Copiar tudo', copy: 'Copiar', copied: 'Copiado', close: 'Fechar',
      insideHint: 'Todos os recursos dentro deste {label}, incluindo ele mesmo.',
      selfHint: 'O ID de recurso deste {label}.',
      count: '{n} recursos', countOne: '1 recurso',
      derived: 'DERIVADO', template: 'DO MODELO',
      foot: 'Os espaços reservados entre chaves não estavam no modelo. Importe novamente com um ID de assinatura para preenchê-los.',
      footFound: 'A assinatura foi lida de uma referência de recurso no modelo, não informada. Confirme que é a assinatura que hospeda este grupo de recursos.',
      empty: 'Este recurso não tem ID de recurso do Azure. Importe um template.json para adicioná-los.'
    },
    zh: {
      heading: 'Azure 资源 ID', show: '显示 {n} 个资源 ID', showOne: '显示资源 ID',
      copyAll: '全部复制', copy: '复制', copied: '已复制', close: '关闭',
      insideHint: '此{label}内的所有资源（包括其自身）。',
      selfHint: '此{label}的资源 ID。',
      count: '{n} 个资源', countOne: '1 个资源',
      derived: '推导', template: '来自模板',
      foot: '花括号中的占位符不在模板中。填写订阅 ID 后重新导入即可补全。',
      footFound: '该订阅是从模板中的资源引用读取的，并非手动填写。请确认它就是承载此资源组的订阅。',
      empty: '此资源没有 Azure 资源 ID。请导入 template.json 以添加。'
    },
    ko: {
      heading: 'Azure 리소스 ID', show: '리소스 ID {n}개 표시', showOne: '리소스 ID 표시',
      copyAll: '모두 복사', copy: '복사', copied: '복사됨', close: '닫기',
      insideHint: '이 {label} 안의 모든 리소스(자신 포함).',
      selfHint: '이 {label}의 리소스 ID입니다.',
      count: '리소스 {n}개', countOne: '리소스 1개',
      derived: '추정', template: '템플릿 제공',
      foot: '중괄호 자리 표시자는 템플릿에 없었습니다. 구독 ID를 입력해 다시 가져오면 채워집니다.',
      footFound: '구독 ID는 입력값이 아니라 템플릿의 리소스 참조에서 읽은 값입니다. 이 리소스 그룹을 호스팅하는 구독이 맞는지 확인하세요.',
      empty: '이 리소스에는 Azure 리소스 ID가 없습니다. template.json을 가져오세요.'
    }
  };

  let bridge = null;
  let drawer = null;
  let drawerNodeId = null;
  let unsubscribe = null;

  const text = (key) => (messages[window.__nds_i18nStore?.getState().lang] || messages.en)[key] || messages.en[key];
  const fill = (key, values) => text(key).replace(/\{(\w+)\}/g, (match, name) =>
    (Object.prototype.hasOwnProperty.call(values, name) ? values[name] : match));

  /* The import records how the subscription was resolved on its root node. */
  function scopeOf(nodeId) {
    const all = nodes();
    const byId = new Map(all.map((node) => [node.id, node]));
    const guard = new Set();
    let current = byId.get(nodeId);
    while (current && !guard.has(current.id)) {
      guard.add(current.id);
      if (current.data?.armScope) return current.data.armScope;
      current = current.parent ? byId.get(current.parent) : null;
    }
    return all.find((node) => node.data?.armScope)?.data.armScope || '';
  }

  function nodes() {
    return bridge?.store?.getState().diagram?.nodes || [];
  }

  function label(node) {
    if (node.data?.typeLabel) return node.data.typeLabel;
    const resolved = bridge?.resourceType?.(node.type);
    return resolved?.label || node.type || '';
  }

  /* Selected node first, then every node nested inside it, in tree order.
     Each node contributes its own ID plus any IDs the layout folded into it. */
  function shortType(type) {
    const parts = String(type || '').split('/');
    return parts.length > 1 ? parts[parts.length - 1] : String(type || '');
  }

  function entriesFor(node, isSelf) {
    const out = [];
    if (typeof node.data?.armId === 'string' && node.data.armId) {
      out.push({
        key: node.id, label: label(node), name: node.data.name || '',
        armId: node.data.armId, origin: node.data.armOrigin, self: isSelf
      });
    }
    let extra = [];
    try { extra = JSON.parse(node.data?.armExtra || '[]'); } catch { extra = []; }
    if (Array.isArray(extra)) {
      for (const item of extra) {
        if (!item || typeof item.i !== 'string' || !item.i) continue;
        out.push({
          key: node.id + '|' + item.i, label: shortType(item.t),
          name: item.i.split('/').at(-1), armId: item.i, origin: item.o, self: false
        });
      }
    }
    return out;
  }

  function collect(nodeId) {
    const all = nodes();
    const byId = new Map(all.map((node) => [node.id, node]));
    const children = new Map();
    for (const node of all) {
      const parent = node.parent || null;
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent).push(node);
    }
    const found = [];
    const seen = new Set();
    const ids = new Set();
    const walk = (id) => {
      if (seen.has(id)) return;
      seen.add(id);
      const node = byId.get(id);
      if (node) {
        for (const entry of entriesFor(node, id === nodeId)) {
          if (ids.has(entry.armId)) continue;
          ids.add(entry.armId);
          found.push(entry);
        }
      }
      for (const child of children.get(id) || []) walk(child.id);
    };
    walk(nodeId);
    return found;
  }

  async function copy(value, button) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch {
      /* file:// and insecure origins reject the async clipboard; fall back. */
      const holder = document.createElement('textarea');
      holder.value = value;
      holder.setAttribute('readonly', '');
      holder.style.cssText = 'position:fixed;top:-1000px;opacity:0';
      document.body.appendChild(holder);
      holder.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      holder.remove();
    }
    if (!ok || !button) return;
    const previous = button.dataset.ndsRidLabel || button.textContent;
    button.dataset.ndsRidLabel = previous;
    button.textContent = text('copied');
    button.classList.add('is-copied');
    clearTimeout(Number(button.dataset.ndsRidTimer));
    button.dataset.ndsRidTimer = String(setTimeout(() => {
      button.textContent = button.dataset.ndsRidLabel || previous;
      button.classList.remove('is-copied');
    }, 1400));
  }

  /* Placeholders such as {subscriptionId} are highlighted so a reader can see
     at a glance which part of the ID is not evidence from the template. */
  function renderId(target, value) {
    target.textContent = '';
    for (const part of String(value).split(/(\{[A-Za-z]+\})/)) {
      if (!part) continue;
      if (/^\{[A-Za-z]+\}$/.test(part)) {
        const mark = document.createElement('mark');
        mark.className = 'nds-rid-placeholder';
        mark.textContent = part;
        target.appendChild(mark);
      } else {
        target.appendChild(document.createTextNode(part));
      }
    }
  }

  function buildDrawer() {
    const root = document.createElement('section');
    root.className = 'nds-rid-drawer';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'false');
    root.innerHTML = '<header class="nds-rid-drawer-head">'
      + '<h2 class="nds-rid-drawer-title"></h2>'
      + '<button type="button" class="nds-rid-close" aria-label="Close">&#10005;</button>'
      + '</header>'
      + '<div class="nds-rid-bar"><button type="button" class="nds-rid-copy-all"></button>'
      + '<span class="nds-rid-count"></span></div>'
      + '<div class="nds-rid-list" tabindex="0"></div>'
      + '<footer class="nds-rid-foot"></footer>';
    root.querySelector('.nds-rid-close').addEventListener('click', closeDrawer);
    root.querySelector('.nds-rid-copy-all').addEventListener('click', (event) => {
      const list = collect(drawerNodeId).map((entry) => entry.armId).join('\r\n');
      void copy(list, event.currentTarget);
    });
    document.body.appendChild(root);
    return root;
  }

  function paintDrawer() {
    if (!drawer) return;
    const node = nodes().find((item) => item.id === drawerNodeId);
    if (!node) { closeDrawer(); return; }
    const found = collect(drawerNodeId);
    if (!found.length) { closeDrawer(); return; }

    const title = [text('heading'), label(node), node.data?.name].filter(Boolean).join(' \u00B7 ');
    drawer.querySelector('.nds-rid-drawer-title').textContent = title;
    drawer.setAttribute('aria-label', title);
    drawer.querySelector('.nds-rid-close').setAttribute('aria-label', text('close'));
    const copyAll = drawer.querySelector('.nds-rid-copy-all');
    copyAll.textContent = text('copyAll');
    delete copyAll.dataset.ndsRidLabel;
    drawer.querySelector('.nds-rid-count').textContent = found.length === 1
      ? text('countOne') : fill('count', { n: found.length });
    const foot = drawer.querySelector('.nds-rid-foot');
    const unresolved = found.some((entry) => entry.armId.includes('{'));
    const scope = scopeOf(drawerNodeId);
    foot.textContent = text(unresolved ? 'foot' : 'footFound');
    foot.hidden = !unresolved && scope !== 'discovered';

    const list = drawer.querySelector('.nds-rid-list');
    list.textContent = '';
    for (const entry of found) {
      const row = document.createElement('div');
      row.className = 'nds-rid-row' + (entry.self ? ' is-self' : '');

      const head = document.createElement('div');
      head.className = 'nds-rid-row-head';

      const type = document.createElement('span');
      type.className = 'nds-rid-type';
      type.textContent = [entry.label, entry.name].filter(Boolean).join(' \u00B7 ');
      head.appendChild(type);

      const tag = document.createElement('span');
      const fromTemplate = entry.origin === 'template';
      tag.className = 'nds-rid-tag ' + (fromTemplate ? 'is-template' : 'is-derived');
      tag.textContent = text(fromTemplate ? 'template' : 'derived');
      head.appendChild(tag);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nds-rid-row-copy';
      button.textContent = text('copy');
      button.addEventListener('click', (event) => void copy(entry.armId, event.currentTarget));
      head.appendChild(button);

      const code = document.createElement('code');
      code.className = 'nds-rid-id';
      renderId(code, entry.armId);

      row.append(head, code);
      list.appendChild(row);
    }
  }

  function onKey(event) {
    if (event.key === 'Escape' && drawer) { event.stopPropagation(); closeDrawer(); }
  }

  function openDrawer(nodeId) {
    drawerNodeId = nodeId;
    if (!drawer) {
      drawer = buildDrawer();
      document.addEventListener('keydown', onKey, true);
      unsubscribe = bridge.store.subscribe((state) => {
        if (state.selectedNodeId && state.selectedNodeId !== drawerNodeId) drawerNodeId = state.selectedNodeId;
        paintDrawer();
      });
    }
    paintDrawer();
    drawer?.querySelector('.nds-rid-list')?.focus({ preventScroll: true });
  }

  function closeDrawer() {
    unsubscribe?.();
    unsubscribe = null;
    document.removeEventListener('keydown', onKey, true);
    drawer?.remove();
    drawer = null;
    drawerNodeId = null;
  }

  function install(incoming) {
    bridge = incoming;
    document.documentElement.classList.add('nds-rid-ready');
  }

  /* Rendered inside the inspector, below Notes. Returns null when the selected
     node has no ID, so hand-drawn diagrams are untouched. */
  function panel(node) {
    const React = bridge?.React;
    if (!React || !node) return null;
    const found = collect(node.id);
    if (!found.length) return null;
    const create = React.createElement;
    const count = found.length;
    const name = label(node) || '';
    return create('div', { className: 'nds-rid-block', key: 'nds-rid' }, [
      create('div', { className: 'nds-rid-block-head', key: 'h' },
        text('heading') + ' (' + count + ')'),
      create('div', { className: 'nds-rid-block-actions', key: 'a' }, [
        create('button', {
          type: 'button', key: 'show', className: 'nds-rid-block-show',
          onClick: () => openDrawer(node.id)
        }, count === 1 ? text('showOne') : fill('show', { n: count })),
        create('button', {
          type: 'button', key: 'copy', className: 'nds-rid-block-copy',
          onClick: (event) => void copy(found.map((entry) => entry.armId).join('\r\n'), event.currentTarget)
        }, text('copyAll'))
      ]),
      create('p', { className: 'nds-rid-block-hint', key: 'p' },
        count === 1 ? fill('selfHint', { label: name }) : fill('insideHint', { label: name }))
    ]);
  }

  window.ndsArmResourceIds = { install, panel, collect, openDrawer, closeDrawer };
})();
