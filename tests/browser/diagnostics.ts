import type { Page } from '@playwright/test';

// Prints page errors, console errors, renderer crashes and main-frame navigations as test output,
// so a failure on CI shows its cause in the job log (Playwright prints stdout under each failure).
export function watchPage(page: Page): void {
  const log = (message: string) => console.log(`[page] ${message}`);
  page.on('pageerror', e => log(`pageerror: ${e.stack ?? e.message}`));
  page.on('console', m => { if (m.type() === 'error') log(`console.error: ${m.text()}`); });
  page.on('crash', () => log('renderer crashed'));
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) log(`navigated: ${frame.url()}`); });
}
