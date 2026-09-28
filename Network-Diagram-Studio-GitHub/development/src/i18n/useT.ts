import { useCallback } from 'react';
import { useI18nStore, type LangCode } from './i18n-store';
import { DICT } from './strings';

/**
 * The English string IS the key.
 *
 * The alternative — invented keys like `header.export.button` — means every
 * call site stops saying what it renders, and a missing entry renders a
 * debug-looking token to the user. With English-as-key an untranslated string
 * simply stays English, which is a perfectly good fallback, and the JSX still
 * reads as prose in review.
 */
export function translate(lang: LangCode, source: string): string {
  if (lang === 'en') return source;
  const hit = DICT[lang]?.[source];
  if (hit) return hit;
  recordMiss(lang, source);
  return source;
}

/**
 * Untranslated strings are silently English at runtime, which is exactly what
 * we want for users but useless for catching gaps. Every miss is recorded so
 * the acceptance test can walk the whole UI in each language and assert the
 * dictionary actually covers what got rendered.
 */
const misses = new Map<string, Set<string>>();
function recordMiss(lang: LangCode, source: string) {
  if (typeof window === 'undefined') return;
  let set = misses.get(lang);
  if (!set) {
    set = new Set();
    misses.set(lang, set);
  }
  set.add(source);
  (window as unknown as { __nds_i18nMissing?: () => Record<string, string[]> })
    .__nds_i18nMissing = () =>
    Object.fromEntries([...misses].map(([k, v]) => [k, [...v]]));
}

/** Component-level translator. Re-renders the caller when the language changes. */
export function useT() {
  const lang = useI18nStore((s) => s.lang);
  return useCallback((source: string) => translate(lang, source), [lang]);
}
