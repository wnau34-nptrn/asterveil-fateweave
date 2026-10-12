import type { StoragePort } from '../core/save/battle-save';
export function browserStorage(): StoragePort | undefined {
  try { return window.localStorage; } catch { return undefined; }
}
