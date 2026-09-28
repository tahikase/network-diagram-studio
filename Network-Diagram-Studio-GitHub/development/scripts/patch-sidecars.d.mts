export const runtimeTags: string[];
export function productionIdentity(text: string): string;
export function verifyRuntimeWiring(html: string, directory: string): void;
export function wireRuntimeHtml(html: string, directory: string): string;
export function wireProductionBundle(html: string, directory: string, root?: string): string;
