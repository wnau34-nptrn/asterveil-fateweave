import { expect, test } from '@playwright/test';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { encounterById } from '../../src/content/encounters/catalog';
import { newProfile } from '../../src/core/world/profile';
import { affixPool, setCounts } from '../../src/core/world/equipment';
import { GEAR_SLOTS, SET_IDS, type Item } from '../../src/core/world/types';
import { parseGame } from '../../src/core/save/expedition-save';
import atlas from '../../src/game/visuals/equip/gear_items.json' with { type: 'json' };
import { xpAt } from '../fixtures/camp-level';
import { legacyEnvelope } from '../fixtures/legacy-save';

const gearRevision = async () => createHash('sha256').update(await readFile(new URL('../../public/assets/ui/equip/gear_items.webp', import.meta.url))).digest('hex').slice(0, 8);

test('decoded equipment atlas matches all 78 approved source cells', async ({ page, baseURL }) => {
  const source = new URL('../../incoming/ART-UI-EQUIP-002/cells/', import.meta.url);
  const names = (await readdir(source)).filter(name => name.endsWith('.png')).sort();
  expect(names).toHaveLength(78);
  const references = await Promise.all(names.map(async name => ({
    name: name.slice(0, -4), png: (await readFile(new URL(name, source))).toString('base64'),
  })));
  await page.goto('./');
  const mismatches = await page.evaluate(async ({ url, frames, references }) => {
    const decode = async (src: string) => createImageBitmap(await (await fetch(src)).blob(), { colorSpaceConversion: 'none' });
    const actual = await decode(url), canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!, mismatches: string[] = [];
    for (const reference of references) {
      const f = frames[reference.name as keyof typeof frames], expected = await decode(`data:image/png;base64,${reference.png}`);
      let maxDifference = 0;
      // Compare on both opaque backgrounds to cover alpha while avoiding the
      // precision loss from unpremultiplying faint PNG/WebP edge pixels.
      for (const background of ['#000', '#fff']) {
        ctx.fillStyle = background; ctx.fillRect(0, 0, 128, 128); ctx.drawImage(actual, f.x, f.y, f.w, f.h, 0, 0, 128, 128);
        const a = ctx.getImageData(0, 0, 128, 128).data;
        ctx.fillStyle = background; ctx.fillRect(0, 0, 128, 128); ctx.drawImage(expected, 0, 0);
        const b = ctx.getImageData(0, 0, 128, 128).data;
        for (let i = 0; i < a.length; i++) maxDifference = Math.max(maxDifference, Math.abs(a[i]! - b[i]!));
      }
      // Equal PNG/WebP pixels can round by one in 8-bit canvas compositing.
      if (maxDifference > 1) mismatches.push(`${reference.name}: ${maxDifference}`);
      expected.close();
    }
    actual.close();
    return mismatches;
  }, { url: new URL(`assets/ui/equip/gear_items.webp?v=${await gearRevision()}`, baseURL!).href, frames: atlas, references });
  expect(mismatches).toEqual([]);
});

test('equipment art: mixed loot and a matching full set at 390px', async ({ browser, baseURL }, info) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const page = await context.newPage(), errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const profile = newProfile(map, 123);
  profile.tutorialDone = true;
  profile.veteran = true;
  profile.cleared = ['ruined-border', 'deep-forest', 'veil-frontier'];
  profile.commander = { name: 'อารี', crest: 'star', color: 'gold', camp: 'ค่ายอารี' };
  let uid = 1;
  const item = (slot: Item['slot'], rarity: number, extra: Partial<Item> = {}): Item => ({
    uid: uid++, slot, rarity, level: 6,
    ...(slot === 'weapon' ? { hero: 'guardian' } : {}),
    affixes: affixPool(map.equipment, slot, extra.hero ?? 'guardian').slice(0, map.equipment.affixCount[rarity]),
    ...(rarity === 4 && !extra.boss ? { special: 'laststand' as const } : {}), ...extra,
  });
  profile.members.guardian = { stars: 3, dupes: 0, gear: Object.fromEntries(GEAR_SLOTS.map(slot => [slot, item(slot, 3, { set: 'dawn' })]))}; profile.campXp = Math.max(profile.campXp, xpAt(10));
  const slots = ['head', 'body', 'gloves', 'boots', 'charm'] as const;
  profile.items = [
    ...[0, 2, 3].flatMap(rarity => slots.map(slot => item(slot, rarity))),
    ...SET_IDS.map((set, i) => item(slots[i % slots.length]!, 2, { set })),
    ...['aegis', 'focus', 'lantern'].map(boss => item('charm', 4, { boss: boss as Item['boss'] })),
    ...[0, 2, 4].map(rarity => item('weapon', rarity)),
    ...['mira', 'toma', 'lio'].map(hero => item('weapon', 3, { hero })),
  ];
  profile.nextItem = uid;
  expect(setCounts(profile.members.guardian.gear).dawn).toBe(6);
  const key = 'asterveil.fateweave.expedition.v1', raw = JSON.stringify(legacyEnvelope({ version: 40, profile, run: null }));
  parseGame(raw, map, encounterById);
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
  await page.goto('./'); await page.locator('#continue').click();
  await page.locator('#lobby-tab-team').click(); await page.locator('#lobby-member-guardian').click();
  await page.locator('#lobby-gear-open').click();
  const panel = page.locator('#camp-character-dialog');
  await expect(panel).toBeVisible(); await expect(panel.locator('.bag-grid li')).toHaveCount(30);
  const before = await page.evaluate(k => localStorage.getItem(k), key);
  // Read the real CSS and decoded image: an enlarged atlas must still sample one complete cell.
  const sprite = panel.locator('.equip-sprite').first();
  const cols = Math.max(...Object.values(atlas).map(f => f.x + f.w)) / 128;
  const rows = Math.max(...Object.values(atlas).map(f => f.y + f.h)) / 128;
  const dimensions = await sprite.evaluate(async el => {
    const css = getComputedStyle(el), image = new Image();
    image.src = css.backgroundImage.slice(5, -2); await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight, size: css.backgroundSize, url: image.src };
  });
  expect(dimensions).toEqual({ width: cols * 128, height: rows * 128, size: `${cols * 100}% ${rows * 100}%`, url: new URL(`assets/ui/equip/gear_items.webp?v=${await gearRevision()}`, baseURL!).href });
  await expect(panel.locator('.doll-slot .set-emblem')).toHaveCount(6);
  const output = process.env.EQUIP_ART_SHOTS;
  if (output) await mkdir(output, { recursive: true });
  await page.screenshot({ path: output ? `${output}/character-full-set-390.png` : info.outputPath('character-full-set-390.png') });
  await panel.locator('.bag-grid').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.screenshot({ path: output ? `${output}/bag-mixed-loot-390.png` : info.outputPath('bag-mixed-loot-390.png') });
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBe(before);
  expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  expect(errors).toEqual([]); await context.close();
});
