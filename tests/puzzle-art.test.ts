import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import frames from '../src/content/world/puzzle.json';

// ART-WORLD-PUZZLE-001: the CSS picks frames by column/row of a 5×4 atlas of 128 px cells (game-feel.css "Phase 3C").
const layout = ['rune_star', 'rune_moon', 'rune_sun', 'rune_star_lit', 'rune_moon_lit', 'rune_sun_lit', 'lever_up', 'lever_down', 'boulder', 'pit_open',
  'pit_filled', 'door_rune', 'door_lever', 'door_open', 'crack_hint', 'crack_open', 'glyph_star', 'glyph_moon', 'glyph_sun'];
describe('puzzle atlas', () => {
  it('maps every frame to the cell the CSS expects', () => {
    const f = frames as Record<string, { x: number; y: number; w: number; h: number }>;
    expect(Object.keys(f).sort()).toEqual([...layout].sort());
    layout.forEach((name, i) => expect(f[name]).toMatchObject({ x: (i % 5) * 128, y: Math.floor(i / 5) * 128, w: 128, h: 128 }));
    const css = readFileSync('src/ui/game-feel.css', 'utf8');
    const cell = (sel: string) => { const m = new RegExp(`${sel.replace(/[.[\]=]/g, c => `\\${c}`)} \\{ --px: (\\d); --py: (\\d); \\}`).exec(css); return m && `${m[1]},${m[2]}`; };
    const at = (name: string) => { const i = layout.indexOf(name); return `${i % 5},${Math.floor(i / 5)}`; };
    expect(cell('.rune-stone[data-glyph=sun]')).toBe(at('rune_sun')); expect(cell('.rune-stone.lit[data-glyph=sun]')).toBe(at('rune_sun_lit'));
    expect(cell('.lever.pulled')).toBe(at('lever_down')); expect(cell('.pit.filled')).toBe(at('pit_filled'));
    expect(cell('.puzzle-door.open')).toBe(at('door_open')); expect(cell('.secret-wall.found')).toBe(at('crack_open'));
    expect(cell('.door-glyph[data-glyph=moon]')).toBe(at('glyph_moon'));
  });
});
