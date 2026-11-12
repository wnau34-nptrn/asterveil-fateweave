// P09-02d: where this page load keeps progress — the device (local play) or the server (server play, P09-02c). Fixed for
// the page load; the shell sets it once. Screens use it for their "saved" labels.
export type SavePlace = 'device' | 'server';
let place: SavePlace = 'device';
export const setSavePlace = (next: SavePlace): void => { place = next; };
export const savePlace = (): SavePlace => place;
