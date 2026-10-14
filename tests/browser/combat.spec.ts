import { errors, expect, test, type Page } from '@playwright/test';
import { battles, riftWarden } from '../../src/content/encounters/catalog';
import { veilSiege } from '../../src/content/encounters/veil-siege';
import type { EncounterDefinition } from '../../src/core/battle/types';
import { createBattle, currentHeroId, replay, resolveCommand } from '../../src/core/battle/engine';
import { offensive, guided, partyRoutes, type Move } from '../fixtures/party-routes';
import { encounterRoutes } from '../fixtures/encounter-routes';
const key=(id:string)=>'asterveil.fateweave.battle.v1'+(id==='veil-siege'?'':'.'+id);
function simulate(data:EncounterDefinition,moves:readonly Move[]){let s=createBattle(data);for(const [heroId,action,targetId]of moves)s=resolveCommand(s,data,{beat:s.beat,heroId,action,targetId}).state;return s;}
async function seed(page:Page,data:EncounterDefinition,moves:readonly Move[],version=data.version){
 await page.addInitScript(({id,version,commands,key})=>{
  if(sessionStorage.getItem('playtest-seeded'))return;
  localStorage.setItem('asterveil.fateweave.encounter.v1',id);
  localStorage.setItem(key,JSON.stringify({version:1,encounterId:id,contentVersion:version,commands}));sessionStorage.setItem('playtest-seeded','yes');
 },{id:data.id,version,key:key(data.id),commands:simulate(data,moves).commands});
}
async function start(page:Page){
 const issues:string[]=[];page.on('pageerror',e=>issues.push(e.message));page.on('console',m=>{if(m.type()==='error')issues.push(m.text());});
 await page.goto('./');await expect(page.locator('#game canvas')).toBeVisible();await expect(page.locator('#battle-select')).toBeEnabled();
 if(await page.locator('#start').count())await page.locator('#start').click();return issues;
}
async function finish(page:Page){
 const skip=page.locator('#skip-turn');try{await skip.click({timeout:2500});}catch(e){if(!(e instanceof errors.TimeoutError))throw e;await expect(skip).toHaveCount(0);}
 await expect(page.locator('#beat-status')).not.toContainText('กำลังแสดงผล');
}
async function cast(page:Page,hero:string,action:string,target:string){
 await owner(page,hero);await page.locator(`#action-${action}`).click();await expect(page.locator('#skill-popover')).toBeVisible();
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
async function prefix(page:Page,length:number){for(const [h,a,t]of guided.slice(0,length)){await cast(page,h,a,t);await finish(page);}}
async function savedState(page:Page,data=veilSiege){const commands=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).commands,key(data.id));return replay(data,commands);}

test('asset readiness gates Start and inputs; first SPD hero commits once',async({page})=>{
 await page.clock.install({time:new Date('2026-10-14T00:00:00Z')});let release!:()=>void;let requested=false;const gate=new Promise<void>(r=>{release=r;});
 await page.route('**/assets/art/units.webp',async route=>{requested=true;await gate;await route.continue();});
 const issues:string[]=[];page.on('pageerror',e=>issues.push(e.message));
 try{
  await page.goto('./',{waitUntil:'domcontentloaded'});await expect.poll(()=>requested).toBe(true);
  await expect(page.locator('#start')).toBeDisabled();await expect(page.locator('#hero-tracer')).toBeDisabled();await expect(page.locator('#battle-select')).toBeDisabled();
  release();await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.clock.pauseAt(new Date('2026-10-14T01:00:00Z'));
  await cast(page,'tracer','mark','brute');await expect(page.locator('#turn-phase')).toHaveAttribute('data-phase','hero');expect(await count(page)).toBe(1);
  await finish(page);await owner(page,'weaver');expect(issues).toEqual([]);
 }finally{release();}
});
test('only the SPD owner can command through cards, forged events, canvas and keyboard',async({page})=>{
 const issues=await start(page);await owner(page,'tracer');
 await page.locator('#hero-guardian').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));await owner(page,'tracer');
 const canvas=(await page.locator('#game canvas').boundingBox())!;await page.mouse.click(canvas.x+canvas.width*.35,canvas.y+canvas.height*.59-15);await owner(page,'tracer');
 const card=await page.locator('#hero-weaver').boundingBox();await page.mouse.click(card!.x+card!.width/2,card!.y+card!.height/2);await owner(page,'tracer');
 await page.locator('#action-mark').focus();await page.keyboard.press('Enter');await expect(page.locator('#skill-popover')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#action-mark')).toBeFocused();
 await page.locator('#target-brute').focus();await page.keyboard.press('Enter');await finish(page);await owner(page,'weaver');expect(await count(page)).toBe(1);expect(issues).toEqual([]);
});
test('normal motion shows separate actual hero and enemy turns, exact staged HP and locked controls',async({browser},info)=>{
 const context=await browser.newContext({viewport:{width:1366,height:768},reducedMotion:'no-preference'}),page=await context.newPage();
 await page.clock.install({time:new Date('2026-10-14T00:00:00Z')});const issues=await start(page);await page.clock.pauseAt(new Date('2026-10-14T01:00:00Z'));
 await cast(page,'tracer','execute','brute');await expect(page.locator('#turn-phase')).toHaveAttribute('data-actor','tracer');
 await expect(page.locator('[data-enemy=brute]')).toContainText('172 / 200');await expect(page.locator('#hero-tracer')).toContainText('56 / 56');
 await expect(page.locator('#battle-select')).toBeDisabled();await expect(page.locator('#action-attack')).toBeDisabled();await expect(page.locator('#target-brute')).toBeDisabled();
 expect((await savedState(page)).heroes[1]!.hp).toBe(44);expect(await count(page)).toBe(1);await page.screenshot({path:info.outputPath('hero-stage.png')});
 await page.clock.runFor(1000);await expect(page.locator('#turn-phase')).toHaveAttribute('data-actor','raider');await expect(page.locator('#hero-tracer')).toContainText('44 / 56');
 await page.screenshot({path:info.outputPath('enemy-stage.png')});await page.clock.runFor(1000);await owner(page,'weaver');expect(issues).toEqual([]);await context.close();
});
test('reduced motion retains the physical interrupted enemy turn and never adds an extra attack',async({page},info)=>{
 await seed(page,riftWarden,[['tracer','mark','brute'],['weaver','bolt','brute']]);await page.clock.install({time:new Date('2026-10-14T00:00:00Z')});const issues=await start(page);
 await page.clock.pauseAt(new Date('2026-10-14T01:00:00Z'));await cast(page,'guardian','bash','brute');await expect(page.locator('.turn-slot[data-actor=brute]').first()).toContainText('หยุด');await page.clock.runFor(1000);
 await expect(page.locator('#turn-phase')).toHaveAttribute('data-actor','brute');await expect(page.locator('#turn-phase')).toHaveAttribute('data-canceled','true');
 await expect(page.locator('#hero-tracer')).toContainText('56 / 56');await page.screenshot({path:info.outputPath('interrupted-turn.png')});await page.clock.runFor(1000);await owner(page,'healer');expect(issues).toEqual([]);
});
test('skip, restart, mid-turn reload and hidden-tab completion never repeat committed actions',async({page})=>{
 const issues=await start(page);await cast(page,'tracer','mark','brute');await finish(page);await owner(page,'weaver');
 await page.locator('#restart').click();await owner(page,'tracer');expect(await count(page)).toBe(0);
 await cast(page,'tracer','execute','brute');await page.reload();await owner(page,'weaver');expect(await count(page)).toBe(1);
 await expect(page.locator('#hero-tracer')).toContainText('44 / 56');
 await cast(page,'weaver','bolt','brute');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await owner(page,'guardian');expect(await count(page)).toBe(2);await page.evaluate(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));expect(issues).toEqual([]);
});
for(const [index,hero]of ['tracer','weaver','guardian','healer'].entries()){
 test(`${hero}: owned skills explain real abilities in a floating window without committing`,async({page},info)=>{
  const issues=await start(page);await prefix(page,index);await owner(page,hero);const before=await count(page),field=await page.locator('.arena').boundingBox();
  for(const action of veilSiege.heroes.find(h=>h.id===hero)!.actions){
   await page.locator('#action-'+action).click();await expect(page.locator('#skill-popover')).toBeVisible();await expect(page.locator('#skill-title')).toContainText(veilSiege.skills[action].name);
   await expect(page.locator('#skill-copy')).not.toBeEmpty();expect(await count(page)).toBe(before);expect(await page.locator('.arena').boundingBox()).toEqual(field);
   await reachable(page,'[data-ui=skill-close]');await page.screenshot({path:info.outputPath(action+'-explanation.png')});await page.keyboard.press('Escape');await expect(page.locator('#action-'+action)).toBeFocused();
  }
  expect(issues).toEqual([]);
 });
}
test('Guard targets the announced ally without transferring the Knight turn; popup permits direct field casting',async({page})=>{
 const issues=await start(page);await prefix(page,2);await owner(page,'guardian');await page.locator('#action-guard').click();await expect(page.locator('#skill-popover')).toBeVisible();
 await page.locator('#target-weaver').click();await expect(page.locator('#skill-popover')).not.toBeVisible();await finish(page);await owner(page,'healer');
 await expect(page.locator('#hero-guardian')).toContainText('66 / 76');await expect(page.locator('#hero-weaver')).toContainText('48 / 48');expect(await count(page)).toBe(3);expect(issues).toEqual([]);
});
test('Mark waits for the next round, survives Mage actions and adds 22 to the Duelist strike',async({page},info)=>{
 const issues=await start(page);await prefix(page,3);await cast(page,'healer','heal','guardian');await finish(page);
 await owner(page,'tracer');await expect(page.locator('#beat-status')).toContainText('รอบ 2');await cast(page,'tracer','execute','brute');await finish(page);
 await expect(page.locator('[data-enemy=brute]')).toContainText('150 / 200');expect((await savedState(page)).enemies[1]!.markedUntil).toBe(0);
 await page.screenshot({path:info.outputPath('marked-follow-up.png')});expect(issues).toEqual([]);
});
test('Priest can heal another hero without allowing that recipient to command',async({page})=>{
 const issues=await start(page);await prefix(page,3);await owner(page,'healer');await page.locator('#action-heal').click();await page.locator('[data-ui=skill-close]').click();
 await expect(page.locator('#target-weaver')).toBeDisabled();await expect(page.locator('#target-guardian')).toBeEnabled();await page.locator('#target-guardian').click();await finish(page);await owner(page,'tracer');
 await expect(page.locator('#hero-guardian')).toContainText('76 / 76');expect(issues).toEqual([]);
});
test('Prayer through another living ally casts once and Ward persists until the actual enemy turn',async({page})=>{
 const issues=await start(page);await prefix(page,2);await expect(page.locator('#hero-weaver')).toContainText('โล่ 14');
 await cast(page,'guardian','attack','brute');await finish(page);await expect(page.locator('#hero-weaver')).toContainText('34 / 48');
 await cast(page,'healer','prayer','party-guardian');await finish(page);await expect(page.locator('#hero-weaver')).toContainText('44 / 48');await expect(page.locator('#hero-tracer')).toContainText('54 / 56');expect(await count(page)).toBe(4);expect(issues).toEqual([]);
});
for(const first of ['raider','brute']){
 test(`blind Attack priority ${first} loses under SPD turns`,async({page})=>{
  test.setTimeout(75000);const issues=await start(page);let s=createBattle(veilSiege);
  while(s.outcome==='active'){
   const hero=currentHeroId(s,veilSiege)!,e=s.enemies.find(e=>e.id===first&&e.hp>0)??s.enemies.find(e=>e.hp>0)!;
   await cast(page,hero,'attack',e.id);await finish(page);s=resolveCommand(s,veilSiege,{beat:s.beat,heroId:hero,action:'attack',targetId:e.id}).state;
  }
  expect(s.outcome).toBe('defeat');await expect(page.locator('.result-card')).toContainText('แพ้แล้ว');await reachable(page,'.result-card button');expect(issues).toEqual([]);
 });
}
const routes=[...partyRoutes.map(r=>({...r,data:veilSiege})),...encounterRoutes];
for(const [index,route]of routes.entries()){
 test(`${route.name}: all-four victory, exact HP, reload and selected-only restart`,async({browser},info)=>{
  test.setTimeout(75000);const viewport=index%3===0?{width:320,height:568}:index%3===1?{width:390,height:844}:{width:1366,height:768};
  const context=await browser.newContext({viewport,hasTouch:viewport.width<600,reducedMotion:'reduce'}),page=await context.newPage(),issues=await start(page);
  if(route.data.id!=='veil-siege')await pick(page,route.data.id);
  await expect(page.locator('#enemy-roster .enemy-card')).toHaveCount(route.data.enemies.length);
  for(const [i,[hero,action,target]]of route.moves.entries()){
   await cast(page,hero,action,target);await finish(page);
   if(i===0){await page.reload();await expect(page.locator('#start')).toHaveCount(0);await owner(page,'weaver');}
  }
  await expect(page.locator('.result-card')).toContainText('ยืนอยู่ 4 / 4 คน');await expect(page.locator('.result-card')).toContainText(`เลือดทีม ${route.hp.reduce((a,b)=>a+b,0)}`);
  for(const [i,hero]of route.data.heroes.entries())await expect(page.locator('#hero-'+hero.id)).toContainText(`${route.hp[i]} / ${hero.maxHp}`);
  await reachable(page,'.result-card button');await reachable(page,'#battle-select');await page.screenshot({path:info.outputPath('four-survivor-victory.png')});
  await page.locator('.result-card button').click();await owner(page,'tracer');expect(await count(page,route.data.id)).toBe(0);expect(issues).toEqual([]);await context.close();
 });
}
for(const viewport of [{width:320,height:568},{width:390,height:640},{width:390,height:844},{width:600,height:800},{width:768,height:1024},{width:844,height:390},{width:1024,height:768},{width:1280,height:720},{width:1366,height:640},{width:1366,height:768},{width:1920,height:1080}]){
 test(`viewport ${viewport.width}x${viewport.height}: timeline, popup and controls fit without scroll`,async({browser},info)=>{
  const context=await browser.newContext({viewport,hasTouch:viewport.width<900,reducedMotion:'reduce'}),page=await context.newPage(),issues=await start(page);
  const fits=async()=>{
   expect(await page.evaluate(()=>({x:scrollX,y:scrollY,overflow:document.documentElement.scrollHeight>innerHeight}))).toEqual({x:0,y:0,overflow:false});
   for(const s of ['#battle-select','#battle-info','#restart','#action-attack','#action-mark','#action-execute'])await reachable(page,s);
   await expect.poll(()=>page.locator('#game canvas').evaluate(el=>{const r=el.getBoundingClientRect(),a=el.parentElement!.parentElement!.getBoundingClientRect();return r.height>=120&&r.left>=a.left&&r.right<=a.right&&r.top>=a.top&&r.bottom<=a.bottom;})).toBe(true);
   await expect(page.locator('#turn-order')).toBeVisible();expect(await page.locator('.turn-slot:visible').count()).toBe(viewport.width<=600||viewport.height<=700?4:6);
   expect(await page.locator('#turn-order').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&el.scrollWidth<=el.clientWidth;})).toBe(true);
  };
  await fits();await owner(page,'tracer');const before=await page.locator('.arena').boundingBox();await page.locator('#action-mark').click();
  await expect(page.locator('#skill-copy')).toContainText('2 รอบ');await reachable(page,'[data-ui=skill-close]');expect(await page.locator('.arena').boundingBox()).toEqual(before);
  expect(await page.locator('#skill-popover').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&el.scrollHeight<=el.clientHeight+1;})).toBe(true);
  await page.screenshot({path:info.outputPath('floating-skill.png')});await page.locator('[data-ui=skill-close]').click();await page.locator('#target-brute').click();await finish(page);await owner(page,'weaver');
  await cast(page,'weaver','ward','weaver');await finish(page);await owner(page,'guardian');await page.locator('#action-guard').click();await page.locator('[data-ui=skill-close]').click();
  const positions=await page.locator('#field-targets button').evaluateAll(es=>es.map(el=>{const r=el.getBoundingClientRect();return{id:(el as HTMLElement).dataset.actor!,x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom};}));
  expect(positions).toHaveLength(4);if(viewport.width<=600&&viewport.height>=viewport.width)for(const [i,a]of positions.entries())for(const b of positions.slice(i+1))expect(a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h).toBe(false);
  const field=(await page.locator('#game canvas').boundingBox())!;for(const r of positions){expect(r.w).toBeGreaterThanOrEqual(44);expect(r.h).toBeGreaterThanOrEqual(44);expect((r.bottom-field.y)/field.height).toBeGreaterThan(.4);}
  for(const [front,back]of [['guardian','weaver'],['tracer','healer']]){const f=positions.find(p=>p.id===front)!,b=positions.find(p=>p.id===back)!;expect(f.x).toBeGreaterThan(b.x);expect(f.bottom).toBeGreaterThan(b.bottom);}
  await reachable(page,'#target-weaver');await page.locator('#target-weaver').click();await finish(page);await owner(page,'healer');
  await page.locator('#restart').click();await owner(page,'tracer');await fits();expect(issues).toEqual([]);await context.close();
 });
}
test('phone rotation and simulated safe areas retain the owner, skill and visible timeline',async({browser},info)=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),issues=await start(page);
 await page.locator('#action-mark').tap();for(const viewport of [{width:844,height:390},{width:1366,height:768},{width:390,height:640}]){
  await page.setViewportSize(viewport);await expect(page.locator('#action-mark')).toHaveAttribute('aria-pressed','true');await owner(page,'tracer');await reachable(page,'[data-ui=skill-close]');await expect(page.locator('#turn-order')).toBeVisible();
 }
 await page.locator('[data-ui=skill-close]').tap();await page.addStyleTag({content:'#app {padding-top:20px;padding-bottom:34px;}'});await reachable(page,'#action-mark');await reachable(page,'#target-brute');
 await page.locator('#target-brute').click();await finish(page);await owner(page,'weaver');expect(await page.evaluate(()=>scrollY)).toBe(0);await page.screenshot({path:info.outputPath('rotated-safe-area.png')});expect(issues).toEqual([]);await context.close();
});
test('a fallen upcoming hero is skipped on commit, reload and continued input',async({page})=>{
 let s=createBattle(veilSiege);while(s.outcome==='active'&&s.heroes.every(h=>h.hp>0)){const t=s.enemies.find(e=>e.id==='brute'&&e.hp>0)??s.enemies.find(e=>e.hp>0)!;s=resolveCommand(s,veilSiege,{beat:s.beat,heroId:currentHeroId(s,veilSiege)!,action:'attack',targetId:t.id}).state;}
 expect(s.outcome).toBe('active');await seed(page,veilSiege,s.commands.map(c=>[c.heroId,c.action,c.targetId] as Move));const issues=await start(page),id=currentHeroId(s,veilSiege)!;
 await owner(page,id);for(const h of s.heroes.filter(h=>h.hp===0)){await expect(page.locator('#hero-'+h.id)).toContainText('ล้มแล้ว');await expect(page.locator(`.turn-slot[data-actor=${h.id}]`)).toHaveCount(0);}
 await page.reload();await owner(page,id);await cast(page,id,'attack',s.enemies.find(e=>e.hp>0)!.id);await finish(page);const final=await savedState(page);if(final.outcome==='active')await owner(page,currentHeroId(final,veilSiege)!);expect(issues).toEqual([]);
});
test('three independent saves restore queue, round and HP; restarting only affects selection',async({page},info)=>{
 const issues=await start(page);await cast(page,'tracer','mark','brute');await finish(page);
 await pick(page,'rear-ambush');await cast(page,'tracer','mark','brute');await finish(page);
 await pick(page,'rift-warden');await cast(page,'tracer','execute','brute');await page.reload();await owner(page,'weaver');
 await expect(page.locator('[data-enemy=brute]')).toContainText('322 / 350');await expect(page.locator('#target-raider')).toHaveCount(0);
 await page.locator('#battle-select').click();await expect(page.locator('#encounter-rear-ambush')).toContainText('เล่นต่อ · รอบ 1');await page.keyboard.press('Escape');await expect(page.locator('#battle-select')).toBeFocused();
 await pick(page,'veil-siege');await owner(page,'weaver');await page.locator('#restart').click();await owner(page,'tracer');
 await pick(page,'rear-ambush');await owner(page,'weaver');await expect(page.locator('#hero-healer')).toContainText('22 / 46');
 expect([await count(page),await count(page,'rear-ambush'),await count(page,'rift-warden')]).toEqual([0,1,1]);await page.screenshot({path:info.outputPath('resumed-speed-turn.png')});expect(issues).toEqual([]);
});
test('narrow picker blocks background casting and retains in-tab progress when storage is denied',async({browser},info)=>{
 const context=await browser.newContext({viewport:{width:320,height:568},hasTouch:true,reducedMotion:'reduce'});await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get:()=>{throw new Error('Denied');}}));
 const page=await context.newPage(),issues=await start(page);await page.locator('#battle-select').click();for(const {data}of battles)await reachable(page,'#encounter-'+data.id);
 await page.screenshot({path:info.outputPath('encounter-picker.png')});await page.locator('#target-brute').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));await page.keyboard.press('Escape');await owner(page,'tracer');
 await pick(page,'rear-ambush');await cast(page,'tracer','mark','brute');await finish(page);await pick(page,'rift-warden');await cast(page,'tracer','mark','brute');await finish(page);
 await pick(page,'rear-ambush');await owner(page,'weaver');await expect(page.locator('#hero-healer')).toContainText('22 / 46');await expect(page.locator('#save-status')).toContainText('บันทึกบนเครื่องนี้ไม่ได้');expect(issues).toEqual([]);await context.close();
});
for(const invalid of ['old-version','foreign-owner','malformed','invalid-selection']){
 test(`save ${invalid}: safe recovery to SPD rules and Duelist owner`,async({page})=>{
  if(invalid==='old-version')await seed(page,veilSiege,guided.slice(0,1),veilSiege.version-1);
  else await page.addInitScript(({mode,version})=>{
   if(mode==='invalid-selection')localStorage.setItem('asterveil.fateweave.encounter.v1','unregistered');
   else localStorage.setItem('asterveil.fateweave.battle.v1',mode==='malformed'?'{bad':JSON.stringify({version:1,encounterId:'veil-siege',contentVersion:version,commands:[{beat:1,heroId:'guardian',action:'attack',targetId:'brute'}]}));
  },{mode:invalid,version:veilSiege.version});
  const issues=await start(page);await owner(page,'tracer');await expect(page.locator('#hero-tracer')).toContainText('56 / 56');await cast(page,'tracer','mark','brute');await finish(page);await owner(page,'weaver');expect(await count(page)).toBe(1);expect(issues).toEqual([]);
 });
}
test('opening advice uses SPD owners, respects dismissal and never commits through teaching controls',async({page},info)=>{
 const issues=await start(page);await expect(page.locator('#coach-copy')).toContainText('ไลรา');await expect(page.locator('#coach-copy')).toContainText('ติดตรา');
 await page.locator('#coach-dismiss').click();expect(await count(page)).toBe(0);await page.reload();await page.locator('#start').click();await expect(page.locator('#battle-coach')).not.toBeVisible();
 await page.locator('#battle-info').click();await page.locator('#coach-toggle').click();await expect(page.locator('#coach-toggle')).toBeFocused();await page.locator('[data-ui=info-close]').click();
 for(const [i,[h,a,t]]of guided.slice(0,3).entries()){await cast(page,h,a,t);await finish(page);if(i===0)await expect(page.locator('#coach-copy')).toContainText('ไอรา');if(i===1)await expect(page.locator('#coach-copy')).toContainText('เอกิส');}
 await expect(page.locator('#battle-coach')).not.toBeVisible();await owner(page,'healer');await page.screenshot({path:info.outputPath('completed-coaching.png')});expect(issues).toEqual([]);
});
test('round cooldown can be inspected but never cast; the intervening actors do not refresh it',async({page})=>{
 const moves:readonly Move[]=[['tracer','execute','brute'],['weaver','ward','weaver'],['guardian','guard','weaver'],['healer','heal','guardian']];
 await seed(page,veilSiege,moves);const issues=await start(page);await owner(page,'tracer');await expect(page.locator('#beat-status')).toContainText('รอบ 2');
 await page.locator('#action-execute').click();await expect(page.locator('#skill-availability')).toContainText('พร้อมใน 1 รอบ');await page.locator('[data-ui=skill-close]').click();await expect(page.locator('#target-brute')).toBeDisabled();
 await page.locator('#target-brute').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));expect(await count(page)).toBe(4);
 await cast(page,'tracer','attack','brute');await finish(page);await owner(page,'weaver');expect(issues).toEqual([]);
});
test('final victory waits for its actual actor stage and has no dead-enemy retaliation',async({page},info)=>{
 await seed(page,veilSiege,offensive.slice(0,-1));await page.clock.install({time:new Date('2026-10-14T00:00:00Z')});const issues=await start(page);await page.clock.pauseAt(new Date('2026-10-14T01:00:00Z'));
 const [h,a,t]=offensive.at(-1)!;await cast(page,h,a,t);await expect(page.locator('.result-card')).toHaveCount(0);await expect(page.locator('#battle-select')).toBeDisabled();expect(await count(page)).toBe(offensive.length);
 await page.clock.runFor(1000);await expect(page.locator('.result-card')).toContainText('ยืนอยู่ 4 / 4 คน');await expect(page.locator('.result-card')).toContainText('เลือดทีม 162');
 await reachable(page,'.result-card button');await page.screenshot({path:info.outputPath('final-speed-turn.png')});expect(issues).toEqual([]);
});
test('visible queue follows actual SPD actors across a round and explains speeds',async({page},info)=>{
 const issues=await start(page);expect(await page.locator('.turn-slot').evaluateAll(es=>es.map(e=>(e as HTMLElement).dataset.actor))).toEqual(['tracer','raider','weaver','guardian','brute','healer']);
 await prefix(page,3);await cast(page,'healer','heal','guardian');await finish(page);await expect(page.locator('#beat-status')).toContainText('รอบ 2');await owner(page,'tracer');
 await expect(page.locator('.turn-slot').first()).toHaveAttribute('data-actor','tracer');await expect(page.locator('.turn-slot').first()).toHaveAttribute('aria-current','step');
 await page.locator('#battle-info').click();await expect(page.locator('#rules')).toContainText('SPD 120');await expect(page.locator('#rules')).toContainText('คนละ 1 ครั้งต่อรอบ');await page.keyboard.press('Escape');
 await page.screenshot({path:info.outputPath('speed-round-queue.png')});expect(issues).toEqual([]);
});

test('defeating a queued enemy removes its turn immediately and never damages the team',async({page},info)=>{
 await seed(page,veilSiege,[['tracer','execute','raider'],['weaver','bolt','raider'],['guardian','bash','raider'],['healer','attack','brute']]);const issues=await start(page);await owner(page,'tracer');
 const before=await savedState(page);await cast(page,'tracer','attack','raider');await finish(page);await owner(page,'weaver');
 await expect(page.locator('.turn-slot[data-actor=raider]')).toHaveCount(0);await expect(page.locator('[data-enemy=raider]')).toContainText('0 / 78');
 expect((await savedState(page)).heroes.map(h=>h.hp)).toEqual(before.heroes.map(h=>h.hp));await page.screenshot({path:info.outputPath('defeated-enemy-queue.png')});expect(issues).toEqual([]);
});
