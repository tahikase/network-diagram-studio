import type { LangCode } from './i18n-store';
import source from './strings-updates.json';

type TranslatedLanguage = Exclude<LangCode, 'en'>;
const rows: Record<string, Record<TranslatedLanguage, string>> = source;
export const UPDATES_DICT: Record<TranslatedLanguage, Record<string, string>> = {
  ja: {}, zh: {}, es: {}, pt: {}, fr: {}, de: {}, ko: {},
};
const languages: TranslatedLanguage[] = ['ja', 'zh', 'es', 'pt', 'fr', 'de', 'ko'];
for (const [text, translations] of Object.entries(rows)) {
  for (const language of languages) UPDATES_DICT[language][text] = translations[language];
}
