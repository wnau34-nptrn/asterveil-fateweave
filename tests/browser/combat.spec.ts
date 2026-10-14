import { errors,expect,test,type Page } from '@playwright/test';
import { battles } from '../../src/content/encounters/catalog';
import { veilSiege } from '../../src/content/encounters/veil-siege';
import type { EncounterDefinition } from '../../src/core/battle/types';
import { currentHeroId,createBattle,replay,resolveCommand } from '../../src/core/battle/engine';
import { offensive,defensive,guided,type Move } from '../fixtures/party-routes';
import { encounterRoutes } from '../fixtures/encounter-routes';
const key=(id:string)=>'asterveil.fateweave.battle.v1'+(id==='veil-siege'?'':'.'+id);
async function seed(page:Page,data:EncounterDefinition,moves:readonly Move[],version=data.version){
 await page.addInitScript(({id,version,commands,key})=>{
  if(sessionStorage.getItem('playtest-seeded'))return;
  localStorage.setItem('asterveil.fateweave.encounter.v1',id);
  localStorage.setItem(key,JSON.stringify({version:1,encounterId:id,contentVersion:version,commands}));
  sessionStorage.setItem('playtest-seeded','yes');
 },{id:data.id,version,key:key(data.id),commands:moves.map(([heroId,action,targetId],i)=>({beat:i+1,heroId,action,targetId}))});
}
async function start(page:Page){
 const issues:string[]=[];page.on('pageerror',e=>issues.push(e.message));page.on('console',m=>{if(m.type()==='error')issues.push(m.text());});
 await page.goto('./');await expect(page.locator('#game canvas')).toBeVisible();await expect(page.locator('#battle-select')).toBeEnabled();
 if(await page.locator('#start').count())await page.locator('#start').click();
 return issues;
}
async function finish(page:Page){
 const skip=page.locator('#skip-turn');try{await skip.click({timeout:2500});}catch(e){if(!(e instanceof errors.TimeoutError))throw e;await expect(skip).toHaveCount(0);}
 await expect(page.locator('#beat-status')).not.toContainText('กำลังแสดงผล');
}
async function cast(page:Page,hero:string,action:string,target:string){
 await expect(page.locator(`#hero-${hero}`)).toHaveAttribute('aria-pressed','true');await expect(page.locator(`#hero-${hero}`)).toBeEnabled();
 await page.locator(`#action-${action}`).click();await expect(page.locator('#skill-popover')).toBeVisible();
 await page.locator('[data-ui=skill-close]').click();await page.locator(`#target-${target}`).click();
}
async function pick(page:Page,id:string){await page.locator('#battle-select').click();await page.locator(`#encounter-${id}`).click();await expect(page.locator('#encounter-picker')).not.toBeVisible();}
async function count(page:Page,id='veil-siege'){return page.evaluate(k=>{const s=localStorage.getItem(k);return s?JSON.parse(s).commands.length:0;},key(id));}
async function reachable(page:Page,selector:string){
 await expect.poll(()=>page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
}
async function owner(page:Page,id:string){
 await expect(page.locator(`#hero-${id}`)).toBeEnabled();await expect(page.locator(`#hero-${id}`)).toHaveAttribute('aria-pressed','true');
 for(const other of ['guardian','tracer','weaver','healer'].filter(h=>h!==id))await expect(page.locator(`#hero-${other}`)).toBeDisabled();
}

test('asset readiness gates Start and all controls; first Knight cast commits once',async({page})=>{
 await page.clock.install({time:new Date('2026-10-14T00:00:00Z')});let release!:()=>void;let requested=false;const gate=new Promise<void>(r=>{release=r;});
 await page.route('**/assets/art/units.webp',async route=>{requested=true;await gate;await route.continue();});
 const issues:string[]=[];page.on('pageerror',e=>issues.push(e.message));
 try{
  await page.goto('./',{waitUntil:'domcontentloaded'});await expect.poll(()=>requested).toBe(true);
  await expect(page.locator('#start')).toBeDisabled();await expect(page.locator('#hero-guardian')).toBeDisabled();await expect(page.locator('#battle-select')).toBeDisabled();
  release();await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.clock.pauseAt(new Date('2026-10-14T01:00:00Z'));
  await owner(page,'guardian');await cast(page,'guardian','bash','raider');await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase','hero');
  expect(await count(page)).toBe(1);await finish(page);await owner(page,'tracer');expect(issues).toEqual([]);
 }finally{release();}
});

test('fixed turns reject cards, forged hero selection and raw canvas selection; keyboard casts only the owner',async({page})=>{
 const issues=await start(page);await owner(page,'guardian');
 await page.locator('#hero-weaver').evaluate(el=>{const b=el as HTMLButtonElement;b.disabled=false;b.click();});
 await expect(page.locator('#hero-guardian')).toHaveAttribute('aria-pressed','true');
 const field=(await page.locator('#game canvas').boundingBox())!;await page.mouse.click(field.x+field.width*.14,field.y+field.height*.48-35);
 await expect(page.locator('#hero-guardian')).toHaveAttribute('aria-pressed','true');expect(await count(page)).toBe(0);
 await page.locator('#action-bash').focus();await page.keyboard.press('Enter');await expect(page.locator('#skill-popover')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('#action-bash')).toBeFocused();
 await page.locator('#target-raider').focus();await page.keyboard.press('Enter');await finish(page);await owner(page,'tracer');
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).commands[0].heroId,key('veil-siege'))).toBe('guardian');expect(issues).toEqual([]);
});

test('normal stages show Knight damage, frozen enemy damage, then change the owner; all commands lock during both stages',async({page},info)=>{
 await page.clock.install({time:new Date('2026-10-14T00:00:00Z')});await page.emulateMedia({reducedMotion:'no-preference'});const issues=await start(page);
 await page.clock.pauseAt(new Date('2026-10-14T01:00:00Z'));await cast(page,'guardian','bash','brute');
 await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase','hero');await expect(page.locator('#turn-phase')).toHaveAttribute('data-actor','guardian');
 await expect(page.locator('[data-enemy=brute]')).toContainText('146 / 164');await expect(page.locator('#hero-tracer')).toContainText('56 / 56');
 await expect(page.locator('#skill-popover')).not.toBeVisible();await expect(page.locator('#battle-select')).toBeDisabled();
 for(const h of ['guardian','tracer','weaver','healer'])await expect(page.locator(`#hero-${h}`)).toBeDisabled();
 await page.locator('#target-brute').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));expect(await count(page)).toBe(1);
 await page.screenshot({path:info.outputPath('hero-stage.png')});await page.clock.runFor(1000);
 await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase','enemy');await expect(page.locator('#turn-phase')).toHaveAttribute('data-actor','raider');
 await expect(page.locator('#hero-tracer')).toContainText('44 / 56');await expect(page.locator('#action-attack')).toBeDisabled();
 await page.screenshot({path:info.outputPath('enemy-stage.png')});await page.clock.runFor(1000);
 await owner(page,'tracer');await expect(page.locator('#beat-status')).toContainText('จังหวะ 2');expect(issues).toEqual([]);
});

test('reduced-motion interruption shows a canceled enemy turn without damage',async({page},info)=>{
 await page.clock.install({time:new Date('2026-10-14T00:00:00Z')});const issues=await start(page);await page.clock.pauseAt(new Date('2026-10-14T01:00:00Z'));
 await cast(page,'guardian','bash','raider');await page.clock.runFor(1000);await expect(page.locator('#turn-phase')).toHaveAttribute('data-canceled','true');
 await expect(page.locator('#hero-tracer')).toContainText('56 / 56');await expect(page.locator('#event-log')).toContainText('หยุดการโจมตี');
 await page.screenshot({path:info.outputPath('interrupted-turn.png')});await finish(page);await owner(page,'tracer');expect(issues).toEqual([]);
});

test('skip, restart, mid-turn reload and hidden-tab completion do not replay or leak the old actor',async({page})=>{
 await page.clock.install({time:new Date('2026-10-14T00:00:00Z')});const issues=await start(page);await page.clock.pauseAt(new Date('2026-10-14T01:00:00Z'));
 await cast(page,'guardian','bash','raider');await page.reload();await owner(page,'tracer');expect(await count(page)).toBe(1);
 await cast(page,'tracer','mark','brute');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await owner(page,'weaver');expect(await count(page)).toBe(2);await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));
 await page.locator('#restart').click();await owner(page,'guardian');expect(await count(page)).toBe(0);
 await cast(page,'guardian','attack','brute');await page.locator('#restart').click();await page.clock.runFor(2200);
 await owner(page,'guardian');expect(await count(page)).toBe(0);await expect(page.locator('[data-enemy=brute]')).toContainText('164 / 164');expect(issues).toEqual([]);
});

for(const [index,hero]of ['guardian','tracer','weaver','healer'].entries()){
 test(`${hero} turn: only owned skills and floating descriptions; reading and closing never cast`,async({page},info)=>{
  if(index)await seed(page,veilSiege,guided.slice(0,index));const issues=await start(page);await owner(page,hero);
  const def=veilSiege.heroes[index]!;expect(await page.locator('.actions button').evaluateAll(es=>es.map(e=>e.id))).toEqual(def.actions.map(a=>'action-'+a));
  for(const action of def.actions){
   const before=await count(page);await page.locator('#action-'+action).click();await expect(page.locator('#skill-popover')).toBeVisible();
   await expect(page.locator('#skill-title')).toContainText(veilSiege.skills[action].name);await expect(page.locator('#skill-copy')).not.toBeEmpty();
   await reachable(page,'[data-ui=skill-close]');await page.keyboard.press('Escape');await expect(page.locator('#action-'+action)).toBeFocused();expect(await count(page)).toBe(before);
  }
  await page.locator('#action-'+def.actions[1]!).click();await page.screenshot({path:info.outputPath('skill-explanation.png')});
  await page.locator('#battle-info').click();await expect(page.locator('#skill-popover')).not.toBeVisible();await expect(page.locator('#info-skill')).toContainText(veilSiege.skills[def.actions[1]!].name);
  await page.locator('[data-ui=info-close]').click();await owner(page,hero);expect(issues).toEqual([]);
 });
}

test('Guard popup explains reduction; its ally target is usable while that ally cannot issue commands',async({page})=>{
 const issues=await start(page);await page.locator('#action-guard').click();await expect(page.locator('#skill-copy')).toContainText('65%');
 await expect(page.locator('#hero-tracer')).toBeDisabled();await expect(page.locator('#target-weaver')).toBeDisabled();
 // Desktop popup stays over the dock; a valid field target casts without confirmation.
 await reachable(page,'#target-tracer');await page.locator('#target-tracer').click();await finish(page);
 await expect(page.locator('#hero-guardian')).toContainText('71 / 76');await expect(page.locator('#hero-tracer')).toContainText('56 / 56');
 await owner(page,'tracer');expect(issues).toEqual([]);
});

test('Mark waits through Mage and Priest turns and delivers the actual 50-power hit on the next Duelist turn',async({page},info)=>{
 const issues=await start(page);
 for(const [i,[hero,action,target]]of guided.slice(0,6).entries()){
  await cast(page,hero,action,target);await finish(page);
  if(i===1){await expect(page.locator('[data-enemy=brute]')).toContainText('ติดตรา');await owner(page,'weaver');await expect(page.locator('#action-execute')).toHaveCount(0);}
  if(i===2){await expect(page.locator('[data-enemy=brute]')).toContainText('138 / 164');await expect(page.locator('[data-enemy=brute]')).toContainText('ติดตรา');}
 }
 await expect(page.locator('[data-enemy=brute]')).toContainText('70 / 164');await expect(page.locator('[data-enemy=brute]')).not.toContainText('ติดตรา');
 await expect(page.locator('#event-log')).toContainText('เสียเลือด 50');await owner(page,'weaver');await page.screenshot({path:info.outputPath('marked-follow-up.png')});expect(issues).toEqual([]);
});

test('Priest heals another hero as a target without letting that hero take the turn',async({page})=>{
 await seed(page,veilSiege,guided.slice(0,3));const issues=await start(page);await owner(page,'healer');
 await page.locator('#action-heal').click();await expect(page.locator('#skill-copy')).toContainText('20');await page.locator('[data-ui=skill-close]').click();
 await expect(page.locator('#hero-weaver')).toBeDisabled();await expect(page.locator('#target-tracer')).toBeDisabled();
 await page.locator('#target-tracer').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));expect(await count(page)).toBe(3);await owner(page,'healer');
 await page.locator('#target-weaver').click();await finish(page);await expect(page.locator('#hero-weaver')).toContainText('40 / 48');
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).commands[3].heroId,key('veil-siege'))).toBe('healer');await owner(page,'guardian');expect(issues).toEqual([]);
});

test('Prayer casts once through any living ally and Ward absorbs the announced hit before HP',async({page})=>{
 await seed(page,veilSiege,guided.slice(0,2));const issues=await start(page);await owner(page,'weaver');
 await cast(page,'weaver','ward','guardian');await finish(page);await expect(page.locator('#hero-guardian')).toContainText('71 / 76');await expect(page.locator('#hero-guardian')).toContainText('โล่ 2');
 await page.locator('#action-prayer').click();await expect(page.locator('#skill-copy')).toContainText('ทุกคน');await page.locator('[data-ui=skill-close]').click();
 await page.locator('#target-party-guardian').click();await finish(page);expect(await count(page)).toBe(4);
 await expect(page.locator('#hero-guardian')).toContainText('76 / 76');await expect(page.locator('#hero-weaver')).toContainText('30 / 48');
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).commands[3].targetId,key('veil-siege'))).toBe('party');await owner(page,'guardian');expect(issues).toEqual([]);
});

for(const first of ['raider','brute']){
 test(`fixed-owner basic attacks prioritizing ${first} still lose`,async({page})=>{
  const issues=await start(page);let state=createBattle(veilSiege);
  while(state.outcome==='active'&&state.commands.length<50){const hero=currentHeroId(state,veilSiege)!,target=state.enemies.find(e=>e.id===first&&e.hp>0)??state.enemies.find(e=>e.hp>0)!;
   await cast(page,hero,'attack',target.id);await finish(page);state=resolveCommand(state,veilSiege,{beat:state.beat,heroId:hero,action:'attack',targetId:target.id}).state;
  }
  expect(state.outcome).toBe('defeat');await expect(page.locator('.result-card')).toContainText('แพ้แล้ว');await reachable(page,'#battle-select');await reachable(page,'.result-card button');expect(issues).toEqual([]);
 });
}
const routes=[{data:veilSiege,name:'original offensive',moves:offensive,hp:[52,6,4,18]}, {data:veilSiege,name:'original defensive',moves:defensive,hp:[72,14,18,38]}, {data:veilSiege,name:'guided',moves:guided,hp:[57,16,14,28]},...encounterRoutes];
for(const [index,route]of routes.entries()){
 test(`${route.name}: forced turns win with all four heroes and exact HP, restore and restart the selected battle`,async({browser},info)=>{
  const viewport=index%3===0?{width:320,height:568}:index%3===1?{width:390,height:844}:{width:1366,height:768};
  const context=await browser.newContext({viewport,hasTouch:viewport.width<600,reducedMotion:'reduce'}),page=await context.newPage(),issues=await start(page);
  if(route.data.id!=='veil-siege')await pick(page,route.data.id);
  await expect(page.locator('#enemy-roster .enemy-card')).toHaveCount(route.data.enemies.length);
  for(const [i,[hero,action,target]]of route.moves.entries()){
   await cast(page,hero,action,target);await finish(page);
   if(i===0){await page.reload();await expect(page.locator('#start')).toHaveCount(0);await owner(page,'tracer');}
  }
  await expect(page.locator('.result-card')).toContainText('ยืนอยู่ 4 / 4 คน');await expect(page.locator('.result-card')).toContainText(`เลือดทีม ${route.hp.reduce((a,b)=>a+b,0)}`);
  for(const [i,hero]of route.data.heroes.entries())await expect(page.locator('#hero-'+hero.id)).toContainText(`${route.hp[i]} / ${hero.maxHp}`);
  await reachable(page,'.result-card button');await reachable(page,'#battle-select');await page.screenshot({path:info.outputPath('four-survivor-victory.png')});
  await page.locator('.result-card button').click();await owner(page,'guardian');expect(await count(page,route.data.id)).toBe(0);expect(issues).toEqual([]);await context.close();
 });
}

for(const viewport of [{width:320,height:568},{width:390,height:640},{width:390,height:844},{width:600,height:800},{width:768,height:1024},{width:844,height:390},{width:1024,height:768},{width:1280,height:720},{width:1366,height:640},{width:1366,height:768},{width:1920,height:1080}]){
 test(`viewport ${viewport.width}x${viewport.height}: owned controls and floating skill stay contained without scroll`,async({browser},info)=>{
  const context=await browser.newContext({viewport,hasTouch:viewport.width<900,reducedMotion:'reduce'}),page=await context.newPage(),issues=await start(page);
  const fits=async()=>{
   expect(await page.evaluate(()=>({x:scrollX,y:scrollY,overflow:document.documentElement.scrollHeight>innerHeight}))).toEqual({x:0,y:0,overflow:false});
   for(const s of ['#battle-select','#battle-info','#restart','#action-attack','#action-guard','#action-bash'])await reachable(page,s);
   await expect.poll(()=>page.locator('#game canvas').evaluate(el=>{const r=el.getBoundingClientRect(),a=el.parentElement!.parentElement!.getBoundingClientRect();return r.height>=120&&r.left>=a.left&&r.right<=a.right&&r.top>=a.top&&r.bottom<=a.bottom;})).toBe(true);
  };
  await fits();await owner(page,'guardian');const before=await page.locator('.arena').boundingBox();await page.locator('#action-guard').click();
  await expect(page.locator('#skill-popover')).toBeVisible();await reachable(page,'[data-ui=skill-close]');
  expect(await page.locator('.arena').boundingBox()).toEqual(before);
  expect(await page.locator('#skill-popover').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&el.scrollHeight<=el.clientHeight+1;})).toBe(true);
  await page.screenshot({path:info.outputPath('floating-skill.png')});await page.locator('[data-ui=skill-close]').click();await reachable(page,'#target-tracer');
  const positions=await page.locator('#field-targets button').evaluateAll(es=>es.map(el=>{const r=el.getBoundingClientRect();return{id:(el as HTMLElement).dataset.actor!,x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom};}));
  expect(positions).toHaveLength(4);
  if(viewport.width<=600&&viewport.height>=viewport.width)for(const [i,a]of positions.entries())for(const b of positions.slice(i+1))expect(a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h).toBe(false);
  const field=(await page.locator('#game canvas').boundingBox())!;
  for(const r of positions){expect(r.w).toBeGreaterThanOrEqual(44);expect(r.h).toBeGreaterThanOrEqual(44);expect((r.bottom-field.y)/field.height).toBeGreaterThan(.4);}
  for(const [front,back]of [['guardian','weaver'],['tracer','healer']]){const f=positions.find(p=>p.id===front)!,b=positions.find(p=>p.id===back)!;expect(f.x).toBeGreaterThan(b.x);expect(f.bottom).toBeGreaterThan(b.bottom);}
  await page.locator('#target-tracer').click();await finish(page);await owner(page,'tracer');
  await page.locator('#action-mark').click();await expect(page.locator('#skill-copy')).toContainText('5 จังหวะ');await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>scrollY)).toBe(0);await page.locator('#restart').click();await owner(page,'guardian');await fits();
  expect(issues).toEqual([]);await context.close();
 });
}

test('phone rotation and safe-area/visible-height changes preserve the selected skill and fixed owner',async({browser},info)=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),issues=await start(page);
 await page.locator('#action-guard').tap();await expect(page.locator('#skill-popover')).toBeVisible();
 for(const viewport of [{width:844,height:390},{width:1366,height:768},{width:390,height:640}]){
  await page.setViewportSize(viewport);await expect(page.locator('#action-guard')).toHaveAttribute('aria-pressed','true');await owner(page,'guardian');await reachable(page,'[data-ui=skill-close]');
 }
 await page.locator('[data-ui=skill-close]').tap();await page.addStyleTag({content:'#app {padding-top:20px;padding-bottom:34px;}'});
 await reachable(page,'#action-guard');await reachable(page,'#target-tracer');await page.locator('#target-tracer').tap();await finish(page);await owner(page,'tracer');
 expect(await page.evaluate(()=>scrollY)).toBe(0);await page.screenshot({path:info.outputPath('rotated-safe-area.png')});expect(issues).toEqual([]);await context.close();
});

test('a fallen upcoming hero is skipped on commit, reload and continued input',async({page})=>{
 let state=createBattle(veilSiege);while(state.outcome==='active'&&state.heroes.every(h=>h.hp>0)){
  const target=state.enemies.find(e=>e.id==='brute'&&e.hp>0)??state.enemies.find(e=>e.hp>0)!;
  state=resolveCommand(state,veilSiege,{beat:state.beat,heroId:currentHeroId(state,veilSiege)!,action:'attack',targetId:target.id}).state;
 }
 expect(state.outcome).toBe('active');const moves=state.commands.map(c=>[c.heroId,c.action,c.targetId]as Move);await seed(page,veilSiege,moves);const issues=await start(page);
 const expected=currentHeroId(state,veilSiege)!;await owner(page,expected);
 for(const h of state.heroes.filter(h=>h.hp===0))await expect(page.locator('#hero-'+h.id)).toContainText('ล้มแล้ว');
 await page.reload();await owner(page,expected);await cast(page,expected,'attack',state.enemies.find(e=>e.hp>0)!.id);await finish(page);
 const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).commands,key('veil-siege'));
 const final=replay(veilSiege,saved);if(final.outcome==='active')await owner(page,currentHeroId(final,veilSiege)!);expect(issues).toEqual([]);
});

test('selection keeps each battle owner/progress, mid-turn reload and selected-only restart',async({page},info)=>{
 const issues=await start(page);await cast(page,'guardian','guard','tracer');await finish(page);
 await pick(page,'rear-ambush');await cast(page,'guardian','guard','weaver');await finish(page);
 await pick(page,'rift-warden');await cast(page,'guardian','bash','brute');await page.reload();await owner(page,'tracer');
 await expect(page.locator('[data-enemy=brute]')).toContainText('232 / 250');await expect(page.locator('#target-raider')).toHaveCount(0);
 await page.locator('#battle-select').click();await expect(page.locator('#encounter-rear-ambush')).toContainText('เล่นต่อ · จังหวะ 2');await page.keyboard.press('Escape');await expect(page.locator('#battle-select')).toBeFocused();
 await pick(page,'veil-siege');await owner(page,'tracer');await page.locator('#restart').click();await owner(page,'guardian');
 await pick(page,'rear-ambush');await owner(page,'tracer');await expect(page.locator('#hero-guardian')).toContainText('70 / 76');
 expect([await count(page),await count(page,'rear-ambush'),await count(page,'rift-warden')]).toEqual([0,1,1]);
 await page.screenshot({path:info.outputPath('resumed-owned-turn.png')});expect(issues).toEqual([]);
});

test('narrow picker blocks background commands and preserves turns without storage',async({browser},info)=>{
 const context=await browser.newContext({viewport:{width:320,height:568},hasTouch:true,reducedMotion:'reduce'});
 await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get:()=>{throw new Error('Denied');}}));
 const page=await context.newPage(),issues=await start(page);await page.locator('#battle-select').click();
 for(const {data}of battles)await reachable(page,'#encounter-'+data.id);await page.screenshot({path:info.outputPath('encounter-picker.png')});
 await page.locator('#target-brute').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));await page.keyboard.press('Escape');await owner(page,'guardian');
 await pick(page,'rear-ambush');await cast(page,'guardian','guard','weaver');await finish(page);
 await pick(page,'rift-warden');await cast(page,'guardian','bash','brute');await finish(page);
 await pick(page,'rear-ambush');await owner(page,'tracer');await expect(page.locator('#hero-guardian')).toContainText('70 / 76');
 await expect(page.locator('#save-status')).toContainText('บันทึกบนเครื่องนี้ไม่ได้');expect(issues).toEqual([]);await context.close();
});

for(const invalid of ['old-version','foreign-owner','malformed','invalid-selection']){
 test(`save ${invalid}: safe recovery to the current rules and Knight owner`,async({page})=>{
  if(invalid==='old-version')await seed(page,veilSiege,guided.slice(0,1),veilSiege.version-1);
  else await page.addInitScript(mode=>{
   if(mode==='invalid-selection')localStorage.setItem('asterveil.fateweave.encounter.v1','unregistered');
   else localStorage.setItem('asterveil.fateweave.battle.v1',mode==='malformed'?'{bad':JSON.stringify({version:1,encounterId:'veil-siege',contentVersion:4,commands:[{beat:1,heroId:'tracer',action:'attack',targetId:'brute'}]}));
  },invalid);
  const issues=await start(page);await owner(page,'guardian');await expect(page.locator('#hero-guardian')).toContainText('76 / 76');
  await cast(page,'guardian','bash','raider');await finish(page);await owner(page,'tracer');expect(await count(page)).toBe(1);expect(issues).toEqual([]);
 });
}

test('teaching advice uses the current owner, respects dismissal and never issues a command',async({page},info)=>{
 const issues=await start(page);await expect(page.locator('#coach-copy')).toContainText('เอกิส');await expect(page.locator('#coach-copy')).toContainText('ตั้งรับแทน');
 await page.locator('#coach-dismiss').click();expect(await count(page)).toBe(0);await page.reload();await page.locator('#start').click();await expect(page.locator('#battle-coach')).not.toBeVisible();
 await page.locator('#battle-info').click();await page.locator('#coach-toggle').click();await expect(page.locator('#coach-toggle')).toBeFocused();await page.locator('[data-ui=info-close]').click();
 for(const [i,[hero,action,target]]of guided.slice(0,3).entries()){
  await cast(page,hero,action,target);await finish(page);
  if(i===0)await expect(page.locator('#coach-copy')).toContainText('ไลรา');if(i===1){await expect(page.locator('#coach-copy')).toContainText('ไอรา');await expect(page.locator('#coach-copy')).toContainText('ศรเวท');}
 }
 await expect(page.locator('#battle-coach')).not.toBeVisible();await owner(page,'healer');await page.screenshot({path:info.outputPath('completed-coaching.png')});expect(issues).toEqual([]);
});

test('cooling owned skill can be inspected but its targets cannot commit; skipped heroes do not give free control',async({page})=>{
 const moves:readonly Move[]=[
  ['guardian','bash','raider'],['tracer','attack','brute'],['weaver','attack','brute'],['healer','attack','brute'],
  ['guardian','bash','raider'],['tracer','attack','brute'],['healer','attack','brute'],['guardian','bash','raider'],
  ['tracer','attack','brute'],['healer','attack','brute'],['guardian','bash','raider'],['healer','prayer','party'],
 ];
 const expected=replay(veilSiege,moves.map(([heroId,action,targetId],i)=>({beat:i+1,heroId,action,targetId})));
 expect(currentHeroId(expected,veilSiege)).toBe('guardian');expect(expected.heroes[0]!.cooldowns.bash).toBeGreaterThan(expected.beat);
 await seed(page,veilSiege,moves);const issues=await start(page);await owner(page,'guardian');
 await page.locator('#action-bash').click();await expect(page.locator('#skill-popover')).toBeVisible();await expect(page.locator('#skill-availability')).toContainText('คูลดาวน์');
 await page.locator('[data-ui=skill-close]').click();await expect(page.locator('#target-brute')).toBeDisabled();
 await page.locator('#target-brute').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));expect(await count(page)).toBe(12);
 await cast(page,'guardian','attack','brute');await finish(page);await owner(page,'healer');await expect(page.locator('#hero-guardian')).toContainText('ล้มแล้ว');expect(issues).toEqual([]);
});

test('final victory waits for both stages and the defeated source never attacks',async({page},info)=>{
 await page.clock.install({time:new Date('2026-10-14T00:00:00Z')});await seed(page,veilSiege,offensive.slice(0,-1));const issues=await start(page);
 await page.clock.pauseAt(new Date('2026-10-14T01:00:00Z'));await cast(page,'guardian','bash','raider');
 await expect(page.locator('.result-card')).toHaveCount(0);expect(await count(page)).toBe(offensive.length);await expect(page.locator('#battle-select')).toBeDisabled();
 await page.clock.runFor(1000);await expect(page.locator('#turn-phase')).toHaveAttribute('data-canceled','true');await expect(page.locator('.result-card')).toHaveCount(0);
 await page.clock.runFor(1000);await expect(page.locator('.result-card')).toContainText('ยืนอยู่ 4 / 4 คน');await expect(page.locator('.result-card')).toContainText('เลือดทีม 80');
 await reachable(page,'.result-card button');await reachable(page,'#battle-select');await page.screenshot({path:info.outputPath('final-owned-turn.png')});expect(issues).toEqual([]);
});
