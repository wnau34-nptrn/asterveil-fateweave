import { targetOptions } from '../core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../core/battle/types';
import { actorName } from './th';

export interface Lesson {
  step: number;
  title: string;
  copy: string;
  heroId: string;
  action: ActionId;
  targetId: string;
}

// Optional advice reads the real battle; it never commits or changes a command.
export function battleLesson(state: BattleState, data: EncounterDefinition): Lesson | undefined {
  if (state.outcome !== 'active' || state.beat > 3) return;
  const make = (heroId: string, action: ActionId, targetId: string, title: string, detail: string): Lesson | undefined => {
    if (!targetOptions(state, data, heroId, action).some(t => t.id === targetId && t.valid)) return;
    return { step: state.beat, heroId, action, targetId, title,
      copy: `${actorName(heroId, data)} → ${data.skills[action].name} → ${actorName(targetId, data)} · ${detail}` };
  };
  if (state.beat === 1 && state.intent) {
    if (state.intent.kind === 'energy') {
      return make('weaver', 'ward', state.intent.targetId, 'ป้องกันพลังงานถึงแนวหลัง',
        `โล่รับ ${Math.min(data.skills.ward.power, state.intent.damage)} · เลือดเสีย ${Math.max(0, state.intent.damage - data.skills.ward.power)}`);
    }
    if (data.enemies.length === 1) {
      return make('guardian', 'bash', state.intent.sourceId, 'ขัดจังหวะโจมตีกายภาพ', 'กระแทกผู้โจมตีเพื่อหยุดการตอบโต้จังหวะนี้');
    }
    const damage = Math.ceil(state.intent.damage * (1 - data.rules.guardReduction));
    return make('guardian', 'guard', state.intent.targetId, 'อ่านแผนศัตรู', `รับแทนและลดพลัง ${state.intent.damage} → ${damage}`);
  }
  const marked = state.enemies.find(e => e.hp > 0 && e.markedUntil > state.beat);
  if (marked) {
    const bonus = data.rules.markedBonus;
    const strike = make('tracer', 'execute', marked.id, 'ตีเป้าเดิมเพื่อใช้ตรา', `พลัง ${data.skills.execute.power} + ${bonus} = ${data.skills.execute.power + bonus}`);
    if (strike) return strike;
    const attack = data.heroes.find(h => h.id === 'tracer')!.attack;
    return make('tracer', 'attack', marked.id, 'ตีเป้าเดิมเพื่อใช้ตรา', `พลัง ${attack} + ${bonus} = ${attack + bonus}`);
  }
  const target = state.enemies.find(e => e.id === 'brute' && e.hp > 0) ?? state.enemies.find(e => e.hp > 0);
  if (target) return make('tracer', 'mark', target.id, state.beat === 2 ? 'ติดตราเตรียมคอมโบ' : 'ตราต้องใช้กับเป้าเดิม',
    state.beat === 2 ? 'ยังไม่ทำความเสียหาย' : `แล้วไลราตีเป้าเดิมเพื่อเพิ่มพลัง +${data.rules.markedBonus}`);
}
