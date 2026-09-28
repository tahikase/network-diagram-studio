// UI language preference.
//
// Why this exists: people were reaching for the *browser's* translate feature
// to read the app in their own language. That works, but it rewrites the DOM
// underneath React — which is the classic cause of
// `NotFoundError: Failed to execute 'removeChild' on 'Node'` crashes — and it
// happily mangles diagram content too, translating Azure product names that
// Microsoft ships untranslated. Owning the switch ourselves fixes both.
//
// Scope: the app CHROME (buttons, panels, menus, tooltips, help text) plus the
// per-resource "Details" deep-dives in the Property Panel, which are
// translated at render time from the English source strings. It deliberately
// does NOT translate:
//   - Azure resource type names ("ExpressRoute Gateway", "Front Door") —
//     product names are not localised by Microsoft either,
//   - anything the user typed (node names, notes, titles),
//   - template names, which are stitched from product names and would read as
//     nonsense half-translated.
import { create } from 'zustand';

export type LangCode = 'en' | 'ja' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ko';

/**
 * Shown in the Settings menu. `label` is the language's own name — someone
 * looking for their language scans for "日本語", not for "Japanese". `english`
 * rides along as a subtitle so the list stays scannable for everyone else.
 *
 * Right-to-left languages (Arabic, Hebrew) are deliberately absent: they need
 * a mirrored layout, and a half-mirrored canvas is worse than English.
 */
export const LANGUAGES: Array<{ code: LangCode; label: string; english: string }> = [
  { code: 'en', label: 'English', english: 'English' },
  { code: 'ja', label: '日本語', english: 'Japanese' },
  { code: 'zh', label: '简体中文', english: 'Chinese (Simplified)' },
  { code: 'es', label: 'Español', english: 'Spanish' },
  { code: 'pt', label: 'Português', english: 'Portuguese' },
  { code: 'fr', label: 'Français', english: 'French' },
  { code: 'de', label: 'Deutsch', english: 'German' },
  { code: 'ko', label: '한국어', english: 'Korean' },
];

const SUPPORTED = new Set<string>(LANGUAGES.map((l) => l.code));
const STORAGE_KEY = 'nds.lang';

/**
 * Microsoft Learn locale for each UI language. Learn uses full BCP-47 tags in
 * the URL path (`/ja-jp/azure/...`), not the bare primary subtag, and a URL
 * with NO locale segment gets redirected using the browser's Accept-Language —
 * which is not necessarily the language the user picked in this app. Someone
 * who switched the UI to Japanese on an English-locale machine was still being
 * sent to English documentation.
 *
 * `pt` maps to pt-br and `zh` to zh-cn, matching the languages actually offered
 * in the picker (Portuguese and Chinese Simplified). All eight paths were
 * confirmed to return 200 with no redirect.
 */
const LEARN_LOCALE: Record<LangCode, string> = {
  en: 'en-us',
  ja: 'ja-jp',
  zh: 'zh-cn',
  es: 'es-es',
  pt: 'pt-br',
  fr: 'fr-fr',
  de: 'de-de',
  ko: 'ko-kr',
};

/**
 * Point a learn.microsoft.com URL at the user's chosen language.
 *
 * Handles both shapes the app stores: `/azure/...` (no locale, the form used
 * throughout `resource-knowledge.ts`) and an existing `/en-us/azure/...`, which
 * is rewritten rather than doubled up. Any non-Learn URL is returned untouched,
 * so this is safe to apply blindly.
 */
export function learnUrl(url: string, lang: LangCode): string {
  const locale = LEARN_LOCALE[lang] ?? 'en-us';
  return url.replace(
    /^(https:\/\/learn\.microsoft\.com)\/(?:[a-z]{2}-[a-z]{2}\/)?/i,
    `$1/${locale}/`,
  );
}

/**
 * First run only: follow the browser. Someone whose browser is Japanese was
 * already translating the page by hand, so opening in Japanese is what they
 * were asking for. `navigator.language` is a BCP-47 tag ("ja", "ja-JP",
 * "pt-BR", "zh-Hans-CN"), so match on the primary subtag.
 */
function detectFromBrowser(): LangCode {
  if (typeof navigator === 'undefined') return 'en';
  const tags = [navigator.language, ...(navigator.languages ?? [])].filter(Boolean);
  for (const tag of tags) {
    const primary = String(tag).toLowerCase().split('-')[0];
    if (SUPPORTED.has(primary)) return primary as LangCode;
  }
  return 'en';
}

function readStored(): LangCode {
  if (typeof window === 'undefined') return 'en';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && SUPPORTED.has(v)) return v as LangCode;
  } catch {
    // ignore private mode / quota
  }
  return detectFromBrowser();
}

function writeStored(v: LangCode) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, v);
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Keeps <html lang> honest. Screen readers pick their voice from it, and it
 * also stops Chrome from offering to translate a page that is already in the
 * reader's language.
 */
export function applyLang(lang: LangCode) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('lang', lang);
}

interface I18nState {
  lang: LangCode;
  setLang: (l: LangCode) => void;
}

const initialLang = readStored();

export const useI18nStore = create<I18nState>((set) => ({
  lang: initialLang,
  setLang: (l) => {
    writeStored(l);
    applyLang(l);
    set({ lang: l });
  },
}));

applyLang(initialLang);

// Testing hook — mirrors the theme store so Playwright can switch language
// without driving the Settings popover.
if (typeof window !== 'undefined') {
  (window as unknown as { __nds_i18nStore?: typeof useI18nStore }).__nds_i18nStore =
    useI18nStore;
}
