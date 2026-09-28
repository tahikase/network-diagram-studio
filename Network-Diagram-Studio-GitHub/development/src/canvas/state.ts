import type { StateColor } from '../model/types';

export const STATE_STROKE: Record<StateColor, string> = {
  ok: 'var(--nds-ring-ok)',
  degraded: 'var(--nds-ring-degraded)',
  broken: 'var(--nds-ring-broken)',
  unknown: 'var(--nds-ring-unknown)',
};

export const STATE_BG: Record<StateColor, string> = {
  ok: 'var(--nds-ring-ok-bg)',
  degraded: 'var(--nds-ring-degraded-bg)',
  broken: 'var(--nds-ring-broken-bg)',
  unknown: 'var(--nds-ring-unknown-bg)',
};

export const STATE_LABEL: Record<StateColor, string> = {
  ok: 'OK',
  degraded: 'Degraded',
  broken: 'Broken',
  unknown: 'Unknown',
};
