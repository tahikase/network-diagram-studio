// Simple stable-ish ID generator.
export function newId(prefix = 'n'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export const nowIso = (): string => new Date().toISOString();
