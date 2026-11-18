import { validateCommand } from '../core/battle/engine';
import type { ActionId, BattleState, EncounterDefinition } from '../core/battle/types';
import { wbDamage } from '../core/world/world-boss';
import { actorName } from './th';
import { battleLesson, type Lesson } from './tutorial';

export const morvaneAdvice = 'ใช้ท่าวงกว้างคุมลูกน้องถ้ามี แล้วแบ่งจังหวะตี Morvane · ลงดาเมจใส่บอสเพื่อให้ศึกนับสิทธิ์';

const singleTargetOffense: readonly ActionId[] = ['attack', 'bolt', 'mark', 'execute', 'pierce', 'dispel'];

export function morvaneLesson(state: BattleState, data: EncounterDefinition): Lesson | undefined {
  const advice = battleLesson(state, data);
  const boss = data.enemies.find(foe => foe.boss);
  if (!advice || !boss?.court || advice.targetId === boss.id || !singleTargetOffense.includes(advice.action)) return advice;

  const creditedDamage = wbDamage(state, data);
  if (creditedDamage) {
    // With damage on the board, keep the usual targets while the full court stands or an ally is badly hurt.
    const slots = new Set<string>(boss.court.by);
    const court = state.enemies.filter(foe => foe.hp > 0 && slots.has(foe.id)).length;
    const wounded = data.heroes.some(hero => {
      const hp = state.heroes.find(unit => unit.id === hero.id)?.hp ?? 0;
      return hp > 0 && hp * 2 < hero.maxHp;
    });
    if (court === slots.size || wounded) return advice;
  }
  const { action, heroId } = advice;
  if (validateCommand(state, data, { beat: state.beat, action, heroId, targetId: boss.id })) return advice;
  const title = action === 'mark' ? 'ติดตราเตรียมโจมตีบอส' : creditedDamage ? 'ฉวยจังหวะโจมตีบอส' : 'โจมตีบอสเพื่อนับสิทธิ์';
  return {
    step: advice.step,
    action,
    heroId,
    targetId: boss.id,
    title,
    copy: `${actorName(heroId, data)} → ${data.skills[action].name} → ${actorName(boss.id, data)}`,
  };
}
