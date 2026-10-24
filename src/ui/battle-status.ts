import {bossNames,bossDescription} from './boss-equipment';
import { capAmount, corrodeBonus, enemyIntent, guardReductionOf, hasCap, nextIntentOf, phaseMoves, songPower, tauntReductionOf } from '../core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../core/battle/types';
import { actorName, intentName, phaseThai } from './th';

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
    const boss=d.heroes.find(h=>h.id===id)?.gear?.boss;
    if(boss)add('boss',boss.power==='focus'?'mark':boss.power==='aegis'?'ward':'heal',bossNames[boss.power],bossDescription(boss.power,boss.amount),hero.bossUsedRound===s.round?'ใช้สิทธิ์รอบนี้แล้ว · พร้อมใหม่รอบถัดไป':'สิทธิ์รอบนี้พร้อม · ต้องตรงเงื่อนไข');
    if (hero.barrier > 0) add('barrier', 'ward', 'โล่เวท', `ดูดซับความเสียหายได้อีก ${hero.barrier} ก่อนหัก HP`, 'อยู่จนโล่ถูกใช้หมด');
    if (hero.barrier > 0 && hero.reflect && alive(hero.reflect.heroId)) add('reflect', 'ward', 'โล่สะท้อน', `สวนกลับ ${hero.reflect.amount} เมื่อโล่ดูดซับการโจมตี · จาก${name(hero.reflect.heroId)}`, 'ใช้ได้ 1 ครั้ง หรือจนโล่หมด');
    if (hero.evading) add('evade', 'evade', 'ก้าวเงา', `หลบการโจมตีศัตรูได้อีก ${1 + (hero.evadeExtra ?? 0)} ครั้ง`, `ใช้ครบจำนวนครั้ง หรือถึงเทิร์นถัดไปของ${name(id)}`);
    if (hero.hastedRound !== undefined && hero.hastedRound >= s.round) add('haste', 'haste', 'เร่งจังหวะ', `ได้ลำดับลงมือก่อนกลุ่มปกติในรอบ ${hero.hastedRound} (ถ้ามีหลายคน เรียง SPD)`, `มีผลในรอบ ${hero.hastedRound} เท่านั้น`);
    if (s.guard && alive(s.guard.heroId) && s.enemies.some(e => e.id === s.guard!.sourceId && e.hp > 0)) {
      const g = s.guard;
      if (g.targetId === id || g.heroId === id) add('guard', 'guard', g.targetId === id ? 'ได้รับการคุ้มกัน' : 'กำลังคุ้มกัน', `หาก${name(g.sourceId)}โจมตี${name(g.targetId)} ${name(g.heroId)}จะรับแทน ลดความเสียหาย ${Math.round(guardReductionOf(d, g.heroId) * 100)}%`, `หมดเมื่อ${name(g.sourceId)}ลงมือ/ถูกกำจัด หรือถึงเทิร์นถัดไปของ${name(g.heroId)}`);
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
      add('song', song.action, d.skills[song.action].name, `${song.action === 'valor' ? `การโจมตีแต่ละครั้งแรงขึ้น ${power}${chorus}` : song.action === 'dread' ? `ทุกการโจมตีของศัตรูเบาลง ${power}%` : `ฟื้น HP ${power} เมื่อเริ่มรอบใหม่`} · จาก${name(song.heroId)} · มีผลกับเพื่อนที่ยังยืนอยู่ทุกคน`, 'จนกวีเปลี่ยนเพลง ใช้บทส่งท้าย ล้ม หรือจบศึก');
    }
    if (s.rally?.ids.includes(id) && alive(s.rally.heroId)) add('rally', 'rally', d.skills.rally.name, `ลดความเสียหายจากการโจมตีศัตรูครั้งแรก ${Math.round(d.rules.rallyReduction * 100)}% · จาก${name(s.rally.heroId)}`, `รับการโจมตี 1 ครั้ง หรือ${untilTurn(s.rally.heroId)}`);
    if (s.sanctuary?.targetId === id && alive(s.sanctuary.heroId)) add('sanctuary', 'sanctuary', d.skills.sanctuary.name, `HP ไม่ลดต่ำกว่า 1 · จาก${name(s.sanctuary.heroId)}`, untilTurn(s.sanctuary.heroId));
    // Recruit trees: fury tonic, solo, guardian stone and decoy.
    if ((hero.exposed?.round ?? 0) >= s.round) add('fury', 'fury', d.skills.fury.name, `โจมตีแรงขึ้น ${hero.empowered?.percent ?? 0}% แต่รับความเสียหายเพิ่ม ${hero.exposed!.percent}%`, `ถึงจบรอบ ${hero.exposed!.round}`);
    if ((hero.solo?.round ?? 0) >= s.round && alive(hero.solo!.heroId)) add('solo', 'solo', d.skills.solo.name, `ได้ผลเพลงที่บรรเลงอยู่ ×3 · จาก${name(hero.solo!.heroId)}`, `ถึงจบรอบ ${hero.solo!.round}`);
    if (s.stone?.ids.includes(id) && alive(s.stone.heroId)) add('stone', 'guardstone', d.skills.guardstone.name, `การโจมตีครั้งแรกที่โดนเบาลง ${s.stone.percent}% · จาก${name(s.stone.heroId)}`, untilTurn(s.stone.heroId));
    if (s.decoy?.targetId === id && alive(s.decoy.heroId)) add('decoy', 'decoy', d.skills.decoy.name, `ท่าถัดไปที่เล็งคนนี้จะเปลี่ยนไปที่${name(s.decoy.heroId)}`, untilTurn(s.decoy.heroId));
    if (s.solace?.targetId === id && alive(s.solace.heroId)) add('solace', 'heal', 'แสงปลอบประโลม', `ลดความเสียหาย ${capAmount(d, s.solace.heroId, 'solace')}% · จาก${name(s.solace.heroId)}`, untilTurn(s.solace.heroId));
  }
  if (enemy) {
    // Hard-mode traits (A9): always on for this foe.
    const t = d.rules.traits; const traits = d.enemies.find(e => e.id === id)?.traits ?? [];
    if (t && traits.includes('thorns')) add('thorns', 'pierce', 'หนาม', `ตีโดนแล้วผู้ตีเสียเลือด ${t.thornsPercent}% ของความเสียหาย (ไม่ต่ำกว่า 1)`, 'ตลอดศึก');
    if (t && traits.includes('veilguard')) add('veilguard', 'ward', 'เกราะพลังงาน', `รับความเสียหายลดลง ${t.veilguardPercent}% เว้นแต่ติดตราหรือกัดกร่อน`, 'ตลอดศึก');
    if (t && traits.includes('enrage')) add('enrage', 'slam', 'เดือดดาล', `เลือดต่ำกว่า ${t.enrageBelow}% ท่าแรงขึ้น ${t.enragePercent}%`, 'ตลอดศึก');
    if (d.enemies.find(e => e.id === id)?.boss && (enemy.steadyRound ?? 0) >= s.round) add('steadfast', 'guard', 'ไม่หวั่นไหว', 'เพิ่งถูกขัดจังหวะ · กระแทกโล่และตรึงเวทยกเลิกท่าของรอบนี้ไม่ได้ (ยังสร้างความเสียหาย)', `ถึงท้ายรอบ ${enemy.steadyRound}`);
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
    if (enemy.weaken) add('weaken', 'smoke', 'ท่าเบาลง', `ท่าถัดไปเบาลง ${enemy.weaken}%`, 'หมดเมื่อตัวนี้ลงมือ', 'debuff');
    if (s.taunt && alive(s.taunt.heroId)) add('taunted', 'taunt', 'ถูกยั่วยุ', `หากลงมือก่อนเทิร์นถัดไปของ${name(s.taunt.heroId)} จะเล็งไปที่ผู้นั้น`, untilTurn(s.taunt.heroId), 'debuff');
  }
  return rows;
}

// A foe's sheet for the status panel (owner 2026-10-22): its stats, whether the front row shields it, and its moves in
// the order it uses them (they cycle by round), the next one marked. Presentation only, read from the encounter data.
export interface FoeMoveRow { name: string; kind: 'physical' | 'energy'; damage: number; target: string; next: boolean; unstoppable: boolean }
export interface FoeProfile { stats: { label: string; value: string }[]; position: string; moves: FoeMoveRow[] }
export function foeProfile(s: BattleState, d: EncounterDefinition, id: string): FoeProfile | undefined {
  const def = d.enemies.find(e => e.id === id), foe = s.enemies.find(e => e.id === id);
  if (!def || !foe || foe.absent) return undefined;
  const standing = (row: 'front' | 'back') => s.enemies.some(e => e.id !== id && e.hp > 0 && d.enemies.find(x => x.id === e.id)?.row === row);
  const stats = [
    ...(d.level ? [{ label: 'เลเวล', value: `Lv${d.level}` }] : []),
    { label: 'HP', value: `${Math.max(0, foe.hp)} / ${def.maxHp}` },
    { label: 'SPD', value: String(def.speed) },
    { label: 'ตำแหน่ง', value: `${def.row === 'front' ? 'แถวหน้า' : 'แถวหลัง'}${def.boss ? ' · บอส' : def.large ? ' · ตัวใหญ่' : ''}` },
    ...(def.boss ? [{ label: 'ทนการควบคุม', value: 'ถูกขัดแล้ว 2 รอบถัดไปขัดซ้ำไม่ได้' }] : []),
    // Boss phases: the next threshold and what it brings; after the last one, the current phase.
    ...(() => {
      const phases = d.phases?.filter(p => p.sourceId === id) ?? []; if (!phases.length) return [];
      const done = foe.phase ?? 0, next = phases[done];
      const brings = (p: typeof next) => p!.summon?.length ? `เรียกลูกน้อง ${p!.summon.length} ตัว` : 'เปลี่ยนชุดท่า';
      return [{ label: 'ช่วงการต่อสู้', value: next ? `ช่วง ${done + 1}/${phases.length + 1} · เลือดต่ำกว่า ${next.below}% → ${phaseThai(next.name)} (${brings(next)})` : `ช่วงสุดท้าย ${done + 1}/${phases.length + 1}` }];
    })(),
  ];
  const position = foe.hp <= 0 ? 'ล้มแล้ว' : def.row === 'back'
    ? standing('front') ? 'ถูกแถวหน้าบัง · ฮีโร่แนวหน้าตีไม่ถึง ยกเว้นสกิลตีทะลุ (แทงทะลวง ติดตรา แทงข้างหลัง ท้าดวล) · ฮีโร่แนวหลังตีได้' : 'แถวหน้าล้มหมดแล้ว · ทุกคนตีถึง'
    : standing('back') ? 'บังศัตรูแถวหลังอยู่ · ล้มตัวนี้ก่อนฮีโร่แนวหน้าจึงตีแถวหลังได้' : 'ทุกคนตีถึง';
  const cycle = phaseMoves(s, d, id);
  const next = foe.hp > 0 && s.outcome === 'active' ? nextIntentOf(s, d, id) : null;
  const nextIndex = next && !next.special ? ((next.round - (foe.phaseRound ?? 0) - 1) % cycle.length + cycle.length) % cycle.length : -1;
  const moves = cycle.map((m, i) => {
    const hero = d.heroes[m.targetSlot];
    const target = `${hero ? actorName(hero.id, d) : `ช่อง ${m.targetSlot + 1}`}${m.kind === 'physical' ? ' (กายภาพ: แนวหน้าก่อนถ้ายังยืน)' : ''}`;
    return { name: intentName({ ...m, targetId: hero?.id ?? '', beat: 0, round: 0 }), kind: m.kind, damage: m.damage, target: m.charge ? 'ไม่โจมตี · ท่าถัดไปแรงมาก' : m.all ? 'ทั้งทีม' : target, next: i === nextIndex, unstoppable: !!m.unstoppable };
  });
  return { stats, position, moves };
}
