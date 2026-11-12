// P09-02d (owner D1): the Google Identity Services button for server play. The script loads only when the account
// panel opens; it hands back an ID token (a signed JWT) that the Worker checks against Google's keys. The OAuth Web
// Client ID is public (not a secret; docs/design/p09/SERVER_P09_02B_TH.md §7); a build may override it with
// VITE_GOOGLE_CLIENT_ID. No e-mail or name is read on the device.

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()
  || '982054923877-79lqr98hgklktknar98k6jsnvs4dk4fb.apps.googleusercontent.com';
export const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';

interface GoogleId {
  initialize(config: { client_id: string; callback: (r: { credential?: string }) => void; ux_mode?: 'popup'; auto_select?: boolean; cancel_on_tap_outside?: boolean; context?: string; itp_support?: boolean }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
  disableAutoSelect?(): void;
}
declare global { interface Window { google?: { accounts?: { id?: GoogleId } } } }

let loading: Promise<GoogleId | null> | undefined;
function load(): Promise<GoogleId | null> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise(resolve => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT; script.async = true; script.defer = true;
    const timer = setTimeout(() => resolve(null), 15_000);
    script.onload = () => { clearTimeout(timer); resolve(window.google?.accounts?.id ?? null); };
    script.onerror = () => { clearTimeout(timer); loading = undefined; script.remove(); resolve(null); };
    document.head.append(script);
  });
  return loading;
}

// Draws Google's own button into `parent`; `onCredential` gets the ID token after the player chose an account.
// False when the script could not load (offline, blocked).
export async function renderGoogleButton(parent: HTMLElement, onCredential: (idToken: string) => void): Promise<boolean> {
  const id = await load();
  if (!id || !parent.isConnected) return false;
  id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: r => { if (r.credential) onCredential(r.credential); }, ux_mode: 'popup', auto_select: false, cancel_on_tap_outside: true, context: 'signin', itp_support: true });
  id.renderButton(parent, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', locale: 'th', width: Math.min(300, Math.max(200, parent.clientWidth || 280)) });
  return true;
}
