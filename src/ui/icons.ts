import type { ActionId } from '../core/battle/types';
import attack from './svg/attack.svg?raw';
import guard from './svg/guard.svg?raw';
import bash from './svg/bash.svg?raw';
import mark from './svg/mark.svg?raw';
import execute from './svg/precision-strike.svg?raw';
import bolt from './svg/arcane-bolt.svg?raw';
import ward from './svg/ward.svg?raw';
import heal from './svg/heal.svg?raw';
import prayer from './svg/prayer.svg?raw';
import up from './svg/up.svg?raw';
import down from './svg/down.svg?raw';
import left from './svg/left.svg?raw';
import right from './svg/right.svg?raw';
import camp from './svg/camp.svg?raw';
import rest from './svg/rest.svg?raw';
import flag from './svg/flag.svg?raw';
import goal from './svg/gate.svg?raw';
import star from './svg/star.svg?raw';
import danger from './svg/danger.svg?raw';
import safe from './svg/safe-shield.svg?raw';
import talk from './svg/talk.svg?raw';
import info from './svg/info.svg?raw';
import map from './svg/map.svg?raw';
import boss from './svg/boss.svg?raw';
import check from './svg/check.svg?raw';
import circle from './svg/circle.svg?raw';
import close from './svg/close.svg?raw';
import footprints from './svg/footprints.svg?raw';
// ART-WORLD-LOOT-001 line icons (accepted 2026-10-15) and individual star rank badges.
import chest from './svg/chest.svg?raw';
import chestOpen from './svg/chest-open.svg?raw';
import ore from './svg/ore.svg?raw';
import ember from './svg/ember.svg?raw';
import seal from './svg/seal.svg?raw';
import pack from './svg/pack.svg?raw';
import starFilled from './svg/star-filled.svg?raw';
import starBadge from './svg/star_badge.svg?raw';
import starBadgeEmpty from './svg/star_badge_empty.svg?raw';

// Original ART-UI-WORLD-001 line icons (24px viewBox, currentColor). Inlined so they inherit state colour.
const svgs = { attack, guard, bash, mark, execute, bolt, ward, heal, prayer, up, down, left, right, camp, rest, flag, goal, star, danger, safe, talk, info, map, boss, check, circle, close, footprints, chest, chestOpen, ore, ember, seal, pack, starFilled, starBadge, starBadgeEmpty } as const;
const restartPath = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></svg>';
export type IconName = ActionId | keyof typeof svgs | 'restart';
export function icon(name: IconName): string {
  const svg = name === 'restart' ? restartPath : svgs[name];
  return svg.replace('<svg ', '<svg class="icon" aria-hidden="true" focusable="false" ');
}
