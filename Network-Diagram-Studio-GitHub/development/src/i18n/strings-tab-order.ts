const languages = ['ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko'] as const;
type Translations = readonly [string, string, string, string, string, string, string];

const rows: Record<string, Translations> = {
  'Reorder the focused tab': [
    'フォーカス中のタブを並べ替える', '调整焦点标签页的顺序',
    'Reordenar la pestaña enfocada', 'Reordenar a guia em foco',
    'Réordonner l’onglet ayant le focus', 'Fokussierte Registerkarte verschieben',
    '포커스된 탭의 순서 변경',
  ],
  'Navigate tabs': [
    'タブを切り替える', '切换标签页', 'Navegar por las pestañas', 'Navegar entre guias',
    'Naviguer entre les onglets', 'Zwischen Registerkarten wechseln', '탭 탐색',
  ],
  'Activate the focused tab': [
    'フォーカス中のタブを開く', '激活焦点标签页',
    'Activar la pestaña enfocada', 'Ativar a guia em foco',
    'Activer l’onglet ayant le focus', 'Fokussierte Registerkarte aktivieren',
    '포커스된 탭 활성화',
  ],
  'Cancel tab reordering': [
    'タブの並べ替えをキャンセル', '取消标签页排序',
    'Cancelar la reordenación de pestañas', 'Cancelar a reordenação das guias',
    'Annuler la réorganisation des onglets', 'Sortieren der Registerkarten abbrechen',
    '탭 순서 변경 취소',
  ],
  'Drag to reorder. Use Alt+Left/Right to move. Escape cancels.': [
    'ドラッグして並べ替えます。Alt+左右矢印でも移動できます。Esc でキャンセルします。',
    '拖动以重新排序，也可使用 Alt+左/右方向键。按 Escape 取消。',
    'Arrastra para reordenar. Usa Alt+Izquierda/Derecha para mover. Escape cancela.',
    'Arraste para reordenar. Use Alt+Esquerda/Direita para mover. Escape cancela.',
    'Faites glisser pour réordonner, ou utilisez Alt+Gauche/Droite. Échap annule.',
    'Zum Sortieren ziehen oder Alt+Pfeil links/rechts verwenden. Escape bricht ab.',
    '드래그하여 순서를 바꾸세요. Alt+왼쪽/오른쪽 화살표로도 이동할 수 있습니다. Esc로 취소합니다.',
  ],
  'Moved {tab} to position {position} of {count}.': [
    'タブ「{tab}」を {count} 個中の {position} 番目に移動しました。',
    '已将标签页“{tab}”移到第 {position} 位，共 {count} 个。',
    'La pestaña {tab} se movió a la posición {position} de {count}.',
    'A guia {tab} foi movida para a posição {position} de {count}.',
    'L’onglet {tab} a été déplacé en position {position} sur {count}.',
    'Registerkarte {tab} an Position {position} von {count} verschoben.',
    '{tab} 탭을 {count}개 중 {position}번째로 이동했습니다.',
  ],
  'Tab reordering cancelled.': [
    'タブの並べ替えをキャンセルしました。', '已取消标签页排序。',
    'Se canceló la reordenación de pestañas.', 'A reordenação das guias foi cancelada.',
    'Réorganisation des onglets annulée.', 'Sortieren der Registerkarten abgebrochen.',
    '탭 순서 변경을 취소했습니다.',
  ],
  'Each tab holds its own diagram, shapes and notes. Drag tabs to reorder, or focus a tab and use Alt+Left/Right. The browser remembers the order. Save JSON writes only the current tab.': [
    '各タブには、それぞれの図、図形、メモが保存されます。ドラッグするか、タブにフォーカスして Alt+左右矢印を押すと並べ替えられます。順序はブラウザーに保存されます。JSON 保存の対象は現在のタブだけです。',
    '每个标签页都有自己的关系图、形状和笔记。拖动标签页，或聚焦标签页后按 Alt+左/右方向键即可排序。浏览器会记住顺序。保存 JSON 只保存当前标签页。',
    'Cada pestaña tiene su propio diagrama, formas y notas. Arrastra las pestañas para reordenarlas o enfoca una y usa Alt+Izquierda/Derecha. El navegador recuerda el orden. Guardar JSON solo guarda la pestaña actual.',
    'Cada guia tem seu próprio diagrama, formas e notas. Arraste as guias para reordenar ou foque uma guia e use Alt+Esquerda/Direita. O navegador memoriza a ordem. Salvar JSON salva apenas a guia atual.',
    'Chaque onglet possède son schéma, ses formes et ses notes. Faites glisser les onglets pour les réordonner, ou placez le focus sur un onglet et utilisez Alt+Gauche/Droite. Le navigateur mémorise l’ordre. Enregistrer JSON enregistre uniquement l’onglet actuel.',
    'Jede Registerkarte enthält ihr eigenes Diagramm, Formen und Notizen. Zum Sortieren ziehen oder eine Registerkarte fokussieren und Alt+Pfeil links/rechts verwenden. Der Browser merkt sich die Reihenfolge. JSON speichern speichert nur die aktuelle Registerkarte.',
    '각 탭에는 자체 다이어그램, 도형과 메모가 있습니다. 탭을 드래그하거나 탭에 포커스를 두고 Alt+왼쪽/오른쪽 화살표로 순서를 바꾸세요. 브라우저가 순서를 기억합니다. JSON 저장은 현재 탭만 저장합니다.',
  ],
};

export const TAB_ORDER_DICT: Record<typeof languages[number], Record<string, string>> = {
  ja: {}, zh: {}, es: {}, pt: {}, fr: {}, de: {}, ko: {},
};
for (const [source, translations] of Object.entries(rows)) {
  languages.forEach((language, index) => { TAB_ORDER_DICT[language][source] = translations[index]; });
}
