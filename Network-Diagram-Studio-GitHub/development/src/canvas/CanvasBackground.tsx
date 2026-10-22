import { Background, BackgroundVariant, useStore } from '@xyflow/react';
import { create } from 'zustand';
import { CommandMenu, CommandMenuItem } from '../panel/CommandMenu';
import { useT } from '../i18n/useT';

type BackgroundStyle = 'blank' | 'dots' | 'grid';
const key = 'nds.canvas.background';
const defaultStyle: BackgroundStyle = 'grid';
const labels: Record<BackgroundStyle, string> = { blank: 'Blank', dots: 'Dots', grid: 'Grid' };
const storageMessage = 'This browser could not remember the canvas background. Your diagram is unchanged.';

function readPreference(): { style: BackgroundStyle; storageError: string } {
  if (typeof window === 'undefined') return { style: defaultStyle, storageError: '' };
  try {
    const value = localStorage.getItem(key);
    if (value === null) return { style: defaultStyle, storageError: '' };
    if (value !== 'blank' && value !== 'dots' && value !== 'grid') throw new Error('Invalid canvas background.');
    return { style: value, storageError: '' };
  } catch (error) {
    console.warn('Network Diagram Studio could not read the canvas background.', error);
    return { style: defaultStyle, storageError: storageMessage };
  }
}

const useCanvasBackground = create<{
  style: BackgroundStyle;
  storageError: string;
  select: (style: BackgroundStyle) => void;
}>(set => ({
  ...readPreference(),
  select: style => {
    let storageError = '';
    try {
      localStorage.setItem(key, style);
    } catch (error) {
      console.warn('Network Diagram Studio could not save the canvas background.', error);
      storageError = storageMessage;
    }
    set({ style, storageError });
  },
}));

export function CanvasBackground() {
  const style = useCanvasBackground(state => state.style);
  const zoom = useStore(state => state.transform[2]);
  if (style === 'blank') return null;
  if (style === 'dots') {
    // Keep dots at least 2px across and 12px apart on screen without moving their world origin.
    const size = 2 / Math.min(1, zoom);
    const spacing = 16 * 2 ** Math.max(0, Math.ceil(Math.log2(12 / (16 * zoom))));
    return <Background variant={BackgroundVariant.Dots} gap={spacing} size={size} offset={size / 2} color="var(--nds-grid)" />;
  }
  return (
    <>
      <Background id="nds-grid-minor" variant={BackgroundVariant.Lines} gap={24} lineWidth={1} color="var(--nds-grid-line)" />
      <Background id="nds-grid-major" variant={BackgroundVariant.Lines} gap={120} lineWidth={1} color="var(--nds-grid-major)" style={{ backgroundColor: 'transparent' }} />
    </>
  );
}

export function CanvasBackgroundMenu() {
  const t = useT();
  const style = useCanvasBackground(state => state.style);
  const select = useCanvasBackground(state => state.select);
  const storageError = useCanvasBackground(state => state.storageError);
  return (
    <CommandMenu
      id="canvas-background"
      label={t('Canvas: {style}').replace('{style}', t(labels[style]))}
      triggerClassName="nds-canvas-chrome nds-canvas-view-button"
      icon={
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
          <rect x="2" y="2" width="16" height="16" rx="2" /><path d="M7.3 2v16M12.7 2v16M2 7.3h16M2 12.7h16" />
        </svg>
      }
    >
      <div className="nds-menu-heading">{t('Canvas background')}</div>
      {(Object.keys(labels) as BackgroundStyle[]).map(value => (
        <CommandMenuItem
          key={value}
          value={value}
          label={t(labels[value])}
          description={value === defaultStyle ? t('Current default') : undefined}
          checked={style === value}
          onClick={() => select(value)}
          icon={<span className={`nds-background-swatch nds-background-swatch-${value}`} aria-hidden="true" />}
        />
      ))}
      <div className="nds-menu-footer">{t('Changes the background only')}</div>
      {storageError && <p className="nds-menu-storage-error" role="status">{t(storageError)}</p>}
    </CommandMenu>
  );
}
