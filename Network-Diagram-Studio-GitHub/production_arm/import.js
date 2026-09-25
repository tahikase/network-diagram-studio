/* Production adapter: local worker, measured native cards, isolated import layout. */
(function () {
  'use strict';
  const messages = {
    en: {
      title: 'Import ARM template', short: 'Import ARM',
      intro: 'Turn an Azure Portal template.json export into an editable network diagram in a new tab.',
      stepsTitle: 'Steps', exportSteps: ['Azure Portal', 'Resource groups', 'Select a resource group', 'Automation → Export template → ARM Template → Download', 'Extract the ZIP, then choose template.json'],
      choose: 'Choose template.json', none: 'No file selected', group: 'Resource Group Name',
      subscription: 'Subscription ID (optional)',
      groupRequired: 'Enter a Resource Group Name.',
      start: 'Import', cancel: 'Cancel', close: 'View diagram', retry: 'Choose another file',
      progress: 'Import progress', read: 'Reading file', parse: 'Reading ARM structure',
      resolve: 'Resolving resource references', topology: 'Building network topology',
      layout: 'Arranging resources', verify: 'Preparing diagram', ready: 'Diagram ready',
      elapsed: 'Elapsed', progressHelp: 'Completed stages are shown over at least 2.5 seconds; this is not a time estimate.',
      report: 'Import summary', details: 'Details saved to Notes (English)',
      counts: '{resources} exported resources / {nodes} diagram objects / {edges} connections',
      fileError: 'Choose a non-empty JSON template, up to 10 MiB.',
      engineError: 'The ARM importer could not start. Reload this production page and try again.',
      workerError: 'Local processing was interrupted or blocked by browser policy. Your existing work was not replaced.',
      layoutError: 'The diagram could not be arranged safely. Import was rolled back; your previous tab is unchanged.',
      timeout: 'This import exceeded the processing limit. Export a smaller selection of resources and try again.',
      reportFallback: 'No additional details.'
    },
    ja: {
      title: 'ARM テンプレートのインポート', short: 'ARM インポート',
      intro: 'Azure Portal の template.json を、新しいタブの編集可能なネットワーク図に変換します。',
      stepsTitle: '手順', exportSteps: ['Azure Portal', 'Resource groups', 'リソースグループを選択', 'Automation → Export template → ARM Template → Download', 'ZIP を展開し、template.json を選択'],
      choose: 'template.json を選択', none: 'ファイル未選択', group: 'リソースグループ名',
      subscription: 'サブスクリプション ID (任意)',
      groupRequired: 'リソースグループ名を入力してください。',
      start: 'インポート', cancel: 'キャンセル', close: '図を表示', retry: '別のファイルを選択',
      progress: 'インポートの進行状況', read: 'ファイルを読み込み中', parse: 'ARM 構造を解析中',
      resolve: 'リソース参照を解決中', topology: 'ネットワーク構成を作成中', layout: 'リソースを配置中', verify: '図を準備中', ready: '図を作成しました',
      elapsed: '経過時間', progressHelp: '完了した段階を最低 2.5 秒かけて表示します。所要時間の予測ではありません。',
      report: 'インポートの概要', details: '詳細を Notes に保存（英語）',
      counts: 'エクスポート {resources} リソース / 図 {nodes} オブジェクト / {edges} 接続',
      fileError: '空でない JSON テンプレートを選択してください（最大 10 MiB）。',
      engineError: 'インポーターを起動できません。この非運用ページを再読み込みしてください。',
      workerError: 'ブラウザーによりローカル処理が中断または制限されました。既存の作業は置き換えていません。',
      layoutError: '安全に配置できなかったため、インポートを取り消しました。元のタブは変更されていません。',
      timeout: '処理時間の上限を超えました。リソースを絞ってエクスポートしてください。', reportFallback: '追加情報はありません。'
    },
    es: { title: 'Importar plantilla ARM', short: 'Importar ARM', intro: 'Convierte template.json de Azure Portal en un diagrama editable en una pestaña nueva.', choose: 'Elegir template.json', none: 'Ningún archivo seleccionado', group: 'Nombre del grupo de recursos', start: 'Importar', cancel: 'Cancelar', close: 'Ver diagrama', retry: 'Elegir otro archivo', progress: 'Progreso de importación', read: 'Leyendo archivo', parse: 'Leyendo estructura ARM', resolve: 'Resolviendo referencias', topology: 'Creando topología', layout: 'Organizando recursos', verify: 'Preparando diagrama', ready: 'Diagrama listo', elapsed: 'Tiempo transcurrido', report: 'Resumen de importación', details: 'Detalles guardados en Notes (inglés)', counts: '{resources} recursos exportados / {nodes} objetos / {edges} conexiones' },
    fr: { title: 'Importer un modèle ARM', short: 'Importer ARM', intro: 'Transformez template.json d’Azure Portal en diagramme modifiable dans un nouvel onglet.', choose: 'Choisir template.json', none: 'Aucun fichier sélectionné', group: 'Nom du groupe de ressources', start: 'Importer', cancel: 'Annuler', close: 'Afficher le diagramme', retry: 'Choisir un autre fichier', progress: 'Progression de l’importation', read: 'Lecture du fichier', parse: 'Lecture de la structure ARM', resolve: 'Résolution des références', topology: 'Création de la topologie', layout: 'Disposition des ressources', verify: 'Préparation du diagramme', ready: 'Diagramme prêt', elapsed: 'Temps écoulé', report: 'Résumé de l’importation', details: 'Détails enregistrés dans Notes (anglais)', counts: '{resources} ressources exportées / {nodes} objets / {edges} connexions' },
    de: { title: 'ARM-Vorlage importieren', short: 'ARM importieren', intro: 'template.json aus Azure Portal wird in einem neuen Tab als bearbeitbares Netzwerkdiagramm geöffnet.', choose: 'template.json auswählen', none: 'Keine Datei ausgewählt', group: 'Ressourcengruppenname', start: 'Importieren', cancel: 'Abbrechen', close: 'Diagramm anzeigen', retry: 'Andere Datei auswählen', progress: 'Importfortschritt', read: 'Datei wird gelesen', parse: 'ARM-Struktur wird gelesen', resolve: 'Referenzen werden aufgelöst', topology: 'Topologie wird erstellt', layout: 'Ressourcen werden angeordnet', verify: 'Diagramm wird vorbereitet', ready: 'Diagramm bereit', elapsed: 'Verstrichene Zeit', report: 'Importübersicht', details: 'Details in Notes gespeichert (Englisch)', counts: '{resources} exportierte Ressourcen / {nodes} Objekte / {edges} Verbindungen' },
    pt: { title: 'Importar modelo ARM', short: 'Importar ARM', intro: 'Transforme template.json do Azure Portal em um diagrama editável em uma nova aba.', choose: 'Escolher template.json', none: 'Nenhum arquivo selecionado', group: 'Nome do grupo de recursos', start: 'Importar', cancel: 'Cancelar', close: 'Ver diagrama', retry: 'Escolher outro arquivo', progress: 'Progresso da importação', read: 'Lendo arquivo', parse: 'Lendo estrutura ARM', resolve: 'Resolvendo referências', topology: 'Criando topologia', layout: 'Organizando recursos', verify: 'Preparando diagrama', ready: 'Diagrama pronto', elapsed: 'Tempo decorrido', report: 'Resumo da importação', details: 'Detalhes salvos em Notes (inglês)', counts: '{resources} recursos exportados / {nodes} objetos / {edges} conexões' },
    zh: { title: '导入 ARM 模板', short: '导入 ARM', intro: '将 Azure Portal 导出的 template.json 转换为新选项卡中的可编辑网络图。', choose: '选择 template.json', none: '未选择文件', group: '资源组名称', start: '导入', cancel: '取消', close: '查看图表', retry: '选择其他文件', progress: '导入进度', read: '正在读取文件', parse: '正在解析 ARM 结构', resolve: '正在解析资源引用', topology: '正在构建网络拓扑', layout: '正在排列资源', verify: '正在准备图表', ready: '图表已就绪', elapsed: '已用时间', report: '导入摘要', details: '详细信息已保存到 Notes（英文）', counts: '{resources} 个导出资源 / {nodes} 个图形对象 / {edges} 个连接' },
    ko: { title: 'ARM 템플릿 가져오기', short: 'ARM 가져오기', intro: 'Azure Portal의 template.json을 새 탭에서 편집 가능한 네트워크 다이어그램으로 변환합니다.', choose: 'template.json 선택', none: '선택한 파일 없음', group: '리소스 그룹 이름', start: '가져오기', cancel: '취소', close: '다이어그램 보기', retry: '다른 파일 선택', progress: '가져오기 진행률', read: '파일 읽는 중', parse: 'ARM 구조 읽는 중', resolve: '리소스 참조 확인 중', topology: '네트워크 토폴로지 생성 중', layout: '리소스 배치 중', verify: '다이어그램 준비 중', ready: '다이어그램 준비 완료', elapsed: '경과 시간', report: '가져오기 요약', details: 'Notes에 세부 정보 저장됨(영어)', counts: '내보낸 리소스 {resources}개 / 개체 {nodes}개 / 연결 {edges}개' }
  };
  const guidance = {
    es: {
      stepsTitle: 'Pasos', exportSteps: ['Azure Portal', 'Resource groups', 'Selecciona un grupo de recursos', 'Automation → Export template → ARM Template → Download', 'Extrae el ZIP y elige template.json'],
      groupRequired: 'Introduce un nombre de grupo de recursos.',
      subscription: 'ID de suscripción (opcional)',
      progressHelp: 'Las etapas completadas se muestran durante al menos 2,5 segundos; no es una estimación de tiempo.',
      fileError: 'Elige una plantilla JSON no vacía de hasta 10 MiB.', engineError: 'No se pudo iniciar el importador. Recarga esta página de prueba.',
      workerError: 'El navegador interrumpió o bloqueó el procesamiento local. Tu trabajo anterior no se ha reemplazado.',
      layoutError: 'No se pudo organizar el diagrama de forma segura. Se revirtió la importación; la pestaña anterior no cambió.',
      timeout: 'Se superó el límite de procesamiento. Exporta una selección más pequeña.', reportFallback: 'No hay más detalles.'
    },
    fr: {
      stepsTitle: 'Étapes', exportSteps: ['Azure Portal', 'Resource groups', 'Sélectionnez un groupe de ressources', 'Automation → Export template → ARM Template → Download', 'Extrayez le ZIP, puis choisissez template.json'],
      groupRequired: 'Saisissez un nom de groupe de ressources.',
      subscription: 'ID d’abonnement (facultatif)',
      progressHelp: 'Les étapes terminées sont affichées sur au moins 2,5 secondes ; ce n’est pas une estimation de durée.',
      fileError: 'Choisissez un modèle JSON non vide de 10 MiB maximum.', engineError: 'L’importateur n’a pas démarré. Rechargez cette page de test.',
      workerError: 'Le navigateur a interrompu ou bloqué le traitement local. Votre travail précédent n’a pas été remplacé.',
      layoutError: 'Impossible de disposer le diagramme sans chevauchement. L’importation a été annulée ; l’onglet précédent est inchangé.',
      timeout: 'La limite de traitement a été dépassée. Exportez moins de ressources.', reportFallback: 'Aucun détail supplémentaire.'
    },
    de: {
      stepsTitle: 'Schritte', exportSteps: ['Azure Portal', 'Resource groups', 'Ressourcengruppe auswählen', 'Automation → Export template → ARM Template → Download', 'ZIP entpacken und template.json auswählen'],
      groupRequired: 'Geben Sie einen Ressourcengruppennamen ein.',
      subscription: 'Abonnement-ID (optional)',
      progressHelp: 'Abgeschlossene Schritte werden über mindestens 2,5 Sekunden angezeigt; dies ist keine Zeitschätzung.',
      fileError: 'Wählen Sie eine nicht leere JSON-Vorlage mit höchstens 10 MiB.', engineError: 'Der Importer konnte nicht starten. Laden Sie diese Testseite neu.',
      workerError: 'Der Browser hat die lokale Verarbeitung unterbrochen oder blockiert. Ihre bisherige Arbeit wurde nicht ersetzt.',
      layoutError: 'Das Diagramm konnte nicht sicher angeordnet werden. Der Import wurde zurückgenommen; der vorherige Tab ist unverändert.',
      timeout: 'Das Verarbeitungslimit wurde überschritten. Exportieren Sie weniger Ressourcen.', reportFallback: 'Keine weiteren Details.'
    },
    pt: {
      stepsTitle: 'Etapas', exportSteps: ['Azure Portal', 'Resource groups', 'Selecione um grupo de recursos', 'Automation → Export template → ARM Template → Download', 'Extraia o ZIP e escolha template.json'],
      groupRequired: 'Digite um nome de grupo de recursos.',
      subscription: 'ID da assinatura (opcional)',
      progressHelp: 'As etapas concluídas são mostradas por pelo menos 2,5 segundos; não é uma estimativa de tempo.',
      fileError: 'Escolha um modelo JSON não vazio de até 10 MiB.', engineError: 'Não foi possível iniciar o importador. Recarregue esta página de teste.',
      workerError: 'O navegador interrompeu ou bloqueou o processamento local. Seu trabalho anterior não foi substituído.',
      layoutError: 'Não foi possível organizar o diagrama com segurança. A importação foi revertida; a aba anterior não mudou.',
      timeout: 'O limite de processamento foi excedido. Exporte menos recursos.', reportFallback: 'Nenhum detalhe adicional.'
    },
    zh: {
      stepsTitle: '步骤', exportSteps: ['Azure Portal', 'Resource groups', '选择资源组', 'Automation → Export template → ARM Template → Download', '解压 ZIP 后选择 template.json'],
      groupRequired: '请输入资源组名称。',
      subscription: '订阅 ID（可选）',
      progressHelp: '已完成的阶段会在至少 2.5 秒内显示；这不是时间估计。',
      fileError: '请选择不超过 10 MiB 的非空 JSON 模板。', engineError: '无法启动导入器。请重新加载此非生产页面。',
      workerError: '浏览器中断或阻止了本地处理。未替换您已有的工作。',
      layoutError: '无法安全排列图表，已撤销导入。原选项卡保持不变。',
      timeout: '超出处理时间限制。请减少导出的资源数量。', reportFallback: '无其他详细信息。'
    },
    ko: {
      stepsTitle: '단계', exportSteps: ['Azure Portal', 'Resource groups', '리소스 그룹 선택', 'Automation → Export template → ARM Template → Download', 'ZIP 압축을 풀고 template.json을 선택'],
      groupRequired: '리소스 그룹 이름을 입력하세요.',
      subscription: '구독 ID (선택 사항)',
      progressHelp: '완료된 단계를 최소 2.5초 동안 표시합니다. 소요 시간 예측이 아닙니다.',
      fileError: '최대 10 MiB의 비어 있지 않은 JSON 템플릿을 선택하세요.', engineError: '가져오기를 시작하지 못했습니다. 이 비프로덕션 페이지를 새로 고치세요.',
      workerError: '브라우저가 로컬 처리를 중단하거나 차단했습니다. 기존 작업은 대체되지 않았습니다.',
      layoutError: '안전하게 배치하지 못해 가져오기를 취소했습니다. 이전 탭은 변경되지 않았습니다.',
      timeout: '처리 시간 제한을 초과했습니다. 더 적은 리소스를 내보내세요.', reportFallback: '추가 세부 정보가 없습니다.'
    }
  };
  for (const [language, strings] of Object.entries(guidance)) Object.assign(messages[language], strings);
  let dialog, opener, fileInput, selectedFile, worker, workerUrl, reader, timer, timeout;
  let busy = false, applying = false, succeeded = false, generation = 0, percent = 0, stage = 'read';
  let langStore, unsubscribeLanguage, rollback, cancelMinimum;
  let workPercent = 0, visibleStarted = 0, groupTouched = false;
  const frameWaiters = new Set();
  const MAX_BYTES = 10 * 1024 * 1024;
  const MIN_PROGRESS_MS = 2500;
  const byId = (suffix) => document.getElementById('nds-arm-' + suffix);
  const text = (key) => (messages[langStore?.getState().lang] || messages.en)[key] || messages.en[key];
  const setText = (id, key) => { byId(id).textContent = text(key); };
  const current = (token) => generation === token && busy && dialog.isConnected && dialog.open;
  const frame = () => new Promise((resolve) => {
    const finish = (active) => {
      cancelAnimationFrame(animation);
      clearTimeout(fallback);
      frameWaiters.delete(cancel);
      resolve(active);
    };
    const cancel = () => finish(false);
    const animation = requestAnimationFrame(() => finish(true));
    const fallback = setTimeout(() => finish(true), 100);
    frameWaiters.add(cancel);
  });
  function updateLanguage() {
    if (!dialog) return;
    opener.title = text('title');
    opener.setAttribute('aria-label', text('title'));
    opener.querySelector('.nds-arm-long').textContent = text('short');
    dialog.querySelectorAll('[data-arm-text]').forEach((el) => { el.textContent = text(el.dataset.armText); });
    renderExportSteps();
    setText('start', 'start');
    setText('cancel', succeeded ? 'close' : 'cancel');
    if (!selectedFile) setText('filename', 'none');
    byId('progress').setAttribute('aria-label', text('progress'));
    validateGroup();
    if (busy) paintProgress();
  }
  function renderExportSteps() {
    const list = byId('export');
    if (!list) return;
    const steps = text('exportSteps');
    list.replaceChildren(...(Array.isArray(steps) ? steps : [steps]).map((step) => {
      const item = document.createElement('li');
      item.textContent = step;
      return item;
    }));
  }
  function validateGroup() {
    const group = byId('group'), valid = !!group.value.trim();
    group.setCustomValidity(valid ? '' : text('groupRequired'));
    group.setAttribute('aria-invalid', String(!valid && groupTouched));
    byId('group-error').hidden = valid || !groupTouched;
    byId('start').disabled = busy || !selectedFile || !valid;
    return valid;
  }
  function paintProgress() {
    // Pace only already completed work. Time alone never advances past a real
    // stage, and 100 is reserved for a measured, ready-to-use native diagram.
    const cap = visibleStarted ? Math.min(99, 99 * (performance.now() - visibleStarted) / MIN_PROGRESS_MS) : 0;
    percent = Math.max(percent, Math.floor(Math.min(workPercent, cap)));
    renderProgress();
  }
  function showProgress(value, nextStage) {
    workPercent = Math.max(workPercent, Math.min(99, value));
    stage = nextStage;
    paintProgress();
  }
  function renderProgress() {
    byId('progress').setAttribute('aria-valuenow', String(percent));
    byId('percent').textContent = percent + '%';
    byId('ring').style.strokeDashoffset = String(264 * (1 - percent / 100));
    if (byId('stage').textContent !== text(stage)) byId('stage').textContent = text(stage);
  }
  function releaseWorker() {
    if (worker) worker.terminate();
    worker = null;
    if (workerUrl) URL.revokeObjectURL(workerUrl);
    workerUrl = null;
    clearTimeout(timeout);
    timeout = null;
  }
  function release() {
    releaseWorker();
    if (reader && reader.readyState === FileReader.LOADING) reader.abort();
    reader = null;
    clearInterval(timer);
    timer = null;
    for (const cancel of [...frameWaiters]) cancel();
    if (cancelMinimum) cancelMinimum();
  }
  function cancelOperation() {
    generation++;
    release();
    busy = applying = false;
    if (rollback) {
      const restore = rollback;
      rollback = null;
      restore();
    }
  }
  function minimumDisplay() {
    return new Promise((resolve) => {
      const finish = (active) => { clearTimeout(wait); cancelMinimum = null; resolve(active); };
      const wait = setTimeout(() => finish(true), Math.max(0, MIN_PROGRESS_MS - (performance.now() - visibleStarted)));
      cancelMinimum = () => finish(false);
    });
  }
  function resetView() {
    succeeded = false;
    byId('form').hidden = false;
    byId('progress').hidden = true;
    byId('result').hidden = true;
    byId('error').hidden = true;
    byId('start').hidden = false;
    validateGroup();
    setText('cancel', 'cancel');
  }
  function fail(message) {
    cancelOperation();
    resetView();
    byId('error').textContent = message;
    byId('error').hidden = false;
    byId('choose').focus();
  }
  function selectFile() {
    if (busy) return;
    fileInput.value = '';
    fileInput.click();
  }
  function open() {
    if (dialog.open || document.querySelector('dialog[open]')) return;
    groupTouched = false;
    resetView();
    dialog.showModal();
    selectFile();
  }
  function close() {
    cancelOperation();
    dialog.close();
    if (opener.isConnected) opener.focus();
  }
  function checkGeometry(diagram, measurementsOnly = false) {
    const nodes = new Map(diagram.nodes.map((n) => [n.id, n]));
    const elements = new Map(Array.from(document.querySelectorAll('.react-flow__node[data-id]'), (el) => [el.dataset.id, el]));
    const rectangles = new Map();
    for (const node of diagram.nodes) {
      const el = elements.get(node.id);
      if (!el || !node.size || node.size.w <= 0 || node.size.h <= 0) return false;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite)) return false;
      rectangles.set(node.id, rect);
    }
    if (measurementsOnly) return true;
    const ancestor = (id, target) => {
      for (let node = nodes.get(id), i = 0; node?.parent && i < nodes.size; i++) {
        if (node.parent === target) return true;
        node = nodes.get(node.parent);
      }
      return false;
    };
    for (let i = 0; i < diagram.nodes.length; i++) {
      const node = diagram.nodes[i], rect = rectangles.get(node.id);
      const headers = Array.from(elements.get(node.id).querySelectorAll('[data-nds-group-header]'), (el) => el.getBoundingClientRect());
      if (headers.some((h) => h.left < rect.left - .5 || h.right > rect.right + .5 || h.bottom > rect.bottom + .5)) return false;
      if (node.parent) {
        const parent = rectangles.get(node.parent);
        const headerBottom = Math.max(parent?.top || 0, ...Array.from(
          elements.get(node.parent)?.querySelectorAll('[data-nds-group-header]') || [], (el) => el.getBoundingClientRect().bottom));
        if (!parent || rect.left < parent.left - .5 || rect.right > parent.right + .5 ||
            rect.top < headerBottom - .5 || rect.bottom > parent.bottom + .5) return false;
      }
      for (let j = i + 1; j < diagram.nodes.length; j++) {
        const other = diagram.nodes[j];
        if (ancestor(node.id, other.id) || ancestor(other.id, node.id)) continue;
        const b = rectangles.get(other.id);
        if (Math.min(rect.right, b.right) - Math.max(rect.left, b.left) > .5 &&
            Math.min(rect.bottom, b.bottom) - Math.max(rect.top, b.top) > .5) return false;
      }
    }
    return true;
  }
  function renderReport(report) {
    const counts = text('counts').replace('{resources}', report.resourceCount).replace('{nodes}', report.nodeCount).replace('{edges}', report.edgeCount);
    byId('counts').textContent = counts;
    const list = byId('warnings');
    list.replaceChildren();
    const items = [...report.warnings, ...report.summarized.map((r) => `${r.type} (${r.count}): ${r.reason}`)];
    for (const item of items) {
      const li = document.createElement('li');
      li.textContent = item;
      list.append(li);
    }
    if (!items.length) { const li = document.createElement('li'); li.textContent = text('reportFallback'); list.append(li); }
  }
  function flowLayout(diagram) {
    // Project real connections onto sibling containers. Positions express an
    // overview, not new links, effective routes, or a direction for VPN/peering.
    const nodes = diagram.nodes.map((node) => ({ ...node, position: { ...node.position }, size: { ...node.size } }));
    const byNodeId = new Map(nodes.map((node) => [node.id, node]));
    const nodeOrder = new Map(nodes.map((node, i) => [node.id, i]));
    const children = new Map();
    const headerSpace = new Map();
    for (const el of document.querySelectorAll('.react-flow__node[data-id]')) {
      const header = el.querySelector('[data-nds-group-header]');
      if (!header) continue;
      const contentWidth = Array.from(header.children).reduce((sum, part) => sum + Math.max(part.scrollWidth || 0, part.clientWidth || 0), 0);
      const blocks = Array.from(el.querySelectorAll('[data-nds-group-header]'));
      headerSpace.set(el.dataset.id, {
        w: Math.ceil(Math.max(contentWidth + header.children.length * 10, ...blocks.map((part) => part.scrollWidth)) * 1.5 + 40),
        top: Math.max(84, Math.ceil(Math.max(...blocks.map((part) => part.offsetTop + part.offsetHeight)) * 1.5 + 24))
      });
    }
    for (const node of nodes) {
      const key = node.parent || '';
      if (!children.has(key)) children.set(key, []);
      children.get(key).push(node);
    }
    const canvas = document.querySelector('.react-flow').getBoundingClientRect();
    const aspect = Math.max(1.5, Math.min(2, canvas.width / canvas.height));
    const roles = { 'local-gw': 0, 'er-circuit': 5, 'vpn-gw': 10, 'er-gw': 10, vwan: 10, 'vwan-hub': 10,
      'front-door': 0, 'traffic-manager': 0, appgw: 20, firewall: 20, lb: 30, 'private-endpoint': 40,
      'private-link-service': 40, 'dns-resolver': 50, bastion: 50, vm: 60, vmss: 60, aks: 60, nat: 80 };
    const roleCache = new Map();
    function role(node) {
      if (!roleCache.has(node.id)) roleCache.set(node.id, children.has(node.id)
        ? Math.min(...children.get(node.id).map(role)) : (roles[node.type] ?? 60));
      return roleCache.get(node.id);
    }
    const compare = (a, b) => role(a) - role(b) || nodeOrder.get(a.id) - nodeOrder.get(b.id);
    function sibling(id, parentId) {
      let node = byNodeId.get(id);
      while (node && (node.parent || '') !== parentId) node = byNodeId.get(node.parent);
      return node;
    }
    function shelf(items) {
      if (!items.length) return { w: 0, h: 0, positions: [] };
      const gap = 96;
      const widest = Math.max(...items.map((item) => item.w));
      const area = items.reduce((sum, item) => sum + (item.w + gap) * (item.h + gap), 0);
      const target = Math.sqrt(area * aspect);
      let best;
      for (const factor of [.6, .8, 1, 1.2, 1.5, 1.8]) {
        const limit = Math.max(widest, target * factor);
        let x = 0, y = 0, rowHeight = 0, w = 0;
        const positions = [];
        for (const item of items) {
          if (x && x + item.w > limit) { y += rowHeight + gap; x = 0; rowHeight = 0; }
          positions.push({ x, y });
          w = Math.max(w, x + item.w);
          rowHeight = Math.max(rowHeight, item.h);
          x += item.w + gap;
        }
        const h = y + rowHeight;
        const score = Math.max(w / aspect, h);
        if (!best || score < best.score) best = { positions, w, h, score };
      }
      return best;
    }
    function pack(parentId) {
      const siblings = (children.get(parentId) || []).slice().sort(compare);
      for (const child of siblings) {
        if (!children.has(child.id) && !headerSpace.has(child.id)) continue;
        const inner = pack(child.id), header = headerSpace.get(child.id);
        if (!header) throw new Error('layout');
        child.size = { w: Math.max(240, inner.w + 64, header.w), h: inner.h + header.top + 32 };
      }
      const links = [];
      for (const edge of diagram.edges) {
        const source = sibling(edge.source, parentId), target = sibling(edge.target, parentId);
        if (source && target && source !== target) links.push({ source, target,
          directed: ['backend', 'privateendpoint', 'dns'].includes(edge.kind) });
      }
      const outgoing = new Map(siblings.map((node) => [node.id, new Set()]));
      for (const link of links) if (link.directed) outgoing.get(link.source.id).add(link.target.id);
      // Collapse directed cycles before ranking, rather than inventing a
      // one-way path through a loop. Acyclic backend/endpoint chains retain order.
      const visited = new Map(), low = new Map(), stack = [], active = new Set(), blocks = [], blockOf = new Map();
      let next = 0;
      function visit(id) {
        visited.set(id, next); low.set(id, next++);
        stack.push(id); active.add(id);
        for (const target of outgoing.get(id)) {
          if (!visited.has(target)) { visit(target); low.set(id, Math.min(low.get(id), low.get(target))); }
          else if (active.has(target)) low.set(id, Math.min(low.get(id), visited.get(target)));
        }
        if (low.get(id) !== visited.get(id)) return;
        const block = { nodes: [], out: new Set(), neighbors: new Set(), incoming: 0, rank: 0 };
        let member;
        do {
          member = stack.pop(); active.delete(member);
          blockOf.set(member, block); block.nodes.push(byNodeId.get(member));
        } while (member !== id);
        block.nodes.sort(compare);
        blocks.push(block);
      }
      for (const node of siblings) if (!visited.has(node.id)) visit(node.id);
      for (const link of links) {
        const a = blockOf.get(link.source.id), b = blockOf.get(link.target.id);
        if (a === b) continue;
        a.neighbors.add(b); b.neighbors.add(a);
        if (link.directed && !a.out.has(b)) { a.out.add(b); b.incoming++; }
      }
      const ready = blocks.filter((b) => !b.incoming), order = [];
      while (ready.length) {
        ready.sort((a, b) => compare(a.nodes[0], b.nodes[0]));
        const block = ready.shift();
        block.order = order.length; order.push(block);
        for (const target of block.out) if (--target.incoming === 0) ready.push(target);
      }
      if (order.length !== blocks.length) throw new Error('layout');
      for (const link of links) {
        if (link.directed) continue;
        const a = blockOf.get(link.source.id), b = blockOf.get(link.target.id);
        if (a !== b) (a.order < b.order ? a : b).out.add(a.order < b.order ? b : a);
      }
      for (const block of order) for (const target of block.out) target.rank = Math.max(target.rank, block.rank + 1);
      const placed = new Set(), tiles = [];
      for (const first of order) {
        if (placed.has(first)) continue;
        const component = [], pending = [first];
        placed.add(first);
        while (pending.length) {
          const block = pending.pop(); component.push(block);
          for (const neighbor of block.neighbors) if (!placed.has(neighbor)) { placed.add(neighbor); pending.push(neighbor); }
        }
        const columns = new Map();
        for (const block of component) {
          if (!columns.has(block.rank)) columns.set(block.rank, []);
          columns.get(block.rank).push(...block.nodes);
        }
        const levels = [...columns].sort(([a], [b]) => a - b).map(([, members]) => {
          members.sort(compare);
          return { members, w: Math.max(...members.map((n) => n.size.w)), h: members.reduce((sum, n) => sum + n.size.h, 0) + (members.length - 1) * 80 };
        });
        const h = Math.max(...levels.map((level) => level.h));
        let x = 0;
        for (const level of levels) {
          let y = (h - level.h) / 2;
          for (const node of level.members) { node.position = { x, y }; y += node.size.h + 80; }
          x += level.w + 224;
        }
        tiles.push({ w: x - 224, h, nodes: component.flatMap((block) => block.nodes) });
      }
      // Unconnected networks occupy separate, balanced tiles. They are never
      // forced into one apparent traffic chain or linked just for aesthetics.
      const packed = shelf(tiles);
      tiles.forEach((tile, i) => tile.nodes.forEach((node) => {
        node.position.x += packed.positions[i].x + (parentId ? 32 : 48);
        node.position.y += packed.positions[i].y + (parentId ? headerSpace.get(parentId).top : 48);
      }));
      return packed;
    }
    pack('');
    return { ...diagram, nodes };
  }
  window.ndsArmLayout = { flowLayout, checkGeometry };
  async function applyResult(result, token, groupLabel, visible) {
    if (!current(token) || applying) return;
    releaseWorker();
    applying = true;
    showProgress(90, 'layout');
    if (!await frame() || !current(token)) return;
    try {
      const tabs = window.__nds_tabsStore, store = window.__nds_diagramStore;
      const previousId = tabs.getState().activeTabId;
      const previous = { tabs: tabs.getState(), diagram: store.getState(), undo: window.__nds_undoRouter.snapshot() };
      let importedId;
      // Until acceptance, cancellation restores the native transaction immediately,
      // including during measurement frames or the minimum display interval.
      rollback = () => {
        if (importedId && importedId !== previousId) {
          tabs.getState().deleteTab(importedId);
          if (tabs.getState().activeTabId !== previousId) tabs.getState().switchTab(previousId);
        }
        tabs.setState(previous.tabs);
        store.setState(previous.diagram);
        const router = window.__nds_undoRouter;
        router.reset();
        [...previous.undo.undoJournal, ...previous.undo.redoJournal.slice().reverse()].forEach((source) => router.record(source));
        previous.undo.redoJournal.forEach(() => router.commitUndo());
      };
      const rootGroup = result.diagram.nodes.find((node) => node.type === 'group-rg' && !node.parent);
      if (rootGroup) rootGroup.data.name = groupLabel;
      // Native tab creation snapshots outgoing work and measures the cards before
      // import-only packing. Existing diagrams and the global layout are unchanged.
      tabs.getState().addTabWithDiagram(result.diagram.meta.title, result.diagram);
      importedId = tabs.getState().activeTabId;
      if (importedId === previousId) throw new Error('layout');
      showProgress(95, 'verify');
      let safe = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        if (!await frame() || !current(token)) return;
        if (attempt >= 3 && document.fonts.status !== 'loading' && checkGeometry(store.getState().diagram, true)) { safe = true; break; }
      }
      if (!safe) throw new Error('layout');
      store.getState().loadDiagram(flowLayout(store.getState().diagram), { relayout: false });
      store.setState({ fitNonce: store.getState().fitNonce + 1 });
      safe = false;
      for (let attempt = 0; attempt < 50; attempt++) {
        if (!await frame() || !current(token)) return;
        if (attempt >= 3 && checkGeometry(store.getState().diagram)) { safe = true; break; }
      }
      if (!safe) throw new Error('layout');
      // The imported tab opens with a blank Notes page: the import's own
      // findings are shown in the result panel below, and a page of standing
      // caveats is not something the reader wrote.
      renderReport(result.report);
      showProgress(99, 'verify');
      if (!await visible || !current(token)) return;
      while (performance.now() - visibleStarted < MIN_PROGRESS_MS) {
        if (!await minimumDisplay() || !current(token)) return;
      }
      rollback = null;
      release();
      percent = 100;
      stage = 'ready';
      renderProgress();
      busy = applying = false;
      succeeded = true;
      byId('result').hidden = false;
      byId('start').hidden = true;
      setText('cancel', 'close');
      byId('cancel').focus();
    } catch {
      if (current(token)) fail(text('layoutError'));
    }
  }
  function start() {
    if (busy || !dialog.open) return;
    groupTouched = true;
    if (!validateGroup()) { byId('group').focus(); return; }
    if (!selectedFile) { fail(text('fileError')); return; }
    const groupLabel = byId('group').value.trim();
    const subscriptionId = byId('sub').value.trim();
    if (!selectedFile.size || selectedFile.size > MAX_BYTES || !/\.json$/i.test(selectedFile.name)) { fail(text('fileError')); return; }
    if (typeof window.ndsArmEngine !== 'function' || !window.__nds_tabsStore || !window.__nds_diagramStore) { fail(text('engineError')); return; }
    const token = ++generation;
    busy = true;
    percent = workPercent = visibleStarted = 0;
    byId('error').hidden = true;
    byId('form').hidden = true;
    byId('start').hidden = true;
    byId('progress').hidden = false;
    byId('result').hidden = true;
    showProgress(0, 'read');
    byId('cancel').focus();
    const visible = (async () => {
      if (!await frame() || !current(token)) return false;
      if (!await frame() || !current(token)) return false;
      visibleStarted = performance.now();
      return true;
    })();
    timer = setInterval(paintProgress, 32);
    timeout = setTimeout(() => { if (current(token)) fail(text('timeout')); }, 60000);
    try { reader = new FileReader(); } catch { fail(text('workerError')); return; }
    reader.onprogress = (event) => { if (event.lengthComputable && current(token)) showProgress(15 * event.loaded / event.total, 'read'); };
    reader.onerror = () => { if (current(token)) fail(text('workerError')); };
    reader.onload = () => {
      if (!current(token)) return;
      const raw = reader.result;
      reader = null;
      showProgress(15, 'parse');
      try {
        // A self-contained Blob worker also works when the standalone HTML is
        // opened via file://; it never fetches or uploads the selected template.
        const script = `const engine = (${window.ndsArmEngine.toString()})(); onmessage = function(event) { try { const result = engine.convert(event.data.raw, event.data.options, function(progress) { postMessage({kind:'progress', progress}); }); postMessage({kind:'result', result}); } catch (error) { postMessage({kind:'error', message:error.message}); } };`;
        workerUrl = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }));
        worker = new Worker(workerUrl);
        worker.onmessage = (event) => {
          if (!current(token)) return;
          if (event.data.kind === 'progress') {
            const update = event.data.progress;
            if (Number.isFinite(update.percent) && ['parse', 'resolve', 'topology'].includes(update.stage)) showProgress(Math.min(85, update.percent), update.stage);
          } else if (event.data.kind === 'result') {
            void applyResult(event.data.result, token, groupLabel, visible);
          } else if (event.data.kind === 'error') {
            fail(event.data.message);
          }
        };
        worker.onerror = (event) => { event.preventDefault(); if (current(token)) fail(text('workerError')); };
        // This existing engine option labels the root and Notes only. It does not
        // resolve resourceGroup(), subscription metadata, or unknown ARM scopes.
        worker.postMessage({ raw, options: { title: 'ARM network diagram', resourceGroupName: groupLabel, subscriptionId } });
      } catch { fail(text('workerError')); }
    };
    try { reader.readAsText(selectedFile); } catch { fail(text('workerError')); }
  }
  function attach() {
    if (!opener) return;
    // The native module may expose its store after this deferred addon starts.
    const languageStore = window.__nds_i18nStore;
    if (languageStore && languageStore !== langStore) {
      unsubscribeLanguage?.();
      langStore = languageStore;
      unsubscribeLanguage = langStore.subscribe(updateLanguage);
      updateLanguage();
    }
    const narrow = matchMedia('(max-width: 1100px)').matches;
    const load = Array.from(document.querySelectorAll('header button')).find((b) => b.textContent.includes('JSON'));
    const save = Array.from(document.querySelectorAll('header button')).find((b) => b !== load && b.textContent.includes('JSON'));
    // Reuse the shipped toolbar classes, including rem-based sizing and theme.
    if (load && opener.className !== load.className) opener.className = load.className;
    const anchor = narrow
      ? document.querySelector('[data-nds-tabbar="1"]')
      : save;
    if (anchor && (narrow ? opener.parentElement !== anchor : opener.previousElementSibling !== anchor)) {
      if (narrow) anchor.prepend(opener);
      else anchor.after(opener);
    }
  }
  function init() {
    if (document.getElementById('nds-arm-dialog')) return;
    opener = document.createElement('button');
    opener.id = 'nds-arm-open';
    opener.type = 'button';
    opener.setAttribute('aria-haspopup', 'dialog');
    opener.innerHTML = '<span class="nds-arm-long"></span><span class="nds-arm-short">ARM</span>';
    opener.addEventListener('click', open);
    dialog = document.createElement('dialog');
    dialog.id = 'nds-arm-dialog';
    dialog.setAttribute('aria-labelledby', 'nds-arm-title');
    dialog.setAttribute('aria-describedby', 'nds-arm-intro');
    dialog.innerHTML = `
      <h2 id="nds-arm-title" data-arm-text="title"></h2>
      <p id="nds-arm-intro" data-arm-text="intro"></p>
      <div id="nds-arm-form">
        <div class="nds-arm-export"><p class="nds-arm-export-title" data-arm-text="stepsTitle"></p><ol id="nds-arm-export" class="nds-arm-export-list"></ol></div>
        <div class="nds-arm-file"><button id="nds-arm-choose" type="button" data-arm-text="choose"></button><span id="nds-arm-filename"></span></div>
        <input id="nds-arm-file" type="file" accept=".json,application/json" hidden>
        <label for="nds-arm-group" data-arm-text="group"></label>
        <input id="nds-arm-group" type="text" maxlength="90" required aria-required="true" aria-describedby="nds-arm-group-error">
        <p id="nds-arm-group-error" role="status" aria-live="polite" data-arm-text="groupRequired" hidden></p>
        <label for="nds-arm-sub" data-arm-text="subscription"></label>
        <input id="nds-arm-sub" type="text" maxlength="100" spellcheck="false" autocomplete="off">
      </div>
      <div id="nds-arm-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden>
        <div><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/><circle id="nds-arm-ring" cx="50" cy="50" r="42"/></svg><span id="nds-arm-percent"></span></div>
        <div><p id="nds-arm-stage" role="status" aria-live="polite"></p></div>
      </div>
      <p id="nds-arm-error" role="alert" hidden></p>
      <div id="nds-arm-result" hidden>
        <div id="nds-arm-report"><h3 data-arm-text="report"></h3><p id="nds-arm-counts" class="nds-arm-report-counts"></p><details><summary data-arm-text="details"></summary><ul id="nds-arm-warnings"></ul></details></div>
      </div>
      <div class="nds-arm-actions"><button id="nds-arm-cancel" type="button"></button><button id="nds-arm-start" class="nds-arm-primary" type="button" disabled></button></div>`;
    document.body.append(dialog);
    fileInput = byId('file');
    fileInput.addEventListener('change', () => {
      if (busy) return;
      selectedFile = fileInput.files[0] || null;
      resetView();
      byId('filename').textContent = selectedFile ? selectedFile.name + ' (' + Math.ceil(selectedFile.size / 1024) + ' KiB)' : text('none');
      if (selectedFile) (validateGroup() ? byId('start') : byId('group')).focus();
    });
    fileInput.addEventListener('cancel', () => { if (!selectedFile) close(); });
    byId('choose').addEventListener('click', selectFile);
    byId('start').addEventListener('click', start);
    byId('group').addEventListener('input', () => { groupTouched = true; validateGroup(); });
    byId('group').addEventListener('blur', () => { groupTouched = true; validateGroup(); });
    byId('group').addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); start(); }
    });
    byId('cancel').addEventListener('click', close);
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
    dialog.addEventListener('close', () => { if (!dialog.open && busy) cancelOperation(); });
    // Bubble-phase isolation keeps native text editing intact while preventing
    // editor document shortcuts from copying/deleting resources behind the modal.
    dialog.addEventListener('keydown', (event) => event.stopPropagation());
    dialog.addEventListener('keyup', (event) => event.stopPropagation());
    updateLanguage();
    attach();
    const observer = new MutationObserver(records => {
      if (dialog.isConnected) {
        if (!opener.isConnected || !langStore || records.some(record =>
          record.target instanceof Element && record.target.closest('header, [data-nds-tabbar]'))) attach();
        return;
      }
      cancelOperation();
      observer.disconnect();
      unsubscribeLanguage?.();
      window.removeEventListener('resize', attach);
      window.removeEventListener('pagehide', close);
      opener.remove();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', attach);
    window.addEventListener('pagehide', close);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
