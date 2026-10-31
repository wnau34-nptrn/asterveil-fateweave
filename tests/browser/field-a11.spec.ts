import { test, expect, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

test.skip(process.env.PLAYWRIGHT_PAGES === 'true', 'source-only A11 field gate runs explicitly in CI/Pages');
// W8 / A11: full fields (5 heroes + up to 4 foes, reserves included) across every catalog encounter, back to back, then around again.
// Mirrors src/content/encounters/catalog.ts `encounters` (importing it here would pull JSON imports into the Playwright loader).
const ENCOUNTERS = ['first-clash', 'scout-patrol', 'rift-whelp', 'thicket-ambush', 'shadow-stalker', 'veil-siege', 'rear-ambush', 'crystal-stampede',
  'rift-warden', 'elite-tusk-chief', 'elite-briar-lord', 'mini-veil-golem', 'vanguard-captain', 'slime-pair', 'bat-swarm', 'slime-nest', 'tusker-bats',
  'beetle-spore', 'beetle-wall', 'stalker-spore', 'forest-swarm', 'channeler-wisps', 'crawler-pack', 'rift-host', 'thorn-host', 'rift-legion'];
const MiB = 1048576;
const settle = async (page: Page) => {
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.fieldA11QA.cached()) === JSON.stringify(window.fieldA11QA.expectedSheets())), { timeout: 20000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.fieldA11QA.optionalFx()) === JSON.stringify(window.fieldA11QA.expectedFx())), { timeout: 20000 }).toBe(true);
  // Every drawn body uses its identity atlas (no seed fallback left once loaded).
  await expect.poll(() => page.evaluate(() => Object.values(window.fieldA11QA.bodies()).every(keys => keys.some(k => k.startsWith('unit-pilot-')))), { timeout: 20000 }).toBe(true);
};

test('A11: every encounter with a team of five draws atlases, shares duplicates and never accumulates textures', async ({ page }) => {
  test.setTimeout(240000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('tests/browser/fixtures/field-a11.html?encounter=first-clash');
  await expect(page.locator('#start')).toBeEnabled({ timeout: 20000 });
  const rows: { id: string; pass: number; bodies: number; standing: number; sheets: number; unitMiB: number; fxMiB: number; optional: string[] }[] = [];
  for (const pass of [1, 2]) for (const id of ENCOUNTERS) {
    await page.evaluate(id => window.fieldA11QA.open(id), id);
    await settle(page);
    const r = await page.evaluate(() => ({ bodies: Object.keys(window.fieldA11QA.bodies()).length, standing: window.fieldA11QA.standing(), sheets: window.fieldA11QA.cached().length,
      bytes: window.fieldA11QA.bytes(), optional: window.fieldA11QA.optionalFx() }));
    expect(r.bodies, id).toBe(r.standing);
    expect(r.bytes.unit, id).toBeLessThanOrEqual(64 * MiB);
    rows.push({ id, pass, bodies: r.bodies, standing: r.standing, sheets: r.sheets, unitMiB: +(r.bytes.unit / MiB).toFixed(2), fxMiB: +(r.bytes.fx / MiB).toFixed(2), optional: r.optional });
  }
  // The second lap holds exactly what the first did, encounter by encounter: nothing accumulated.
  for (const id of ENCOUNTERS) {
    const [a, b] = rows.filter(r => r.id === id);
    expect({ unit: b!.unitMiB, fx: b!.fxMiB, optional: b!.optional }, id).toEqual({ unit: a!.unitMiB, fx: a!.fxMiB, optional: a!.optional });
  }
  // Encounter-only VFX are present only where used: the boss atlas comes and goes with the boss; Cerise keeps saint/dance loaded.
  expect(rows.find(r => r.id === 'vanguard-captain')!.optional).toEqual(['boss-signature-fx', 'saint-dance-fx']);
  expect(rows.find(r => r.id === 'slime-pair')!.optional).toEqual(['foe-signature-fx', 'saint-dance-fx']);
  expect(rows.find(r => r.id === 'bat-swarm')!.optional).toEqual(['saint-dance-fx']);
  expect(errors).toEqual([]);
  if (process.env.A11_REPORT) { mkdirSync('docs/validation/w8-field-audit', { recursive: true }); writeFileSync('docs/validation/w8-field-audit/runtime.json', JSON.stringify(rows, null, 1) + '\n'); }
});
