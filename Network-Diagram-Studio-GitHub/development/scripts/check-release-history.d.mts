export interface ReleaseHistoryCheck {
  version: string;
  digest: string;
  count: number;
}
export function checkReleaseHistory(root?: string): ReleaseHistoryCheck;
export function checkReleaseAudience(root?: string): { version: string; count: number };
export function sealReleaseHistory(root?: string): ReleaseHistoryCheck;
export function verifyReleaseBundle(html: string, root?: string): ReleaseHistoryCheck;
export function markReleasePublished(root?: string): ReleaseHistoryCheck;
