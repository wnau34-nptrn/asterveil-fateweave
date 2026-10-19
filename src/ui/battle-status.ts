import { capAmount, corrodeBonus, enemyIntent, guardReductionOf, hasCap, songPower, tauntReductionOf } from '../core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../core/battle/types';
import { actorName } from './th';

export interface UnitStatus {
  id: string; kind: 'buff' | 'debuff'; icon: ActionId;
  name: string; detail: string; duration: string;
}

// Presentation only. Read the displayed turn snapshot; never infer status from VFX or logs.
export function unitStatuses(s: BattleState, d: EncounterDefinition, id: string): UnitStatus[] {
  const hero = s.heroes.find(h => h.id === id), enemy = s.enemies.find(e => e.id === id);
  if ((!hero && !enemy) || (hero ?? enemy)!.hp <= 0 || s.outcome !== 'active') return [];
  const rows: UnitStatus[] = [];
  const add = (key: string, icon: ActionId, name: string, detail: string, duration: string, kind: UnitStatus['kind'] = 'buff') => rows.push({ id: key, icon, name, detail, duration, kind });
  const name = (actor: string) => actorName(actor, d);
  const alive = (actor: string) => s.heroes.some(h => h.id === actor && h.hp > 0);
  const untilTurn = (actor: string) => `จนถึงเทิร์นถัดไปของ${name(actor)} หรือผู้ร่ายล้ม`;
  const rounds = (until: number) => `เหลือ ${until - s.round} รอบ รวมรอบนี้ · หมดเมื่อเริ่มรอบ ${until}`;
  if (hero) {
    if (hero.barrier > 0) add('barrier', 'ward', 'โล่เวท', `ดูดซับความเสียหายได้อีก ${hero.barrier} ก่อนหัก HP`, 'อยู่จนโล่ถูกใช้หมด');
    if (hero.barrier > 0 && hero.reflect && alive(hero.reflect.heroId)) add('reflect', 'ward', 'โล่สะท้อน', `สวนกลับ ${hero.reflect.amount} เมื่อโล่ดูดซับการโจมตี · จาก${name(hero.reflect.heroId)}`, 'ใช้ได้ 1 ครั้ง หรือจนโล่หมด');
    if (hero.evading) add('evade', 'evade', 'ก้าวเงา', `หลบการโจมตีศัตรูได้อีก ${1 + (hero.evadeExtra ?? 0)} ครั้ง`, `ใช้ครบจำนวนครั้ง หรือถึงเทิร์นถัดไปของ${name(id)}`);
    if (hero.hastedRound !== undefined && hero.hastedRound >= s.round) add('haste', 'haste', 'เร่งจังหวะ', `ได้ลำดับลงมือก่อนกลุ่มปกติในรอบ ${hero.hastedRound} (ถ้ามีหลายคน เรียง SPD)`, `มีผลในรอบ ${hero.hastedRound} เท่านั้น`);
    if (s.guard && alive(s.guard.heroId) && s.enemies.some(e => e.id === s.guard!.sourceId && e.hp > 0)) {
      const g = s.guard;
      if (g.targetId === id || g.heroId === id) add('guard', 'guard', g.targetId === id ? 'ได้รับการคุ้มกัน' : 'กำลังคุ้มกัน', `${name(g.heroId)}รับการโจมตีจาก${name(g.sourceId)}แทน${name(g.targetId)} ลดความเสียหาย ${Math.round(guardReductionOf(d, g.heroId) * 100)}%`, `หมดเมื่อ${name(g.sourceId)}ลงมือ/ถูกกำจัด หรือถึงเทิร์นถัดไปของ${name(g.heroId)}`);
    }
    const brace = s.counter;
    if (brace && alive(brace.heroId) && d.heroes.find(h => h.id === id)?.lane === 'front') {
      const reduction = hasCap(d, brace.heroId, 'frontwall') ? ` ลดความเสียหายกายภาพ ${capAmount(d, brace.heroId, 'frontwall')}%` : '';
      add('counter', brace.wall ? 'spearwall' : 'brace', brace.wall ? 'กำแพงทวน' : 'ตั้งทวน', `${name(brace.heroId)}สวนกลับเมื่อแนวหน้าถูกโจมตีกายภาพ${reduction}`, brace.wall ? untilTurn(brace.heroId) : `สวนกลับ 1 ครั้ง หรือ${untilTurn(brace.heroId)}`);
    }
    if (s.taunt?.heroId === id) add('taunt', 'taunt', 'ยั่วยุ', `ดึงเป้าหมายการโจมตีศัตรูมาที่ตนเอง ลดความเสียหาย ${Math.round(tauntReductionOf(d, id) * 100)}%`, untilTurn(id));
    if (s.song && alive(s.song.heroId)) {
      const song = s.song, power = songPower(d, song.heroId, song.action);
      const chorus = song.action === 'valor' && hasCap(d, song.heroId, 'chorus') ? ` และลดความเสียหายที่ได้รับ ${capAmount(d, song.heroId, 'chorus')}` : '';
      add('song', song.action, d.skills[song.action].name, `${song.action === 'valor' ? `การโจมตีแต่ละครั้งแรงขึ้น ${power}${chorus}` : `ฟื้น HP ${power} เมื่อเริ่มรอบใหม่`} · จาก${name(song.heroId)} · มีผลกับเพื่อนที่ยังยืนอยู่ทุกคน`, 'จนกวีเปลี่ยนเพลง ใช้บทส่งท้าย ล้ม หรือจบศึก');
    }
    if (s.rally?.ids.includes(id) && alive(s.rally.heroId)) add('rally', 'rally', d.skills.rally.name, `ลดความเสียหายจากการโจมตีศัตรูครั้งแรก ${Math.round(d.rules.rallyReduction * 100)}% · จาก${name(s.rally.heroId)}`, `รับการโจมตี 1 ครั้ง หรือ${untilTurn(s.rally.heroId)}`);
    if (s.sanctuary?.targetId === id && alive(s.sanctuary.heroId)) add('sanctuary', 'sanctuary', d.skills.sanctuary.name, `HP ไม่ลดต่ำกว่า 1 · จาก${name(s.sanctuary.heroId)}`, untilTurn(s.sanctuary.heroId));
    if (s.solace?.targetId === id && alive(s.solace.heroId)) add('solace', 'heal', 'แสงปลอบประโลม', `ลดความเสียหาย ${capAmount(d, s.solace.heroId, 'solace')}% · จาก${name(s.solace.heroId)}`, untilTurn(s.solace.heroId));
  }
  if (enemy) {
    if (enemy.markedUntil > s.round) {
      const users = d.heroes.filter(h => h.empoweredByStatuses).map(h => name(h.id)).join(' / ') || 'ผู้มีท่าใช้ตรา';
      add('mark', 'mark', 'ติดตรา', `${users}ใช้โจมตีปกติหรือ${d.skills.execute.name} สร้างความเสียหายเพิ่ม ${d.rules.markedBonus} และใช้ตราหมด`, `${rounds(enemy.markedUntil)} หรือถูกใช้ตราโจมตี`, 'debuff');
    }
    if ((enemy.corrodedUntil ?? 0) > s.round) add('corrode', 'acid', 'กัดกร่อน', `การโจมตีของฝ่ายเราใส่ตัวนี้สร้างความเสียหายเพิ่ม ${corrodeBonus(s, d, id)}`, rounds(enemy.corrodedUntil!), 'debuff');
    if (enemy.delayedRound !== undefined && enemy.delayedRound >= s.round) add('delay', 'hinder', 'ชะลอจังหวะ', `ได้ลำดับลงมือหลังกลุ่มปกติในรอบ ${enemy.delayedRound} (ถ้ามีหลายตัว เรียง SPD)`, `มีผลในรอบ ${enemy.delayedRound} เท่านั้น`, 'debuff');
    if (enemy.interruptedRound !== undefined && enemy.interruptedRound >= s.round) {
      const energy = enemyIntent(s, d, id, enemy.interruptedRound)?.kind === 'energy';
      add('interrupt', energy ? 'sigil' : 'bash', energy ? 'ผนึกพลัง' : 'ขัดจังหวะ', `ยกเลิกท่า${energy ? 'พลังงาน' : 'กายภาพ'}ในเทิร์นที่กำหนด`, `ใช้เมื่อถึงเทิร์นของตัวนี้ในรอบ ${enemy.interruptedRound}`, 'debuff');
    }
    if (s.taunt && alive(s.taunt.heroId)) add('taunted', 'taunt', 'ถูกยั่วยุ', `หากลงมือก่อนเทิร์นถัดไปของ${name(s.taunt.heroId)} จะเล็งไปที่ผู้นั้น`, untilTurn(s.taunt.heroId), 'debuff');
  }
  return rows;
}
