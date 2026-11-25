import type { BattleEvent, EncounterDefinition, TurnStage } from '../../core/battle/types';
import type { SfxName } from '../../platform/sfx';
import { artOf } from './assets';
import { basicWeapon } from './basic-attack-fx';
import { unitPose } from './unit-animation-map';
import { unitClip, unitRelease } from './unit-frames';

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
    case 'clash': return `ปะทะ −${event.amount}`;
    case 'venom': return event.targetId === event.sourceId ? `เคลือบพิษ ${event.amount}` : `พิษ ${event.amount} ชั้น`;
    case 'arcane': return (event.amount ?? 0) > 0 ? `ประจุเวท +${event.amount}` : `ใช้ประจุ ${-(event.amount ?? 0)}`;
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
    case 'stagger': return 'เสียหลัก!';
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
function heroPose(turn: TurnStage, data?: EncounterDefinition) {
  return data && turn.side === 'hero' ? unitPose(turn, data) : undefined;
}

// Audio uses the same contact deadline and authored projectile release as the visual stage.
export function prepareSound(turn: TurnStage, data: EncounterDefinition, contact: number): { name: SfxName; at: number } | undefined {
  if (!contact || turn.events.some(e => e.type === 'cancel')) return;
  const pose = heroPose(turn, data);
  if (!pose) return { name: effectFamily(turn) === 'steel' ? 'swing' : 'charge', at: 0 };
  const windup = (name: SfxName, lead: number) => ({ name, at: Math.max(0, contact - lead) });
  const ownContact = turn.events.some(e => e.sourceId === turn.actorId && (e.type === 'damage' || e.type === 'dodge'));
  const basic = basicWeapon(turn, data);
  const releaseSound = !ownContact ? undefined : pose === 'shoot' ? 'arrowRelease' : pose === 'throw' ? 'flaskRelease'
    : basic === 'orb' ? 'orbRelease' : basic === 'rhythm' ? 'rhythmLead' : undefined;
  if (releaseSound) {
    const art = artOf(data, turn.actorId);
    const release = unitRelease(art, unitClip(art, turn.action, undefined))?.at ?? .55;
    return { name: releaseSound, at: Math.min(contact - 1, Math.max(0, Math.round(contact * release))) };
  }
  if (pose === 'song' || pose === 'dance') return windup('rhythmLead', 110);
  if (pose === 'cast' || pose === 'guard' || !ownContact) {
    return windup('charge', 205);
  }
  return windup('swing', 145);
}

// At most two simultaneous recipes; one main impact, one secondary mechanic.
export function contactSounds(turn: TurnStage, data?: EncounterDefinition): SfxName[] {
  const has = (type: BattleEvent['type']) => turn.events.some(e => e.type === type);
  if (has('cancel')) return ['cancel'];
  const ownDodge = turn.events.some(e => e.type === 'dodge' && e.sourceId === turn.actorId);
  const hit = turn.events.find(e => e.type === 'damage' && e.sourceId === turn.actorId)
    ?? (ownDodge ? undefined : turn.events.find(e => e.type === 'damage'));
  const pose = heroPose(turn, data);
  const arcane = pose === 'cast' || effectFamily(turn) === 'arcane';
  let primary: SfxName | undefined;
  if (hit) {
    if (!hit.amount) primary = hit.absorbed ? arcane ? 'barrier' : 'steelBlock' : 'guard';
    else if (['execute', 'finisher', 'backstab'].includes(turn.action ?? '')) primary = 'crit';
    else if (pose === 'smash' || pose === 'punch') primary = 'bluntHit';
    else if (pose === 'song' || pose === 'dance') primary = 'rhythmHit';
    else primary = arcane ? 'zap' : 'hit';
  } else if (has('dodge') || has('evade')) primary = 'miss';
  const support: SfxName | undefined =
    has('guard') || has('brace') || has('taunt') || has('counter') || has('parry') ? 'guard'
    : has('barrier') || has('sanctuary') || has('sigil') ? 'barrier'
    : has('heal') || has('revive') ? 'heal'
    : has('mark') || has('corrode') || has('delay') || has('interrupt') || has('deflect') || has('dial') || has('dispel') ? 'debuff'
    : has('haste') || has('song') || has('rally') || has('stand') || has('finale') || has('buff')
      || turn.events.some(e => (e.amount ?? 0) > 0 && ['chi', 'arcane'].includes(e.type)) ? 'buff'
    : undefined;
  return [...new Set([primary, support].filter(s => s !== undefined))];
}
