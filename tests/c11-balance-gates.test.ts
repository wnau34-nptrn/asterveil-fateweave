import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
// Historical C11 acceptance reports retain the original buy-every-offer policy.
// C12 changes the fixed-team purchasing policy and has a separate live twenty-cell gate
// in campaign-sim.test.ts, compared against the same policy on the immediate pre-C12 base.
function rates(file: string): Map<string,number> {
 const out=new Map<string,number>();let policy='';
 for(const line of readFileSync(file,'utf8').split('\n')){
  if(line.startsWith('### '))policy=line;
  const cells=line.split('|').slice(1,-1).map(s=>s.trim());
  if(cells.length<3)continue;
  if(/^(ซากชายแดน|เส้นทางป่าทึบ|แนวรอยแยก) #1$/.test(cells[0]!) || /^แนวรอยแยก \(ยาก\) #[12]$/.test(cells[0]!))out.set(`${policy}/${cells[0]}`,parseFloat(cells[2]!));
 }
 return out;
}
it('C11 campaign first clears and both hard runs are no worse than regenerated f56d2fb',()=>{
 const before=rates('docs/validation/balance-sim/c11-before/CAMPAIGN.md'),after=rates('docs/validation/balance-sim/CAMPAIGN.md');
 expect(before.size).toBe(20);
 for(const [key,rate] of before)expect(after.get(key),key).toBeGreaterThanOrEqual(rate);
});
