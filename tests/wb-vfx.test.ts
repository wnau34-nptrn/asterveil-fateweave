import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { WORLD_BOSS_TRIO } from '../src/content/encounters/catalog';
import { anchorPoint, bossCues, bossMoves, chargeHolds, holdPlacement, usesBossSignature } from '../src/game/visuals/boss-signature-fx';
import art from '../src/game/visuals/boss-signature-art.json';
import { wbVfxFixture, wbVfxMoves, type WbVfxMove } from './fixtures/wb-vfx';

// ART-VFX-WB-TRIO-001 (P11-05 step 5): the World Boss trio's painted moves. Every cue is read from real resolver turns.
const atlas = JSON.parse(readFileSync('public/assets/fx/boss_signature_fx.json', 'utf8'));
const layers = JSON.parse(readFileSync('incoming/ART-VFX-WB-TRIO-001/layers.json', 'utf8')).layers as { file: string; move: string; beat: string; anchor: string; pivot_px: number[]; suggested_canvas_width_390: number; route: string; sha256: string }[];
const intake = JSON.parse(readFileSync('incoming/ART-VFX-WB-TRIO-001/intake-report.json', 'utf8'));
const revision = JSON.parse(readFileSync('docs/validation/wb-vfx-revision/intake-report.json', 'utf8'));
const moves = Object.keys(wbVfxMoves) as WbVfxMove[];
const slug = (m: string) => m.toLowerCase().replace(/ /g, '-');
const routeOf: Record<string, string> = { charge: 'charge', single: 'single', all: 'all', caster: 'caster', summon: 'summon' };

describe('World Boss trio VFX: names, routes and art', () => {
  it('routes all 13 real trio moves exactly as the brief and the catalog say, and nothing for the body-only moves', () => {
    const names = new Set(WORLD_BOSS_TRIO.flatMap(e => [...e.intents.map(i => i.name), ...(e.phases ?? []).map(p => p.name)]));
    for (const m of moves) {
      expect(names.has(m), m).toBe(true);
      const layer = layers.find(l => l.file === `layers/${slug(m)}-peak.png`)!;
      expect(bossMoves[m], m).toBe(routeOf[layer.route]);
    }
    for (const m of ['Stone Fist', 'Boulder Hurl', 'Shard Talon', 'Six-Hand Rend']) expect(Object.hasOwn(bossMoves, m), m).toBe(false);
    for (const d of WORLD_BOSS_TRIO) expect(usesBossSignature(d), d.id).toBe(true);
  });
  it('ships R1 with the seven clarity replacements, retaining every original pivot, width and anchor; R2 stays out', () => {
    for (const l of layers.filter(x => x.file.startsWith('layers/'))) {
      const name = `${l.move}_${l.beat}` as keyof typeof art;
      expect(atlas.frames[name], name).toBeDefined();
      expect(atlas.frames[name].sourceSize).toEqual({ w: 256, h: 256 });
      expect(art[name]).toMatchObject({ anchor: l.anchor, pivot: l.pivot_px, width: l.suggested_canvas_width_390 });
      expect(intake.layers[name]).toBe(l.sha256);
      expect(createHash('sha256').update(readFileSync(`incoming/ART-VFX-WB-TRIO-001/${l.file}`)).digest('hex')).toBe(l.sha256);
      const replacement = revision.replaced[name];
      if (replacement) {
        expect(replacement.originalSha256).toBe(l.sha256);
        expect(createHash('sha256').update(readFileSync(replacement.file)).digest('hex')).toBe(replacement.sha256);
      }
    }
    expect(Object.keys(atlas.frames)).toHaveLength(81);
    expect(revision.baselineAtlasSha256).toBe(intake.atlasSha256);
    expect(revision.atlasSha256).toBe(createHash('sha256').update(readFileSync('public/assets/fx/boss_signature_fx.webp')).digest('hex'));
    expect(revision.layoutSha256).toBe(createHash('sha256').update(readFileSync('public/assets/fx/boss_signature_fx.json')).digest('hex'));
    expect(revision.runtimeArtSha256).toBe(createHash('sha256').update(readFileSync('src/game/visuals/boss-signature-art.json')).digest('hex'));
    const { w, h } = atlas.meta.size; expect(Math.max(w, h)).toBeLessThanOrEqual(2048);
  });
  it('limits changed artwork to Bolt/Tide three beats and Wing prepare; all other 74 frame canvases stay unchanged', () => {
    const allowed = ['severing-bolt', 'shadow-tide'].flatMap(m => ['prepare', 'peak', 'settle'].map(b => `${m}_${b}`));
    allowed.push('wing-gathering_prepare');
    expect(Object.keys(revision.replaced).sort()).toEqual(allowed.sort());
    const changed = Object.keys(atlas.frames).filter(name => revision.frameRgbaBefore[name] !== revision.frameRgbaAfter[name]);
    expect(changed.sort()).toEqual(allowed.sort());
    expect(revision.unchangedFrames).toBe(74);
    expect(revision.size).toEqual([atlas.meta.size.w, atlas.meta.size.h]);
  });
});

describe('World Boss trio VFX: cues follow the real turn', () => {
  for (const m of moves) it(`${m}: cue only where the resolver acted`, () => {
    const f = wbVfxFixture(m), turn = f.turn, cues = bossCues(turn), route = bossMoves[m];
    expect(turn.intent!.name).toBe(m);
    if (route === 'charge' || route === 'caster') {
      expect(cues.map(c => [c.at, c.id])).toEqual([['caster', 'f1']]);
      expect(turn.events.some(e => e.type === 'damage')).toBe(false);
    } else if (route === 'summon') {
      // Call the Court is an ordinary intent (no phase event): a cue only for the foe really brought back (f2, felled by
      // Guardian this round), none for f3 and b2, which still stand.
      expect(turn.events.some(e => e.type === 'phase')).toBe(false);
      expect(f.result.turns[0]!.events.some(e => e.type === 'down' && e.targetId === 'f2')).toBe(true);
      expect(cues.map(c => [c.at, c.id])).toEqual([['summoned', 'f2']]);
    } else {
      const struck = turn.events.filter(e => e.sourceId === 'f1' && (e.type === 'damage' || e.type === 'dodge')).map(e => e.targetId);
      expect(cues.map(c => c.id)).toEqual(struck);
      expect(struck.length).toBe(route === 'all' ? 5 : 1);
    }
  });
  it('Call the Court with no fallen court member paints nothing', () => {
    const f = wbVfxFixture('Call the Court'), turn = structuredClone(f.turn);
    turn.events = turn.events.filter(e => e.type !== 'summon');
    expect(bossCues(turn)).toEqual([]);
  });
});

describe('World Boss trio VFX: waiting holds', () => {
  it('Titan Gathering holds the rigid Mountain Fall warning; Wing Gathering holds its own breakable shell', () => {
    expect(chargeHolds(wbVfxFixture('Titan Gathering').result.state, wbVfxFixture('Titan Gathering').data))
      .toEqual([{ enemyId: 'f1', charge: 'Titan Gathering', release: 'Mountain Fall', kind: 'unstoppable', frame: 'mountain-fall_prepare' }]);
    const w = wbVfxFixture('Wing Gathering');
    // The dive that follows is not unstoppable; the charge itself is breakable (R1), so the hold says so.
    expect(chargeHolds(w.result.state, w.data)).toEqual([{ enemyId: 'f1', charge: 'Wing Gathering', release: 'Worldshard Dive', kind: 'breakable', frame: 'wing-gathering_prepare' }]);
  });
  it('a broken Wing Gathering clears the hold at once (the next move is the generated stagger) and paints no cue', () => {
    const f = wbVfxFixture('Wing Gathering', 'break');
    expect(f.turn.events.some(e => e.type === 'cancel')).toBe(true);
    expect(bossCues(f.turn)).toEqual([]);
    expect(chargeHolds(f.result.state, f.data)).toEqual([]);
  });
  it('the release clears the hold', () => {
    for (const m of ['Titan Gathering', 'Wing Gathering'] as const) {
      const f = wbVfxFixture(m, 'release');
      expect(chargeHolds(f.state, f.data)).toHaveLength(1);
      expect(chargeHolds(f.result.state, f.data)).toEqual([]);
    }
  });
});

describe('World Boss trio VFX: anchors', () => {
  const boss = { x: 270, y: 200, feetY: 320, size: 157.5, side: -1 as const };
  it('ground layers sit on the feet line; chest layers on the chest; forward means toward the heroes', () => {
    expect(anchorPoint(boss, 'target.feet').y).toBe(320);
    expect(anchorPoint(boss, 'whole_hero_side.actual_target_feet').y).toBe(320);
    expect(anchorPoint(boss, 'caster.feet').y).toBe(320);
    expect(anchorPoint(boss, 'target.chest')).toEqual({ x: 270, y: 200 });
    expect(anchorPoint(boss, 'caster.forward_chest').x).toBeLessThan(270);
    // Codex's offset_390 is [rear, down]: rear of a left-facing foe is screen-right.
    expect(anchorPoint(boss, 'caster.chest', 1, [12, 0]).x).toBe(282);
  });
  it('places the trio holds by their layer anchor and leaves the older families to the scene', () => {
    const titan = holdPlacement(boss, { enemyId: 'f1', charge: 'Titan Gathering', release: 'Mountain Fall', kind: 'unstoppable', frame: 'mountain-fall_prepare' }, 1)!;
    expect(titan).toMatchObject(anchorPoint(boss, 'caster.forward_chest'));
    const wing = holdPlacement(boss, { enemyId: 'f1', charge: 'Wing Gathering', release: 'Worldshard Dive', kind: 'breakable', frame: 'wing-gathering_prepare' }, 1)!;
    expect(wing.y).toBeGreaterThan(boss.y);
    expect(holdPlacement(boss, { enemyId: 'f1', charge: 'Rift Gathering', release: 'Rift Cataclysm', kind: 'unstoppable', frame: 'rift-cataclysm_prepare' }, 1)).toBeUndefined();
  });
});
