import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { characterSim, characterReport, CHARACTER_MIN_CLEAR, CHARACTER_MAX_RATE_SPREAD, CHARACTER_MAX_HP_SPREAD } from './sim/character-sim';
const full = process.env.SIM_REPORT === '1';
const rows = characterSim(full ? Array.from({length:12},(_,i)=>1001+i*37) : [1001]);
it('every playable character clears maps 1–3 at map level with a viable build', () => {
  for (const r of rows) expect(r.won/r.tried, `${r.id} ${r.map}`).toBeGreaterThanOrEqual(CHARACTER_MIN_CLEAR);
});
it('no character is far above or below its peers in the standard team', () => {
  for (const map of new Set(rows.map(r=>r.map))) {
    const rs = rows.filter(r=>r.map===map), rates=rs.map(r=>r.won/r.tried), hp=rs.map(r=>r.hp/r.tried);
    expect(Math.max(...rates)-Math.min(...rates), map).toBeLessThanOrEqual(CHARACTER_MAX_RATE_SPREAD);
    expect(Math.max(...hp)-Math.min(...hp), map).toBeLessThanOrEqual(CHARACTER_MAX_HP_SPREAD);
  }
});
if(full) it('writes the roster report including every chosen build',()=>{mkdirSync('docs/validation/balance-sim',{recursive:true});writeFileSync('docs/validation/balance-sim/CHARACTERS.md',characterReport(rows));});
