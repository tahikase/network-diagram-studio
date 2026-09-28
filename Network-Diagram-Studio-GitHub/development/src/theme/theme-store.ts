// Appearance / theme preference.
//
// Light is the ONLY historical look, so it stays the default — an existing
// user who never opens Settings sees exactly what they saw before.
//
// Theming works by remapping CSS custom properties under
// `html[data-theme="dark"]` (see the dark block in src/index.css). Because
// Tailwind v4 compiles every colour utility down to `var(--color-*)`,
// overriding those variables re-themes the whole app without touching the
// ~300 utility classes scattered across the components.
import { create } from 'zustand';

export type ThemePref = 'light' | 'dark';

const STORAGE_KEY = 'nds.theme';

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * There used to be a third "System" option that tracked the OS setting. It was
 * dropped because a two-way switch is what people actually reach for, and
 * because a diagram whose look changes when Windows flips to night mode
 * mid-screen-share is surprising rather than helpful.
 *
 * Anyone still carrying `system` in localStorage is migrated once, to whatever
 * the OS was resolving to — so they keep the look they had — and the concrete
 * choice is written back.
 */
function readStored(): ThemePref {
  if (typeof window === 'undefined') return 'light';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light') return v;
    if (v === 'system') {
      const migrated: ThemePref = systemPrefersDark() ? 'dark' : 'light';
      writeStored(migrated);
      return migrated;
    }
    return 'light';
  } catch {
    return 'light';
  }
}

function writeStored(v: ThemePref) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, v);
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Writes the theme onto <html>. `color-scheme` is what makes native widgets —
 * scrollbars, form controls, the caret — follow the theme too.
 */
export function applyTheme(theme: ThemePref) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

interface ThemeState {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

const initialPref = readStored();

export const useThemeStore = create<ThemeState>((set) => ({
  pref: initialPref,
  setPref: (p) => {
    writeStored(p);
    applyTheme(p);
    set({ pref: p });
  },
}));

// Paint the stored theme during module init — before React's first render —
// so a dark-mode user never sees a white flash on load.
applyTheme(initialPref);

// Testing hook — mirrors the other stores so Playwright checks can flip the
// theme without driving the Settings popover.
if (typeof window !== 'undefined') {
  (window as unknown as { __nds_themeStore?: typeof useThemeStore }).__nds_themeStore =
    useThemeStore;
}
