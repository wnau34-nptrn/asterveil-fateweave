// Phase 0 evidence tooling only. Runs the existing game with synthetic isolated saves.
// Usage: node scripts/combat-presentation-baseline.mjs --output <absolute external directory> [--capture] [--url <production URL>] [--stage-frames]
/* global localStorage, sessionStorage */
import process from 'node:process';
import console from 'node:console';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputArg = process.argv.indexOf('--output');
assert(outputArg >= 0 && process.argv[outputArg + 1], '--output <absolute directory> is required');
const output = process.argv[outputArg + 1];
const urlArg = process.argv.indexOf('--url');
const captureUrl = urlArg >= 0 ? process.argv[urlArg + 1] : 'http://127.0.0.1:5187/';
assert(captureUrl && /^https?:\/\//.test(captureUrl), '--url must be an http(s) URL');
assert(path.isAbsolute(output), 'Output must be absolute');
const relative = path.relative(root, output);
assert(relative.startsWith('..') || path.isAbsolute(relative), 'Evidence must be outside the repository');
await fs.mkdir(output, { recursive: true });
const write = async (name, data) => fs.writeFile(path.join(output, name), JSON.stringify(data, null, 2) + '\n');
const source = await fs.readFile(path.join(root, 'src/core/battle/types.ts'), 'utf8');
const ast = ts.createSourceFile('types.ts', source, ts.ScriptTarget.Latest, true);
const literals = node => ts.isUnionTypeNode(node) ? node.types.flatMap(literals) : ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal) ? [node.literal.text] : [];
const actionIds = literals(ast.statements.find(n => ts.isTypeAliasDeclaration(n) && n.name.text === 'ActionId').type);
const eventIds = literals(ast.statements.find(n => ts.isInterfaceDeclaration(n) && n.name.text === 'BattleEvent').members.find(n => n.name?.getText(ast) === 'type').type);
const profiles = {
  attack: ['physical-by-actor', 'weapon-contact', 600], guard: ['support', 'guard-link', 500], bash: ['physical', 'shield-bash', 800],
  mark: ['support', 'mark-seal', 500], execute: ['physical', 'precision-slash', 850], bolt: ['energy', 'arcane-projectile', 850],
  ward: ['support', 'hex-barrier', 650], heal: ['support', 'mint-heal', 650], prayer: ['support', 'party-heal', 700],
  brace: ['support', 'spear-stance', 500], pierce: ['physical', 'spear-thrust', 800], hinder: ['physical', 'arrow-delay', 750],
  volley: ['physical', 'arrow-volley', 900], acid: ['energy', 'acid-flask', 800], haste: ['support', 'haste-tonic', 550],
  ambush: ['physical', 'shadow-strike', 750], evade: ['support', 'shadow-step', 500], taunt: ['support', 'challenge-rune', 550],
  slam: ['physical', 'hammer-slam', 850], valor: ['support', 'valor-notes', 600], mend: ['support', 'mending-notes', 600],
  rally: ['support', 'party-guard', 700], finisher: ['physical', 'finishing-lunge', 950], sigil: ['energy', 'sigil-bind', 850],
  sanctuary: ['support', 'sanctuary-seal', 750], spearwall: ['support', 'spear-wall', 700], weakshot: ['energy', 'weakpoint-arrow', 850],
  bomb: ['energy', 'blast-flask', 900], backstab: ['physical', 'backstab-shadow', 900], quake: ['energy', 'earthshaker', 1000],
  finale: ['physical', 'finale-wave', 950],
};
assert.deepEqual(Object.keys(profiles).sort(), [...actionIds].sort(), 'Every ActionId requires an explicit proposed profile');
const eventVisual = {
  damage: 'contact-number-hp', guard: 'guard-link', mark: 'mark-seal', barrier: 'barrier-gain', heal: 'hp-restoration',
  interrupt: 'intent-break', cancel: 'canceled-action', down: 'fall-or-dissolve', outcome: 'result-transition',
  brace: 'spear-stance', counter: 'return-strike', delay: 'queue-delay', corrode: 'acid-status', haste: 'haste-status',
  evade: 'evasion-ready', dodge: 'miss-afterimage', taunt: 'challenge-link', song: 'song-state', rally: 'party-guard',
  sigil: 'sigil-status', sanctuary: 'survival-seal', stand: 'last-stand', finale: 'song-finale',
};
assert.deepEqual(Object.keys(eventVisual).sort(), [...eventIds].sort(), 'Every BattleEvent type requires a fallback');
const server = await createServer({ root, server: { host: '127.0.0.1', port: 5187, strictPort: true }, clearScreen: false });
let browser;
let captureState;
try {
  await server.listen();
  const load = p => server.ssrLoadModule('/' + p);
  const { stageTiming } = await load('src/ui/battle-playback.ts');
  const catalog = await load('src/content/encounters/catalog.ts');
  const { veilSiege } = await load('src/content/encounters/veil-siege.ts');
  const { heroes } = await load('src/content/heroes/team.ts');
  const { mercenaries } = await load('src/content/heroes/mercenaries.ts');
  const { chapterOne: map } = await load('src/content/world/chapter1.ts');
  const engine = await load('src/core/battle/engine.ts');
  const world = await load('src/core/world/world.ts');
  const { newProfile, depart } = await load('src/core/world/profile.ts');
  const { skillDescription, heroText } = await load('src/ui/th.ts');
  const { guided, offensive } = await load('tests/fixtures/party-routes.ts');
  const { battleLesson } = await load('src/ui/tutorial.ts');
  const { gearFor } = await load('tests/sim/class-sim.ts');
  const allHeroes = [...heroes, ...mercenaries];
  const actions = actionIds.map(id => {
    const owners = allHeroes.filter(h => h.actions.includes(id) || h.unlocks?.skill === id);
    assert(owners.length, `No owner for ${id}`);
    const [visualKind, family, durationMs] = profiles[id];
    const owner = owners[0];
    return { id, name: veilSiege.skills[id].name, owners: owners.map(h => ({ id: h.id, role: h.role, name: heroText[h.id]?.name ?? h.name, unlock: h.unlocks?.skill === id ? 'star3' : 'base' })),
      targetKind: engine.targetKind(id), proposed: { visualKind, family, durationMs, assetState: 'not-produced', fallback: visualKind === 'support' ? 'recipient-icon-and-authoritative-event-text' : 'source-to-actual-target-line-and-contact',
        soundCue: visualKind === 'support' ? 'apply' : 'prepare/travel/contact', secondaryPolicy: 'only-actual-ordered-events; no invented hits, crits or bonus values' },
      currentDescription: skillDescription(id, owner.id, { ...veilSiege, heroes: allHeroes }),
    };
  });
  const intentsByKey = new Map();
  for (const encounter of catalog.encounters) for (const intent of encounter.intents) {
    const key = `${intent.kind}:${intent.name}`;
    if (!intentsByKey.has(key)) intentsByKey.set(key, { id: key, name: intent.name, kind: intent.kind, occurrences: [],
      proposed: { family: intent.name === 'Crushing Blow' ? 'enemy-heavy-contact' : intent.kind === 'energy' ? 'enemy-energy-projectile' : 'enemy-weapon-contact', durationMs: 800,
        assetState: 'not-produced', soundCue: 'prepare/travel/contact', fallback: 'source-to-resolved-target; respect-guard-dodge-barrier-cancel', secondaryPolicy: 'no-AoE-without-actual-target-events' } });
    intentsByKey.get(key).occurrences.push({ encounterId: encounter.id, sourceId: intent.sourceId, targetSlot: intent.targetSlot, damage: intent.damage });
  }
  const intents = [...intentsByKey.values()];
  for (const intent of intents) {
    intent.proposed.overrides = intent.occurrences.some(o => o.encounterId === 'rift-warden') ? [{ encounterId: 'rift-warden', durationMs: 1200,
      family: intent.name === 'Crushing Blow' ? 'warden-heavy-slam' : intent.kind === 'energy' ? 'warden-rift-bolt' : 'warden-raking-slash' }] : [];
  }
  const events = eventIds.map(id => ({ id, proposedFamily: eventVisual[id],
    cue: id === 'damage' ? 'contact' : id === 'outcome' ? 'after-final-reaction' : 'at-authoritative-event-order',
    fallback: 'actual-target-icon-and-event-text; exact-values-only', assetState: 'not-produced', provenance: 'event type alone does not prove gear/passive origin' }));
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const fingerprints = {};
  for (const file of ['src/core/battle/types.ts', 'src/core/battle/engine.ts', 'src/ui/battle-ui.ts', 'src/game/scenes/BattleScene.ts', 'src/ui/game-shell.ts', 'src/platform/sfx.ts'])
    fingerprints[file] = createHash('sha256').update(await fs.readFile(path.join(root, file))).digest('hex');
  const metadata = { createdUtc: new Date().toISOString(), head: git(['rev-parse', 'HEAD']), branch: git(['branch', '--show-current']),
    counts: { heroes: allHeroes.length, actions: actions.length, intents: intents.length, events: events.length }, sourceSha256: fingerprints,
    limitations: ['synthetic QA saves only', 'clock-controlled screenshots are not frame-time measurements', 'video captures visual output, not audible SFX', 'no physical mobile/Safari verification'] };
  await write('coverage.json', { metadata, actions, intents, events });
  const tableCell = text => String(text).replaceAll('|', '/').replaceAll('\n', ' ');
  const table = (heads, rows) => [heads, heads.map(() => '---'), ...rows].map(row => '| ' + row.map(tableCell).join(' | ') + ' |').join('\n');
  await fs.writeFile(path.join(output, 'COVERAGE_TH.md'), [
    '# ตารางครอบคลุมสกิลและเอฟเฟกต์ — เฟส 0', '',
    `ต้นทาง ${metadata.head}; 10 อาชีพ / ${actions.length} actions / ${intents.length} intent variants (kind+name) / ${events.length} event types.`, '',
    'ข้อมูลชื่อ/เจ้าของ/target มาจาก content และ resolver จริง ส่วน family/เวลา/เสียง/fallback เป็นข้อเสนอ ยังไม่พัฒนา visualKind เป็นภาษาภาพ ไม่ใช่การเพิ่มประเภท damage ในกติกา', '',
    '## แอ็กชันทั้งหมด', '',
    table(['ID / ชื่อ', 'อาชีพ / ปลดล็อก', 'เป้าหมายจริง', 'family ที่เสนอ', 'เวลา ms'], actions.map(a => [a.id + ' / ' + a.name, a.owners.map(o => o.role + ':' + o.unlock).join(', '), a.targetKind, a.proposed.family, a.proposed.durationMs])), '',
    'Fallback ทุกแถว: support ใช้ไอคอนผู้รับและข้อความเหตุการณ์; damage ใช้เส้นจากผู้กระทำถึงเป้าจริงพร้อมจุดปะทะ ตัวเลขและผลรองต้องมาจาก events ทุก asset ยัง not-produced รายละเอียด cue และเงื่อนไขอยู่ใน coverage.json และสเปกเฟส 0', '',
    '## ท่าศัตรูทั้งหมด', '',
    table(['ชื่อ', 'kind จริง', 'ใช้ใน encounter', 'family / เวลาเสนอ', 'บอส override'], intents.map(i => [i.name, i.kind, [...new Set(i.occurrences.map(o => o.encounterId))].join(', '), i.proposed.family + ' / ' + i.proposed.durationMs, i.proposed.overrides.map(o => o.encounterId + ': ' + o.family + ' / ' + o.durationMs).join(', ') || 'ไม่มี'])), '',
    'Fallback ทุกแถว: เชื่อมต้นทางถึง resolved target และอ่าน Guard/Dodge/Barrier/Cancel จริง ไม่สร้าง AoE จากชื่อท่า; cue prepare/travel/contact, ผลรองตาม events และ asset ทุกแถวยัง not-produced', '',
    '## เหตุการณ์ทั้งหมด', '',
    table(['Event', 'family ที่เสนอ', 'cue', 'fallback'], events.map(e => [e.id, e.proposedFamily, e.cue, e.fallback])), '',
    'ชนิด event อย่างเดียวไม่ระบุว่าเป็นพลัง boss/set/passive ใด ห้ามเดา provenance จากข้อความ log รายการ passive/talent/gear ใช้เป็นเงื่อนไขเพิ่ม feedback เมื่อพิสูจน์แหล่งได้ ไม่เพิ่ม event หรือกติกาปลอม', '',
    '## คำอธิบายสกิลจากระบบจริง', '',
    ...actions.flatMap(a => [`### ${a.id} — ${a.name}`, '', a.currentDescription, '']),
  ].join('\n').trimEnd() + '\n');
  const makeGame = (id = 'veil-siege', roster, wounded = {}) => {
    const p = newProfile(map, 17); p.commander = { name: 'ทดสอบภาพ', crest: 'star', color: 'gold' }; p.tutorialDone = true;
    if (roster) { p.party.deployed = roster; for (const h of roster) if (!p.members[h]) { p.company.push(h); p.members[h] = { stars: 1, dupes: 0 }; } }
    const game = depart(p, map, catalog.encounterById, 1234);
    Object.assign(game.run.hp, wounded);
    game.run.battle = { kind: id === 'rift-warden' ? 'boss' : 'random', encounterId: id, entry: { ...game.run.hp }, commands: [] };
    return game;
  };
  const fixture = (id, game, prefix, move) => {
    const data = world.battleData(game.run, map, catalog.encounterById);
    let before = world.battleState(game.run, map, catalog.encounterById);
    for (const [heroId, action, targetId] of prefix) before = engine.resolveCommand(before, data, { beat: before.beat, heroId, action, targetId }).state;
    game.run.battle.commands = before.commands;
    const [heroId, action, targetId] = move;
    const command = { beat: before.beat, heroId, action, targetId };
    const expected = engine.resolveCommand(before, data, command);
    assert.equal(expected.state.commands.length, before.commands.length + 1, id);
    return { id, game, move, data, before, command, expected };
  };
  const cases = [
    fixture('attack', makeGame(), [], ['tracer', 'attack', 'brute']),
    fixture('mark', makeGame(), [], ['tracer', 'mark', 'brute']),
    fixture('marked-execute', makeGame(), guided.slice(0, 4), ['tracer', 'execute', 'brute']),
    fixture('bolt', makeGame(), offensive.slice(0, 1), ['weaver', 'bolt', 'brute']),
    fixture('ward', makeGame(), guided.slice(0, 1), ['weaver', 'ward', 'weaver']),
    fixture('guard', makeGame(), guided.slice(0, 2), ['guardian', 'guard', 'weaver']),
    fixture('heal', makeGame(), guided.slice(0, 3), ['healer', 'heal', 'guardian']),
    fixture('counter', makeGame('rift-warden', ['guardian', 'tracer', 'garran', 'healer']), [['tracer', 'mark', 'brute'], ['garran', 'brace', 'garran']], ['guardian', 'attack', 'brute']),
  ];
  const bossProfile = newProfile(map, 17); bossProfile.commander = { name: 'ทดสอบบอส', crest: 'star', color: 'gold' }; bossProfile.tutorialDone = true;
  let uid = 1;
  for (const id of bossProfile.company) {
    const gear = gearFor(id, 'main', 11);
    for (const item of Object.values(gear)) if (item) { item.uid = uid++; item.plus = 20; }
    bossProfile.members[id] = { stars: 5, dupes: 0, level: 10, exp: 0, gear };
  }
  bossProfile.nextItem = uid;
  const bossGame = depart(bossProfile, map, catalog.encounterById, 1234);
  bossGame.run.battle = { kind: 'boss', encounterId: map.bossEncounterId, level: 11, entry: { ...bossGame.run.hp }, commands: [] };
  const bossData = world.battleData(bossGame.run, map, catalog.encounterById);
  let bossState = world.battleState(bossGame.run, map, catalog.encounterById);
  for (let n = 0; bossState.outcome === 'active' && n < 200; n++) {
    const lesson = battleLesson(bossState, bossData); assert(lesson, 'Advisor must supply a legal boss move');
    bossState = engine.resolveCommand(bossState, bossData, { beat: bossState.beat, heroId: lesson.heroId, action: lesson.action, targetId: lesson.targetId }).state;
  }
  assert.equal(bossState.outcome, 'victory');
  const last = bossState.commands.at(-1);
  cases.push(fixture('boss-victory', bossGame, bossState.commands.slice(0, -1).map(c => [c.heroId, c.action, c.targetId]), [last.heroId, last.action, last.targetId]));
  assert(cases.find(c => c.id === 'counter').expected.events.some(e => e.type === 'counter'), 'Counter baseline must actually counter');
  assert(cases.find(c => c.id === 'heal').expected.events.some(e => e.type === 'heal' && e.amount > 0), 'Heal must restore real HP');
  for (const c of cases) await write(`fixture-${c.id}.json`, { version: 27, ...c.game });
  await write('resolver-traces.json', cases.map(({ id, data, before, command, expected }) => ({ id, encounter: data.id, data, before, command, expected })));
  console.log(JSON.stringify({ stage: 'catalog-and-fixtures', ...metadata.counts, scenarios: cases.length }));
  if (!process.argv.includes('--capture')) process.exitCode = 0;
  else {
    captureState = { metadata, runs: [], status: 'running', limitations: metadata.limitations };
    await write('capture-report.json', captureState);
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
      args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const runs = captureState.runs;
    const key = 'asterveil.fateweave.expedition.v1';
    for (const [width, height, touch] of [[390, 844, true], [1366, 768, false], [320, 568, true]]) {
      const selected = width === 320 ? cases.filter(c => ['attack', 'guard', 'boss-victory'].includes(c.id)) : cases;
      for (const c of selected) {
        const dir = path.join(output, `${width}x${height}`, c.id); await fs.mkdir(dir, { recursive: true });
        const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch,
          reducedMotion: 'no-preference', recordVideo: { dir, size: { width: Math.min(width, 1366), height } } });
        const page = await context.newPage(); const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        await page.clock.install({ time: new Date('2026-10-21T00:00:00Z') });
        await page.addInitScript(({ key, raw }) => {
          if (sessionStorage.getItem('phase0-seeded')) return;
          localStorage.setItem(key, raw); localStorage.setItem('asterveil.fateweave.tutorial.v1', 'off');
          sessionStorage.setItem('phase0-seeded', 'yes');
        }, { key, raw: JSON.stringify({ version: 27, ...c.game }) });
        try {
          await page.goto(captureUrl);
          await page.locator('#continue').click();
          await page.locator('#game canvas').waitFor({ state: 'visible' });
          if (await page.locator('#start').isVisible()) await page.locator('#start').click();
          await page.locator(`#action-${c.move[1]}`).waitFor({ state: 'visible' });
          assert(await page.locator(`#action-${c.move[1]}`).isEnabled(), `${c.id}: action not ready`);
          await page.locator(`#action-${c.move[1]}`).click();
          await page.clock.pauseAt(new Date('2026-10-21T01:00:00Z'));
          await page.screenshot({ path: path.join(dir, 'before.png') });
          await page.locator(`#target-${c.move[2]}`).click();
          const frames = [];
          const times = new Set([0, 140, 250, 1000, 2000]);
          if (process.argv.includes('--stage-frames')) {
            let offset = 0;
            for (const turn of c.expected.turns) {
              const timing = stageTiming(turn, false);
              times.add(offset + Math.max(0, timing.contact - 32));
              times.add(offset + timing.contact + 32); offset += timing.end;
            }
          }
          for (const t of [...times].sort((a,b) => a-b)) {
            const previous = frames.at(-1)?.ms ?? 0;
            if (t > previous) await page.clock.runFor(t - previous);
            const name = `t-${String(t).padStart(4, '0')}.png`;
            await page.screenshot({ path: path.join(dir, name) });
            frames.push({ ms: t, screenshot: name, phase: await page.locator('#turn-phase').getAttribute('data-phase'),
              actor: await page.locator('#turn-phase').getAttribute('data-actor'),
              hp: await page.locator('#field-statuses').innerText(), lastRequestedSfx: await page.locator('html').getAttribute('data-sfx') });
          }
          const saved = JSON.parse(await page.evaluate(key => localStorage.getItem(key), key));
          await fs.writeFile(path.join(dir, 'observed-save.json'), JSON.stringify(saved, null, 2) + '\n');
          let loot;
          if (c.id === 'boss-victory') {
            assert.equal(saved.run.battle, null, 'Completed boss battle must settle');
            assert.equal(saved.run.bossDefeated, true);
            assert.equal(saved.run.found.filter(i => !i.boss).length, 3);
            assert.equal(saved.run.found.filter(i => i.boss).length, 1);
            assert.equal(saved.run.bossLoot.rewarded, true);
            await page.locator('#leave-battle').waitFor({ state: 'visible' });
            const stable = await page.evaluate(key => localStorage.getItem(key), key);
            await page.reload(); await page.locator('#continue').click();
            assert.equal(await page.evaluate(key => localStorage.getItem(key), key), stable, 'Reload must not duplicate boss rewards');
            loot = { ordinary: 3, boss: 1, outcome: 'victory', reloadUnchanged: true };
          } else {
            assert.equal(saved.run.battle.commands.length, c.expected.state.commands.length, `${c.id}: commit count`);
            assert.deepEqual(world.battleState(saved.run, map, catalog.encounterById), c.expected.state, `${c.id}: authoritative state`);
          }
          assert.deepEqual(errors, [], `${c.id}: browser errors`);
          const entry = { id: c.id, width, height, touch, frames, errors, video: path.basename(await page.video().path()),
            commandCount: c.expected.state.commands.length, outcome: c.expected.state.outcome, loot,
            stateCheck: c.id === 'boss-victory' ? 'settled-world-result-and-stable-reload' : 'deep-equality-with-authoritative-replay' };
          await fs.writeFile(path.join(dir, 'observations.json'), JSON.stringify(entry, null, 2) + '\n');
          runs.push(entry); console.log(JSON.stringify({ stage: 'capture', id: c.id, width, height, outcome: c.expected.state.outcome }));
        } finally { await context.close(); }
      }
    }
    await write('capture-report.json', { ...captureState, status: 'passed' });
  }
} catch (error) {
  if (captureState) await write('capture-report.json', { ...captureState, status: 'failed', error: error.message });
  throw error;
} finally { await browser?.close(); await server.close(); }
