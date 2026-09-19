/* Production help content; native React disclosures own rendering and focus. */
(function () {
  'use strict';

  const groups = [
    ['Saving and sharing', ['save', 'load', 'collaborate']],
    ['Exporting a picture', ['png', 'svg']],
    ['Working faster', ['palette', 'favorites', 'connections', 'tabs', 'copyGroup', 'textImages', 'sizeLabels', 'toolbar']],
    ['Working in the Notes', ['resizeNotes', 'comments', 'screenshot', 'annotate', 'sensitive']],
    ['Import ARM', ['exportArm', 'importArm', 'reviewArm']]
  ];
  const copy = {
    en: {
      arm: 'Import ARM',
      platform: 'Use canvas shortcuts outside text fields. On Mac, use Command instead of Ctrl.',
      shortcuts: ['Pan canvas', 'Redo resources only', 'Paste selection or image', 'Duplicate one resource', 'Select shapes on blank canvas', 'Edit text or add text on blank canvas'],
      save: ['Save JSON', 'Download the active tab, including resources, shapes, images, Notes and comments. Keep this editable copy.'],
      load: ['Load JSON', 'Save your current tab first. Load JSON replaces it with the selected file.'],
      collaborate: ['Work with a colleague', 'Send the JSON file to a colleague. They load, edit, save and return it. This is not live coediting.'],
      png: ['PNG', 'Save the whole diagram as an image for tickets or slides. Keep JSON for later edits.'],
      svg: ['SVG', 'Save a sharp, scalable picture for documents or printing. Keep JSON to edit in the studio.'],
      palette: ['Palette', 'Search for a resource. Click to add it, or drag it into place.'],
      favorites: ['Favorites', 'Click a star to keep an item at the top of the palette.'],
      connections: ['Connections', 'Drag between connection dots. Select the connection to choose Line or Arrow, then Straight or Bent.'],
      tabs: ['Tabs', 'Each tab has its own diagram and Notes. Save JSON downloads only the active tab.'],
      copyGroup: ['Copy a group', 'Select the outer group, then copy and paste. The group and its contents are copied together.'],
      textImages: ['Text and images', 'With Move selected, double-click blank canvas to type. Use Ctrl+V to paste an image.'],
      sizeLabels: ['Size and labels', 'Text Size changes both text and logo size. Double-click a caption to edit or clear it.'],
      toolbar: ['Drawing toolbar', 'Drag the dotted grip to a canvas edge. Use Move to select items and Hand to pan the view.'],
      resizeNotes: ['Resize Notes', 'Drag the top grip for height and the side grip for width. Notes stays above the tabs.'],
      comments: ['Comments', 'Set your name in Settings. Select Notes text to add a comment. Replies and names travel in JSON.'],
      screenshot: ['Screenshot', 'Click Screenshot and drag a region. Add marks, then choose Save PNG or Add to Notes.'],
      annotate: ['Edit a screenshot', 'Select a mark to move or resize it. Double-click a picture in Notes to reopen the editor.'],
      sensitive: ['Before sharing', 'Crop or pixelate sensitive areas. Inspect the saved PNG. Do not rely on shapes to hide private text.'],
      exportArm: ['Get template.json', 'In Azure Portal, open the resource group. Select Export template, then Download. Extract the ZIP file.'],
      importArm: ['Import a template', 'Choose template.json and enter Resource Group Name. Click Import, then View diagram. Processing stays on this device.'],
      reviewArm: ['Review the result', 'Read import Notes for omitted details and assumptions. The diagram does not deploy resources or verify connectivity.']
    },
    ja: {
      arm: 'ARM をインポート',
      platform: 'キャンバスのショートカットは入力欄の外で使います。Mac では Ctrl の代わりに Command を使います。',
      shortcuts: ['キャンバスを移動', 'リソースのみやり直し', '選択項目または画像を貼り付け', 'リソースを 1 つ複製', '空白部分で図形を範囲選択', '文字を編集、空白部分に文字を追加'],
      save: ['JSON を保存', '現在のタブのリソース、図形、画像、メモ、コメントを保存します。再編集用に保管してください。'],
      load: ['JSON を読み込み', '先に現在のタブを保存します。読み込むファイルで、そのタブの内容が置き換わります。'],
      collaborate: ['同僚と共同作業', 'JSON ファイルを同僚に送ります。相手が読み込み、編集、保存して返送します。同時編集ではありません。'],
      png: ['PNG', '図全体を画像として保存します。ケースやスライドに使えます。再編集には JSON を残します。'],
      svg: ['SVG', '拡大しても鮮明な画像を保存します。文書や印刷に使えます。スタジオでの再編集には JSON が必要です。'],
      palette: ['パレット', 'リソースを検索します。クリックで追加するか、好きな位置にドラッグします。'],
      favorites: ['お気に入り', '星をクリックすると、項目がパレットの上部に表示されます。'],
      connections: ['接続', '接続点から別の接続点へドラッグします。線を選び、線・矢印と直線・折れ線を設定します。'],
      tabs: ['タブ', '各タブに図とメモがあります。JSON 保存の対象は現在のタブだけです。'],
      copyGroup: ['グループをコピー', '外側のグループを選び、コピーして貼り付けます。中のリソースも一緒にコピーされます。'],
      textImages: ['文字と画像', '移動ツールで空白部分をダブルクリックすると文字を入力できます。画像は Ctrl+V で貼り付けます。'],
      sizeLabels: ['サイズとラベル', '文字サイズを変えるとロゴも拡大・縮小します。キャプションはダブルクリックで編集・削除できます。'],
      toolbar: ['描画ツールバー', '点のあるグリップをキャンバスの端へドラッグします。ハンドツールは図を動かさず表示を移動します。'],
      resizeNotes: ['メモのサイズ', '上のグリップで高さ、横のグリップで幅を変えます。メモはタブの上に収まります。'],
      comments: ['コメント', '設定で名前を入力します。メモの文字を選んでコメントを追加します。返信と名前も JSON に保存されます。'],
      screenshot: ['スクリーンショット', 'スクリーンショットを押し、範囲をドラッグします。注釈を付けて PNG 保存かメモへの追加を選びます。'],
      annotate: ['スクリーンショットを編集', '注釈を選んで移動・サイズ変更します。メモの画像をダブルクリックすると再編集できます。'],
      sensitive: ['共有する前に', '機密部分を切り抜くか、ぼかします。保存した PNG を確認してください。図形を重ねるだけでは隠せません。'],
      exportArm: ['template.json を取得', 'Azure Portal でリソースグループを開きます。Export template、Download の順に選び、ZIP を展開します。'],
      importArm: ['テンプレートを読み込み', 'template.json を選び、リソースグループ名を入力します。インポート後に図を開きます。処理は端末内で行います。'],
      reviewArm: ['結果を確認', '省略した情報や前提はインポートのメモで確認します。図の作成はデプロイや接続確認ではありません。']
    },
    zh: {
      arm: '导入 ARM',
      platform: '在文本框外使用画布快捷键。Mac 上用 Command 代替 Ctrl。',
      shortcuts: ['平移画布', '仅重做资源', '粘贴选中内容或图片', '复制单个资源', '在空白处框选形状', '编辑文字或在空白处添加文字'],
      save: ['保存 JSON', '下载当前标签页的资源、形状、图片、备注和批注。保留此文件以便继续编辑。'],
      load: ['加载 JSON', '先保存当前标签页。加载 JSON 会用选中的文件替换该标签页。'],
      collaborate: ['与同事协作', '把 JSON 文件发给同事。对方加载、编辑、保存后回传。这不是实时协同编辑。'],
      png: ['PNG', '将整张图保存为图片，用于工单或幻灯片。保留 JSON 以便以后编辑。'],
      svg: ['SVG', '保存清晰且可缩放的图片，用于文档或打印。回到工作室编辑时需要 JSON。'],
      palette: ['素材面板', '搜索资源。单击添加，或拖到所需位置。'],
      favorites: ['收藏', '点击星标，将常用项目放在面板顶部。'],
      connections: ['连接', '在连接点之间拖动。选中连线，设置线条或箭头，以及直线或折线。'],
      tabs: ['标签页', '每个标签页都有自己的图和备注。保存 JSON 只下载当前标签页。'],
      copyGroup: ['复制资源组', '选中外层资源组，再复制并粘贴。组内资源也会一起复制。'],
      textImages: ['文字与图片', '选择移动工具，双击画布空白处输入文字。用 Ctrl+V 粘贴图片。'],
      sizeLabels: ['大小与标签', '文字大小会同时调整文字和图标。双击说明标签可编辑或清空。'],
      toolbar: ['绘图工具栏', '拖动点状手柄，将工具栏停靠在画布边缘。手形工具只平移视图，不移动资源。'],
      resizeNotes: ['调整备注大小', '拖动顶部手柄调整高度，侧边手柄调整宽度。备注不会遮住标签页。'],
      comments: ['批注', '在设置中填写姓名。选中备注文字后添加批注。回复和姓名会保存在 JSON 中。'],
      screenshot: ['截图', '点击截图并拖选区域。添加标记后，选择保存 PNG 或添加到备注。'],
      annotate: ['编辑截图', '选中标记以移动或调整大小。双击备注中的图片可重新打开编辑器。'],
      sensitive: ['分享前', '裁剪敏感区域或打码，并检查保存的 PNG。不要仅用形状覆盖隐私文字。'],
      exportArm: ['获取 template.json', '在 Azure Portal 打开资源组。选择 Export template，再选 Download。解压 ZIP 文件。'],
      importArm: ['导入模板', '选择 template.json 并填写资源组名称。点击导入，再查看图。所有处理均在本机完成。'],
      reviewArm: ['检查结果', '在导入备注中查看省略的信息和假设。生成图不会部署资源或验证连接。']
    },
    es: {
      arm: 'Importar ARM',
      platform: 'Usa los atajos fuera de los campos de texto. En Mac, cambia Ctrl por Command.',
      shortcuts: ['Mover la vista', 'Rehacer solo recursos', 'Pegar selección o imagen', 'Duplicar un recurso', 'Seleccionar formas en el lienzo vacío', 'Editar texto o añadirlo en un espacio vacío'],
      save: ['Guardar JSON', 'Descarga la pestaña activa con recursos, formas, imágenes, notas y comentarios. Conserva esta copia editable.'],
      load: ['Cargar JSON', 'Guarda primero la pestaña actual. Cargar JSON la sustituye por el archivo elegido.'],
      collaborate: ['Colaborar', 'Envía el JSON a un compañero. Lo carga, edita, guarda y devuelve. No es edición simultánea.'],
      png: ['PNG', 'Guarda todo el diagrama como imagen para casos o diapositivas. Conserva el JSON para editarlo.'],
      svg: ['SVG', 'Guarda una imagen nítida y escalable para documentos o impresión. Usa JSON para volver a editar en el estudio.'],
      palette: ['Paleta', 'Busca un recurso. Haz clic para añadirlo o arrástralo a su lugar.'],
      favorites: ['Favoritos', 'Pulsa la estrella para fijar un elemento arriba de la paleta.'],
      connections: ['Conexiones', 'Arrastra entre puntos de conexión. Selecciona la conexión para elegir línea o flecha y trazado recto o con codos.'],
      tabs: ['Pestañas', 'Cada pestaña tiene su diagrama y sus notas. Guardar JSON descarga solo la pestaña activa.'],
      copyGroup: ['Copiar un grupo', 'Selecciona el grupo exterior, copia y pega. Su contenido se copia junto con él.'],
      textImages: ['Texto e imágenes', 'Con Mover seleccionado, haz doble clic en un espacio vacío para escribir. Pega imágenes con Ctrl+V.'],
      sizeLabels: ['Tamaño y etiquetas', 'Tamaño del texto cambia también el logotipo. Haz doble clic en una etiqueta para editarla o borrarla.'],
      toolbar: ['Barra de dibujo', 'Arrastra el asa de puntos hasta un borde. La herramienta Mano desplaza la vista sin mover recursos.'],
      resizeNotes: ['Ajustar Notas', 'Arrastra el asa superior para cambiar la altura y la lateral para el ancho. Notas queda encima de las pestañas.'],
      comments: ['Comentarios', 'Escribe tu nombre en Configuración. Selecciona texto en Notas y añade un comentario. JSON conserva respuestas y nombres.'],
      screenshot: ['Captura de pantalla', 'Pulsa Captura y arrastra una región. Añade marcas y elige Guardar PNG o Añadir a Notas.'],
      annotate: ['Editar una captura', 'Selecciona una marca para moverla o cambiar su tamaño. Haz doble clic en una imagen de Notas para editarla.'],
      sensitive: ['Antes de compartir', 'Recorta o pixela las zonas sensibles. Revisa el PNG guardado. No ocultes texto privado solo con formas.'],
      exportArm: ['Obtener template.json', 'Abre el grupo de recursos en Azure Portal. Elige Export template y Download. Extrae el ZIP.'],
      importArm: ['Importar una plantilla', 'Elige template.json e introduce el nombre del grupo. Pulsa Importar y Ver diagrama. Se procesa en tu dispositivo.'],
      reviewArm: ['Revisar el resultado', 'Consulta los detalles omitidos y supuestos en Notas. El diagrama no despliega recursos ni comprueba la conectividad.']
    },
    fr: {
      arm: 'Importer ARM',
      platform: 'Utilisez les raccourcis hors des champs de texte. Sur Mac, remplacez Ctrl par Command.',
      shortcuts: ['Déplacer la vue', 'Rétablir les ressources uniquement', 'Coller la sélection ou une image', 'Dupliquer une ressource', 'Sélectionner des formes sur une zone vide', 'Modifier du texte ou en ajouter sur une zone vide'],
      save: ['Enregistrer JSON', 'Téléchargez l’onglet actif avec ses ressources, formes, images, notes et commentaires. Gardez cette copie modifiable.'],
      load: ['Charger JSON', 'Enregistrez d’abord l’onglet actuel. Charger JSON le remplace par le fichier choisi.'],
      collaborate: ['Travailler avec un collègue', 'Envoyez le JSON à un collègue. Il le charge, le modifie, l’enregistre et le renvoie. Ce n’est pas une coédition en direct.'],
      png: ['PNG', 'Enregistrez tout le diagramme en image pour un ticket ou une présentation. Gardez le JSON pour les modifications.'],
      svg: ['SVG', 'Enregistrez une image nette et redimensionnable pour les documents ou l’impression. Gardez le JSON pour modifier dans le studio.'],
      palette: ['Palette', 'Recherchez une ressource. Cliquez pour l’ajouter ou faites-la glisser à sa place.'],
      favorites: ['Favoris', 'Cliquez sur l’étoile pour garder un élément en haut de la palette.'],
      connections: ['Connexions', 'Reliez deux points par glisser-déposer. Sélectionnez la connexion pour choisir une ligne ou une flèche, droite ou coudée.'],
      tabs: ['Onglets', 'Chaque onglet contient son diagramme et ses notes. Enregistrer JSON télécharge uniquement l’onglet actif.'],
      copyGroup: ['Copier un groupe', 'Sélectionnez le groupe extérieur, puis copiez et collez. Son contenu est copié avec lui.'],
      textImages: ['Texte et images', 'Avec Déplacer, double-cliquez sur une zone vide pour écrire. Collez une image avec Ctrl+V.'],
      sizeLabels: ['Taille et libellés', 'La taille du texte modifie aussi celle du logo. Double-cliquez sur un libellé pour le modifier ou l’effacer.'],
      toolbar: ['Barre de dessin', 'Faites glisser la poignée à points vers un bord. L’outil Main déplace la vue sans déplacer les ressources.'],
      resizeNotes: ['Redimensionner Notes', 'La poignée supérieure règle la hauteur ; celle du côté règle la largeur. Notes reste au-dessus des onglets.'],
      comments: ['Commentaires', 'Indiquez votre nom dans Paramètres. Sélectionnez du texte dans Notes pour commenter. Les réponses et noms sont conservés en JSON.'],
      screenshot: ['Capture d’écran', 'Cliquez sur Capture et délimitez une zone. Annotez, puis choisissez Enregistrer PNG ou Ajouter aux notes.'],
      annotate: ['Modifier une capture', 'Sélectionnez une annotation pour la déplacer ou la redimensionner. Double-cliquez sur une image dans Notes pour la modifier.'],
      sensitive: ['Avant de partager', 'Recadrez ou pixellisez les zones sensibles. Vérifiez le PNG enregistré. Ne masquez pas du texte privé avec de simples formes.'],
      exportArm: ['Obtenir template.json', 'Dans Azure Portal, ouvrez le groupe de ressources. Choisissez Export template, puis Download. Décompressez le ZIP.'],
      importArm: ['Importer un modèle', 'Choisissez template.json et indiquez le nom du groupe. Cliquez sur Importer, puis Voir le diagramme. Le traitement reste local.'],
      reviewArm: ['Vérifier le résultat', 'Lisez les détails omis et hypothèses dans Notes. Le diagramme ne déploie rien et ne vérifie pas la connectivité.']
    },
    de: {
      arm: 'ARM importieren',
      platform: 'Canvas-Tastenkürzel gelten außerhalb von Textfeldern. Auf dem Mac ersetzt Command die Ctrl-Taste.',
      shortcuts: ['Ansicht verschieben', 'Nur Ressourcen wiederherstellen', 'Auswahl oder Bild einfügen', 'Eine Ressource duplizieren', 'Formen auf leerer Fläche auswählen', 'Text bearbeiten oder auf leerer Fläche hinzufügen'],
      save: ['JSON speichern', 'Lädt den aktiven Tab mit Ressourcen, Formen, Bildern, Notizen und Kommentaren herunter. Bewahren Sie diese bearbeitbare Kopie auf.'],
      load: ['JSON laden', 'Speichern Sie zuerst den aktuellen Tab. JSON laden ersetzt ihn durch die gewählte Datei.'],
      collaborate: ['Mit Kollegen arbeiten', 'Senden Sie die JSON-Datei an einen Kollegen. Er lädt, bearbeitet, speichert und sendet sie zurück. Keine gleichzeitige Bearbeitung.'],
      png: ['PNG', 'Speichert das gesamte Diagramm als Bild für Tickets oder Folien. Behalten Sie JSON zum Bearbeiten.'],
      svg: ['SVG', 'Speichert ein scharfes, skalierbares Bild für Dokumente oder Druck. Zum Bearbeiten im Studio benötigen Sie JSON.'],
      palette: ['Palette', 'Suchen Sie eine Ressource. Klicken Sie zum Hinzufügen oder ziehen Sie sie an die gewünschte Stelle.'],
      favorites: ['Favoriten', 'Klicken Sie auf den Stern, um einen Eintrag oben in der Palette zu behalten.'],
      connections: ['Verbindungen', 'Ziehen Sie zwischen Verbindungspunkten. Wählen Sie die Verbindung und dann Linie oder Pfeil sowie gerade oder abgewinkelt.'],
      tabs: ['Tabs', 'Jeder Tab hat sein eigenes Diagramm und seine Notizen. JSON speichern lädt nur den aktiven Tab herunter.'],
      copyGroup: ['Gruppe kopieren', 'Wählen Sie die äußere Gruppe. Kopieren und fügen Sie sie ein. Ihr Inhalt wird mitkopiert.'],
      textImages: ['Text und Bilder', 'Wählen Sie Verschieben. Doppelklicken Sie auf eine leere Fläche zum Schreiben. Bilder fügen Sie mit Ctrl+V ein.'],
      sizeLabels: ['Größe und Beschriftung', 'Textgröße ändert auch die Logogröße. Doppelklicken Sie auf eine Beschriftung, um sie zu bearbeiten oder zu leeren.'],
      toolbar: ['Zeichenleiste', 'Ziehen Sie den gepunkteten Griff an einen Rand. Das Handwerkzeug verschiebt die Ansicht, nicht die Ressourcen.'],
      resizeNotes: ['Notizen vergrößern', 'Der obere Griff ändert die Höhe, der seitliche die Breite. Notizen bleiben oberhalb der Tabs.'],
      comments: ['Kommentare', 'Tragen Sie Ihren Namen in Einstellungen ein. Markieren Sie Notiztext zum Kommentieren. JSON speichert Antworten und Namen.'],
      screenshot: ['Screenshot', 'Klicken Sie auf Screenshot und ziehen Sie einen Bereich auf. Markieren Sie ihn und wählen Sie PNG speichern oder zu Notizen hinzufügen.'],
      annotate: ['Screenshot bearbeiten', 'Wählen Sie eine Markierung zum Verschieben oder Skalieren. Ein Doppelklick auf ein Notizbild öffnet den Editor erneut.'],
      sensitive: ['Vor dem Teilen', 'Schneiden oder verpixeln Sie sensible Bereiche. Prüfen Sie das gespeicherte PNG. Formen allein verdecken private Texte nicht sicher.'],
      exportArm: ['template.json abrufen', 'Öffnen Sie die Ressourcengruppe im Azure Portal. Wählen Sie Export template, dann Download. Entpacken Sie die ZIP-Datei.'],
      importArm: ['Vorlage importieren', 'Wählen Sie template.json und geben Sie den Gruppennamen ein. Klicken Sie auf Importieren und Diagramm anzeigen. Die Verarbeitung bleibt lokal.'],
      reviewArm: ['Ergebnis prüfen', 'Lesen Sie ausgelassene Details und Annahmen in Notizen. Das Diagramm stellt keine Ressourcen bereit und prüft keine Verbindung.']
    },
    pt: {
      arm: 'Importar ARM',
      platform: 'Use os atalhos fora dos campos de texto. No Mac, use Command no lugar de Ctrl.',
      shortcuts: ['Mover a visualização', 'Refazer apenas recursos', 'Colar seleção ou imagem', 'Duplicar um recurso', 'Selecionar formas numa área vazia', 'Editar texto ou adicioná-lo numa área vazia'],
      save: ['Salvar JSON', 'Baixa a guia ativa com recursos, formas, imagens, notas e comentários. Guarde esta cópia editável.'],
      load: ['Carregar JSON', 'Salve primeiro a guia atual. Carregar JSON substitui essa guia pelo arquivo escolhido.'],
      collaborate: ['Trabalhar com um colega', 'Envie o JSON a um colega. Ele carrega, edita, salva e devolve o arquivo. Não é edição simultânea.'],
      png: ['PNG', 'Salva todo o diagrama como imagem para chamados ou slides. Guarde o JSON para editar depois.'],
      svg: ['SVG', 'Salva uma imagem nítida e redimensionável para documentos ou impressão. Use JSON para editar novamente no estúdio.'],
      palette: ['Paleta', 'Pesquise um recurso. Clique para adicioná-lo ou arraste-o até o local desejado.'],
      favorites: ['Favoritos', 'Clique na estrela para manter um item no topo da paleta.'],
      connections: ['Conexões', 'Arraste entre pontos de conexão. Selecione a conexão para escolher linha ou seta e traçado reto ou dobrado.'],
      tabs: ['Guias', 'Cada guia tem seu diagrama e suas notas. Salvar JSON baixa apenas a guia ativa.'],
      copyGroup: ['Copiar um grupo', 'Selecione o grupo externo, copie e cole. O conteúdo é copiado junto com o grupo.'],
      textImages: ['Texto e imagens', 'Com Mover selecionado, clique duas vezes numa área vazia para escrever. Cole imagens com Ctrl+V.'],
      sizeLabels: ['Tamanho e rótulos', 'Tamanho do texto também altera o logotipo. Clique duas vezes num rótulo para editá-lo ou apagá-lo.'],
      toolbar: ['Barra de desenho', 'Arraste a alça pontilhada até uma borda. A ferramenta Mão move a visualização, não os recursos.'],
      resizeNotes: ['Redimensionar Notas', 'Arraste a alça superior para a altura e a lateral para a largura. Notas fica acima das guias.'],
      comments: ['Comentários', 'Defina seu nome em Configurações. Selecione texto em Notas para comentar. JSON preserva respostas e nomes.'],
      screenshot: ['Captura de tela', 'Clique em Captura e arraste uma região. Adicione marcas e escolha Salvar PNG ou Adicionar às Notas.'],
      annotate: ['Editar uma captura', 'Selecione uma marca para mover ou redimensionar. Clique duas vezes numa imagem em Notas para reabrir o editor.'],
      sensitive: ['Antes de compartilhar', 'Recorte ou pixele áreas sensíveis. Confira o PNG salvo. Não use apenas formas para ocultar texto privado.'],
      exportArm: ['Obter template.json', 'Abra o grupo de recursos no Azure Portal. Selecione Export template e Download. Extraia o arquivo ZIP.'],
      importArm: ['Importar um modelo', 'Escolha template.json e informe o nome do grupo. Clique em Importar e Ver diagrama. O processamento é local.'],
      reviewArm: ['Revisar o resultado', 'Leia nas Notas os detalhes omitidos e as premissas. O diagrama não implanta recursos nem verifica a conectividade.']
    },
    ko: {
      arm: 'ARM 가져오기',
      platform: '캔버스 단축키는 입력란 밖에서 사용합니다. Mac에서는 Ctrl 대신 Command를 사용하세요.',
      shortcuts: ['캔버스 이동', '리소스만 다시 실행', '선택 항목 또는 이미지 붙여넣기', '리소스 하나 복제', '빈 영역에서 도형 선택', '텍스트 편집 또는 빈 영역에 추가'],
      save: ['JSON 저장', '현재 탭의 리소스, 도형, 이미지, 메모와 댓글을 다운로드합니다. 다시 편집하려면 이 파일을 보관하세요.'],
      load: ['JSON 불러오기', '먼저 현재 탭을 저장하세요. JSON을 불러오면 선택한 파일로 현재 탭이 바뀝니다.'],
      collaborate: ['동료와 협업', 'JSON 파일을 동료에게 보내세요. 동료가 불러와 편집하고 저장한 뒤 돌려줍니다. 실시간 공동 편집은 아닙니다.'],
      png: ['PNG', '전체 다이어그램을 이미지로 저장해 티켓이나 슬라이드에 사용합니다. 편집용 JSON도 보관하세요.'],
      svg: ['SVG', '문서나 인쇄에 사용할 선명한 벡터 이미지를 저장합니다. 스튜디오에서 편집하려면 JSON이 필요합니다.'],
      palette: ['팔레트', '리소스를 검색하세요. 클릭해 추가하거나 원하는 위치로 끌어 놓으세요.'],
      favorites: ['즐겨찾기', '별표를 클릭하면 항목이 팔레트 상단에 표시됩니다.'],
      connections: ['연결', '연결점 사이를 드래그하세요. 연결선을 선택해 선 또는 화살표와 직선 또는 꺾인 선을 고르세요.'],
      tabs: ['탭', '각 탭에 별도의 다이어그램과 메모가 있습니다. JSON 저장은 현재 탭만 다운로드합니다.'],
      copyGroup: ['그룹 복사', '바깥쪽 그룹을 선택해 복사하고 붙여넣으세요. 그룹 안의 리소스도 함께 복사됩니다.'],
      textImages: ['텍스트와 이미지', '이동 도구로 빈 캔버스를 두 번 클릭해 입력하세요. 이미지는 Ctrl+V로 붙여넣습니다.'],
      sizeLabels: ['크기와 레이블', '텍스트 크기를 바꾸면 로고 크기도 바뀝니다. 캡션을 두 번 클릭해 편집하거나 지울 수 있습니다.'],
      toolbar: ['그리기 도구 모음', '점 모양 손잡이를 캔버스 가장자리로 끌어 놓으세요. 손 도구는 리소스가 아닌 화면을 이동합니다.'],
      resizeNotes: ['메모 크기 조절', '위쪽 손잡이로 높이, 옆쪽 손잡이로 너비를 조절하세요. 메모는 탭 위에 머무릅니다.'],
      comments: ['댓글', '설정에서 이름을 입력하세요. 메모의 글을 선택해 댓글을 답니다. 답글과 이름도 JSON에 저장됩니다.'],
      screenshot: ['스크린샷', '스크린샷을 누르고 영역을 드래그하세요. 표시를 추가한 뒤 PNG 저장 또는 메모에 추가를 선택하세요.'],
      annotate: ['스크린샷 편집', '표시를 선택해 이동하거나 크기를 바꾸세요. 메모의 이미지를 두 번 클릭하면 편집기가 다시 열립니다.'],
      sensitive: ['공유 전 확인', '민감한 부분을 자르거나 모자이크 처리하세요. 저장한 PNG를 확인하세요. 도형만 덮어 개인정보를 가리지 마세요.'],
      exportArm: ['template.json 받기', 'Azure Portal에서 리소스 그룹을 여세요. Export template과 Download를 선택한 뒤 ZIP 파일을 푸세요.'],
      importArm: ['템플릿 가져오기', 'template.json을 선택하고 리소스 그룹 이름을 입력하세요. 가져오기 후 다이어그램을 여세요. 처리는 기기 안에서 이루어집니다.'],
      reviewArm: ['결과 검토', '가져오기 메모에서 생략한 정보와 가정을 확인하세요. 다이어그램은 리소스를 배포하거나 연결을 검증하지 않습니다.']
    }
  };
  const overrides = {
    'Tools:H': 0,
    'Editing:Ctrl+Y': 1,
    'Editing:Ctrl+V': 2,
    'Editing:Ctrl+D': 3,
    'Selection:Drag': 4,
    'Selection:Double-click': 5
  };
  window.ndsSettingsHelp = Object.freeze({
    install: dictionaries => {
      for (const [lang, localized] of Object.entries(copy)) {
        if (lang === 'en') continue;
        const dictionary = dictionaries[lang];
        if (!dictionary) throw new Error(`Missing native Settings language: ${lang}`);
        const add = (source, text) => {
          if (!dictionary[source]) dictionary[source] = text;
        };
        add(copy.en.arm, localized.arm);
        add(copy.en.platform, localized.platform);
        copy.en.shortcuts.forEach((source, index) => add(source, localized.shortcuts[index]));
        for (const [, ids] of groups) {
          for (const id of ids) {
            copy.en[id].forEach((source, index) => add(source, localized[id][index]));
          }
        }
      }
    },
    guides: () => groups.map(([label, ids]) => ({
      label,
      items: ids.map(id => {
        const [term, desc] = copy.en[id];
        return { term, desc, translateTerm: true };
      })
    })),
    shortcuts: original => original.map(group => ({
      ...group,
      rows: group.rows.map(row => {
        const index = overrides[`${group.label}:${row.keys}`];
        return index === undefined ? row : { ...row, label: copy.en.shortcuts[index] };
      })
    })),
    platformNote: () => copy.en.platform
  });
}());
