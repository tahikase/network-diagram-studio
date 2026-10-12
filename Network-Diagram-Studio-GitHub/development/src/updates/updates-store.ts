import { create } from 'zustand';
import releases from './release-history.json';

export const UPDATES_SEEN_KEY = 'nds.updates.seen.v1';
const latestPublicVersion = releases[0].version;
const versionPattern = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;
const storageMessage = 'This browser could not remember the viewed version. The New badge may appear again.';

function isNewer(current: string, seen: string | null): boolean {
  if (!seen) return true;
  const previous = seen.split('.').map(Number);
  for (const [index, part] of current.split('.').map(Number).entries()) {
    if (part !== previous[index]) return part > previous[index];
  }
  return false;
}

function readSeen(): { version: string | null; error: string } {
  try {
    const version = localStorage.getItem(UPDATES_SEEN_KEY);
    if (version !== null && !versionPattern.test(version)) throw new Error('Invalid viewed release version.');
    return { version, error: '' };
  } catch (error) {
    console.warn('Network Diagram Studio could not read the viewed release version.', error);
    return { version: null, error: storageMessage };
  }
}

interface UpdatesState {
  open: boolean;
  unread: boolean;
  storageError: string;
  returnTo: HTMLElement | null;
  automatic: boolean;
  show: (returnTo: HTMLElement, automatic?: boolean) => void;
  showAutomatic: (returnTo: HTMLElement) => void;
  keepOpen: () => void;
  hide: () => void;
}

const stored = readSeen();
export const useUpdatesStore = create<UpdatesState>((set, get) => ({
  open: false,
  unread: isNewer(latestPublicVersion, stored.version),
  storageError: stored.error,
  returnTo: null,
  automatic: false,
  show: (returnTo, automatic = false) => {
    let storageError = '';
    try {
      const previous = localStorage.getItem(UPDATES_SEEN_KEY);
      if (!previous || !versionPattern.test(previous) || isNewer(latestPublicVersion, previous)) {
        localStorage.setItem(UPDATES_SEEN_KEY, latestPublicVersion);
      }
    } catch (error) {
      console.warn('Network Diagram Studio could not save the viewed release version.', error);
      storageError = storageMessage;
    }
    set({ open: true, unread: false, storageError, returnTo, automatic: automatic && !storageError });
  },
  showAutomatic: (returnTo) => {
    const state = get();
    if (state.unread && !state.open && !state.storageError) state.show(returnTo, true);
  },
  keepOpen: () => { if (get().automatic) set({ automatic: false }); },
  hide: () => set({ open: false, automatic: false }),
}));

window.addEventListener('storage', event => {
  if (event.key !== UPDATES_SEEN_KEY && event.key !== null) return;
  const next = readSeen();
  useUpdatesStore.setState({ unread: isNewer(latestPublicVersion, next.version), storageError: next.error });
});
