import type { Dict } from './strings';

/**
 * v0.9.59 — the in-app Guide (Settings ▸ Guide) and the version readout.
 *
 * Kept in its own file for the same reason `strings-knowledge.ts` is: these
 * are long prose paragraphs, and dropping twenty of them into the middle of
 * `strings.ts` would bury the short UI labels that file is actually for.
 * Merged into `DICT` at the bottom of `strings.ts`.
 *
 * Not translated anywhere, on purpose: JSON, PNG, SVG, Teams. They are format
 * and product names, and every language ships them in Latin script.
 */

const ja: Dict = {
  Guide: 'ガイド',
  'Saving and sharing': '保存と共有',
  'Save JSON': 'JSON を保存',
  'Downloads the tab you are working on — nodes, connections, shapes and notes — as a single .json file. This is the only copy that leaves the browser, so save before you close.':
    '作業中のタブ（ノード、接続、図形、メモ）を 1 つの .json ファイルとしてダウンロードします。ブラウザーの外に残る唯一のコピーですので、閉じる前に必ず保存してください。',
  'Load JSON': 'JSON を読み込み',
  'Opens a .json file back into the studio, replacing what is currently on screen. Anything unsaved is lost, so save first.':
    '.json ファイルを開き、現在画面にある内容を置き換えます。未保存の内容は失われるため、先に保存してください。',
  'Work with a colleague': '同僚と共同作業する',
  'There is no server and no sign-in. Send someone the .json file; they open it with Load JSON, edit it, save it again and send it back. The file is plain text, so it also works in a Teams chat or attached to a ticket.':
    'サーバーもサインインもありません。.json ファイルを相手に送り、相手は「JSON を読み込み」で開いて編集し、再び保存して返送します。ファイルはテキスト形式なので、Teams のチャットやケースへの添付でもそのまま使えます。',
  'Exporting a picture': '画像として書き出す',
  'Downloads the whole diagram as an image, at twice screen resolution so it stays readable when scaled. Use it for tickets, email and slide decks. A PNG cannot be edited again — keep the .json.':
    '図全体を画像としてダウンロードします。画面の 2 倍の解像度なので、拡大しても文字が読めます。ケース、メール、スライドに最適です。PNG は再編集できないため、.json も残しておいてください。',
  'Downloads the whole diagram as vector art. It stays sharp at any size, opens in any browser, and can be embedded in a wiki page or a document. Best choice for anything that will be printed or zoomed.':
    '図全体をベクター形式でダウンロードします。どんなサイズでも鮮明で、どのブラウザーでも開け、Wiki ページや文書に埋め込めます。印刷や拡大を伴う用途に最適です。',
  'Working faster': '効率よく作業する',
  'Click any tile to drop it at the centre of the canvas, or drag it exactly where you want it. The search box at the top looks through resources, icons and shapes at once.':
    'タイルをクリックするとキャンバス中央に配置され、ドラッグすれば好きな位置に置けます。上部の検索ボックスは、リソース・アイコン・図形をまとめて検索します。',
  'Star ☆ any resource, icon or shape to pin it to the Favorites section at the top of the palette, so the handful you use every day is never more than one click away.':
    'リソース・アイコン・図形の ☆ をクリックすると、パレット上部の「お気に入り」に固定されます。毎日使うものを 1 クリックで呼び出せます。',
  Connections: '接続',
  'Hover over an item to reveal its connect dots, then drag from a dot onto another item. The line keeps up when either end is moved. Arrows from the Shapes section are free-floating annotations and attach to nothing.':
    '項目にカーソルを合わせると接続ドットが表示されます。ドットから別の項目へドラッグしてください。どちらかを動かしても線は追従します。「図形」セクションの矢印は自由に動く注釈で、何にも接続しません。',
  Tabs: 'タブ',
  'Each tab holds its own diagram, shapes and notes — useful for before/after or for one design per region. Save JSON writes the tab you are currently on.':
    'タブごとに図・図形・メモを個別に保持します。変更前後の比較や、リージョンごとの構成に便利です。「JSON を保存」は現在開いているタブを書き出します。',
  Version: 'バージョン',
  'Working in the Notes':
    'メモでの作業',
  'Select a run of text in a note and attach a comment to it. Replies build a thread, and resolving one hides it without deleting it. Set your name in Settings so your colleague knows who wrote what. Comments travel in the .json, so both of you see the same thread.':
    'メモ内のテキストを選択してコメントを添付します。返信はスレッドになり、解決するとコメントは削除されずに非表示になります。設定で名前を入力しておくと、誰が書いたのかが同僚にも分かります。コメントは .json に含まれて移動するため、双方が同じスレッドを見られます。',
  'Screenshot':
    'スクリーンショット',
  'Drag a region out of the diagram and it goes straight into the annotation editor. Release the mouse to open it — there is no confirm step, because overshooting is repaired by the crop tool one screen later. An image already on the clipboard can be pasted into a note directly.':
    '図から範囲をドラッグすると、そのまま注釈エディターが開きます。マウスを離すだけで開きます。確認の手順はありません。行き過ぎた分は次の画面の「切り抜き」で直せるためです。クリップボードにある画像も、メモに直接貼り付けられます。',
  'Annotating a screenshot':
    'スクリーンショットに注釈を付ける',
  'Arrow, box, ellipse, callout, step number, text and highlighter stay editable — click one to select it, drag it to move it, or drag a handle to resize it. Hold Shift for 45° arrows, circles and squares. Double-click a picture in a note to reopen the editor later.':
    '矢印・四角・楕円・吹き出し・手順番号・テキスト・蛍光ペンは、後からでも編集できます。クリックで選択、ドラッグで移動、ハンドルのドラッグでサイズ変更です。Shift を押しながらで 45 度の矢印・正円・正方形になります。メモ内の画像をダブルクリックすると、エディターを開き直せます。',
  'Hiding something sensitive':
    '見せたくない情報を隠す',
  'Pixelate and Crop change the picture itself rather than adding a layer, so what they remove cannot be recovered by whoever opens the file. Undo still works while the editor is open. Everything else is stored as a shape and can be changed at any time.':
    '「ぼかし」と「切り抜き」はレイヤーを重ねるのではなく画像そのものを変更します。そのため、取り除いた内容はファイルを開いた人にも復元できません。エディターを開いている間は元に戻せます。それ以外はすべて図形として保存され、いつでも変更できます。',
  'Screenshot editor':
    'スクリーンショット エディター',
  'Select, arrow, box, ellipse, callout':
    '選択、矢印、四角、楕円、吹き出し',
  'Text, step number, highlighter':
    'テキスト、手順番号、蛍光ペン',
  'Pixelate, crop':
    'ぼかし、切り抜き',
  '45° arrows, circles and squares':
    '45 度の矢印・正円・正方形',
  'Delete the selected annotation':
    '選択した注釈を削除',
  'Close the editor without inserting':
    '挿入せずにエディターを閉じる',
};

const zh: Dict = {
  Guide: '使用指南',
  'Saving and sharing': '保存与共享',
  'Save JSON': '保存 JSON',
  'Downloads the tab you are working on — nodes, connections, shapes and notes — as a single .json file. This is the only copy that leaves the browser, so save before you close.':
    '将当前标签页（节点、连接、形状和备注）下载为一个 .json 文件。这是唯一能离开浏览器的副本，请在关闭前保存。',
  'Load JSON': '加载 JSON',
  'Opens a .json file back into the studio, replacing what is currently on screen. Anything unsaved is lost, so save first.':
    '打开 .json 文件并替换当前画布上的内容。未保存的内容会丢失，请先保存。',
  'Work with a colleague': '与同事协作',
  'There is no server and no sign-in. Send someone the .json file; they open it with Load JSON, edit it, save it again and send it back. The file is plain text, so it also works in a Teams chat or attached to a ticket.':
    '没有服务器，也无需登录。把 .json 文件发给对方，对方用“加载 JSON”打开、编辑、再保存并回传即可。该文件是纯文本，因此也可以直接在 Teams 聊天中发送或作为工单附件。',
  'Exporting a picture': '导出图片',
  'Downloads the whole diagram as an image, at twice screen resolution so it stays readable when scaled. Use it for tickets, email and slide decks. A PNG cannot be edited again — keep the .json.':
    '将整张图导出为图片，分辨率为屏幕的两倍，放大后依然清晰可读。适合工单、邮件和演示文稿。PNG 无法再次编辑，请保留 .json 文件。',
  'Downloads the whole diagram as vector art. It stays sharp at any size, opens in any browser, and can be embedded in a wiki page or a document. Best choice for anything that will be printed or zoomed.':
    '将整张图导出为矢量图形。任意尺寸都保持清晰，可在任何浏览器中打开，也可嵌入 wiki 页面或文档。需要打印或缩放时首选此格式。',
  'Working faster': '提高效率',
  'Click any tile to drop it at the centre of the canvas, or drag it exactly where you want it. The search box at the top looks through resources, icons and shapes at once.':
    '单击任意磁贴即可放置到画布中央，或拖动到你想要的位置。顶部的搜索框会同时搜索资源、图标和形状。',
  'Star ☆ any resource, icon or shape to pin it to the Favorites section at the top of the palette, so the handful you use every day is never more than one click away.':
    '为任意资源、图标或形状点击 ☆，即可固定到面板顶部的“收藏”区，让每天都用的那几个始终一键可达。',
  Connections: '连接',
  'Hover over an item to reveal its connect dots, then drag from a dot onto another item. The line keeps up when either end is moved. Arrows from the Shapes section are free-floating annotations and attach to nothing.':
    '将鼠标悬停在某个对象上会显示连接点，从连接点拖动到另一个对象即可。移动任意一端时连线都会跟随。“形状”区的箭头是可自由移动的批注，不会连接到任何对象。',
  Tabs: '标签页',
  'Each tab holds its own diagram, shapes and notes — useful for before/after or for one design per region. Save JSON writes the tab you are currently on.':
    '每个标签页都有各自的图、形状和备注，适合做变更前后对比或按区域分别设计。“保存 JSON”导出的是当前所在的标签页。',
  Version: '版本',
  'Working in the Notes':
    '在笔记中工作',
  'Select a run of text in a note and attach a comment to it. Replies build a thread, and resolving one hides it without deleting it. Set your name in Settings so your colleague knows who wrote what. Comments travel in the .json, so both of you see the same thread.':
    '在笔记中选中一段文字即可为其添加批注。回复会形成一个会话，解决后批注会被隐藏而不会删除。请在“设置”中填写姓名，同事才能知道每条批注出自谁手。批注随 .json 一起传递，因此双方看到的是同一个会话。',
  'Screenshot':
    '屏幕截图',
  'Drag a region out of the diagram and it goes straight into the annotation editor. Release the mouse to open it — there is no confirm step, because overshooting is repaired by the crop tool one screen later. An image already on the clipboard can be pasted into a note directly.':
    '从图中拖出一块区域，即可直接进入批注编辑器。松开鼠标就会打开，没有确认步骤——拖过头的部分可以在下一个界面用裁剪工具修正。剪贴板中已有的图片也可以直接粘贴到笔记中。',
  'Annotating a screenshot':
    '为截图添加批注',
  'Arrow, box, ellipse, callout, step number, text and highlighter stay editable — click one to select it, drag it to move it, or drag a handle to resize it. Hold Shift for 45° arrows, circles and squares. Double-click a picture in a note to reopen the editor later.':
    '箭头、方框、椭圆、标注气泡、步骤编号、文字和荧光笔都可以继续编辑——单击选中，拖动移动，拖动控制点调整大小。按住 Shift 可得到 45° 箭头、正圆和正方形。双击笔记中的图片即可重新打开编辑器。',
  'Hiding something sensitive':
    '隐藏敏感内容',
  'Pixelate and Crop change the picture itself rather than adding a layer, so what they remove cannot be recovered by whoever opens the file. Undo still works while the editor is open. Everything else is stored as a shape and can be changed at any time.':
    '“马赛克”和“裁剪”会直接修改图片本身，而不是叠加一层，因此被去掉的内容无法被打开文件的人还原。编辑器打开期间仍可撤消。其余内容都以图形方式保存，随时可以修改。',
  'Screenshot editor':
    '截图编辑器',
  'Select, arrow, box, ellipse, callout':
    '选择、箭头、方框、椭圆、标注气泡',
  'Text, step number, highlighter':
    '文字、步骤编号、荧光笔',
  'Pixelate, crop':
    '马赛克、裁剪',
  '45° arrows, circles and squares':
    '45° 箭头、正圆和正方形',
  'Delete the selected annotation':
    '删除选中的批注',
  'Close the editor without inserting':
    '关闭编辑器且不插入',
};

const es: Dict = {
  Guide: 'Guía',
  'Saving and sharing': 'Guardar y compartir',
  'Save JSON': 'Guardar JSON',
  'Downloads the tab you are working on — nodes, connections, shapes and notes — as a single .json file. This is the only copy that leaves the browser, so save before you close.':
    'Descarga la pestaña en la que trabajas —nodos, conexiones, formas y notas— como un único archivo .json. Es la única copia que sale del navegador, así que guarda antes de cerrar.',
  'Load JSON': 'Cargar JSON',
  'Opens a .json file back into the studio, replacing what is currently on screen. Anything unsaved is lost, so save first.':
    'Abre un archivo .json y reemplaza lo que hay en pantalla. Se pierde todo lo no guardado, así que guarda primero.',
  'Work with a colleague': 'Trabajar con un compañero',
  'There is no server and no sign-in. Send someone the .json file; they open it with Load JSON, edit it, save it again and send it back. The file is plain text, so it also works in a Teams chat or attached to a ticket.':
    'No hay servidor ni inicio de sesión. Envía el archivo .json a otra persona; lo abre con Cargar JSON, lo edita, lo vuelve a guardar y te lo devuelve. El archivo es texto plano, así que también funciona en un chat de Teams o adjunto a un caso.',
  'Exporting a picture': 'Exportar una imagen',
  'Downloads the whole diagram as an image, at twice screen resolution so it stays readable when scaled. Use it for tickets, email and slide decks. A PNG cannot be edited again — keep the .json.':
    'Descarga el diagrama completo como imagen, al doble de la resolución de pantalla para que siga siendo legible al ampliarlo. Úsalo para casos, correo y presentaciones. Un PNG ya no se puede editar: conserva el .json.',
  'Downloads the whole diagram as vector art. It stays sharp at any size, opens in any browser, and can be embedded in a wiki page or a document. Best choice for anything that will be printed or zoomed.':
    'Descarga el diagrama completo como gráfico vectorial. Se mantiene nítido a cualquier tamaño, se abre en cualquier navegador y se puede insertar en una wiki o un documento. La mejor opción para imprimir o ampliar.',
  'Working faster': 'Trabajar más rápido',
  'Click any tile to drop it at the centre of the canvas, or drag it exactly where you want it. The search box at the top looks through resources, icons and shapes at once.':
    'Haz clic en cualquier icono para colocarlo en el centro del lienzo, o arrástralo justo donde lo quieras. El buscador de arriba consulta recursos, iconos y formas a la vez.',
  'Star ☆ any resource, icon or shape to pin it to the Favorites section at the top of the palette, so the handful you use every day is never more than one click away.':
    'Marca con ☆ cualquier recurso, icono o forma para fijarlo en Favoritos, arriba de la paleta, y tener siempre a un clic los pocos que usas a diario.',
  Connections: 'Conexiones',
  'Hover over an item to reveal its connect dots, then drag from a dot onto another item. The line keeps up when either end is moved. Arrows from the Shapes section are free-floating annotations and attach to nothing.':
    'Pasa el cursor sobre un elemento para ver sus puntos de conexión y arrastra desde un punto hasta otro elemento. La línea sigue a ambos extremos cuando los mueves. Las flechas de la sección Formas son anotaciones libres y no se conectan a nada.',
  Tabs: 'Pestañas',
  'Each tab holds its own diagram, shapes and notes — useful for before/after or for one design per region. Save JSON writes the tab you are currently on.':
    'Cada pestaña tiene su propio diagrama, formas y notas: útil para un antes/después o un diseño por región. Guardar JSON exporta la pestaña en la que estás.',
  Version: 'Versión',
  'Working in the Notes':
    'Trabajar en las Notas',
  'Select a run of text in a note and attach a comment to it. Replies build a thread, and resolving one hides it without deleting it. Set your name in Settings so your colleague knows who wrote what. Comments travel in the .json, so both of you see the same thread.':
    'Selecciona un fragmento de texto en una nota y adjúntale un comentario. Las respuestas forman un hilo, y resolver uno lo oculta sin borrarlo. Escribe tu nombre en Configuración para que tu colega sepa quién escribió cada cosa. Los comentarios viajan en el .json, así que ambos veis el mismo hilo.',
  'Screenshot':
    'Captura de pantalla',
  'Drag a region out of the diagram and it goes straight into the annotation editor. Release the mouse to open it — there is no confirm step, because overshooting is repaired by the crop tool one screen later. An image already on the clipboard can be pasted into a note directly.':
    'Arrastra una región del diagrama y pasarás directamente al editor de anotaciones. Se abre al soltar el ratón: no hay paso de confirmación, porque lo que te pases se corrige con la herramienta de recorte en la pantalla siguiente. Una imagen que ya esté en el portapapeles puede pegarse directamente en una nota.',
  'Annotating a screenshot':
    'Anotar una captura',
  'Arrow, box, ellipse, callout, step number, text and highlighter stay editable — click one to select it, drag it to move it, or drag a handle to resize it. Hold Shift for 45° arrows, circles and squares. Double-click a picture in a note to reopen the editor later.':
    'La flecha, el recuadro, la elipse, el bocadillo, el número de paso, el texto y el marcador siguen siendo editables: haz clic para seleccionar, arrastra para mover o arrastra un tirador para cambiar el tamaño. Mantén Mayús para flechas de 45°, círculos y cuadrados. Haz doble clic en una imagen de una nota para volver a abrir el editor.',
  'Hiding something sensitive':
    'Ocultar algo sensible',
  'Pixelate and Crop change the picture itself rather than adding a layer, so what they remove cannot be recovered by whoever opens the file. Undo still works while the editor is open. Everything else is stored as a shape and can be changed at any time.':
    'Pixelar y Recortar modifican la propia imagen en lugar de añadir una capa, así que lo que quitan no puede recuperarlo quien abra el archivo. Deshacer sigue funcionando mientras el editor está abierto. Todo lo demás se guarda como forma y puede cambiarse en cualquier momento.',
  'Screenshot editor':
    'Editor de capturas',
  'Select, arrow, box, ellipse, callout':
    'Seleccionar, flecha, recuadro, elipse, bocadillo',
  'Text, step number, highlighter':
    'Texto, número de paso, marcador',
  'Pixelate, crop':
    'Pixelar, recortar',
  '45° arrows, circles and squares':
    'Flechas de 45°, círculos y cuadrados',
  'Delete the selected annotation':
    'Eliminar la anotación seleccionada',
  'Close the editor without inserting':
    'Cerrar el editor sin insertar',
};

const pt: Dict = {
  Guide: 'Guia',
  'Saving and sharing': 'Salvar e compartilhar',
  'Save JSON': 'Salvar JSON',
  'Downloads the tab you are working on — nodes, connections, shapes and notes — as a single .json file. This is the only copy that leaves the browser, so save before you close.':
    'Baixa a guia em que você está trabalhando — nós, conexões, formas e anotações — como um único arquivo .json. É a única cópia que sai do navegador, então salve antes de fechar.',
  'Load JSON': 'Carregar JSON',
  'Opens a .json file back into the studio, replacing what is currently on screen. Anything unsaved is lost, so save first.':
    'Abre um arquivo .json e substitui o que está na tela. Tudo o que não foi salvo é perdido, então salve antes.',
  'Work with a colleague': 'Trabalhar com um colega',
  'There is no server and no sign-in. Send someone the .json file; they open it with Load JSON, edit it, save it again and send it back. The file is plain text, so it also works in a Teams chat or attached to a ticket.':
    'Não há servidor nem login. Envie o arquivo .json para alguém; a pessoa abre com Carregar JSON, edita, salva de novo e devolve. O arquivo é texto puro, então também funciona em um chat do Teams ou anexado a um chamado.',
  'Exporting a picture': 'Exportar uma imagem',
  'Downloads the whole diagram as an image, at twice screen resolution so it stays readable when scaled. Use it for tickets, email and slide decks. A PNG cannot be edited again — keep the .json.':
    'Baixa o diagrama inteiro como imagem, no dobro da resolução da tela para continuar legível ao ampliar. Use em chamados, e-mail e apresentações. Um PNG não pode ser editado de novo — guarde o .json.',
  'Downloads the whole diagram as vector art. It stays sharp at any size, opens in any browser, and can be embedded in a wiki page or a document. Best choice for anything that will be printed or zoomed.':
    'Baixa o diagrama inteiro como arte vetorial. Fica nítido em qualquer tamanho, abre em qualquer navegador e pode ser incorporado em uma wiki ou documento. Melhor escolha para imprimir ou ampliar.',
  'Working faster': 'Trabalhar mais rápido',
  'Click any tile to drop it at the centre of the canvas, or drag it exactly where you want it. The search box at the top looks through resources, icons and shapes at once.':
    'Clique em qualquer bloco para soltá-lo no centro da tela, ou arraste exatamente para onde quiser. A busca no topo procura em recursos, ícones e formas ao mesmo tempo.',
  'Star ☆ any resource, icon or shape to pin it to the Favorites section at the top of the palette, so the handful you use every day is never more than one click away.':
    'Marque com ☆ qualquer recurso, ícone ou forma para fixá-lo em Favoritos, no topo da paleta, deixando a um clique os poucos que você usa todo dia.',
  Connections: 'Conexões',
  'Hover over an item to reveal its connect dots, then drag from a dot onto another item. The line keeps up when either end is moved. Arrows from the Shapes section are free-floating annotations and attach to nothing.':
    'Passe o cursor sobre um item para ver seus pontos de conexão e arraste de um ponto até outro item. A linha acompanha as duas pontas quando você as move. As setas da seção Formas são anotações livres e não se ligam a nada.',
  Tabs: 'Guias',
  'Each tab holds its own diagram, shapes and notes — useful for before/after or for one design per region. Save JSON writes the tab you are currently on.':
    'Cada guia tem seu próprio diagrama, formas e anotações — útil para antes/depois ou um desenho por região. Salvar JSON exporta a guia em que você está.',
  Version: 'Versão',
  'Working in the Notes':
    'Trabalhar nas Notas',
  'Select a run of text in a note and attach a comment to it. Replies build a thread, and resolving one hides it without deleting it. Set your name in Settings so your colleague knows who wrote what. Comments travel in the .json, so both of you see the same thread.':
    'Selecione um trecho de texto numa nota e anexe um comentário. As respostas formam um tópico, e resolver um comentário oculta-o sem o apagar. Escreva o seu nome nas Definições para que o colega saiba quem escreveu o quê. Os comentários viajam no .json, por isso ambos veem o mesmo tópico.',
  'Screenshot':
    'Captura de ecrã',
  'Drag a region out of the diagram and it goes straight into the annotation editor. Release the mouse to open it — there is no confirm step, because overshooting is repaired by the crop tool one screen later. An image already on the clipboard can be pasted into a note directly.':
    'Arraste uma região do diagrama e vai diretamente para o editor de anotações. Abre ao soltar o rato: não há passo de confirmação, porque o excesso é corrigido com a ferramenta de recorte no ecrã seguinte. Uma imagem já na área de transferência pode ser colada diretamente numa nota.',
  'Annotating a screenshot':
    'Anotar uma captura',
  'Arrow, box, ellipse, callout, step number, text and highlighter stay editable — click one to select it, drag it to move it, or drag a handle to resize it. Hold Shift for 45° arrows, circles and squares. Double-click a picture in a note to reopen the editor later.':
    'Seta, caixa, elipse, balão, número da etapa, texto e marcador continuam editáveis — clique para selecionar, arraste para mover ou arraste uma alça para redimensionar. Mantenha Shift para setas de 45°, círculos e quadrados. Faça duplo clique numa imagem de uma nota para reabrir o editor.',
  'Hiding something sensitive':
    'Ocultar algo sensível',
  'Pixelate and Crop change the picture itself rather than adding a layer, so what they remove cannot be recovered by whoever opens the file. Undo still works while the editor is open. Everything else is stored as a shape and can be changed at any time.':
    'Pixelizar e Recortar alteram a própria imagem em vez de acrescentar uma camada, por isso o que removem não pode ser recuperado por quem abrir o ficheiro. Anular continua a funcionar enquanto o editor está aberto. Tudo o resto é guardado como forma e pode ser alterado a qualquer momento.',
  'Screenshot editor':
    'Editor de capturas',
  'Select, arrow, box, ellipse, callout':
    'Selecionar, seta, caixa, elipse, balão',
  'Text, step number, highlighter':
    'Texto, número da etapa, marcador',
  'Pixelate, crop':
    'Pixelizar, recortar',
  '45° arrows, circles and squares':
    'Setas de 45°, círculos e quadrados',
  'Delete the selected annotation':
    'Eliminar a anotação selecionada',
  'Close the editor without inserting':
    'Fechar o editor sem inserir',
};

const fr: Dict = {
  Guide: 'Guide',
  'Saving and sharing': 'Enregistrer et partager',
  'Save JSON': 'Enregistrer le JSON',
  'Downloads the tab you are working on — nodes, connections, shapes and notes — as a single .json file. This is the only copy that leaves the browser, so save before you close.':
    'Télécharge l’onglet en cours — nœuds, connexions, formes et notes — dans un seul fichier .json. C’est la seule copie qui sort du navigateur : enregistrez avant de fermer.',
  'Load JSON': 'Charger un JSON',
  'Opens a .json file back into the studio, replacing what is currently on screen. Anything unsaved is lost, so save first.':
    'Ouvre un fichier .json et remplace ce qui est à l’écran. Tout ce qui n’est pas enregistré est perdu : enregistrez d’abord.',
  'Work with a colleague': 'Travailler avec un collègue',
  'There is no server and no sign-in. Send someone the .json file; they open it with Load JSON, edit it, save it again and send it back. The file is plain text, so it also works in a Teams chat or attached to a ticket.':
    'Il n’y a ni serveur ni connexion. Envoyez le fichier .json à quelqu’un ; il l’ouvre avec Charger un JSON, le modifie, l’enregistre et vous le renvoie. Le fichier est du texte brut : il passe aussi dans une conversation Teams ou en pièce jointe d’un ticket.',
  'Exporting a picture': 'Exporter une image',
  'Downloads the whole diagram as an image, at twice screen resolution so it stays readable when scaled. Use it for tickets, email and slide decks. A PNG cannot be edited again — keep the .json.':
    'Télécharge le schéma entier en image, au double de la résolution de l’écran pour rester lisible une fois agrandi. Idéal pour les tickets, les e-mails et les présentations. Un PNG ne se remodifie pas : conservez le .json.',
  'Downloads the whole diagram as vector art. It stays sharp at any size, opens in any browser, and can be embedded in a wiki page or a document. Best choice for anything that will be printed or zoomed.':
    'Télécharge le schéma entier en vectoriel. Il reste net à toutes les tailles, s’ouvre dans n’importe quel navigateur et s’intègre dans une page wiki ou un document. Le meilleur choix pour l’impression ou le zoom.',
  'Working faster': 'Gagner du temps',
  'Click any tile to drop it at the centre of the canvas, or drag it exactly where you want it. The search box at the top looks through resources, icons and shapes at once.':
    'Cliquez sur une vignette pour la déposer au centre du canevas, ou faites-la glisser exactement où vous voulez. La recherche en haut interroge les ressources, les icônes et les formes à la fois.',
  'Star ☆ any resource, icon or shape to pin it to the Favorites section at the top of the palette, so the handful you use every day is never more than one click away.':
    'Marquez d’une ☆ une ressource, une icône ou une forme pour l’épingler aux Favoris, en haut de la palette : celles que vous utilisez tous les jours restent à un clic.',
  Connections: 'Connexions',
  'Hover over an item to reveal its connect dots, then drag from a dot onto another item. The line keeps up when either end is moved. Arrows from the Shapes section are free-floating annotations and attach to nothing.':
    'Survolez un élément pour afficher ses points de connexion, puis faites glisser d’un point vers un autre élément. La ligne suit les deux extrémités lorsqu’on les déplace. Les flèches de la section Formes sont des annotations libres et ne s’attachent à rien.',
  Tabs: 'Onglets',
  'Each tab holds its own diagram, shapes and notes — useful for before/after or for one design per region. Save JSON writes the tab you are currently on.':
    'Chaque onglet a son propre schéma, ses formes et ses notes — pratique pour un avant/après ou une conception par région. Enregistrer le JSON exporte l’onglet actif.',
  Version: 'Version',
  'Working in the Notes':
    'Travailler dans les Notes',
  'Select a run of text in a note and attach a comment to it. Replies build a thread, and resolving one hides it without deleting it. Set your name in Settings so your colleague knows who wrote what. Comments travel in the .json, so both of you see the same thread.':
    'Sélectionnez un passage de texte dans une note et attachez-y un commentaire. Les réponses forment un fil, et résoudre un commentaire le masque sans le supprimer. Indiquez votre nom dans les Paramètres pour que votre collègue sache qui a écrit quoi. Les commentaires voyagent dans le .json : vous voyez donc tous les deux le même fil.',
  'Screenshot':
    'Capture d’écran',
  'Drag a region out of the diagram and it goes straight into the annotation editor. Release the mouse to open it — there is no confirm step, because overshooting is repaired by the crop tool one screen later. An image already on the clipboard can be pasted into a note directly.':
    'Faites glisser une zone du diagramme et vous arrivez directement dans l’éditeur d’annotations. Il s’ouvre au relâchement de la souris : il n’y a pas d’étape de confirmation, car un débordement se corrige avec l’outil de rognage à l’écran suivant. Une image déjà dans le presse-papiers peut être collée directement dans une note.',
  'Annotating a screenshot':
    'Annoter une capture',
  'Arrow, box, ellipse, callout, step number, text and highlighter stay editable — click one to select it, drag it to move it, or drag a handle to resize it. Hold Shift for 45° arrows, circles and squares. Double-click a picture in a note to reopen the editor later.':
    'La flèche, le cadre, l’ellipse, la bulle, le numéro d’étape, le texte et le surligneur restent modifiables : cliquez pour sélectionner, faites glisser pour déplacer, ou tirez une poignée pour redimensionner. Maintenez Maj pour des flèches à 45°, des cercles et des carrés. Double-cliquez sur une image d’une note pour rouvrir l’éditeur.',
  'Hiding something sensitive':
    'Masquer un élément sensible',
  'Pixelate and Crop change the picture itself rather than adding a layer, so what they remove cannot be recovered by whoever opens the file. Undo still works while the editor is open. Everything else is stored as a shape and can be changed at any time.':
    'Pixelliser et Rogner modifient l’image elle-même au lieu d’ajouter un calque : ce qu’ils retirent ne peut donc pas être récupéré par celui qui ouvre le fichier. Annuler fonctionne toujours tant que l’éditeur est ouvert. Tout le reste est enregistré comme forme et reste modifiable à tout moment.',
  'Screenshot editor':
    'Éditeur de captures',
  'Select, arrow, box, ellipse, callout':
    'Sélection, flèche, cadre, ellipse, bulle',
  'Text, step number, highlighter':
    'Texte, numéro d’étape, surligneur',
  'Pixelate, crop':
    'Pixelliser, rogner',
  '45° arrows, circles and squares':
    'Flèches à 45°, cercles et carrés',
  'Delete the selected annotation':
    'Supprimer l’annotation sélectionnée',
  'Close the editor without inserting':
    'Fermer l’éditeur sans insérer',
};

const de: Dict = {
  Guide: 'Anleitung',
  'Saving and sharing': 'Speichern und teilen',
  'Save JSON': 'JSON speichern',
  'Downloads the tab you are working on — nodes, connections, shapes and notes — as a single .json file. This is the only copy that leaves the browser, so save before you close.':
    'Lädt die aktuelle Registerkarte – Knoten, Verbindungen, Formen und Notizen – als eine einzige .json-Datei herunter. Das ist die einzige Kopie, die den Browser verlässt: vor dem Schließen speichern.',
  'Load JSON': 'JSON laden',
  'Opens a .json file back into the studio, replacing what is currently on screen. Anything unsaved is lost, so save first.':
    'Öffnet eine .json-Datei und ersetzt den aktuellen Inhalt. Nicht Gespeichertes geht verloren – vorher speichern.',
  'Work with a colleague': 'Mit Kolleginnen und Kollegen arbeiten',
  'There is no server and no sign-in. Send someone the .json file; they open it with Load JSON, edit it, save it again and send it back. The file is plain text, so it also works in a Teams chat or attached to a ticket.':
    'Es gibt keinen Server und keine Anmeldung. Schicken Sie jemandem die .json-Datei; sie wird mit „JSON laden“ geöffnet, bearbeitet, wieder gespeichert und zurückgeschickt. Die Datei ist reiner Text und funktioniert daher auch im Teams-Chat oder als Anhang an ein Ticket.',
  'Exporting a picture': 'Als Bild exportieren',
  'Downloads the whole diagram as an image, at twice screen resolution so it stays readable when scaled. Use it for tickets, email and slide decks. A PNG cannot be edited again — keep the .json.':
    'Lädt das gesamte Diagramm als Bild herunter, mit doppelter Bildschirmauflösung, damit es beim Vergrößern lesbar bleibt. Ideal für Tickets, E-Mails und Präsentationen. Ein PNG lässt sich nicht mehr bearbeiten – die .json aufheben.',
  'Downloads the whole diagram as vector art. It stays sharp at any size, opens in any browser, and can be embedded in a wiki page or a document. Best choice for anything that will be printed or zoomed.':
    'Lädt das gesamte Diagramm als Vektorgrafik herunter. Sie bleibt in jeder Größe scharf, öffnet sich in jedem Browser und lässt sich in eine Wiki-Seite oder ein Dokument einbetten. Beste Wahl zum Drucken oder Zoomen.',
  'Working faster': 'Schneller arbeiten',
  'Click any tile to drop it at the centre of the canvas, or drag it exactly where you want it. The search box at the top looks through resources, icons and shapes at once.':
    'Klicken Sie eine Kachel an, um sie in der Mitte der Arbeitsfläche abzulegen, oder ziehen Sie sie genau an die gewünschte Stelle. Das Suchfeld oben durchsucht Ressourcen, Symbole und Formen gleichzeitig.',
  'Star ☆ any resource, icon or shape to pin it to the Favorites section at the top of the palette, so the handful you use every day is never more than one click away.':
    'Markieren Sie Ressourcen, Symbole oder Formen mit ☆, um sie oben in der Palette unter „Favoriten“ anzuheften – so bleibt das täglich Benötigte immer einen Klick entfernt.',
  Connections: 'Verbindungen',
  'Hover over an item to reveal its connect dots, then drag from a dot onto another item. The line keeps up when either end is moved. Arrows from the Shapes section are free-floating annotations and attach to nothing.':
    'Zeigen Sie auf ein Element, um seine Verbindungspunkte einzublenden, und ziehen Sie von einem Punkt auf ein anderes Element. Die Linie folgt beiden Enden, wenn sie bewegt werden. Pfeile aus dem Bereich „Formen“ sind frei bewegliche Anmerkungen und verbinden sich mit nichts.',
  Tabs: 'Registerkarten',
  'Each tab holds its own diagram, shapes and notes — useful for before/after or for one design per region. Save JSON writes the tab you are currently on.':
    'Jede Registerkarte hat ihr eigenes Diagramm, eigene Formen und Notizen – praktisch für Vorher/Nachher oder ein Design je Region. „JSON speichern“ exportiert die aktuelle Registerkarte.',
  Version: 'Version',
  'Working in the Notes':
    'Arbeiten in den Notizen',
  'Select a run of text in a note and attach a comment to it. Replies build a thread, and resolving one hides it without deleting it. Set your name in Settings so your colleague knows who wrote what. Comments travel in the .json, so both of you see the same thread.':
    'Markieren Sie eine Textstelle in einer Notiz und hängen Sie einen Kommentar daran. Antworten bilden einen Thread, und ein aufgelöster Kommentar wird ausgeblendet, nicht gelöscht. Tragen Sie Ihren Namen in den Einstellungen ein, damit Ihr Kollege weiß, von wem was stammt. Kommentare reisen in der .json mit, sodass Sie beide denselben Thread sehen.',
  'Screenshot':
    'Screenshot',
  'Drag a region out of the diagram and it goes straight into the annotation editor. Release the mouse to open it — there is no confirm step, because overshooting is repaired by the crop tool one screen later. An image already on the clipboard can be pasted into a note directly.':
    'Ziehen Sie einen Bereich aus dem Diagramm heraus, und Sie landen direkt im Anmerkungs-Editor. Er öffnet sich beim Loslassen der Maustaste: Es gibt keinen Bestätigungsschritt, denn zu viel Erfasstes lässt sich einen Bildschirm später mit dem Zuschneiden-Werkzeug korrigieren. Ein Bild, das bereits in der Zwischenablage liegt, kann direkt in eine Notiz eingefügt werden.',
  'Annotating a screenshot':
    'Einen Screenshot mit Anmerkungen versehen',
  'Arrow, box, ellipse, callout, step number, text and highlighter stay editable — click one to select it, drag it to move it, or drag a handle to resize it. Hold Shift for 45° arrows, circles and squares. Double-click a picture in a note to reopen the editor later.':
    'Pfeil, Kasten, Ellipse, Sprechblase, Schrittnummer, Text und Textmarker bleiben bearbeitbar — anklicken zum Auswählen, ziehen zum Verschieben, an einem Griff ziehen zum Ändern der Größe. Mit gedrückter Umschalttaste entstehen 45°-Pfeile, Kreise und Quadrate. Ein Doppelklick auf ein Bild in einer Notiz öffnet den Editor erneut.',
  'Hiding something sensitive':
    'Vertrauliches unkenntlich machen',
  'Pixelate and Crop change the picture itself rather than adding a layer, so what they remove cannot be recovered by whoever opens the file. Undo still works while the editor is open. Everything else is stored as a shape and can be changed at any time.':
    'Verpixeln und Zuschneiden verändern das Bild selbst, statt eine Ebene hinzuzufügen. Was sie entfernen, kann also von niemandem wiederhergestellt werden, der die Datei öffnet. Rückgängig funktioniert weiterhin, solange der Editor geöffnet ist. Alles andere wird als Form gespeichert und bleibt jederzeit änderbar.',
  'Screenshot editor':
    'Screenshot-Editor',
  'Select, arrow, box, ellipse, callout':
    'Auswählen, Pfeil, Kasten, Ellipse, Sprechblase',
  'Text, step number, highlighter':
    'Text, Schrittnummer, Textmarker',
  'Pixelate, crop':
    'Verpixeln, zuschneiden',
  '45° arrows, circles and squares':
    '45°-Pfeile, Kreise und Quadrate',
  'Delete the selected annotation':
    'Ausgewählte Anmerkung löschen',
  'Close the editor without inserting':
    'Editor schließen, ohne einzufügen',
};

const ko: Dict = {
  Guide: '사용 안내',
  'Saving and sharing': '저장 및 공유',
  'Save JSON': 'JSON 저장',
  'Downloads the tab you are working on — nodes, connections, shapes and notes — as a single .json file. This is the only copy that leaves the browser, so save before you close.':
    '작업 중인 탭(노드, 연결, 도형, 메모)을 하나의 .json 파일로 내려받습니다. 브라우저 밖으로 나가는 유일한 사본이므로 닫기 전에 저장하세요.',
  'Load JSON': 'JSON 불러오기',
  'Opens a .json file back into the studio, replacing what is currently on screen. Anything unsaved is lost, so save first.':
    '.json 파일을 열어 현재 화면의 내용을 대체합니다. 저장하지 않은 내용은 사라지므로 먼저 저장하세요.',
  'Work with a colleague': '동료와 함께 작업하기',
  'There is no server and no sign-in. Send someone the .json file; they open it with Load JSON, edit it, save it again and send it back. The file is plain text, so it also works in a Teams chat or attached to a ticket.':
    '서버도 로그인도 없습니다. .json 파일을 상대방에게 보내면 상대방은 ‘JSON 불러오기’로 열어 편집하고 다시 저장해 돌려보내면 됩니다. 텍스트 파일이므로 Teams 채팅이나 케이스 첨부로도 그대로 사용할 수 있습니다.',
  'Exporting a picture': '이미지로 내보내기',
  'Downloads the whole diagram as an image, at twice screen resolution so it stays readable when scaled. Use it for tickets, email and slide decks. A PNG cannot be edited again — keep the .json.':
    '전체 다이어그램을 이미지로 내려받습니다. 화면의 2배 해상도라 확대해도 읽을 수 있습니다. 케이스, 메일, 슬라이드에 적합합니다. PNG는 다시 편집할 수 없으므로 .json 파일을 보관하세요.',
  'Downloads the whole diagram as vector art. It stays sharp at any size, opens in any browser, and can be embedded in a wiki page or a document. Best choice for anything that will be printed or zoomed.':
    '전체 다이어그램을 벡터 형식으로 내려받습니다. 어떤 크기에서도 선명하고, 모든 브라우저에서 열리며, 위키 페이지나 문서에 삽입할 수 있습니다. 인쇄하거나 확대할 때 가장 적합합니다.',
  'Working faster': '더 빠르게 작업하기',
  'Click any tile to drop it at the centre of the canvas, or drag it exactly where you want it. The search box at the top looks through resources, icons and shapes at once.':
    '타일을 클릭하면 캔버스 중앙에 배치되고, 끌어서 원하는 위치에 놓을 수도 있습니다. 상단 검색창은 리소스, 아이콘, 도형을 한 번에 검색합니다.',
  'Star ☆ any resource, icon or shape to pin it to the Favorites section at the top of the palette, so the handful you use every day is never more than one click away.':
    '리소스, 아이콘, 도형에 ☆를 누르면 팔레트 상단의 즐겨찾기에 고정됩니다. 매일 쓰는 몇 가지를 항상 한 번의 클릭으로 꺼낼 수 있습니다.',
  Connections: '연결',
  'Hover over an item to reveal its connect dots, then drag from a dot onto another item. The line keeps up when either end is moved. Arrows from the Shapes section are free-floating annotations and attach to nothing.':
    '항목 위에 마우스를 올리면 연결점이 나타납니다. 연결점에서 다른 항목으로 끌어 놓으세요. 양쪽 중 어느 쪽을 옮겨도 선이 따라갑니다. ‘도형’ 섹션의 화살표는 자유롭게 움직이는 주석이며 아무것에도 연결되지 않습니다.',
  Tabs: '탭',
  'Each tab holds its own diagram, shapes and notes — useful for before/after or for one design per region. Save JSON writes the tab you are currently on.':
    '각 탭은 고유한 다이어그램, 도형, 메모를 가집니다. 변경 전후 비교나 지역별 설계에 유용합니다. ‘JSON 저장’은 현재 열려 있는 탭을 내보냅니다.',
  Version: '버전',
  'Working in the Notes':
    '메모에서 작업하기',
  'Select a run of text in a note and attach a comment to it. Replies build a thread, and resolving one hides it without deleting it. Set your name in Settings so your colleague knows who wrote what. Comments travel in the .json, so both of you see the same thread.':
    '메모에서 텍스트 구간을 선택해 댓글을 붙일 수 있습니다. 답글은 스레드가 되고, 해결하면 삭제되지 않고 숨겨집니다. 설정에서 이름을 입력해 두면 누가 무엇을 썼는지 동료도 알 수 있습니다. 댓글은 .json에 함께 담겨 이동하므로 두 사람이 같은 스레드를 봅니다.',
  'Screenshot':
    '스크린샷',
  'Drag a region out of the diagram and it goes straight into the annotation editor. Release the mouse to open it — there is no confirm step, because overshooting is repaired by the crop tool one screen later. An image already on the clipboard can be pasted into a note directly.':
    '다이어그램에서 영역을 끌어내면 곧바로 주석 편집기로 들어갑니다. 마우스를 놓으면 열리며 확인 단계는 없습니다. 너무 크게 잡은 부분은 다음 화면의 자르기 도구로 바로잡을 수 있기 때문입니다. 클립보드에 이미 있는 이미지는 메모에 바로 붙여 넣을 수 있습니다.',
  'Annotating a screenshot':
    '스크린샷에 주석 달기',
  'Arrow, box, ellipse, callout, step number, text and highlighter stay editable — click one to select it, drag it to move it, or drag a handle to resize it. Hold Shift for 45° arrows, circles and squares. Double-click a picture in a note to reopen the editor later.':
    '화살표, 상자, 타원, 말풍선, 단계 번호, 텍스트, 형광펜은 계속 편집할 수 있습니다. 클릭해서 선택하고, 끌어서 옮기고, 핸들을 끌어 크기를 바꿉니다. Shift를 누른 채 그리면 45° 화살표, 정원, 정사각형이 됩니다. 메모의 그림을 두 번 클릭하면 편집기가 다시 열립니다.',
  'Hiding something sensitive':
    '민감한 내용 가리기',
  'Pixelate and Crop change the picture itself rather than adding a layer, so what they remove cannot be recovered by whoever opens the file. Undo still works while the editor is open. Everything else is stored as a shape and can be changed at any time.':
    '모자이크와 자르기는 레이어를 덧씌우는 대신 이미지 자체를 바꿉니다. 따라서 지운 내용은 파일을 여는 사람도 되살릴 수 없습니다. 편집기가 열려 있는 동안에는 실행 취소가 됩니다. 나머지는 모두 도형으로 저장되어 언제든지 바꿀 수 있습니다.',
  'Screenshot editor':
    '스크린샷 편집기',
  'Select, arrow, box, ellipse, callout':
    '선택, 화살표, 상자, 타원, 말풍선',
  'Text, step number, highlighter':
    '텍스트, 단계 번호, 형광펜',
  'Pixelate, crop':
    '모자이크, 자르기',
  '45° arrows, circles and squares':
    '45° 화살표, 정원, 정사각형',
  'Delete the selected annotation':
    '선택한 주석 삭제',
  'Close the editor without inserting':
    '삽입하지 않고 편집기 닫기',
};

export const GUIDE_DICT: Partial<Record<string, Dict>> = { ja, zh, es, pt, fr, de, ko };
