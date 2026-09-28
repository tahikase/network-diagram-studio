import { z } from 'zod';

export const ICON_FILE_BYTES = 2 * 1024 * 1024;
export const ICON_LIBRARY_BYTES = 50 * 1024 * 1024;
export const ICON_LIBRARY_COUNT = 200;
export const ICON_PNG_SIDE = 2048;
export const IMPORTED_ICON_PREFIX = 'imported--';
const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
const MAX_ELEMENTS = 5000;
const MAX_RENDERED_ELEMENTS = 10000;

export interface ImportedIconAsset {
  readonly id: string;
  readonly label: string;
  readonly mime: 'image/svg+xml' | 'image/png';
  readonly dataUrl: string;
  readonly bytes: number;
  readonly width: number;
  readonly height: number;
}

export function isImportedIconId(id: string | undefined): id is string {
  return typeof id === 'string' && id.startsWith(IMPORTED_ICON_PREFIX);
}

export function iconErrorMessage(error: unknown, fallback = 'The icon could not be imported.'): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? fallback;
  return error instanceof Error ? error.message : fallback;
}

const fail = (message: string): never => { throw new Error(message); };

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  if (value.length > Math.ceil(ICON_FILE_BYTES / 3) * 4 || value.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    return fail('Invalid or oversized icon data.');
  }
  const binary = atob(value);
  if (!binary.length || binary.length > ICON_FILE_BYTES) return fail('Each icon must be 2 MB or smaller.');
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function pngSize(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 45 || ![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) {
    return fail('Invalid PNG file.');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8, width = 0, height = 0, sawData = false, endedData = false;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    if (length > bytes.length - offset - 12) return fail('Invalid PNG file.');
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    let crc = 0xffffffff;
    for (let i = offset + 4; i < offset + 8 + length; i++) crc = crcTable[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    if (((crc ^ 0xffffffff) >>> 0) !== view.getUint32(offset + 8 + length)) return fail('Invalid PNG file.');
    if (offset === 8) {
      if (type !== 'IHDR' || length !== 13) return fail('Invalid PNG file.');
      width = view.getUint32(offset + 8);
      height = view.getUint32(offset + 12);
      if (!width || !height || width > ICON_PNG_SIDE || height > ICON_PNG_SIDE) {
        return fail('PNG dimensions must not exceed 2048 × 2048 pixels.');
      }
      const depths: Record<number, number[]> = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
      if (!depths[bytes[offset + 17]]?.includes(bytes[offset + 16]) ||
          bytes[offset + 18] !== 0 || bytes[offset + 19] !== 0 || bytes[offset + 20] > 1) return fail('Invalid PNG file.');
    } else if (type === 'IHDR') return fail('Invalid PNG file.');
    if (['acTL', 'fcTL', 'fdAT'].includes(type)) return fail('Animated icons are not supported.');
    if (type === 'IDAT') {
      if (endedData) return fail('Invalid PNG file.');
      sawData = true;
    } else if (sawData) endedData = true;
    if (type === 'IEND') {
      if (length !== 0 || offset + 12 !== bytes.length || !sawData) return fail('Invalid PNG file.');
      return { width, height };
    }
    if (!/^[A-Za-z]{4}$/.test(type) ||
        (/^[A-Z]/.test(type) && !['IHDR', 'PLTE', 'IDAT'].includes(type))) return fail('Invalid PNG file.');
    offset += length + 12;
  }
  return fail('Invalid PNG file.');
}

const svgTags = new Set([
  'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask',
  'symbol', 'use', 'text', 'tspan', 'title', 'desc',
]);
const paint = new Set([
  'fill', 'fill-rule', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linecap',
  'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-dasharray',
  'stroke-dashoffset', 'opacity', 'color', 'clip-path', 'clip-rule', 'mask',
  'stop-color', 'stop-opacity', 'font-family', 'font-size', 'font-weight',
  'font-style', 'text-anchor', 'dominant-baseline', 'display', 'visibility',
  'vector-effect', 'paint-order', 'shape-rendering', 'text-rendering', 'image-rendering',
]);
const attributes = new Set([
  ...paint, 'id', 'viewBox', 'width', 'height', 'x', 'y', 'dx', 'dy',
  'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'fr',
  'd', 'points', 'transform', 'offset', 'gradientUnits', 'gradientTransform',
  'spreadMethod', 'clipPathUnits', 'maskUnits', 'maskContentUnits', 'preserveAspectRatio',
  'textLength', 'lengthAdjust', 'rotate',
]);
const localId = /^[A-Za-z0-9_][\w:.-]{0,127}$/;

/** Rebuild a static SVG allowlist, then render it only in SVG image context. */
export function sanitizeIconSvg(source: string): { svg: string; width: number; height: number } {
  if (/<!\s*(?:DOCTYPE|ENTITY)/i.test(source)) return fail('SVG entities are not allowed.');
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
  const root = parsed.documentElement;
  if (parsed.querySelector('parsererror') || root.localName !== 'svg' || root.namespaceURI !== SVG_NS ||
      [...parsed.childNodes].some(node => node.nodeType === Node.PROCESSING_INSTRUCTION_NODE)) {
    return fail('Invalid SVG file.');
  }
  const ids = new Map<string, Element>();
  const refs: string[] = [];
  let count = 0;
  function value(text: string): string {
    // CSS escapes, variables and external references cannot cross this boundary.
    if (/\\|@|var\s*\(|expression\s*\(|javascript:|data:|https?:|file:/i.test(text)) {
      return fail('SVG must contain only static, self-contained artwork.');
    }
    if (/url\s*\(/i.test(text)) {
      const match = /^url\(\s*["']?#([A-Za-z0-9_][\w:.-]{0,127})["']?\s*\)$/i.exec(text);
      if (!match) return fail('External SVG references are not allowed.');
      refs.push(match[1]);
      return `url(#${match[1]})`;
    }
    return text;
  }
  function rebuild(input: Element, depth: number): Element {
    if (++count > MAX_ELEMENTS || depth > 64) return fail('SVG is too complex.');
    if (input.namespaceURI !== SVG_NS || !svgTags.has(input.localName)) {
      return fail('SVG must contain only static, self-contained artwork.');
    }
    const output = document.createElementNS(SVG_NS, input.localName);
    for (const attr of [...input.attributes]) {
      if (/^on/i.test(attr.localName)) return fail('Active SVG content is not allowed.');
      if (attr.name === 'xmlns' || attr.name.startsWith('xmlns:')) continue;
      if (attr.name === 'xml:space' && ['default', 'preserve'].includes(attr.value)) {
        output.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', attr.value);
        continue;
      }
      if (attr.localName === 'href') {
        if ((attr.namespaceURI && attr.namespaceURI !== XLINK_NS) ||
            !['use', 'linearGradient', 'radialGradient'].includes(input.localName) ||
            !attr.value.startsWith('#') || !localId.test(attr.value.slice(1))) {
          return fail('External SVG references are not allowed.');
        }
        refs.push(attr.value.slice(1));
        output.setAttribute('href', attr.value);
      } else if (attr.name === 'style') {
        if (/\\|@|var\s*\(|expression\s*\(/i.test(attr.value)) return fail('Unsupported SVG styling.');
        const declaration = document.createElement('span').style;
        const styling = attr.value.replace(/(?:^|;)\s*enable-background\s*:[^;]*/gi, '');
        declaration.cssText = styling;
        if (!declaration.length && styling.trim()) return fail('Unsupported SVG styling.');
        for (const property of declaration) {
          if (!paint.has(property)) return fail('Unsupported SVG styling.');
          output.setAttribute(property, value(declaration.getPropertyValue(property)));
        }
      } else if (!attr.namespaceURI && attributes.has(attr.name)) {
        if (attr.name === 'id') {
          if (!localId.test(attr.value) || ids.has(attr.value)) return fail('Invalid SVG identifiers.');
          ids.set(attr.value, output);
        }
        output.setAttribute(attr.name, value(attr.value));
      } else if (!attr.namespaceURI && !attr.name.startsWith('aria-') && !attr.name.startsWith('data-') &&
          !['role', 'version', 'class', 'focusable', 'enable-background'].includes(attr.name)) {
        return fail('Unsupported SVG attribute.');
      }
    }
    for (const child of [...input.childNodes]) {
      if (child.nodeType === Node.ELEMENT_NODE) output.append(rebuild(child as Element, depth + 1));
      else if (child.nodeType === Node.TEXT_NODE || child.nodeType === Node.CDATA_SECTION_NODE) {
        if (['text', 'tspan', 'title', 'desc'].includes(input.localName)) output.append(document.createTextNode(child.textContent ?? ''));
        else if (child.textContent?.trim()) return fail('Invalid SVG text.');
      } else if (child.nodeType !== Node.COMMENT_NODE) return fail('Invalid SVG file.');
    }
    return output;
  }
  const clean = rebuild(root, 0);
  if (refs.some(id => !ids.has(id))) return fail('SVG references an unknown element.');
  // An acyclic <use> graph can still expand exponentially. Bound its rendered
  // cost as well as the XML size, and apply the same cycle rule to paint refs.
  const costs = new Map<Element, number>();
  const visiting = new Set<Element>();
  function cost(element: Element, depth: number): number {
    if (visiting.has(element) || depth > 64) return fail('SVG contains cyclic or deeply nested references.');
    const cached = costs.get(element);
    if (cached !== undefined) return cached;
    visiting.add(element);
    let total = 1;
    const targets = [...element.children];
    for (const attr of [...element.attributes]) {
      const match = attr.name === 'href' ? /^#(.+)$/.exec(attr.value) : /^url\(#(.+)\)$/.exec(attr.value);
      if (match) targets.push(ids.get(match[1])!);
    }
    for (const target of targets) {
      total += cost(target, depth + 1);
      if (total > MAX_RENDERED_ELEMENTS) return fail('SVG is too complex.');
    }
    visiting.delete(element);
    costs.set(element, total);
    return total;
  }
  cost(clean, 0);
  const box = clean.getAttribute('viewBox');
  const dims = box ? box.trim().split(/[\s,]+/).map(Number) :
    [0, 0, parseFloat(clean.getAttribute('width') ?? ''), parseFloat(clean.getAttribute('height') ?? '')];
  if (dims.length !== 4 || !dims.every(Number.isFinite) || dims[2] <= 0 || dims[3] <= 0 ||
      dims.some(n => Math.abs(n) > 100000)) return fail('SVG needs a valid viewBox or size.');
  clean.setAttribute('viewBox', dims.join(' '));
  clean.setAttribute('width', String(dims[2]));
  clean.setAttribute('height', String(dims[3]));
  return { svg: new XMLSerializer().serializeToString(clean), width: dims[2], height: dims[3] };
}

const assetInput = z.object({
  id: z.string().regex(/^imported--[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  label: z.string().trim().min(1).max(80),
  mime: z.enum(['image/svg+xml', 'image/png']),
  dataUrl: z.string().max(Math.ceil(ICON_FILE_BYTES / 3) * 4 + 64),
});

export const importedIconAssetSchema = assetInput.transform((input, ctx): ImportedIconAsset => {
  try {
    const prefix = `data:${input.mime};base64,`;
    if (!input.dataUrl.startsWith(prefix)) return fail('Invalid icon data URL.');
    let bytes = fromBase64(input.dataUrl.slice(prefix.length));
    let size: { width: number; height: number };
    if (input.mime === 'image/png') size = pngSize(bytes);
    else {
      const sanitized = sanitizeIconSvg(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      size = sanitized;
      bytes = new TextEncoder().encode(sanitized.svg);
      if (bytes.length > ICON_FILE_BYTES) return fail('Each icon must be 2 MB or smaller.');
    }
    return Object.freeze({ ...input, dataUrl: prefix + toBase64(bytes), bytes: bytes.length, width: size.width, height: size.height });
  } catch (error) {
    ctx.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Invalid icon file.' });
    return z.NEVER;
  }
});

// Library limits do not apply to documents: removing/reimporting library
// entries must never make a previously authored diagram impossible to save.
export const importedIconAssetsSchema = z.array(importedIconAssetSchema)
  .refine(items => new Set(items.map(item => item.id)).size === items.length, 'Duplicate imported icon identifiers.');

export async function decodeIconAsset(asset: ImportedIconAsset): Promise<void> {
  const image = new Image();
  image.src = asset.dataUrl;
  try { await image.decode(); }
  catch { fail('The icon image could not be decoded.'); }
}

export async function readIconFile(file: File): Promise<ImportedIconAsset> {
  if (!file.size || file.size > ICON_FILE_BYTES) return fail('Each icon must be 2 MB or smaller.');
  const format = /\.svg$/i.test(file.name) ? 'svg' : /\.png$/i.test(file.name) ? 'png' : null;
  if (!format) return fail('Choose an SVG or PNG file.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = format === 'svg' ? 'image/svg+xml' : 'image/png';
  const asset = importedIconAssetSchema.parse({
    id: IMPORTED_ICON_PREFIX + crypto.randomUUID(),
    label: file.name.replace(/\.[^.]+$/, '').trim().slice(0, 80) || 'Imported icon',
    mime, dataUrl: `data:${mime};base64,${toBase64(bytes)}`,
  });
  // Structural validation protects the decoder's dimensions; decoding catches
  // corrupt compressed PNG data before anything enters the personal library.
  await decodeIconAsset(asset);
  return asset;
}
