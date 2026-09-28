const languages = ['ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko'] as const;
type Translations = readonly [string, string, string, string, string, string, string];

const rows: Record<string, Translations> = {
  'Shape text formatting': [
    '図形の文字書式', '形状文本格式', 'Formato de texto de la forma', 'Formatação do texto da forma',
    'Mise en forme du texte de la forme', 'Textformatierung der Form', '도형 텍스트 서식',
  ],
  'Shape text': ['図形の文字', '形状文本', 'Texto de la forma', 'Texto da forma', 'Texte de la forme', 'Formtext', '도형 텍스트'],
  'Text alignment': [
    '文字の配置', '文本对齐', 'Alineación del texto', 'Alinhamento do texto',
    'Alignement du texte', 'Textausrichtung', '텍스트 정렬',
  ],
  'Align left': ['左揃え', '左对齐', 'Alinear a la izquierda', 'Alinhar à esquerda', 'Aligner à gauche', 'Linksbündig', '왼쪽 정렬'],
  'Center': ['中央揃え', '居中', 'Centrar', 'Centralizar', 'Centrer', 'Zentrieren', '가운데 정렬'],
  'Align right': ['右揃え', '右对齐', 'Alinear a la derecha', 'Alinhar à direita', 'Aligner à droite', 'Rechtsbündig', '오른쪽 정렬'],
  'Decrease indent': [
    'インデントを減らす', '减少缩进', 'Disminuir sangría', 'Diminuir recuo',
    'Diminuer le retrait', 'Einzug verkleinern', '들여쓰기 줄이기',
  ],
  'Increase indent': [
    'インデントを増やす', '增加缩进', 'Aumentar sangría', 'Aumentar recuo',
    'Augmenter le retrait', 'Einzug vergrößern', '들여쓰기 늘리기',
  ],
  'Paragraph spacing': [
    '段落の間隔', '段落间距', 'Espaciado entre párrafos', 'Espaçamento entre parágrafos',
    'Espacement des paragraphes', 'Absatzabstand', '문단 간격',
  ],
  'Before (px)': ['段落前 (px)', '段前 (px)', 'Antes (px)', 'Antes (px)', 'Avant (px)', 'Vor (px)', '문단 앞 (px)'],
  'After (px)': ['段落後 (px)', '段后 (px)', 'Después (px)', 'Depois (px)', 'Après (px)', 'Nach (px)', '문단 뒤 (px)'],
  'Line spacing': ['行間', '行距', 'Interlineado', 'Espaçamento entre linhas', 'Interligne', 'Zeilenabstand', '줄 간격'],
  'Allowed range': ['入力できる範囲', '允许范围', 'Rango permitido', 'Intervalo permitido', 'Plage autorisée', 'Zulässiger Bereich', '허용 범위'],
  'Applies to all text in this shape.': [
    'この図形内のすべての文字に適用します。', '应用于此形状中的所有文本。',
    'Se aplica a todo el texto de esta forma.', 'Aplica-se a todo o texto desta forma.',
    "S'applique à tout le texte de cette forme.", 'Gilt für den gesamten Text dieser Form.', '이 도형의 모든 텍스트에 적용됩니다.',
  ],
  'Apply': ['適用', '应用', 'Aplicar', 'Aplicar', 'Appliquer', 'Anwenden', '적용'],
};

export const SHAPE_TEXT_DICT: Record<typeof languages[number], Record<string, string>> = {
  ja: {}, zh: {}, es: {}, pt: {}, fr: {}, de: {}, ko: {},
};
for (const [source, translations] of Object.entries(rows)) {
  languages.forEach((language, index) => { SHAPE_TEXT_DICT[language][source] = translations[index]; });
}
