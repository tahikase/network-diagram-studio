const languages = ['ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko'] as const;
type Translations = readonly [string, string, string, string, string, string, string];

const rows: Record<string, Translations> = {
  File: ['ファイル', '文件', 'Archivo', 'Arquivo', 'Fichier', 'Datei', '파일'],
  Export: ['エクスポート', '导出', 'Exportar', 'Exportar', 'Exporter', 'Exportieren', '내보내기'],
  'Create or open': ['新規作成または開く', '新建或打开', 'Crear o abrir', 'Criar ou abrir', 'Créer ou ouvrir', 'Erstellen oder öffnen', '새로 만들기 또는 열기'],
  'Open an editable diagram': ['編集可能な図を開く', '打开可编辑的图表', 'Abrir un diagrama editable', 'Abrir um diagrama editável', 'Ouvrir un diagramme modifiable', 'Ein bearbeitbares Diagramm öffnen', '편집 가능한 다이어그램 열기'],
  'Build from Azure resource exports': ['Azure リソースのエクスポートから作成', '从 Azure 资源导出创建', 'Crear a partir de recursos exportados de Azure', 'Criar a partir de recursos exportados do Azure', 'Créer depuis des ressources Azure exportées', 'Aus exportierten Azure-Ressourcen erstellen', '내보낸 Azure 리소스로 만들기'],
  'Download full diagram': ['図全体をダウンロード', '下载完整图表', 'Descargar el diagrama completo', 'Baixar o diagrama completo', 'Télécharger le diagramme complet', 'Gesamtes Diagramm herunterladen', '전체 다이어그램 다운로드'],
  'Image file': ['画像ファイル', '图像文件', 'Archivo de imagen', 'Arquivo de imagem', 'Fichier image', 'Bilddatei', '이미지 파일'],
  'Scalable vector file': ['拡大・縮小できるベクターファイル', '可缩放矢量文件', 'Archivo vectorial escalable', 'Arquivo vetorial escalável', 'Fichier vectoriel redimensionnable', 'Skalierbare Vektordatei', '크기 조정 가능한 벡터 파일'],
  'Capture to Notes': ['ノートにキャプチャ', '截取到笔记', 'Capturar en Notas', 'Capturar em Notas', 'Capturer dans Notes', 'In Notizen erfassen', '노트에 캡처'],
  'Select an area of the diagram': ['図の範囲を選択', '选择图表区域', 'Seleccionar un área del diagrama', 'Selecionar uma área do diagrama', 'Sélectionner une zone du diagramme', 'Einen Diagrammbereich auswählen', '다이어그램 영역 선택'],
  'Export failed': ['エクスポートに失敗しました', '导出失败', 'Error al exportar', 'Falha ao exportar', "Échec de l'exportation", 'Export fehlgeschlagen', '내보내기 실패'],
  'Canvas: {style}': ['キャンバス：{style}', '画布：{style}', 'Lienzo: {style}', 'Tela: {style}', 'Canevas : {style}', 'Leinwand: {style}', '캔버스: {style}'],
  'Canvas background': ['キャンバスの背景', '画布背景', 'Fondo del lienzo', 'Fundo da tela', 'Arrière-plan du canevas', 'Leinwandhintergrund', '캔버스 배경'],
  Blank: ['無地', '空白', 'En blanco', 'Em branco', 'Uni', 'Leer', '빈 배경'],
  Dots: ['ドット', '圆点', 'Puntos', 'Pontos', 'Points', 'Punkte', '점'],
  Grid: ['グリッド', '网格', 'Cuadrícula', 'Grade', 'Grille', 'Raster', '격자'],
  'Current default': ['現在の既定', '当前默认', 'Opción predeterminada actual', 'Padrão atual', 'Valeur actuelle par défaut', 'Aktueller Standard', '현재 기본값'],
  'Changes the background only': ['背景のみを変更します', '仅更改背景', 'Solo cambia el fondo', 'Altera apenas o fundo', "Modifie uniquement l'arrière-plan", 'Ändert nur den Hintergrund', '배경만 변경합니다'],
  'This browser could not remember the canvas background. Your diagram is unchanged.': [
    'このブラウザーにキャンバスの背景を保存できませんでした。図は変更されていません。',
    '此浏览器无法记住画布背景。您的图表未更改。',
    'Este navegador no pudo recordar el fondo del lienzo. El diagrama no ha cambiado.',
    'Este navegador não conseguiu lembrar o fundo da tela. O diagrama não foi alterado.',
    "Ce navigateur n'a pas pu mémoriser l'arrière-plan du canevas. Votre diagramme est inchangé.",
    'Dieser Browser konnte den Leinwandhintergrund nicht speichern. Ihr Diagramm ist unverändert.',
    '이 브라우저에서 캔버스 배경을 저장하지 못했습니다. 다이어그램은 변경되지 않았습니다.',
  ],
  Fullscreen: ['全画面表示', '全屏', 'Pantalla completa', 'Tela cheia', 'Plein écran', 'Vollbild', '전체 화면'],
  'Enter fullscreen': ['全画面表示に切り替え', '进入全屏', 'Entrar en pantalla completa', 'Entrar em tela cheia', 'Passer en plein écran', 'Vollbild öffnen', '전체 화면으로 전환'],
  'Exit fullscreen': ['全画面表示を終了', '退出全屏', 'Salir de pantalla completa', 'Sair da tela cheia', 'Quitter le plein écran', 'Vollbild verlassen', '전체 화면 종료'],
  'Exit fullscreen (Esc)': ['全画面表示を終了 (Esc)', '退出全屏 (Esc)', 'Salir de pantalla completa (Esc)', 'Sair da tela cheia (Esc)', 'Quitter le plein écran (Échap)', 'Vollbild verlassen (Esc)', '전체 화면 종료 (Esc)'],
  'Fullscreen failed': ['全画面表示に切り替えられませんでした', '全屏切换失败', 'Error al cambiar la pantalla completa', 'Falha ao alternar a tela cheia', 'Impossible de changer le mode plein écran', 'Vollbildwechsel fehlgeschlagen', '전체 화면 전환 실패'],
};

export const WORKSPACE_DICT: Record<typeof languages[number], Record<string, string>> = {
  ja: {}, zh: {}, es: {}, pt: {}, fr: {}, de: {}, ko: {},
};
for (const [source, translations] of Object.entries(rows)) {
  languages.forEach((language, index) => { WORKSPACE_DICT[language][source] = translations[index]; });
}
