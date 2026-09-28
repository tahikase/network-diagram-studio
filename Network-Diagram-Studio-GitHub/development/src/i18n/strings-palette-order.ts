const languages = ['ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko'] as const;
type Translations = readonly [string, string, string, string, string, string, string];

const rows: Record<string, Translations> = {
  'Drag to reorder. Use Alt+Up/Down to move.': [
    'ドラッグして並べ替えます。Alt+上下矢印でも移動できます。',
    '拖动以重新排序，也可使用 Alt+上/下方向键。',
    'Arrastra para reordenar. También puedes usar Alt+Arriba/Abajo.',
    'Arraste para reordenar. Também pode usar Alt+Cima/Baixo.',
    'Faites glisser pour réordonner, ou utilisez Alt+Haut/Bas.',
    'Zum Sortieren ziehen oder Alt+Pfeil auf/ab verwenden.',
    '드래그하여 순서를 바꾸세요. Alt+위/아래 화살표도 사용할 수 있습니다.',
  ],
  'Reset palette order': [
    'パレットの順序をリセット', '重置调色板顺序', 'Restablecer orden de la paleta',
    'Redefinir ordem da paleta', 'Réinitialiser l’ordre de la palette',
    'Palettenreihenfolge zurücksetzen', '팔레트 순서 초기화',
  ],
  'Palette order reset.': [
    'パレットの順序をリセットしました。', '已重置调色板顺序。', 'Se restableció el orden de la paleta.',
    'A ordem da paleta foi redefinida.', 'L’ordre de la palette a été réinitialisé.',
    'Palettenreihenfolge zurückgesetzt.', '팔레트 순서를 초기화했습니다.',
  ],
  'Moved {section} to position {position} of {count}.': [
    '{section} を {count} セクション中の {position} 番目に移動しました。',
    '已将{section}移到第 {position} 位，共 {count} 项。',
    '{section} se movió a la posición {position} de {count}.',
    '{section} foi movido para a posição {position} de {count}.',
    '{section} a été déplacé en position {position} sur {count}.',
    '{section} an Position {position} von {count} verschoben.',
    '{section}을(를) {count}개 중 {position}번째로 이동했습니다.',
  ],
  'Palette order could not be loaded. Showing the default order.': [
    'パレットの順序を読み込めませんでした。既定の順序を表示しています。',
    '无法加载调色板顺序，正在显示默认顺序。',
    'No se pudo cargar el orden de la paleta. Se muestra el orden predeterminado.',
    'Não foi possível carregar a ordem da paleta. A ordem padrão está sendo exibida.',
    'Impossible de charger l’ordre de la palette. L’ordre par défaut est affiché.',
    'Palettenreihenfolge konnte nicht geladen werden. Die Standardreihenfolge wird angezeigt.',
    '팔레트 순서를 불러오지 못했습니다. 기본 순서로 표시합니다.',
  ],
  'Palette order could not be saved. It will reset after reload.': [
    'パレットの順序を保存できませんでした。再読み込みすると元の順序に戻ります。',
    '无法保存调色板顺序，重新加载后将恢复原来的顺序。',
    'No se pudo guardar el orden de la paleta. Se restablecerá al recargar.',
    'Não foi possível salvar a ordem da paleta. Ela será restaurada ao recarregar.',
    'Impossible d’enregistrer l’ordre de la palette. Il sera réinitialisé au rechargement.',
    'Palettenreihenfolge konnte nicht gespeichert werden. Sie wird beim Neuladen zurückgesetzt.',
    '팔레트 순서를 저장하지 못했습니다. 새로 고침하면 이전 순서로 돌아갑니다.',
  ],
};

export const PALETTE_ORDER_DICT: Record<typeof languages[number], Record<string, string>> = {
  ja: {}, zh: {}, es: {}, pt: {}, fr: {}, de: {}, ko: {},
};
for (const [source, translations] of Object.entries(rows)) {
  languages.forEach((language, index) => { PALETTE_ORDER_DICT[language][source] = translations[index]; });
}
