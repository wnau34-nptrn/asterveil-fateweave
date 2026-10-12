import type { ActionId, BattleEvent, BattleState, EncounterDefinition, Intent } from '../core/battle/types';

export const thaiFont = '"Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
export const heroText: Record<string, { name: string; role: string; help: string; icon: string }> = {
  guardian: { name: 'เอกิส', role: 'ผู้พิทักษ์', help: 'รับการโจมตีแทนเพื่อน', icon: '♜' },
  tracer: { name: 'ไลรา', role: 'นักโจมตี', help: 'ติดตราแล้วโจมตีแรง', icon: '➶' },
  weaver: { name: 'ไอรา', role: 'ผู้ถักพลัง', help: 'เบี่ยงพลังไปที่อื่น', icon: '✧' },
};
const names: Record<string, string> = {
  guardian: 'เอกิส', tracer: 'ไลรา', weaver: 'ไอรา', raider: 'นักจู่โจม', brute: 'อสูรรอยแยก', 'energy-crystal': 'ผลึกพลังงาน',
};
export const actionText: Record<ActionId, { name: string; english: string; icon: string }> = {
  attack: { name: 'โจมตี', english: 'Attack', icon: '⚔' },
  guard: { name: 'ตั้งรับ', english: 'Guard', icon: '♜' },
  mark: { name: 'ติดตรา', english: 'Mark', icon: '◇' },
  redirect: { name: 'เบี่ยงพลัง', english: 'Redirect', icon: '✧' },
};
export function actorName(id: string | undefined, data: EncounterDefinition): string {
  if (!id) return 'เป้าหมาย';
  return names[id] ?? data.heroes.find(h => h.id === id)?.name ?? data.enemies.find(e => e.id === id)?.name ?? data.crystal.name;
}
export function intentName(intent: Intent): string {
  return ({ 'Raking Slash': 'ฟันกวาด', 'Rift Bolt': 'ลำแสงรอยแยก', 'Crushing Blow': 'ทุบหนัก' } as Record<string, string>)[intent.name] ?? intent.name;
}
export function reasonThai(reason: string, data: EncounterDefinition): string {
  if (!reason) return '';
  const translations: Record<string, string> = {
    'The encounter has ended.': 'การต่อสู้จบแล้ว',
    'This hero is down.': 'ฮีโร่คนนี้ล้มแล้ว',
    'This hero does not have this action.': 'เลือกฮีโร่ที่มีคำสั่งนี้',
    'Only redirectable energy attacks can be woven.': 'การโจมตีนี้เบี่ยงไม่ได้ ใช้ได้เฉพาะพลังงานที่ระบุว่าเบี่ยงได้',
    [`Requires ${data.rules.redirectCost} Counter. Guard an incoming hit to earn Counter.`]: `ต้องมี ${data.rules.redirectCost} แต้มเบี่ยงพลัง ให้เอกิสตั้งรับเพื่อสะสมแต้มก่อน`,
    'Requires a marked enemy or a charged crystal.': 'ต้องมีศัตรูติดตรา หรือผลึกที่ยังใช้ได้',
    'This enemy is down.': 'ศัตรูตัวนี้ถูกกำจัดแล้ว',
    'Guard must protect the announced target.': 'ตั้งรับได้เฉพาะคนที่ศัตรูกำลังเล็ง',
    'Mark this enemy first.': 'ให้ไลราติดตราศัตรูตัวนี้ก่อน',
    'The crystal has no charge remaining.': 'ผลึกถูกใช้ไปแล้ว',
    'Invalid target.': 'เลือกเป้าหมายใหม่',
    'The preview is stale. Select an action again.': 'สถานะเปลี่ยนแล้ว กรุณาเลือกคำสั่งใหม่',
    'Encounter mismatch.': 'ข้อมูลการต่อสู้ไม่ตรงกัน กรุณาเริ่มใหม่',
  };
  return translations[reason] ?? 'คำสั่งนี้ยังใช้ไม่ได้ กรุณาเลือกเป้าหมายใหม่';
}

// Present typed events in Thai. Simulation messages and identifiers stay unchanged.
export function eventThai(event: BattleEvent, before: BattleState, after: BattleState, data: EncounterDefinition): string {
  const target = actorName(event.targetId, data);
  const source = actorName(event.sourceId, data);
  switch (event.type) {
    case 'damage': {
      const allyBefore = before.heroes.find(h => h.id === event.targetId);
      const allyAfter = after.heroes.find(h => h.id === event.targetId);
      const absorbed = allyBefore && allyAfter ? Math.max(0, allyBefore.barrier - allyAfter.barrier) : 0;
      return `${target} เสียเลือด ${event.amount ?? 0}${absorbed ? ` (โล่รับไว้ ${absorbed})` : ''}`;
    }
    case 'guard':
      if (!event.sourceId) return `ตั้งรับสำเร็จ · แต้มเบี่ยงพลัง ${after.counter}/${data.rules.counterCap}`;
      return `${source}${event.sourceId === event.targetId ? 'ตั้งรับ' : `รับการโจมตีแทน${target}`} ลดความเสียหาย ${data.rules.guardReduction * 100}%`;
    case 'mark': return `${target} ติดตรา ${data.rules.markDuration} จังหวะ รวมจังหวะนี้ เปิดทางให้ไลราโจมตีแรงหรือไอราเบี่ยงพลังใส่`;
    case 'redirect': return `ส่งการโจมตี ${before.intent?.damage ?? 0} ไปที่${target} ใช้ ${data.rules.redirectCost} แต้มเบี่ยงพลัง`;
    case 'barrier': return `ผลึกรับการโจมตี ${before.intent?.damage ?? 0} ทั้งหมด ฮีโร่ที่ยังยืนอยู่ได้โล่คนละ ${event.amount ?? data.crystal.barrier} หน่วย`;
    case 'cancel': return 'หยุดการโจมตีของศัตรูได้ เพราะกำจัดผู้โจมตีก่อน';
    case 'down': return `${target}${data.heroes.some(h => h.id === event.targetId) ? 'ล้มแล้ว' : 'ถูกกำจัดแล้ว'}`;
    case 'outcome': return after.outcome === 'victory' ? 'ชนะแล้ว! รอยแยกสงบลง' : 'แพ้แล้ว ลองวางแผนใหม่';
  }
}
