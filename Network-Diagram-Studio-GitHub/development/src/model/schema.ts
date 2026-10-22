import { z } from 'zod';
import { runtimeExtensions } from '../runtime/extensions';
import { importedIconAssetsSchema } from '../icons/imported-assets';
import { MAX_TEXT_INDENT, MAX_PARAGRAPH_SPACE, MIN_TEXT_LINE_HEIGHT, MAX_TEXT_LINE_HEIGHT } from './shape-text';

const stateSchema = z.enum(['ok', 'degraded', 'broken', 'unknown']);
const edgeKindSchema = z.enum([
  'peering',
  'vpn',
  'expressroute',
  'privateendpoint',
  'backend',
  'dns',
  'internet',
  'link',
]);
const annotationKindSchema = z.enum(['note', 'warning', 'question']);

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  parent: z.string().optional(),
  position: positionSchema,
  size: z.object({ w: z.number(), h: z.number() }).optional(),
  data: z.object({
    name: z.string(),
    subtitle: z.string().optional(),
    state: stateSchema.optional(),
    iconId: z.string().optional(),
    iconSize: z.number().min(16).max(256).optional(),
    typeLabel: z.string().optional(),
    typeCaption: z.string().optional(),
    armId: z.string().optional(),
    armOrigin: z.string().optional(),
    armExtra: z.string().optional(),
    armScope: z.string().optional(),
    fields: z.record(z.string(), z.string()).default({}),
    notes: z.string().optional(),
    textScale: z.number().optional(),
  }),
});

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  kind: edgeKindSchema,
  label: z.string().optional(),
  state: stateSchema.optional(),
  color: z.string().min(1).optional(),
  line: z.enum(['solid', 'dashed', 'dotted']).optional(),
  // Label font-size multiplier (A− / A+ in the property panel). Optional so
  // every file written before it existed still loads unchanged, and Zod
  // would strip it if it were missing here — losing the size on a round trip.
  textScale: z.number().optional(),
  // v0.9.41 — pinned ("fixed") connection points. Zod strips unknown keys,
  // so without these two a saved-and-reloaded diagram would silently lose
  // every arrow's chosen dot and snap back to the side midpoints. Loose
  // strings on purpose: Canvas validates the id against the handle set the
  // node actually renders and falls back to auto-routing when it does not
  // match, so a file from a future build with new dot ids still loads.
  sourceHandle: z.string().min(1).optional(),
  targetHandle: z.string().min(1).optional(),
  data: z.record(z.string(), z.string()).optional(),
});

const annotationSchema = z.object({
  id: z.string().min(1),
  position: positionSchema,
  text: z.string(),
  kind: annotationKindSchema,
  targetId: z.string().optional(),
});

export const diagramSchema = z.object({
  version: z.literal(1),
  meta: z.object({
    title: z.string(),
    caseId: z.string().optional(),
    author: z.string().optional(),
    createdUtc: z.string(),
    updatedUtc: z.string(),
    notes: z.string().optional(),
  }),
  nodes: z.array(nodeSchema),
  edges: z.array(edgeSchema),
  annotations: z.array(annotationSchema).default([]),
});

export type ParsedDiagram = z.infer<typeof diagramSchema>;

// ---------------------------------------------------------------------------
// SHAPES + STROKES IN THE SAVED FILE (v0.9.26)
// ---------------------------------------------------------------------------
// Before v0.9.26 `saveJson` wrote the Diagram alone, and shapes/strokes live
// on the tabs-store rather than on the Diagram — so **every shape and pencil
// stroke was silently dropped on save**. Auto-save (localStorage) kept them,
// which is why it went unnoticed: inside one browser the work always came
// back, and the loss only showed up once a file was shared.
//
// Both keys are OPTIONAL so that every file written before v0.9.26 still
// loads unchanged.
//
// Fields that steps v0.9.27–v0.9.29 will add (`fromRef` / `toRef` binding and
// a shape's declared `resourceType`) are ALREADY declared here, optional. A
// file written by a newer build therefore round-trips through this build
// instead of failing to parse or losing data — and no second migration is
// needed later.

const dashSchema = z.enum(['solid', 'dashed', 'dotted']);

export const strokeSchema = z.object({
  id: z.string().min(1),
  color: z.string().min(1),
  width: z.number(),
  points: z.array(positionSchema),
  dash: dashSchema.optional(),
});

/** v0.9.27 — an arrow endpoint bound to a shape or a diagram node. */
const shapeEndRefSchema = z.object({
  kind: z.enum(['shape', 'node']),
  id: z.string().min(1),
  anchor: positionSchema.optional(),
});

const shapeTextFields = {
  text: z.string().optional(),
  textSize: z.number().optional(),
  textBold: z.boolean().optional(),
  textColor: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  textIndent: z.number().int().min(0).max(MAX_TEXT_INDENT).optional(),
  textSpaceBefore: z.number().min(0).max(MAX_PARAGRAPH_SPACE).optional(),
  textSpaceAfter: z.number().min(0).max(MAX_PARAGRAPH_SPACE).optional(),
  textLineHeight: z.number().min(MIN_TEXT_LINE_HEIGHT).max(MAX_TEXT_LINE_HEIGHT).optional(),
};

const shapeArrowSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('arrow'),
  from: positionSchema,
  to: positionSchema,
  color: z.string().min(1),
  width: z.number(),
  dash: dashSchema.optional(),
  head: z.enum(['none', 'end', 'both', 'dot']).optional(),
  shape: z.enum(['straight', 'step', 'curved', 'elbow']).optional(),
  rotation: z.number().optional(),
  fromRef: shapeEndRefSchema.optional(),
  toRef: shapeEndRefSchema.optional(),
  ...shapeTextFields,
});

const shapeRectSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('rect'),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  color: z.string().min(1),
  width: z.number(),
  fillOpacity: z.number(),
  dash: dashSchema.optional(),
  corner: z.enum(['sharp', 'rounded']).optional(),
  fill: z.enum(['none', 'tint', 'solid']).optional(),
  geom: z.string().optional(),
  canvasImage: z.string().refine(
    (value) => runtimeExtensions().ndsCanvasImages?.validPng(value) === true,
    { message: 'Invalid canvas image: requires an inline PNG up to 2 MiB, 8192 pixels per side and 16 megapixels' }
  ).optional(),
  rotation: z.number().optional(),
  resourceType: z.string().optional(),
  ...shapeTextFields,
});

const shapeEllipseSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('ellipse'),
  cx: z.number(),
  cy: z.number(),
  rx: z.number(),
  ry: z.number(),
  color: z.string().min(1),
  width: z.number(),
  fillOpacity: z.number(),
  dash: dashSchema.optional(),
  fill: z.enum(['none', 'tint', 'solid']).optional(),
  rotation: z.number().optional(),
  resourceType: z.string().optional(),
  ...shapeTextFields,
});

const shapeCalloutSchema = z.object({
  id: z.string().min(1),
  kind: z.literal('callout'),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  anchor: positionSchema,
  ...shapeTextFields,
  text: z.string(),
  color: z.string().min(1),
  width: z.number(),
  dash: dashSchema.optional(),
  corner: z.enum(['sharp', 'rounded']).optional(),
  rotation: z.number().optional(),
});

export const shapeSchema = z.discriminatedUnion('kind', [
  shapeArrowSchema,
  shapeRectSchema,
  shapeEllipseSchema,
  shapeCalloutSchema,
]);

/**
 * The on-disk file.
 *
 * `shapes` / `strokes` are typed `unknown[]` here ON PURPOSE. A single
 * unrecognised entry — say a shape `kind` invented by a future build — must
 * not fail the whole load and cost the user their nodes and edges. The
 * loader validates entry-by-entry with `shapeSchema` and drops what it
 * cannot read, reporting a count.
 */
export const studioFileSchema = diagramSchema.extend({
  iconAssets: importedIconAssetsSchema.optional(),
  shapes: z.array(z.unknown()).optional(),
  strokes: z.array(z.unknown()).optional(),
  /**
   * v0.9.35 — the Notes page for this tab, held as Markdown.
   *
   * Notes ride in the FILE rather than in localStorage because a shared
   * `.json` that silently dropped the engineer's write-up would be the same
   * class of loss that cost shapes their persistence before v0.9.26.
   *
   * `.optional()` so every file written before v0.9.35 still loads — but
   * since v0.9.38 the loader treats "absent" and "empty" as DIFFERENT
   * intents, so do not add a `.default('')` here. A default would resolve
   * `undefined` to `''` inside the parse and destroy the very distinction
   * `tabs-store.loadStudioFile` relies on to avoid wiping a user's notes
   * when they open a pre-v0.9.35 diagram.
   */
  notes: z.string().optional(),
  /**
   * v0.9.65 — comment threads anchored to quoted runs of `notes`.
   *
   * `unknown[]` for the same reason as `shapes`/`strokes`: one malformed
   * entry must not cost the user the diagram. The loader validates
   * entry-by-entry and reports what it dropped.
   *
   * Omitted entirely when there are no comments, so a note without any
   * produces exactly the bytes it did before this key existed. That is what
   * lets a file written here still open cleanly in an older build — the
   * anchors themselves are never written into `notes` (see notes-comments.ts),
   * so such a build renders the note perfectly and simply shows no comments.
   */
  comments: z.array(z.unknown()).optional(),
  /**
   * v0.9.66 — screenshots pasted into `notes`.
   *
   * `unknown[]` for the same reason as `comments`: one corrupt PNG must not
   * cost the user the diagram. Validated entry-by-entry by the loader.
   *
   * The note itself only ever holds `![caption](nds-img:id)`, a short
   * reference, so an older build shows `!caption` where the picture would be
   * and leaves this key alone rather than destroying it. See notes-images.ts
   * for why the bytes are not inlined.
   *
   * Only images the notes still reference are written, so deleting a picture
   * from a note shrinks the file on the next save.
   */
  images: z.array(z.unknown()).optional(),
});

/** One comment thread. Validated per entry by the loader, never in bulk. */
export const noteCommentSchema = z.object({
  id: z.string().min(1),
  quote: z.string(),
  prefix: z.string().default(''),
  suffix: z.string().default(''),
  messages: z
    .array(
      z.object({
        // Self-declared and unverified — may legitimately be empty.
        author: z.string().default(''),
        text: z.string(),
        at: z.string().default(''),
      }),
    )
    .default([]),
  resolved: z.boolean().optional(),
});

/**
 * The canonical shape of a comment thread.
 *
 * Declared here rather than beside the UI so the loader can validate one
 * without the `store` layer having to reach into `demo`.
 */
export type NoteComment = z.infer<typeof noteCommentSchema>;
export type NoteCommentMessage = NoteComment['messages'][number];

/**
 * One stored screenshot. Validated per entry by the loader, never in bulk.
 *
 * `png` is a `data:image/png;base64,…` URL. It is held as a string rather than
 * a Blob because this is what crosses the `.json` boundary, and because the
 * notes serialiser needs it synchronously to build an `<img>`.
 */
/**
 * A single annotation drawn over a captured screenshot.
 *
 * Validated per-entry on load because a `.json` is untrusted input: a bad
 * shape must be dropped, not throw away the whole picture it belongs to.
 * Colours are restricted to a hex literal so a shared file cannot smuggle a
 * `url(...)` fill into a canvas paint.
 */
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const MIN_NOTE_TEXT_SIZE = 8;
export const MAX_NOTE_TEXT_SIZE = 512;
export const MAX_NOTE_TEXT_LENGTH = 2000;
export const MAX_NOTE_SHAPES = 200;
const noteFontSize = z.number().min(MIN_NOTE_TEXT_SIZE).max(MAX_NOTE_TEXT_SIZE).optional();

export const noteShapeSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('arrow'),
    id: z.string().max(40),
    color: hexColor,
    x1: z.number(), y1: z.number(), x2: z.number(), y2: z.number(),
    width: z.number().positive().max(200),
  }),
  z.object({
    kind: z.literal('rect'),
    id: z.string().max(40),
    color: hexColor,
    x: z.number(), y: z.number(), w: z.number(), h: z.number(),
    width: z.number().positive().max(200),
  }),
  z.object({
    kind: z.literal('ellipse'),
    id: z.string().max(40),
    color: hexColor,
    x: z.number(), y: z.number(), w: z.number(), h: z.number(),
    width: z.number().positive().max(200),
  }),
  z.object({
    kind: z.literal('callout'),
    id: z.string().max(40),
    color: hexColor,
    x: z.number(), y: z.number(), w: z.number(), h: z.number(),
    tx: z.number(), ty: z.number(),
    text: z.string().max(MAX_NOTE_TEXT_LENGTH),
    size: z.number().positive().max(400),
    fontSize: noteFontSize,
    width: z.number().positive().max(200),
  }),
  z.object({
    kind: z.literal('highlight'),
    id: z.string().max(40),
    color: hexColor,
    x: z.number(), y: z.number(), w: z.number(), h: z.number(),
  }),
  z.object({
    kind: z.literal('text'),
    id: z.string().max(40),
    color: hexColor,
    x: z.number(), y: z.number(),
    text: z.string().max(MAX_NOTE_TEXT_LENGTH),
    size: z.number().positive().max(400),
    fontSize: noteFontSize,
  }),
  z.object({
    kind: z.literal('counter'),
    id: z.string().max(40),
    color: hexColor,
    x: z.number(), y: z.number(),
    n: z.number().int().min(0).max(999),
    size: z.number().positive().max(400),
    fontSize: noteFontSize,
  }),
]);

export type NoteShape = z.infer<typeof noteShapeSchema>;

export const noteImageSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{1,32}$/i),
  // Alt text, shown when the bytes are missing. May legitimately be empty.
  caption: z.string().default(''),
  w: z.number().int().positive().max(20000).default(1),
  h: z.number().int().positive().max(20000).default(1),
  // Rejecting anything but a PNG data URL is what stops a shared file from
  // pointing this offline app at a remote host, or at a `javascript:` URL.
  png: z.string().regex(/^data:image\/png;base64,[A-Za-z0-9+/=\s]+$/),
  // Editable annotations. `png` above is the UNANNOTATED bitmap — blur and
  // crop are already burned into it, everything else is re-rendered from this
  // list. Storing the picture once instead of twice is why a file with three
  // annotated screenshots is not three megabytes.
  shapes: z.array(noteShapeSchema).max(MAX_NOTE_SHAPES).optional(),
});

export type NoteImage = z.infer<typeof noteImageSchema>;

export type ParsedStudioFile = z.infer<typeof studioFileSchema>;
