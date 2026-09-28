import { useEffect } from 'react';
import { IconGrid } from './IconGrid';
import type { IconEntry } from '../icons/manifest';
import { useT } from '../i18n/useT';

interface IconPickerModalProps {
  open: boolean;
  title?: string;
  onSelect: (icon: IconEntry) => void;
  onClose: () => void;
}

export function IconPickerModal({ open, title, onSelect, onClose }: IconPickerModalProps) {
  const t = useT();
  const modalTitle = title ?? t('Choose an icon');
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: 'var(--nds-scrim)' }}
      onClick={onClose}
    >
      <div
        className="nds-modal bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col overflow-hidden"
        style={{ maxHeight: '85vh', height: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 h-12 border-b bg-white"
          style={{ borderColor: 'var(--color-slate-200)' }}
        >
          <span className="text-sm font-semibold text-slate-800">🎨 {modalTitle}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 text-xl leading-none"
            aria-label={t('Close')}
          >
            ×
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <IconGrid
            onSelect={(icon) => {
              onSelect(icon);
              onClose();
            }}
            autoFocusSearch
            columns={7}
          />
        </div>
      </div>
    </div>
  );
}
