import type { StoragePort } from '../core/save/expedition-save';
export function browserStorage(): StoragePort | undefined {
  try { return window.localStorage; } catch { return undefined; }
}
