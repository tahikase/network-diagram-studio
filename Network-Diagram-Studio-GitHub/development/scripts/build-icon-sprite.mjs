// Builds a single SVG sprite of all Microsoft Azure V24 icons AND any
// repo-local custom SVGs, plus a TS manifest.
// Optional: npm run build:icons -- "C:\path\to\Azure\Icons"
// Also reads from `src/icons/custom-svg/` inside the repo — each top-level
// subdirectory there becomes an additional category with its own icons.
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
if (process.argv.length !== 3) throw new Error('Supply the Azure V24 Icons folder: npm run build:icons -- "<Icons directory>". Normal builds use the included sprite.');
const ICONS_ROOT = path.resolve(process.argv[2]);
const CUSTOM_ICONS_ROOT = path.join(root, 'src', 'icons', 'custom-svg');
const OUT_SPRITE = path.join(root, 'src', 'icons', 'icon-sprite.svg');
const OUT_MANIFEST = path.join(root, 'src', 'icons', 'manifest.ts');

async function walk(dir) {
  const out = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...(await walk(p)));
    else if (item.isFile() && item.name.toLowerCase().endsWith('.svg')) out.push(p);
  }
  return out;
}

function slugFromFilename(name) {
  return name
    .replace(/\.svg$/i, '')
    .replace(/^\d+-icon-service-/i, '')
    .replace(/^\d+-icon-/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function labelFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractSvgInner(text) {
  const openEnd = text.indexOf('>', text.indexOf('<svg'));
  const close = text.lastIndexOf('</svg>');
  if (openEnd < 0 || close < 0) return null;
  return text.slice(openEnd + 1, close).trim();
}

// Strip `<title>…</title>` elements from raw SVG markup. Titles here are
// browser-tooltip metadata copied verbatim from the source Azure icon files
// (e.g. "Icon-machinelearning-161"); they're never surfaced in the UI and
// they bloat the inlined sprite by ~10-15 KB across 700+ symbols.
function stripSvgTitles(svgInner) {
  return svgInner.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
}

function extractViewBox(text) {
  const m = text.match(/<svg[^>]*viewBox="([^"]+)"/i);
  return m ? m[1] : '0 0 18 18';
}

function normalizeCategory(name) {
  return name.trim().toLowerCase();
}

async function main() {
  const files = await walk(ICONS_ROOT);
  console.log(`Found ${files.length} SVG files`);

  const symbols = [];
  const manifest = [];
  const seen = new Set();

  // Emit one <symbol> per SVG, keyed on category+basename slug.
  // `sourceRoot` sets the parent directory used to derive both the
  // category name (top-level subdir) and the manifest-recorded relative
  // path. Custom icons live under CUSTOM_ICONS_ROOT so they get their
  // own category namespace and never collide with Azure icons.
  const emit = async (fileList, sourceRoot) => {
    for (const file of fileList) {
      const rel = path.relative(sourceRoot, file);
      const parts = rel.split(path.sep);
      const category = normalizeCategory(parts[0]);
      const basename = path.basename(file);
      const baseSlug = slugFromFilename(basename);

      let slug = `${category.replace(/[^a-z0-9]+/g, '-')}--${baseSlug}`;
      if (seen.has(slug)) {
        let n = 2;
        while (seen.has(`${slug}-${n}`)) n++;
        slug = `${slug}-${n}`;
      }
      seen.add(slug);

      const text = await readFile(file, 'utf8');
      const rawInner = extractSvgInner(text);
      if (!rawInner) continue;
      const inner = stripSvgTitles(rawInner);
      const viewBox = extractViewBox(text);

      symbols.push(`<symbol id="ic-${slug}" viewBox="${viewBox}">${inner}</symbol>`);
      manifest.push({
        id: slug,
        label: labelFromSlug(baseSlug),
        category,
      });
    }
  };

  await emit(files, ICONS_ROOT);

  // Repo-local custom icons — optional. Skipped silently if the
  // directory is missing (e.g. fresh clone).
  try {
    await stat(CUSTOM_ICONS_ROOT);
    const customFiles = await walk(CUSTOM_ICONS_ROOT);
    if (customFiles.length > 0) {
      console.log(`Found ${customFiles.length} custom SVG files`);
      await emit(customFiles, CUSTOM_ICONS_ROOT);
    }
  } catch {
    // no custom icons — that's fine.
  }

  // Sprite is embedded directly into a DOM subtree (never parsed as a
  // standalone XML document), so we skip the `<?xml?>` prolog and inline
  // newlines to trim ~1.5 KB of dead whitespace across 720+ symbols.
  const sprite =
    `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">` +
    `<defs>${symbols.join('')}</defs></svg>`;

  await mkdir(path.dirname(OUT_SPRITE), { recursive: true });
  await writeFile(OUT_SPRITE, sprite, 'utf8');

  await mkdir(path.dirname(OUT_MANIFEST), { recursive: true });
  const ts =
    `// AUTO-GENERATED by scripts/build-icon-sprite.mjs \u2014 do not edit by hand.\n` +
    `export interface IconEntry { id: string; label: string; category: string; }\n` +
    `export const ICONS: IconEntry[] = ${JSON.stringify(manifest)} as const;\n` +
    `export const ICONS_BY_ID: Record<string, IconEntry> = Object.fromEntries(ICONS.map(i => [i.id, i]));\n` +
    `export const CATEGORIES: string[] = Array.from(new Set(ICONS.map(i => i.category))).sort();\n`;
  await writeFile(OUT_MANIFEST, ts, 'utf8');

  console.log(`Wrote ${symbols.length} symbols → ${OUT_SPRITE}`);
  console.log(`Wrote manifest → ${OUT_MANIFEST}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
