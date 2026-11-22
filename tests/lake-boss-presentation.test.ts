import { describe, expect, it } from 'vitest';
import { bossCues, usesBossSignature, usesLakeBossSignature } from '../src/game/visuals/boss-signature-fx';
import { waterSpirit, riftWarden } from '../src/content/encounters/catalog';
import { readFileSync } from 'node:fs';
import atlasManifest from '../src/game/visuals/unit-atlases.json';
import { actorArt, actorFootOrigins, staticDisplayRatio } from '../src/game/visuals/assets';
import { sequence, unitClip, unitDisplayRatio, unitDownFrame, unitSoleOrigin } from '../src/game/visuals/unit-frames';
import { lakeBossFixture, lakeBossMoves } from './fixtures/lake-boss';

describe('Water Spirit VFX responds to real resolution', () => {
  it('loads its own encounter-only VFX texture', () => {
    expect(usesLakeBossSignature(waterSpirit)).toBe(true);
    expect(usesBossSignature(waterSpirit)).toBe(false);
    expect(usesLakeBossSignature(riftWarden)).toBe(false);
    expect(usesBossSignature(riftWarden)).toBe(true);
  });

  it('peaks only when Water Veil actually heals', () => {
    const healed = lakeBossFixture('Water Veil').turn;
    const sealed = lakeBossFixture('Water Veil', 'sealed').turn;
    const full = lakeBossFixture('Water Veil', 'full').turn;
    expect(bossCues(healed)).toMatchObject([{ id: 'f1', at: 'caster', event: { type: 'heal' } }]);
    expect(sealed.events.some(e => e.type === 'cancel')).toBe(true);
    expect(bossCues(sealed)).toEqual([]);
    expect(bossCues(full)).toEqual([]);
  });

  it('Reflection peaks only at the Mirror Shade that the phase actually summons', () => {
    const { turn, result } = lakeBossFixture('Reflection');
    expect(turn.intent?.special).toBe('phase');
    expect(result.state.enemies.find(e => e.id === 'b2')?.absent ?? false).toBe(false);
    expect(bossCues(turn)).toMatchObject([{ id: 'b2', at: 'summoned', event: { type: 'summon' } }]);
  });

  for (const move of ['Surging Wave', 'Great Wave'] as const) {
    it(`${move} paints once at every actual recipient`, () => {
      const { turn } = lakeBossFixture(move);
      const events = turn.events.filter(e => e.sourceId === 'f1' && (e.type === 'damage' || e.type === 'dodge'));
      expect(events).toHaveLength(move === 'Great Wave' ? 5 : 1);
      expect(bossCues(turn).map(c => c.event)).toEqual(events);
    });
  }
});

describe('Water Spirit body intake', () => {
  const art = 'foe_water_spirit';
  const atlasFrames = (sheet: 'waterspirit' | 'sentinel') =>
    JSON.parse(readFileSync(`public/assets/units/${atlasManifest[sheet].atlas}`, 'utf8')).frames;

  it('fits the former boss height and aligns the still and animated sole', () => {
    const height = (sheet: 'waterspirit' | 'sentinel', identity: string) => {
      const frame = atlasFrames(sheet)['0'];
      return frame.spriteSourceSize.h / frame.sourceSize.h * unitDisplayRatio(identity);
    };
    expect(Math.abs(height('waterspirit', art) - height('sentinel', 'foe_sentinel'))).toBeLessThan(.04);
    expect(actorArt[art]).toEqual({ sheet: 'foes3', frame: 6 });
    expect(staticDisplayRatio(art)).toBe(unitDisplayRatio(art));
    expect(actorFootOrigins[art]).toBe(unitSoleOrigin(art));
    expect(unitSoleOrigin(art)).toBe(.875);
  });

  it('ships all six moves, hit and down in the owner-approved 768px layout', () => {
    const atlas = atlasFrames('waterspirit');
    expect(Object.keys(atlas)).toHaveLength(30);
    for (const frame of Object.values(atlas) as { sourceSize: { w: number; h: number } }[]) {
      expect(frame.sourceSize).toEqual({ w: 768, h: 768 });
    }
    for (const [index, name] of lakeBossMoves.entries()) {
      const clip = unitClip(art, undefined, name), base = index * 4 + 1;
      expect(sequence('cast', 'prepare', clip, art)).toEqual([0, base, base + 1]);
      expect(sequence('cast', 'recover', clip, art)).toEqual([base + 2, base + 3, 0]);
    }
    expect(sequence('hit', 'reaction', undefined, art)).toEqual([25, 26]);
    expect(sequence('down', 'reaction', undefined, art)).toEqual([27, 28, 29]);
    expect(unitDownFrame(art)).toBe(29);
    expect(lakeBossFixture('Tide Lash', 'down').result.state.enemies.find(e => e.id === 'f1')?.hp).toBe(0);
  });
});
