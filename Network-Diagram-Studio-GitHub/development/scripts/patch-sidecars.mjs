import { lstatSync } from 'node:fs';
import path from 'node:path';
import { verifyReleaseBundle } from './check-release-history.mjs';

export const runtimeTags = [
  '<link rel="icon" type="image/svg+xml" sizes="any" href="./production_editor/nds-logo.svg?v=node-n-1" />',
  '<link rel="stylesheet" href="./production_demo/demo.css?v=studio-tour-current-ui-106" />',
  '<script src="./production_demo/demo.js?v=studio-tour-current-ui-106"></script>',
  '<script src="./production_demo/group-copy.js"></script>',
  '<link rel="stylesheet" href="./production_arm/import.css?v=arm-resource-ids-1" />',
  '<script defer src="./production_arm/engine.js?v=arm-resource-ids-1"></script>',
  '<script defer src="./production_arm/import.js?v=arm-motion-1"></script>',
  '<link rel="stylesheet" href="./production_editor/text-dock.css?v=editor-4" />',
  '<script src="./production_editor/text-dock.js?v=editor-motion-1"></script>',
  '<link rel="stylesheet" href="./production_editor/connectors.css?v=connectors-motion-1" />',
  '<script src="./production_editor/connectors.js?v=connectors-2"></script>',
  '<script src="./production_editor/capture.js?v=capture-2"></script>',
  '<script src="./production_vendor/catalog.js?v=vendor-3"></script>',
  '<script src="./production_vendor/vendor-icons.js?v=vendor-3"></script>',
  '<link rel="stylesheet" href="./production_editor/settings.css?v=settings-blue-2">',
  '<link rel="stylesheet" href="./production_editor/captions.css?v=captions-1" />',
  '<script src="./production_editor/captions.js?v=captions-1"></script>',
  '<link rel="stylesheet" href="./production_editor/canvas-images.css?v=canvas-images-1">',
  '<script src="./production_editor/canvas-images.js?v=canvas-images-2"></script>',
  '<link rel="stylesheet" href="./production_editor/appearance.css?v=appearance-free-drag-1" />',
  '<script src="./production_editor/appearance.js?v=appearance-free-drag-1"></script>',
  '<script src="./production_editor/settings-help.js?v=settings-help-tab-order-1"></script>',
  '<link rel="stylesheet" href="./production_editor/notes-layout.css?v=notes-theme-1" />',
  '<script src="./production_editor/notes-layout.js?v=notes-motion-1"></script>',
  '<link rel="stylesheet" href="./production_arm/resource-ids.css?v=resource-ids-1" />',
  '<script src="./production_arm/resource-ids.js?v=resource-ids-1"></script>',
  '<link rel="stylesheet" href="./production_editor/history.css?v=history-1" />',
  '<script src="./production_editor/history.js?v=history-1"></script>',
  '<link rel="stylesheet" href="./production_editor/feedback.css?v=feedback-header-2" />',
  '<script src="./production_editor/feedback.js?v=feedback-ms-forms-1"></script>',
];

const bridges = [
  'ndsProductionConnectors', 'ndsProductionCaptions', 'ndsProductionVendors',
  'ndsProductionGroupCopy', 'ndsProductionGroupPaste', 'ndsArmResourceIds',
  'ndsLeafAppearance', 'ndsTextDock', 'ndsCanvasImages', 'ndsNotesLayout',
  'ndsSettingsHelp', '__ndsProductionCapture',
];

export function productionIdentity(text) {
  return text.replaceAll('ndsNonProduction', 'ndsProduction')
    .replaceAll('__ndsNonProdCapture', '__ndsProductionCapture')
    .replaceAll('nds-nonprod-notes', 'nds-production-notes');
}

export function verifyRuntimeWiring(html, directory) {
  const references = [...html.matchAll(
    /<(?:script|link)\b[^>]*(?:src|href)="\.\/(?:non_)?production_[^"]+"[^>]*>(?:<\/script>)?/g,
  )].map(match => match[0]);
  if (references.length !== runtimeTags.length || references.some((tag, i) => tag !== runtimeTags[i])) {
    throw new Error('Runtime manifest is incomplete, duplicated or out of order.');
  }
  const moduleStart = html.indexOf('<script type="module"');
  if (moduleStart < 0 || runtimeTags.some(tag => html.indexOf(tag) >= moduleStart)) {
    throw new Error('Runtime assets must precede the application module.');
  }
  for (const tag of runtimeTags) {
    const relative = tag.match(/(?:src|href)="\.\/([^"?]+)/)[1];
    const stat = lstatSync(path.join(directory, relative));
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Runtime asset is not a local file: ${relative}`);
  }
}

export function wireRuntimeHtml(html, directory) {
  if (/<(?:script|link)\b[^>]*(?:src|href)="\.\/(?:non_)?production_/.test(html)) {
    verifyRuntimeWiring(html, directory);
    return html;
  }
  if (!/<link rel="icon"[^>]*>/.test(html) || !html.includes('</title>')) {
    throw new Error('Entry HTML is missing its favicon or title anchor.');
  }
  const [favicon, ...sidecars] = runtimeTags;
  const result = html.replace(/<link rel="icon"[^>]*>/, favicon)
    .replace('</title>', '</title>\n    ' + sidecars.join('\n    '));
  verifyRuntimeWiring(result, directory);
  return result;
}

export function wireProductionBundle(html, directory, root) {
  verifyReleaseBundle(html, root);
  const adapted = productionIdentity(html);
  const missing = bridges.filter(bridge => !adapted.includes(bridge));
  if (missing.length) throw new Error(`Missing production runtime bridges: ${missing.join(', ')}`);
  return wireRuntimeHtml(adapted, directory);
}
