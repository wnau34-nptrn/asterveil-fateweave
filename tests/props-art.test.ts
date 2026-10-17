import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import props from '../src/content/world/map_props.json';
import flame from '../src/content/world/camp_flame.json';
import market from '../src/content/world/market.json';
import { chapterOne as map } from '../src/content/world/chapter1';

// ART-WORLD-PROPS-002: the CSS picks map props by column/row of a 4×2 atlas of 128 px cells (game-feel.css "Map props").
const layout = ['herb', 'event_bandits', 'event_shrine', 'event_merchant', 'event_traveller', 'event_rift', 'herb_glow', 'spare'];
const css = readFileSync('src/ui/game-feel.css', 'utf8');
const at = (name: string) => { const i = layout.indexOf(name); return `${i % 4},${Math.floor(i / 4)}`; };
const cell = (sel: string) => { const m = new RegExp(`${sel.replace(/[.[\]=]/g, c => `\\${c}`)} \\{[^}]*--px: (\\d); --py: (\\d);`).exec(css); return m && `${m[1]},${m[2]}`; };
describe('map props atlas', () => {
  it('maps every frame to the cell the CSS expects, with the shared foot line', () => {
    const f = props as Record<string, { x: number; y: number; w: number; h: number; footY: number }>;
    expect(Object.keys(f)).toEqual(layout);
    layout.forEach((name, i) => expect(f[name]).toEqual({ x: (i % 4) * 128, y: Math.floor(i / 4) * 128, w: 128, h: 128, footY: 116 }));
    // Every event kind on the map has a painted prop.
    for (const kind of new Set(map.events.map(e => e.kind))) expect(cell(`.event-mark[data-kind=${kind}]`)).toBe(at(`event_${kind}`));
    expect(cell('.herb .map-prop')).toBe(at('herb')); expect(cell('.herb .herb-glow')).toBe(at('herb_glow'));
  });
  it('the flame strip shares the firepit canvas and the market atlas holds contract then gear box', () => {
    expect(flame).toEqual({ frames: 6, w: 256, h: 256, baseY: 200 });
    expect(readFileSync('src/ui/world.css', 'utf8')).toMatch(/lobby-flame 780ms steps\(6\)/);
    expect(market).toEqual({ contract: { x: 0, y: 0, w: 128, h: 128 }, gearbox: { x: 128, y: 0, w: 128, h: 128 } });
    expect(css).toMatch(/\.market-art\[data-item=gearbox\] \{ background-position: 100% 0; \}/);
  });
});
