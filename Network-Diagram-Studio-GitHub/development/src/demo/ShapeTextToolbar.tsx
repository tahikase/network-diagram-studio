import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { useT } from '../i18n/useT';
import {
  DEFAULT_TEXT_LINE_HEIGHT, MAX_PARAGRAPH_SPACE, MAX_TEXT_INDENT,
  MAX_TEXT_LINE_HEIGHT, MIN_TEXT_LINE_HEIGHT, SHAPE_TEXT_SIZES, type ShapeTextStyle,
} from '../model/shape-text';
import { PEN_COLORS } from '../theme/palette';

const ALIGNMENTS = [
  { value: 'left', label: 'Align left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Align right' },
] as const;

const panelBackground = 'var(--nds-panel-raised, var(--nds-panel))';
const controlStyle: CSSProperties = {
  height: 34, minWidth: 34, padding: '0 6px', flexShrink: 0,
  border: '1px solid var(--nds-border)', borderRadius: 6,
  background: panelBackground, color: 'var(--nds-text)',
  fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
};
const menuItemStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px',
  border: 0, borderRadius: 4, background: 'transparent', color: 'inherit',
  font: 'inherit', textAlign: 'left', cursor: 'pointer',
};

function AlignIcon({ align }: { align: NonNullable<ShapeTextStyle['textAlign']> }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {[14, 10, 14, 8].map((width, i) => {
        const x = align === 'left' ? 2 : align === 'right' ? 16 - width : (18 - width) / 2;
        return <path key={i} d={`M${x} ${3 + i * 4}h${width}`} />;
      })}
    </svg>
  );
}

function IndentIcon({ decrease }: { decrease?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M7 3h9M7 7h9M7 11h9M2 15h14" />
      <path d={decrease ? 'M5 4 2 7l3 3' : 'm2 4 3 3-3 3'} />
    </svg>
  );
}

function ParagraphSpacing({
  shape, onApply, onCancel,
}: {
  shape: ShapeTextStyle;
  onApply: (patch: Partial<ShapeTextStyle>) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [before, setBefore] = useState(String(shape.textSpaceBefore ?? 0));
  const [after, setAfter] = useState(String(shape.textSpaceAfter ?? 0));
  const [lineHeight, setLineHeight] = useState(shape.textLineHeight ?? DEFAULT_TEXT_LINE_HEIGHT);
  const valid = (value: string) => value.trim() !== '' && Number.isFinite(Number(value))
    && Number(value) >= 0 && Number(value) <= MAX_PARAGRAPH_SPACE;
  const canApply = valid(before) && valid(after);
  const apply = () => {
    if (!canApply) return;
    const patch: Partial<ShapeTextStyle> = {};
    if (Number(before) !== (shape.textSpaceBefore ?? 0)) patch.textSpaceBefore = Number(before);
    if (Number(after) !== (shape.textSpaceAfter ?? 0)) patch.textSpaceAfter = Number(after);
    if (lineHeight !== (shape.textLineHeight ?? DEFAULT_TEXT_LINE_HEIGHT)) patch.textLineHeight = lineHeight;
    onApply(patch);
  };
  return (
    <div role="dialog" aria-label={t('Paragraph spacing')} onKeyDown={event => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) { event.stopPropagation(); return; }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCancel(); }
      if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); apply(); }
    }}>
      <strong style={{ display: 'block', marginBottom: 12 }}>{t('Paragraph spacing')}</strong>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 86px', gap: '10px 8px', alignItems: 'center' }}>
        <label htmlFor="nds-paragraph-before">{t('Before (px)')}</label>
        <input id="nds-paragraph-before" data-nds-paragraph-before autoFocus type="number" min={0}
          max={MAX_PARAGRAPH_SPACE} step={1} value={before} aria-invalid={!valid(before)}
          onChange={event => setBefore(event.target.value)} style={{ ...controlStyle, width: '100%' }} />
        <label htmlFor="nds-paragraph-after">{t('After (px)')}</label>
        <input id="nds-paragraph-after" data-nds-paragraph-after type="number" min={0}
          max={MAX_PARAGRAPH_SPACE} step={1} value={after} aria-invalid={!valid(after)}
          onChange={event => setAfter(event.target.value)} style={{ ...controlStyle, width: '100%' }} />
        <label htmlFor="nds-paragraph-line-height">{t('Line spacing')}</label>
        <select id="nds-paragraph-line-height" data-nds-paragraph-line-height value={lineHeight}
          onChange={event => setLineHeight(Number(event.target.value))} style={controlStyle}>
          {[...new Set([MIN_TEXT_LINE_HEIGHT, 1.25, 1.5, 2, 2.5, MAX_TEXT_LINE_HEIGHT, lineHeight])]
            .sort((a, b) => a - b).map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      {!canApply && <div role="alert" style={{ marginTop: 8 }}>{t('Allowed range')}: 0-{MAX_PARAGRAPH_SPACE}</div>}
      <p style={{ fontSize: 12, margin: '12px 0', color: 'var(--nds-text-dim)' }}>
        {t('Applies to all text in this shape.')}
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button type="button" style={controlStyle} onClick={onCancel}>{t('Cancel')}</button>
        <button type="button" data-nds-paragraph-apply disabled={!canApply} onClick={apply}
          style={{ ...controlStyle, opacity: canApply ? 1 : 0.45 }}>{t('Apply')}</button>
      </div>
    </div>
  );
}

export function ShapeTextToolbar({
  shape, onChange, focusText, onHeightChange, spaceAbove, spaceBelow,
}: {
  shape: ShapeTextStyle & { color: string };
  onChange: (patch: Partial<ShapeTextStyle>) => void;
  focusText: () => void;
  onHeightChange: (height: number) => void;
  spaceAbove: number;
  spaceBelow: number;
}) {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const pointerSelect = useRef(false);
  const [menu, setMenu] = useState<'align' | 'spacing' | null>(null);
  const align = shape.textAlign ?? 'center';
  const indent = shape.textIndent ?? 0;
  const size = shape.textSize ?? 14;
  const color = shape.textColor ?? shape.color;
  const returnToText = () => { setMenu(null); focusText(); };
  const closeMenu = () => { setMenu(null); triggerRef.current?.focus(); };
  const change = (patch: Partial<ShapeTextStyle>) => { onChange(patch); returnToText(); };
  const keepSelection = (event: React.MouseEvent) => event.preventDefault();
  const above = spaceBelow < (menu === 'spacing' ? 260 : 180) && spaceAbove > spaceBelow;
  const placeMenu = useCallback(() => {
    const root = rootRef.current, popup = popupRef.current, trigger = triggerRef.current;
    if (!root || !popup || !trigger) return;
    popup.style.left = `${Math.max(0, Math.min(root.clientWidth - popup.offsetWidth, trigger.offsetLeft))}px`;
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(() => { onHeightChange(root.offsetHeight); placeMenu(); });
    observer.observe(root);
    return () => observer.disconnect();
  }, [onHeightChange, placeMenu]);

  useLayoutEffect(() => {
    placeMenu();
    if (menu === 'align') menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [menu, placeMenu]);

  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setMenu(null);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [menu]);

  return (
    <div ref={rootRef} data-nds-text-toolbar="1" role="toolbar" aria-label={t('Shape text formatting')}
      style={{
        position: 'relative', width: '100%', display: 'flex', flexWrap: 'wrap', alignItems: 'center',
        gap: '6px 8px', padding: '5px 8px', boxSizing: 'border-box', minHeight: 46,
        background: panelBackground, border: '1px solid var(--nds-border)',
        borderRadius: 9, boxShadow: '0 5px 14px rgba(0,0,0,0.3)',
        fontFamily: 'system-ui, sans-serif', fontSize: 14, color: 'var(--nds-text)',
      }}>
      <select data-nds-text-size value={size} aria-label={t('Text size')} title={t('Text size')}
        onPointerDown={() => { pointerSelect.current = true; }}
        onKeyDown={event => { pointerSelect.current = false; event.stopPropagation(); }}
        onChange={event => {
          onChange({ textSize: Number(event.target.value) });
          if (pointerSelect.current) focusText();
        }} style={{ ...controlStyle, width: 72 }}>
        {[...new Set([...SHAPE_TEXT_SIZES, size])].sort((a, b) => a - b)
          .map(value => <option key={value} value={value}>{value}px</option>)}
      </select>
      <button type="button" data-nds-text-bold aria-label={t('Bold')} title={t('Bold')}
        aria-pressed={!!shape.textBold} onMouseDown={keepSelection} onClick={() => change({ textBold: !shape.textBold })}
        style={{ ...controlStyle, fontWeight: 700, fontSize: 17,
          background: shape.textBold ? 'var(--nds-accent)' : panelBackground,
          color: shape.textBold ? '#ffffff' : 'var(--nds-text)' }}>B</button>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        <button type="button" data-nds-text-indent-decrease disabled={indent === 0}
          aria-label={t('Decrease indent')} title={t('Decrease indent')} onMouseDown={keepSelection}
          onClick={() => change({ textIndent: indent - 1 })}
          style={{ ...controlStyle, opacity: indent === 0 ? 0.4 : 1 }}><IndentIcon decrease /></button>
        <button type="button" data-nds-text-indent-increase disabled={indent >= MAX_TEXT_INDENT}
          aria-label={t('Increase indent')} title={t('Increase indent')} onMouseDown={keepSelection}
          onClick={() => change({ textIndent: indent + 1 })}
          style={{ ...controlStyle, opacity: indent >= MAX_TEXT_INDENT ? 0.4 : 1 }}><IndentIcon /></button>
      </div>
      <button ref={triggerRef} type="button" data-nds-text-align-trigger aria-label={t('Text alignment')}
        title={t('Text alignment')} aria-haspopup="menu" aria-expanded={menu !== null}
        onMouseDown={keepSelection} onClick={() => setMenu(menu ? null : 'align')}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setMenu('align');
          }
        }}
        style={{ ...controlStyle, display: 'flex', alignItems: 'center', gap: 5, width: 46 }}>
        <AlignIcon align={align} />
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="m1 2 3 3 3-3" />
        </svg>
      </button>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 3 }}>
        {PEN_COLORS.map(swatch => (
          <button key={swatch.key} type="button" data-nds-text-color={swatch.key}
            aria-label={`${t('Color')} ${swatch.label}`} title={`${t('Color')} ${swatch.label}`}
            aria-pressed={color.toLowerCase() === swatch.hex.toLowerCase()}
            onMouseDown={keepSelection} onClick={() => change({ textColor: swatch.hex })}
            style={{
              width: 24, height: 26, padding: 0, borderRadius: 5, background: swatch.hex, cursor: 'pointer',
              border: color.toLowerCase() === swatch.hex.toLowerCase() ? '3px solid var(--nds-accent)'
                : swatch.key === 'white' ? '1px solid #94a3b8' : '1px solid var(--nds-chip-border, var(--nds-border))',
            }} />
        ))}
        <input type="color" data-nds-text-custom-color value={color} aria-label={t('Custom color')}
          title={t('Custom color')} onChange={event => change({ textColor: event.target.value })}
          style={{ ...controlStyle, minWidth: 28, width: 28, height: 30, padding: 0, marginLeft: 3 }} />
      </div>
      {menu && (
        <div ref={popupRef} style={{
          position: 'absolute', left: 0, ...(above ? { bottom: 'calc(100% + 6px)' } : { top: 'calc(100% + 6px)' }),
          width: menu === 'spacing' ? 280 : 240, maxWidth: '100%', boxSizing: 'border-box',
          maxHeight: Math.max(36, (above ? spaceAbove : spaceBelow) - 6), overflowY: 'auto',
          padding: menu === 'spacing' ? 12 : 4, background: panelBackground,
          border: '1px solid var(--nds-border)', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
        }}>
          {menu === 'spacing' ? (
            <ParagraphSpacing shape={shape} onApply={change} onCancel={closeMenu} />
          ) : (
            <div ref={menuRef} role="menu" aria-label={t('Text alignment')} onKeyDown={event => {
              if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeMenu(); return; }
              const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')];
              const index = items.findIndex(item => item === document.activeElement);
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
                : event.key === 'ArrowDown' ? (index + 1) % items.length
                : event.key === 'ArrowUp' ? (index + items.length - 1) % items.length : -1;
              if (next >= 0) { event.preventDefault(); items[next].focus(); }
            }}>
              {ALIGNMENTS.map(option => (
                <button key={option.value} type="button" role="menuitemradio" data-nds-text-align={option.value}
                  aria-checked={align === option.value} onClick={() => {
                    if (align !== option.value) onChange({ textAlign: option.value });
                    returnToText();
                  }}
                  style={{ ...menuItemStyle, background: align === option.value ? 'var(--nds-accent)' : 'transparent',
                    color: align === option.value ? '#ffffff' : 'inherit' }}>
                  <AlignIcon align={option.value} />{t(option.label)}
                </button>
              ))}
              <div role="separator" style={{ margin: '4px 0', borderTop: '1px solid var(--nds-border)' }} />
              <button type="button" role="menuitem" data-nds-text-paragraph-open
                onClick={() => setMenu('spacing')} style={menuItemStyle}>{t('Paragraph spacing')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
