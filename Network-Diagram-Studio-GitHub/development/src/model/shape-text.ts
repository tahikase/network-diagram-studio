import type { CSSProperties } from 'react';
import { fitFontPx, measureTextBlock, type ParagraphMetrics } from './text-metrics';

export interface ShapeTextStyle {
  textSize?: number;
  textBold?: boolean;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  /** Whole-text left inset, in steps of 1.5 em. */
  textIndent?: number;
  /** Pixels at the chosen text size; scales with auto-fitted text. */
  textSpaceBefore?: number;
  textSpaceAfter?: number;
  textLineHeight?: number;
}

export const SHAPE_TEXT_SIZES = [10, 12, 14, 16, 20, 24, 32, 40, 48, 56, 64, 72, 96, 128] as const;
export const MAX_TEXT_INDENT = 8;
export const MAX_PARAGRAPH_SPACE = 48;
export const MIN_TEXT_LINE_HEIGHT = 1;
export const MAX_TEXT_LINE_HEIGHT = 3;
export const DEFAULT_TEXT_LINE_HEIGHT = 1.25;

function paragraphMetrics(style: ShapeTextStyle): ParagraphMetrics {
  return {
    indentEm: (style.textIndent ?? 0) * 1.5,
    spaceBefore: style.textSpaceBefore ?? 0,
    spaceAfter: style.textSpaceAfter ?? 0,
  };
}

export function fitShapeText(text: string, style: ShapeTextStyle, width: number, height: number): number {
  return fitFontPx(text, style.textSize ?? 14, width, height, style.textBold ? 600 : 500,
    style.textLineHeight ?? DEFAULT_TEXT_LINE_HEIGHT, paragraphMetrics(style));
}

export function measureShapeText(text: string, style: ShapeTextStyle, width: number, px = style.textSize ?? 14) {
  return measureTextBlock(text, px, width, style.textBold ? 600 : 500,
    style.textLineHeight ?? DEFAULT_TEXT_LINE_HEIGHT, paragraphMetrics(style), style.textSize ?? 14);
}

export function arrowTextSize(text: string, style: ShapeTextStyle, length: number) {
  const width = Math.max(60, length - 24);
  const height = Math.max(22, (style.textSize ?? 14) + 10, measureShapeText(text, style, width - 12).height + 2);
  return { width, height };
}

export function shapeTextCss(style: ShapeTextStyle, px: number, color: string): CSSProperties {
  const scale = px / Math.max(1, style.textSize ?? 14);
  return {
    width: '100%',
    boxSizing: 'border-box',
    color,
    // foreignObject descendants must override export's inherited text-fill color.
    WebkitTextFillColor: color,
    fontFamily: 'system-ui, sans-serif',
    fontSize: px,
    fontWeight: style.textBold ? 700 : 500,
    lineHeight: style.textLineHeight ?? DEFAULT_TEXT_LINE_HEIGHT,
    textAlign: style.textAlign ?? 'center',
    paddingLeft: `min(${(style.textIndent ?? 0) * 1.5}em, calc(100% - 1px))`,
    paddingTop: (style.textSpaceBefore ?? 0) * scale,
    paddingBottom: (style.textSpaceAfter ?? 0) * scale,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };
}

export function shapeParagraphCss(style: ShapeTextStyle, px: number, index: number) {
  return {
    margin: 0,
    marginTop: index === 0 ? 0
      : ((style.textSpaceBefore ?? 0) + (style.textSpaceAfter ?? 0)) * px / Math.max(1, style.textSize ?? 14),
    minHeight: px * (style.textLineHeight ?? DEFAULT_TEXT_LINE_HEIGHT),
  } satisfies CSSProperties;
}
