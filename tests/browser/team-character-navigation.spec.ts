import { expect, test, type Page } from '@playwright/test';
import { chapterOne as map } from '../../src/content/world/chapter1';
import { newProfile } from '../../src/core/world/profile';
import { parseGame } from '../../src/core/save/expedition-save';
import { encounterById } from '../../src/content/encounters/catalog';
import { emptyTomes } from '../../src/core/world/tomes';
import { xpAt } from '../fixtures/camp-level';
const key='asterveil.fateweave.expedition.v1';
const capture=process.env.TEAM_HUD_SHOTS==='1';
async function open(page:Page,extended=false){
  const p=newProfile(map,17);p.tutorialDone=true;p.veteran=true;p.commander={name:'อารี',crest:'star',color:'gold',camp:'ค่ายอารี'};p.campXp=xpAt(6);p.bank.gold=600;p.cleared=['ruined-border','deep-forest','veil-frontier'];p.tomes=emptyTomes();p.tomes.bulwark.small=10;
  if(extended)for(const id of ['mira','toma','sefa','brann','lio','garran','metta'])if(!p.company.includes(id)){p.company.push(id);p.members[id]={stars:1,dupes:0};}
  const raw=JSON.stringify({version:45,profile:p,run:null});parseGame(raw,map,encounterById);
  await page.addInitScript(({key,raw})=>{if(!sessionStorage.getItem('nav-seeded')){localStorage.setItem(key,raw);sessionStorage.setItem('nav-seeded','yes');}},{key,raw});
  await page.goto('./');await page.locator('#continue').click();await page.locator('#lobby-tab-team').click();
}
const saved=(page:Page)=>page.evaluate(k=>localStorage.getItem(k),key);
for(const [width,height] of [[390,650],[390,844],[320,568],[1366,768]] as const){
  test(`team HUD opens character details, preserves context and cancels spending ${width}x${height}`,async({page},info)=>{
    await page.setViewportSize({width,height});await open(page);const before=await saved(page);
    await expect(page.locator('.team-character-entry')).toContainText('แตะภาพ');
    if(capture&&width===390)await page.screenshot({path:info.outputPath(`team-entry-${height}.png`)});
    await page.locator('#team-character-guardian .portrait').click();
    const dialog=page.locator('#camp-character-dialog');await expect(dialog).toBeVisible();await expect(page.locator('#lobby-tab-team')).toHaveAttribute('aria-controls','camp-character-dialog');
    expect(await dialog.evaluate(el=>el.matches(':modal'))).toBe(false);
    await expect(page.locator('.lobby-pan')).toHaveAttribute('inert','');
    await page.locator('#camp-character-tab-skills').click();await page.locator('#camp-skill-selection').selectOption('guard');
    const nav=page.locator('.lobby-menu');await expect(nav).toBeVisible();const d=await dialog.boundingBox(),n=await nav.boundingBox();expect(d!.y+d!.height).toBeLessThanOrEqual(n!.y);
    for(const b of await nav.locator('button').all()){const r=await b.boundingBox();expect(r!.height).toBeGreaterThanOrEqual(44);expect(r!.width).toBeGreaterThanOrEqual(44);}
    if(capture&&width===390)await page.screenshot({path:info.outputPath(`skills-hud-${height}.png`)});
    await page.locator('#camp-skills-tree').click();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.locator('#team-character-guardian')).toBeFocused();
    await page.locator('#team-character-resume').click();await expect(page.locator('#camp-character-tab-skills')).toHaveAttribute('aria-selected','true');await expect(page.locator('#camp-skills-tree')).toHaveAttribute('aria-pressed','true');
    await page.locator('#camp-skills-details').click();await expect(page.locator('#camp-skill-selection')).toHaveValue('guard');
    await page.locator('#camp-skill-up-guard').scrollIntoViewIfNeeded();const detailScroll=await page.locator('#camp-character-content').evaluate(el=>el.scrollTop);if(height===650)expect(detailScroll).toBeGreaterThan(0);
    await page.locator('#camp-skill-up-guard').click();await expect(page.locator('#camp-skill-review-confirm')).toBeVisible();
    await page.locator('#lobby-tab-forge').click();await expect(dialog).not.toBeVisible();await expect(page.locator('.forge-launcher')).toBeVisible();expect(await saved(page)).toBe(before);
    await page.locator('#lobby-sheet [data-lobby=close]').click();await page.locator('#lobby-tab-team').click();await page.locator('#team-character-resume').click();await expect(page.locator('#camp-character-tab-skills')).toHaveAttribute('aria-selected','true');await expect(page.locator('#camp-skill-review-confirm')).toHaveCount(0);expect(await page.locator('#camp-character-content').evaluate(el=>el.scrollTop)).toBeCloseTo(detailScroll,0);
    await page.locator('#lobby-tab-team').focus();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();expect(await saved(page)).toBe(before);
    await expect(page.locator('.lobby-pan')).not.toHaveAttribute('inert','');
  });
}
test('team scroll/filter and navigation remain usable with large text and safe-area insets',async({page},info)=>{
  await page.setViewportSize({width:390,height:650});await open(page);
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%';document.querySelector<HTMLElement>('#app')!.style.setProperty('--safe-top','59px');document.querySelector<HTMLElement>('.lobby-bottom')!.style.bottom='34px';});
  await page.locator('#team-character-guardian').click();await page.locator('#camp-character-tab-skills').click();
  const dialog=page.locator('#camp-character-dialog');await expect.poll(async()=>{const d=await dialog.boundingBox(),n=await page.locator('.lobby-menu').boundingBox();return d!.y+d!.height<=n!.y;}).toBe(true);
  await page.locator('#camp-skill-up-guard').click();await expect(page.locator('#camp-skill-review-confirm')).toBeInViewport();
  if(capture)await page.screenshot({path:info.outputPath('review-hud-large-text.png')});
  await page.keyboard.press('Escape');await expect(page.locator('#camp-skill-up-guard')).toBeFocused();await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
});

test('return restores team filter, scroll and focus without moving a member',async({page})=>{
  await page.setViewportSize({width:390,height:650});await open(page,true);const before=await saved(page);
  await expect(page.locator('#bench-filter-front')).toBeVisible();await page.locator('#bench-filter-front').click();await page.locator('#lobby-member-garran').click();
  await page.locator('#lobby-skills-open').scrollIntoViewIfNeeded();const scroll=await page.locator('.lobby-content').evaluate(el=>el.scrollTop);expect(scroll).toBeGreaterThan(0);
  await page.locator('#lobby-skills-open').click();await page.keyboard.press('Escape');
  await expect(page.locator('#lobby-skills-open')).toBeFocused();await expect(page.locator('#bench-filter-front')).toHaveAttribute('aria-pressed','true');
  expect(await page.locator('.lobby-content').evaluate(el=>el.scrollTop)).toBeCloseTo(scroll,0);expect(await saved(page)).toBe(before);
});
test('each character returns to its own last tab',async({page})=>{
  await page.setViewportSize({width:390,height:650});await open(page);
  await page.locator('#team-character-guardian').click();await page.locator('#camp-character-tab-skills').click();await page.locator('#camp-skills-tomes').click();await page.keyboard.press('Escape');
  await page.locator('#team-character-tracer').click();await page.locator('#camp-character-tab-gear').click();await page.keyboard.press('Escape');
  await page.locator('#team-character-guardian').click();await expect(page.locator('#camp-character-tab-skills')).toHaveAttribute('aria-selected','true');await expect(page.locator('#camp-skills-tomes')).toHaveAttribute('aria-pressed','true');
});
