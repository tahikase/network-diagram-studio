import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { create } from 'zustand';

const useOpenMenu = create<{ id: string | null }>(() => ({ id: null }));

export function CommandMenu({
  id, label, icon, children, triggerClassName = '', className = '',
}: {
  id: string;
  label: string;
  icon: ReactNode;
  children: ReactNode;
  triggerClassName?: string;
  className?: string;
}) {
  const open = useOpenMenu(state => state.id === id);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const enterFromEnd = useRef(false);
  const close = (restoreFocus = false) => {
    if (useOpenMenu.getState().id === id) useOpenMenu.setState({ id: null });
    if (restoreFocus) trigger.current?.focus();
  };
  const items = () => [...(menu.current?.querySelectorAll<HTMLButtonElement>(
    '[role="menuitem"], [role="menuitemradio"]',
  ) ?? [])].filter(item => !item.disabled && item.getClientRects().length > 0);

  useLayoutEffect(() => {
    if (!open) return;
    const popup = menu.current;
    const anchor = root.current;
    if (popup && anchor) {
      const canvas = anchor.closest('[data-nds-fullscreen-target]');
      const bounds = canvas?.getBoundingClientRect();
      const left = (bounds?.left ?? 0) + 12;
      const right = (bounds?.right ?? window.innerWidth) - 12;
      const width = Math.max(0, right - left);
      popup.style.minWidth = `${Math.min(248, width)}px`;
      popup.style.maxWidth = `${Math.min(360, width)}px`;
      const origin = anchor.getBoundingClientRect().left;
      popup.style.left = `${Math.max(left, Math.min(origin, right - popup.getBoundingClientRect().width)) - origin}px`;
    }
    const available = items();
    (enterFromEnd.current ? available.at(-1) : available[0])?.focus();
  }, [open, label]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        if (useOpenMenu.getState().id === id) useOpenMenu.setState({ id: null });
      }
    };
    const resize = () => {
      if (useOpenMenu.getState().id === id) useOpenMenu.setState({ id: null });
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside);
    window.addEventListener('resize', resize);
    document.addEventListener('fullscreenchange', resize);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('focusin', outside);
      window.removeEventListener('resize', resize);
      document.removeEventListener('fullscreenchange', resize);
    };
  }, [open, id]);

  return (
    <div ref={root} className={`nds-command-menu ${className}`}>
      <button
        ref={trigger}
        type="button"
        id={`nds-menu-${id}-trigger`}
        data-nds-menu-trigger={id}
        className={`nds-menu-trigger ${triggerClassName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`nds-menu-${id}`}
        aria-label={label}
        title={label}
        onClick={() => {
          enterFromEnd.current = false;
          useOpenMenu.setState({ id: open ? null : id });
        }}
        onKeyDown={event => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          event.preventDefault();
          event.stopPropagation();
          enterFromEnd.current = event.key === 'ArrowUp';
          useOpenMenu.setState({ id });
        }}
      >
        {icon}<span>{label}</span>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      <div
        ref={menu}
        id={`nds-menu-${id}`}
        className="nds-command-popup"
        role="menu"
        aria-labelledby={`nds-menu-${id}-trigger`}
        hidden={!open}
        onPointerDown={event => event.stopPropagation()}
        onClickCapture={event => {
          if (event.target instanceof Element && event.target.closest('[role="menuitem"], [role="menuitemradio"]')) {
            // Restore focus before the action can open a dialog or file picker.
            close(true);
          }
        }}
        onKeyDown={event => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            close(true);
          } else if (event.key === 'Tab') {
            close(true);
          } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            const available = items();
            const index = available.findIndex(item => item === document.activeElement);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1
              : (index + (event.key === 'ArrowDown' ? 1 : -1) + available.length) % available.length;
            available[next]?.focus();
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function CommandMenuItem({
  label, description, icon, onClick, title, checked, value,
}: {
  label: string;
  description?: string;
  icon: ReactNode;
  onClick: () => void;
  title?: string;
  checked?: boolean;
  value?: string;
}) {
  return (
    <button
      type="button"
      role={checked === undefined ? 'menuitem' : 'menuitemradio'}
      aria-checked={checked}
      aria-label={label}
      title={title}
      tabIndex={-1}
      data-nds-background-option={value}
      className="nds-menu-item"
      onClick={onClick}
    >
      {icon}
      <span className="nds-menu-item-copy"><span>{label}</span>{description && <small>{description}</small>}</span>
      {checked && <span className="nds-menu-check" aria-hidden="true">&#10003;</span>}
    </button>
  );
}
