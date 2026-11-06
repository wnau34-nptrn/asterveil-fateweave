import type { BattleEvent, TurnStage } from '../../core/battle/types';
import type { SfxName } from '../../platform/sfx';

export type EffectFamily = 'steel' | 'arcane' | 'shield' | 'restore' | 'mark' | 'status';
export interface CombatPrefs { speed: 'normal' | 'fast'; intensity: 'standard' | 'reduced' }
export const combatPrefsKey = 'asterveil.fateweave.presentation.v1';
export function readCombatPrefs(raw: string | null): CombatPrefs {
  try {
    const p = JSON.parse(raw ?? '{}');
    return { speed: p?.speed === 'fast' ? 'fast' : 'normal', intensity: p?.intensity === 'reduced' ? 'reduced' : 'standard' };
  } catch { return { speed: 'normal', intensity: 'standard' }; }
}
export function effectFamily(turn: TurnStage): EffectFamily {
  if (turn.events.some(e => e.type === 'cancel')) return 'status';
  if (turn.action === 'mark') return 'mark';
  if (['heal','prayer','mend','revive'].includes(turn.action ?? '')) return 'restore';
  if (['guard','ward','brace','rally','sanctuary','spearwall','aegis','halo','parry'].includes(turn.action ?? '')) return 'shield';
  if (turn.events.some(e => e.type === 'damage' || e.type === 'dodge')) {
    return (turn.side === 'enemy' ? turn.intent?.kind === 'energy' : ['bolt','sigil','acid','bomb','quake','weakshot','storm','dispel'].includes(turn.action ?? '')) ? 'arcane' : 'steel';
  }
  return 'status';
}
// AV05: the generic hit lift. Additive and well below white, so it brightens without replacing the painted pixels.
export const hitLift = (energy: boolean, quiet: boolean): number => energy ? quiet ? 0x1c1430 : 0x382860 : quiet ? 0x221a10 : 0x44341f;
// All captions come from actual resolver events. A synth recipe named crit is not a rule.
export function effectCaption(event: BattleEvent): string {
  switch (event.type) {
    case 'damage': return event.amount ? `−${event.amount}${event.absorbed ? ` · โล่รับ ${event.absorbed}` : ''}` : event.absorbed ? `โล่รับ ${event.absorbed}` : 'ป้องกันได้';
    case 'counter': return event.text === 'Falling star.' ? `ดาวตก −${event.amount ?? 0}` : `สวนกลับ −${event.amount ?? 0}`;
    case 'cooldown': return `พร้อมเร็วขึ้น ${event.amount ?? 0} รอบ`;
    case 'deflect': return event.text === 'Fate is bent.' ? 'เบนชะตา' : 'ท่าถูกเบน!';
    case 'dial': return 'เลื่อนท่าใหญ่';
    case 'meteor': return event.text === 'The star falls.' ? 'ดาวตก!' : 'ตั้งท่าดาวตก';
    case 'beat': return (event.amount ?? 0) > 0 ? `จังหวะ +${event.amount}` : `ใช้จังหวะ ${-(event.amount ?? 0)}`;
    case 'hex': return `สาป ${event.amount ?? 0}/3`;
    case 'chi': return (event.amount ?? 0) > 0 ? `ปราณ +${event.amount}` : `ปล่อยปราณ ${-(event.amount ?? 0)}`;
    case 'heal': return `+${event.amount ?? 0}`;
    case 'barrier': return `โล่ +${event.amount ?? 0}`;
    case 'mark': return 'ติดตรา';
    case 'guard': return 'คุ้มกัน';
    case 'interrupt': return 'ขัดจังหวะ';
    case 'cancel': return event.cause === 'defeated' ? 'ล้มแล้ว · ยกเลิกท่า' : event.cause === 'sealed' ? 'ผนึกท่า' : 'เสียจังหวะ';
    case 'down': return 'ล้ม';
    case 'dodge': return 'หลบ!';
    case 'brace': return 'เตรียมสวน';
    case 'delay': return 'ชะลอ';
    case 'corrode': return 'กัดกร่อน';
    case 'haste': return 'เร่งจังหวะ';
    case 'evade': return 'เตรียมหลบ';
    case 'taunt': return 'ยั่วยุ';
    case 'song': return 'บทเพลง';
    case 'rally': return 'แนวป้องกัน';
    case 'sigil': return 'ผนึก';
    case 'sanctuary': return 'เขตคุ้มครอง';
    case 'stand': return 'ยืนหยัด';
    case 'finale': return 'บทส่งท้าย';
    case 'phase': return 'เปลี่ยนช่วง!';
    case 'summon': return 'ปรากฏตัว';
    case 'charge': return 'รวบรวมพลัง';
    case 'resist': return event.text === 'Unstoppable move.' ? 'ขัดไม่ได้' : 'ไม่หวั่นไหว';
    case 'parry': return 'ปัดดาบ';
    case 'revive': return 'ฟื้นคืน!';
    case 'buff': return 'เสริมพลัง';
    case 'shove': return event.text === 'Shoved to the back row.' ? 'ถูกผลักไปหลัง' : event.text === 'Pulled to the front row.' ? 'ถูกดึงมาหน้า' : 'กลับแถวเดิม';
    case 'pin': return 'ตรึงแถว';
    case 'dispel': return 'สลายเวท';
    case 'weaken': return 'อ่อนแรง';
    case 'outcome': return '';
  }
}
// At most two simultaneous recipes; one main impact, one secondary mechanic.
export function contactSounds(turn: TurnStage): SfxName[] {
  const has = (type: BattleEvent['type']) => turn.events.some(e => e.type === type);
  if (has('cancel')) return ['cancel'];
  const hit = turn.events.find(e => e.type === 'damage');
  const primary: SfxName | undefined = hit ? !hit.amount && hit.absorbed ? 'barrier' : ['execute','finisher','backstab'].includes(turn.action ?? '') ? 'crit' : effectFamily(turn) === 'arcane' ? 'zap' : 'hit' : has('dodge') || has('evade') ? 'miss' : undefined;
  const support: SfxName | undefined = has('guard') || has('brace') || has('taunt') || has('counter') ? 'guard' : has('barrier') || has('sanctuary') || has('sigil') ? 'barrier' : has('heal') ? 'heal' : has('mark') || has('corrode') || has('delay') || has('interrupt') ? 'debuff' : has('haste') || has('song') || has('rally') || has('stand') || has('finale') ? 'buff' : undefined;
  return [...new Set([primary, support].filter(s => s !== undefined))];
}
