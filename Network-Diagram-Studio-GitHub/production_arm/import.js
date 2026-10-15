/* Production adapter: local worker, measured native cards, isolated import layout. */
(function () {
  'use strict';
  const messages = {
    en: {
      title: 'Import ARM template', short: 'Import ARM',
      intro: 'Turn an Azure Portal template.json export into an editable network diagram in a new tab.',
      stepsTitle: 'Steps', exportSteps: ['Azure Portal', 'Resource groups', 'Select a resource group', 'Automation → Export template → ARM Template → Download', 'template.json'],
      choose: 'Choose template.json', none: 'No file selected', group: 'Resource group',
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
      stepsTitle: '手順', exportSteps: ['Azure Portal', 'Resource groups', 'リソースグループを選択', 'Automation → Export template → ARM Template → Download', 'template.json'],
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
    en: {
      fileTitle: 'Select your ARM template',
      fileHelp: 'Choose the extracted template.json from your computer, not the ZIP.'
    },
    ja: {
      fileTitle: 'ARM テンプレートを選択',
      fileHelp: 'ZIP ではなく、展開した template.json をコンピューターから選択してください。'
    },
    es: {
      fileTitle: 'Selecciona tu plantilla ARM',
      fileHelp: 'Elige el template.json extraído de tu equipo, no el ZIP.',
      stepsTitle: 'Pasos', exportSteps: ['Azure Portal', 'Resource groups', 'Selecciona un grupo de recursos', 'Automation → Export template → ARM Template → Download', 'template.json'],
      groupRequired: 'Introduce un nombre de grupo de recursos.',
      subscription: 'ID de suscripción (opcional)',
      progressHelp: 'Las etapas completadas se muestran durante al menos 2,5 segundos; no es una estimación de tiempo.',
      fileError: 'Elige una plantilla JSON no vacía de hasta 10 MiB.', engineError: 'No se pudo iniciar el importador. Recarga esta página de prueba.',
      workerError: 'El navegador interrumpió o bloqueó el procesamiento local. Tu trabajo anterior no se ha reemplazado.',
      layoutError: 'No se pudo organizar el diagrama de forma segura. Se revirtió la importación; la pestaña anterior no cambió.',
      timeout: 'Se superó el límite de procesamiento. Exporta una selección más pequeña.', reportFallback: 'No hay más detalles.'
    },
    fr: {
      fileTitle: 'Sélectionnez votre modèle ARM',
      fileHelp: 'Choisissez le fichier template.json extrait sur votre ordinateur, pas le ZIP.',
      stepsTitle: 'Étapes', exportSteps: ['Azure Portal', 'Resource groups', 'Sélectionnez un groupe de ressources', 'Automation → Export template → ARM Template → Download', 'template.json'],
      groupRequired: 'Saisissez un nom de groupe de ressources.',
      subscription: 'ID d’abonnement (facultatif)',
      progressHelp: 'Les étapes terminées sont affichées sur au moins 2,5 secondes ; ce n’est pas une estimation de durée.',
      fileError: 'Choisissez un modèle JSON non vide de 10 MiB maximum.', engineError: 'L’importateur n’a pas démarré. Rechargez cette page de test.',
      workerError: 'Le navigateur a interrompu ou bloqué le traitement local. Votre travail précédent n’a pas été remplacé.',
      layoutError: 'Impossible de disposer le diagramme sans chevauchement. L’importation a été annulée ; l’onglet précédent est inchangé.',
      timeout: 'La limite de traitement a été dépassée. Exportez moins de ressources.', reportFallback: 'Aucun détail supplémentaire.'
    },
    de: {
      fileTitle: 'ARM-Vorlage auswählen',
      fileHelp: 'Wählen Sie die entpackte template.json auf Ihrem Computer, nicht die ZIP-Datei.',
      stepsTitle: 'Schritte', exportSteps: ['Azure Portal', 'Resource groups', 'Ressourcengruppe auswählen', 'Automation → Export template → ARM Template → Download', 'template.json'],
      groupRequired: 'Geben Sie einen Ressourcengruppennamen ein.',
      subscription: 'Abonnement-ID (optional)',
      progressHelp: 'Abgeschlossene Schritte werden über mindestens 2,5 Sekunden angezeigt; dies ist keine Zeitschätzung.',
      fileError: 'Wählen Sie eine nicht leere JSON-Vorlage mit höchstens 10 MiB.', engineError: 'Der Importer konnte nicht starten. Laden Sie diese Testseite neu.',
      workerError: 'Der Browser hat die lokale Verarbeitung unterbrochen oder blockiert. Ihre bisherige Arbeit wurde nicht ersetzt.',
      layoutError: 'Das Diagramm konnte nicht sicher angeordnet werden. Der Import wurde zurückgenommen; der vorherige Tab ist unverändert.',
      timeout: 'Das Verarbeitungslimit wurde überschritten. Exportieren Sie weniger Ressourcen.', reportFallback: 'Keine weiteren Details.'
    },
    pt: {
      fileTitle: 'Selecione seu modelo ARM',
      fileHelp: 'Escolha o template.json extraído no seu computador, não o ZIP.',
      stepsTitle: 'Etapas', exportSteps: ['Azure Portal', 'Resource groups', 'Selecione um grupo de recursos', 'Automation → Export template → ARM Template → Download', 'template.json'],
      groupRequired: 'Digite um nome de grupo de recursos.',
      subscription: 'ID da assinatura (opcional)',
      progressHelp: 'As etapas concluídas são mostradas por pelo menos 2,5 segundos; não é uma estimativa de tempo.',
      fileError: 'Escolha um modelo JSON não vazio de até 10 MiB.', engineError: 'Não foi possível iniciar o importador. Recarregue esta página de teste.',
      workerError: 'O navegador interrompeu ou bloqueou o processamento local. Seu trabalho anterior não foi substituído.',
      layoutError: 'Não foi possível organizar o diagrama com segurança. A importação foi revertida; a aba anterior não mudou.',
      timeout: 'O limite de processamento foi excedido. Exporte menos recursos.', reportFallback: 'Nenhum detalhe adicional.'
    },
    zh: {
      fileTitle: '选择 ARM 模板',
      fileHelp: '请从计算机中选择解压后的 template.json，而不是 ZIP 文件。',
      stepsTitle: '步骤', exportSteps: ['Azure Portal', 'Resource groups', '选择资源组', 'Automation → Export template → ARM Template → Download', 'template.json'],
      groupRequired: '请输入资源组名称。',
      subscription: '订阅 ID（可选）',
      progressHelp: '已完成的阶段会在至少 2.5 秒内显示；这不是时间估计。',
      fileError: '请选择不超过 10 MiB 的非空 JSON 模板。', engineError: '无法启动导入器。请重新加载此非生产页面。',
      workerError: '浏览器中断或阻止了本地处理。未替换您已有的工作。',
      layoutError: '无法安全排列图表，已撤销导入。原选项卡保持不变。',
      timeout: '超出处理时间限制。请减少导出的资源数量。', reportFallback: '无其他详细信息。'
    },
    ko: {
      fileTitle: 'ARM 템플릿 선택',
      fileHelp: '컴퓨터에서 ZIP 파일이 아닌 압축을 푼 template.json을 선택하세요.',
      stepsTitle: '단계', exportSteps: ['Azure Portal', 'Resource groups', '리소스 그룹 선택', 'Automation → Export template → ARM Template → Download', 'template.json'],
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
  const multiMessages = {
    en: {
      title: 'Import ARM templates', intro: 'One diagram. Separate resource groups.', help: 'Help & limits',
      template: 'Template', templates: 'Templates', change: 'Change file', remove: 'Remove',
      add: '+ Add template', addHelp: 'Choose one or more JSON files. Each file gets its own resource-group fields.',
      selected: '{count} files selected', importCount: 'Import {count} templates',
      resultTitle: 'One diagram, separate resource groups',
      resultHelp: 'Connections require matching resource references. Missing or ambiguous references are listed in Notes.',
      scopeHelp: 'For cross-group matching, supply the subscription ID for each group. A subscription found in file references is not assumed to host that group.',
      local: 'Local only. No deployment.',
      limits: 'Per import: 10 templates, 10 MiB JSON, 2,000 resource declarations and 300 diagram nodes (including groups).',
      scopeError: 'Use a valid resource-group name and, if supplied, a subscription GUID.',
      duplicateGroup: 'This resource-group scope is already in the list. Use one export per group, or distinct subscription IDs.',
      templateCounts: '{file} / {group}: {resources} exported resources'
    },
    ja: {
      title: 'ARM テンプレートのインポート', intro: '1 つの図に、リソースグループを分けて表示。', help: 'ヘルプと上限',
      template: 'テンプレート', templates: 'テンプレート一覧', change: 'ファイルを変更', remove: '削除',
      add: '+ テンプレートを追加', addHelp: 'JSON ファイルを 1 つ以上選択します。ファイルごとにリソースグループを入力できます。',
      selected: '{count} ファイル選択済み', importCount: '{count} テンプレートをインポート',
      resultTitle: '1 つの図に、リソースグループを分けて表示',
      resultHelp: 'リソース参照が一致する場合だけ接続します。不明・曖昧な参照は Notes に記録します。',
      scopeHelp: 'グループ間の照合には、各グループのサブスクリプション ID を入力してください。ファイル内の参照先 ID を、そのグループの所属先とはみなしません。',
      local: 'ローカル処理のみ。デプロイなし。',
      limits: 'インポート全体の上限：10 テンプレート、JSON 合計 10 MiB、2,000 リソース定義、300 オブジェクト（グループを含む）。',
      scopeError: '有効なリソースグループ名と、入力する場合は GUID 形式のサブスクリプション ID を指定してください。',
      duplicateGroup: '同じリソースグループが既にあります。グループごとに 1 ファイルにするか、異なるサブスクリプション ID を指定してください。',
      templateCounts: '{file} / {group}: エクスポート {resources} リソース'
    },
    zh: {
      title: '导入 ARM 模板', intro: '一个图表，独立的资源组。', help: '帮助与限制',
      template: '模板', templates: '模板列表', change: '更换文件', remove: '移除', add: '+ 添加模板',
      addHelp: '选择一个或多个 JSON 文件。每个文件都有独立的资源组字段。',
      selected: '已选择 {count} 个文件', importCount: '导入 {count} 个模板',
      resultTitle: '一个图表，独立的资源组', resultHelp: '仅在资源引用匹配时添加连接。缺失或不明确的引用会列在 Notes 中。',
      scopeHelp: '跨组匹配需要填写各组的订阅 ID。不将文件引用中的订阅视为该组所属的订阅。',
      local: '仅本地处理，不会部署。', limits: '每次导入最多 10 个模板、10 MiB JSON、2,000 个资源声明和 300 个图表节点（包括组）。',
      scopeError: '请填写有效的资源组名称，以及可选的 GUID 格式订阅 ID。',
      duplicateGroup: '列表中已有此资源组范围。每组仅保留一个导出，或指定不同的订阅 ID。',
      templateCounts: '{file} / {group}：{resources} 个导出资源'
    },
    es: {
      title: 'Importar plantillas ARM', intro: 'Un diagrama. Grupos de recursos separados.', help: 'Ayuda y límites',
      template: 'Plantilla', templates: 'Plantillas', change: 'Cambiar archivo', remove: 'Quitar', add: '+ Añadir plantilla',
      addHelp: 'Elige uno o más archivos JSON. Cada archivo tiene sus propios campos de grupo de recursos.',
      selected: '{count} archivos seleccionados', importCount: 'Importar {count} plantillas',
      resultTitle: 'Un diagrama, grupos de recursos separados', resultHelp: 'Solo se conectan referencias coincidentes. Las referencias ausentes o ambiguas se guardan en Notes.',
      scopeHelp: 'Para relacionar grupos, indica el ID de suscripción de cada uno. Una suscripción encontrada en referencias no se asume como propia del grupo.',
      local: 'Solo local. Sin despliegue.', limits: 'Por importación: 10 plantillas, 10 MiB de JSON, 2.000 declaraciones de recursos y 300 nodos del diagrama (incluidos los grupos).',
      scopeError: 'Usa un nombre de grupo válido y, si lo indicas, un GUID de suscripción.',
      duplicateGroup: 'Este grupo ya está en la lista. Usa una exportación por grupo o distintos ID de suscripción.',
      templateCounts: '{file} / {group}: {resources} recursos exportados'
    },
    pt: {
      title: 'Importar modelos ARM', intro: 'Um diagrama. Grupos de recursos separados.', help: 'Ajuda e limites',
      template: 'Modelo', templates: 'Modelos', change: 'Alterar arquivo', remove: 'Remover', add: '+ Adicionar modelo',
      addHelp: 'Escolha um ou mais arquivos JSON. Cada arquivo tem seus próprios campos de grupo de recursos.',
      selected: '{count} arquivos selecionados', importCount: 'Importar {count} modelos',
      resultTitle: 'Um diagrama, grupos de recursos separados', resultHelp: 'Conexões exigem referências correspondentes. Referências ausentes ou ambíguas ficam em Notes.',
      scopeHelp: 'Para relacionar grupos, informe a assinatura de cada um. Uma assinatura encontrada nas referências não é considerada a assinatura do grupo.',
      local: 'Somente local. Sem implantação.', limits: 'Por importação: 10 modelos, 10 MiB de JSON, 2.000 declarações de recursos e 300 nós do diagrama (incluindo grupos).',
      scopeError: 'Use um nome de grupo válido e, se informado, um GUID de assinatura.',
      duplicateGroup: 'Este grupo já está na lista. Use uma exportação por grupo ou IDs de assinatura distintos.',
      templateCounts: '{file} / {group}: {resources} recursos exportados'
    },
    fr: {
      title: 'Importer des modèles ARM', intro: 'Un diagramme. Des groupes de ressources distincts.', help: 'Aide et limites',
      template: 'Modèle', templates: 'Modèles', change: 'Changer de fichier', remove: 'Retirer', add: '+ Ajouter un modèle',
      addHelp: 'Choisissez un ou plusieurs fichiers JSON. Chaque fichier possède ses propres champs de groupe de ressources.',
      selected: '{count} fichiers sélectionnés', importCount: 'Importer {count} modèles',
      resultTitle: 'Un diagramme, des groupes de ressources distincts', resultHelp: 'Les connexions exigent des références concordantes. Les références absentes ou ambiguës figurent dans Notes.',
      scopeHelp: 'Pour relier les groupes, indiquez leur ID d’abonnement. Un abonnement trouvé dans les références n’est pas considéré comme celui du groupe.',
      local: 'Traitement local. Aucun déploiement.', limits: 'Par import : 10 modèles, 10 MiB de JSON, 2 000 déclarations de ressources et 300 nœuds du diagramme (groupes compris).',
      scopeError: 'Utilisez un nom de groupe valide et, si fourni, un GUID d’abonnement.',
      duplicateGroup: 'Ce groupe est déjà présent. Utilisez un export par groupe ou des ID d’abonnement distincts.',
      templateCounts: '{file} / {group} : {resources} ressources exportées'
    },
    de: {
      title: 'ARM-Vorlagen importieren', intro: 'Ein Diagramm. Getrennte Ressourcengruppen.', help: 'Hilfe und Limits',
      template: 'Vorlage', templates: 'Vorlagen', change: 'Datei ändern', remove: 'Entfernen', add: '+ Vorlage hinzufügen',
      addHelp: 'Wählen Sie eine oder mehrere JSON-Dateien. Jede Datei hat eigene Ressourcengruppenfelder.',
      selected: '{count} Dateien ausgewählt', importCount: '{count} Vorlagen importieren',
      resultTitle: 'Ein Diagramm, getrennte Ressourcengruppen', resultHelp: 'Verbindungen erfordern passende Ressourcenverweise. Fehlende oder mehrdeutige Verweise stehen in Notes.',
      scopeHelp: 'Geben Sie für gruppenübergreifende Zuordnungen die jeweilige Abonnement-ID an. Ein Abonnement in Dateiverweisen gilt nicht als das Abonnement der Gruppe.',
      local: 'Nur lokal. Keine Bereitstellung.', limits: 'Pro Import: 10 Vorlagen, 10 MiB JSON, 2.000 Ressourcendeklarationen und 300 Diagrammknoten (einschließlich Gruppen).',
      scopeError: 'Geben Sie einen gültigen Gruppennamen und optional eine Abonnement-GUID an.',
      duplicateGroup: 'Diese Gruppe ist bereits vorhanden. Verwenden Sie einen Export pro Gruppe oder verschiedene Abonnement-IDs.',
      templateCounts: '{file} / {group}: {resources} exportierte Ressourcen'
    },
    ko: {
      title: 'ARM 템플릿 가져오기', intro: '하나의 다이어그램. 분리된 리소스 그룹.', help: '도움말 및 제한',
      template: '템플릿', templates: '템플릿 목록', change: '파일 변경', remove: '제거', add: '+ 템플릿 추가',
      addHelp: 'JSON 파일을 하나 이상 선택하세요. 파일마다 별도의 리소스 그룹 필드가 있습니다.',
      selected: '{count}개 파일 선택됨', importCount: '템플릿 {count}개 가져오기',
      resultTitle: '하나의 다이어그램, 분리된 리소스 그룹', resultHelp: '리소스 참조가 일치할 때만 연결합니다. 없거나 모호한 참조는 Notes에 기록합니다.',
      scopeHelp: '그룹 간 일치 확인에는 각 그룹의 구독 ID를 입력하세요. 파일 참조의 구독을 해당 그룹의 구독으로 간주하지 않습니다.',
      local: '로컬 처리만. 배포 없음.', limits: '가져오기당 템플릿 10개, JSON 10 MiB, 리소스 선언 2,000개, 다이어그램 노드 300개(그룹 포함)까지 가능합니다.',
      scopeError: '유효한 리소스 그룹 이름과 선택 사항인 GUID 형식의 구독 ID를 입력하세요.',
      duplicateGroup: '이 리소스 그룹이 이미 있습니다. 그룹당 하나의 내보내기 또는 다른 구독 ID를 사용하세요.',
      templateCounts: '{file} / {group}: 내보낸 리소스 {resources}개'
    }
  };
  for (const [language, strings] of Object.entries(multiMessages)) Object.assign(messages[language], strings);
  let dialog, opener, fileInput, worker, workerUrl, reader, timer, timeout, pendingEntry;
  let entrySequence = 0;
  const newEntry = () => ({ id: ++entrySequence, file: null, group: '', subscription: '', touched: false });
  let entries = [newEntry()];
  let busy = false, applying = false, succeeded = false, generation = 0, percent = 0, stage = 'read';
  let langStore, unsubscribeLanguage, rollback, cancelMinimum;
  let workPercent = 0, visibleStarted = 0;
  const frameWaiters = new Set();
  const MAX_BYTES = 10 * 1024 * 1024;
  const MAX_TEMPLATES = 10;
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
    setText('cancel', succeeded ? 'close' : 'cancel');
    renderEntries();
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
    const scopes = new Map();
    for (const entry of entries) {
      const scope = entry.subscription.trim().toLowerCase() + '|' + entry.group.trim().toLowerCase();
      if (entry.group.trim()) scopes.set(scope, (scopes.get(scope) || 0) + 1);
    }
    let valid = true;
    for (const entry of entries) {
      const card = dialog.querySelector(`[data-arm-entry="${entry.id}"]`);
      const group = card.querySelector('[data-arm-group]'), sub = card.querySelector('[data-arm-sub]');
      const groupName = entry.group.trim(), subscription = entry.subscription.trim();
      const groupValid = /^[\p{L}\p{N}_.()-]{1,90}$/u.test(groupName) && !groupName.endsWith('.');
      const subValid = !subscription || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(subscription);
      const duplicate = (scopes.get(subscription.toLowerCase() + '|' + groupName.toLowerCase()) || 0) > 1;
      const error = !groupName ? text('groupRequired') : !groupValid || !subValid ? text('scopeError') : duplicate ? text('duplicateGroup') : '';
      entry.error = error;
      group.setCustomValidity(!groupValid || duplicate ? error : '');
      sub.setCustomValidity(subValid ? '' : error);
      group.setAttribute('aria-invalid', String(entry.touched && (!groupValid || duplicate)));
      sub.setAttribute('aria-invalid', String(entry.touched && !subValid));
      const message = card.querySelector('[data-arm-entry-error]');
      message.textContent = error;
      message.hidden = !error || !entry.touched;
      if (error || !entry.file) valid = false;
    }
    byId('start').disabled = busy || !valid;
    byId('start').textContent = entries.length > 1 ? text('importCount').replace('{count}', entries.length) : text('start');
    byId('selected').textContent = text('selected').replace('{count}', entries.filter(entry => entry.file).length);
    byId('add').disabled = busy || entries.length >= MAX_TEMPLATES;
    return valid;
  }
  function renderEntries() {
    const list = byId('templates');
    list.replaceChildren();
    entries.forEach((entry, index) => {
      const card = document.createElement('section');
      card.className = 'nds-arm-template';
      card.dataset.armEntry = entry.id;
      card.dataset.selected = String(!!entry.file);
      const suffix = index ? '-' + entry.id : '';
      card.setAttribute('aria-labelledby', 'nds-arm-template-title' + suffix);
      card.innerHTML = `
        <div class="nds-arm-template-heading"><h3 id="nds-arm-template-title${suffix}"></h3><button type="button" data-arm-remove></button></div>
        <div class="nds-arm-file">
          <div class="nds-arm-file-row">
            <button id="nds-arm-choose${suffix}" class="nds-arm-primary" type="button" data-arm-choose aria-describedby="nds-arm-file-help nds-arm-filename${suffix}">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 7V5a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v3"/><path d="M3 9h18l-2 11H5L3 9Z"/></svg>
              <span></span>
            </button>
            <span id="nds-arm-filename${suffix}" data-arm-filename role="status" aria-live="polite"></span>
          </div>
        </div>
        <div class="nds-arm-fields">
          <div><label for="nds-arm-group${suffix}"></label><input id="nds-arm-group${suffix}" data-arm-group type="text" maxlength="90" required aria-required="true" aria-describedby="nds-arm-group-error${suffix}"></div>
          <div><label for="nds-arm-sub${suffix}"></label><input id="nds-arm-sub${suffix}" data-arm-sub type="text" maxlength="100" spellcheck="false" autocomplete="off" aria-describedby="nds-arm-group-error${suffix}"></div>
        </div>
        <p id="nds-arm-group-error${suffix}" class="nds-arm-entry-error" data-arm-entry-error role="status" aria-live="polite" hidden></p>`;
      card.querySelector('.nds-arm-template-heading h3').textContent = text('template') + ' ' + (index + 1);
      const remove = card.querySelector('[data-arm-remove]');
      remove.textContent = text('remove');
      remove.setAttribute('aria-label', text('remove') + ' ' + text('template') + ' ' + (index + 1));
      remove.hidden = entries.length === 1 && !entry.file;
      remove.addEventListener('click', () => {
        entries = entries.filter(item => item !== entry);
        if (!entries.length) entries.push(newEntry());
        renderEntries();
        resetView();
        byId('add').focus();
      });
      const choose = card.querySelector('[data-arm-choose]');
      choose.querySelector('span').textContent = entry.file ? text('change') : text('choose');
      choose.addEventListener('click', () => selectFile(entry));
      card.querySelector('[data-arm-filename]').textContent = entry.file
        ? entry.file.name + ' (' + Math.ceil(entry.file.size / 1024) + ' KiB)' : text('none');
      const group = card.querySelector('[data-arm-group]'), sub = card.querySelector('[data-arm-sub]');
      card.querySelector(`label[for="${group.id}"]`).textContent = text('group') + ' *';
      card.querySelector(`label[for="${sub.id}"]`).textContent = text('subscription');
      group.value = entry.group;
      sub.value = entry.subscription;
      for (const input of [group, sub]) {
        const update = () => {
          entry.group = group.value;
          entry.subscription = sub.value;
          entry.touched = true;
          validateGroup();
        };
        input.addEventListener('input', update);
        input.addEventListener('keydown', event => {
          if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); start(); }
        });
      }
      list.append(card);
    });
    validateGroup();
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
  function selectFile(entry = null) {
    if (busy) return;
    pendingEntry = entry?.id ?? null;
    fileInput.multiple = !entry?.file;
    fileInput.value = '';
    fileInput.click();
  }
  function open() {
    if (dialog.open || document.querySelector('dialog[open]')) return;
    for (const entry of entries) entry.touched = false;
    resetView();
    dialog.showModal();
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
    byId('template-report').replaceChildren(...(report.templates || []).map((item, index) => {
      const li = document.createElement('li');
      li.textContent = text('templateCounts').replace('{file}', entries[index].file.name)
        .replace('{group}', item.resourceGroupName).replace('{resources}', item.resourceCount);
      return li;
    }));
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
  async function applyResult(result, token, visible) {
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
      // Multi-template findings travel with the new diagram in Notes; the
      // existing single-template blank Notes behavior is preserved.
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
    for (const entry of entries) entry.touched = true;
    if (!validateGroup()) {
      const entry = entries.find(item => item.error || !item.file);
      const card = dialog.querySelector(`[data-arm-entry="${entry.id}"]`);
      card.querySelector(entry.file ? '[aria-invalid="true"]' : '[data-arm-choose]')?.focus();
      return;
    }
    if (entries.length > MAX_TEMPLATES || entries.reduce((sum, entry) => sum + entry.file.size, 0) > MAX_BYTES) { fail(text('limits')); return; }
    const invalidFile = entries.find(entry => !entry.file.size || !/\.json$/i.test(entry.file.name));
    if (invalidFile) { fail(text('template') + ' ' + (entries.indexOf(invalidFile) + 1) + ': ' + text('fileError')); return; }
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
    const inputs = [];
    const process = () => {
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
            void applyResult(event.data.result, token, visible);
          } else if (event.data.kind === 'error') {
            fail(event.data.message);
          }
        };
        worker.onerror = (event) => { event.preventDefault(); if (current(token)) fail(text('workerError')); };
        worker.postMessage({ raw: inputs, options: { title: 'ARM network diagram' } });
      } catch { fail(text('workerError')); }
    };
    const readNext = () => {
      if (!current(token)) return;
      if (inputs.length === entries.length) { process(); return; }
      const entry = entries[inputs.length];
      try { reader = new FileReader(); } catch { fail(text('workerError')); return; }
      reader.onprogress = (event) => {
        if (event.lengthComputable && current(token)) showProgress(15 * (inputs.length + event.loaded / event.total) / entries.length, 'read');
      };
      reader.onerror = () => { if (current(token)) fail(text('workerError')); };
      reader.onload = () => {
        if (!current(token)) return;
        inputs.push({ raw: reader.result, resourceGroupName: entry.group.trim(), subscriptionId: entry.subscription.trim() });
        reader = null;
        readNext();
      };
      try { reader.readAsText(entry.file); } catch { fail(text('workerError')); }
    };
    readNext();
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
      <div class="nds-arm-layout">
      <div class="nds-arm-content">
      <div id="nds-arm-form">
        <section class="nds-arm-export" aria-labelledby="nds-arm-export-title"><h3 id="nds-arm-export-title" class="nds-arm-export-title" data-arm-text="stepsTitle"></h3><ol id="nds-arm-export" class="nds-arm-export-list"></ol></section>
        <span id="nds-arm-selected" class="nds-arm-visually-hidden" role="status" aria-live="polite"></span>
        <div id="nds-arm-templates"></div>
        <button id="nds-arm-add" type="button" data-arm-text="add"></button>
        <input id="nds-arm-file" type="file" accept=".json,application/json" hidden>
        <details id="nds-arm-help" class="nds-arm-help">
        <summary data-arm-text="help"></summary>
        <p id="nds-arm-file-help" data-arm-text="fileHelp"></p>
        <div class="nds-arm-combined"><strong data-arm-text="resultTitle"></strong><p data-arm-text="resultHelp"></p><p data-arm-text="scopeHelp"></p></div>
        <p class="nds-arm-muted" data-arm-text="limits"></p>
        </details>
      </div>
      <div id="nds-arm-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" hidden>
        <div><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/><circle id="nds-arm-ring" cx="50" cy="50" r="42"/></svg><span id="nds-arm-percent"></span></div>
        <div><p id="nds-arm-stage" role="status" aria-live="polite"></p></div>
      </div>
      <p id="nds-arm-error" role="alert" hidden></p>
      <div id="nds-arm-result" hidden>
        <div id="nds-arm-report"><h3 data-arm-text="report"></h3><p id="nds-arm-counts" class="nds-arm-report-counts"></p><ul id="nds-arm-template-report"></ul><details><summary data-arm-text="details"></summary><ul id="nds-arm-warnings"></ul></details></div>
      </div>
      </div>
      </div>
      <div class="nds-arm-actions"><p class="nds-arm-muted" data-arm-text="local"></p><button id="nds-arm-cancel" type="button"></button><button id="nds-arm-start" class="nds-arm-primary" type="button" disabled></button></div>`;
    document.body.append(dialog);
    fileInput = byId('file');
    fileInput.addEventListener('change', () => {
      if (busy) return;
      const files = Array.from(fileInput.files);
      if (!files.length) return;
      const target = entries.find(entry => entry.id === pendingEntry);
      const count = entries.length + files.length - (target || entries.length === 1 && !entries[0].file ? 1 : 0);
      const total = entries.reduce((sum, entry) => sum + (entry !== target ? entry.file?.size || 0 : 0), 0)
        + files.reduce((sum, file) => sum + file.size, 0);
      if (count > MAX_TEMPLATES || total > MAX_BYTES) { fail(text('limits')); return; }
      if (files.some(file => !file.size || !/\.json$/i.test(file.name))) { fail(text('fileError')); return; }
      let first = target || (entries.length === 1 && !entries[0].file ? entries[0] : null);
      for (const file of files) {
        const entry = first || newEntry();
        if (!entries.includes(entry)) entries.push(entry);
        entry.file = file;
        first = null;
      }
      renderEntries();
      resetView();
      const selected = target || entries.find(entry => !entry.group.trim()) || entries.at(-1);
      dialog.querySelector(`[data-arm-entry="${selected.id}"] [data-arm-group]`).focus();
    });
    byId('add').addEventListener('click', () => selectFile());
    byId('start').addEventListener('click', start);
    byId('cancel').addEventListener('click', close);
    dialog.addEventListener('cancel', (event) => {
      if (event.target === dialog) {
        event.preventDefault();
        close();
      }
    });
    dialog.addEventListener('close', () => {
      if (!dialog.open && busy) cancelOperation();
    });
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
