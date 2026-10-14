import { rearAmbush, riftWarden } from '../../src/content/encounters/catalog';
import type { Move } from './party-routes';

export const rearCombo: readonly Move[] = [
  ['weaver','ward','weaver'], ['tracer','mark','brute'], ['tracer','execute','brute'],
  ['weaver','bolt','brute'], ['guardian','bash','brute'], ['tracer','execute','brute'],
  ['weaver','bolt','brute'], ['healer','heal','healer'], ['tracer','execute','raider'],
  ['guardian','bash','raider'], ['weaver','bolt','raider'],
];
export const rearSupport: readonly Move[] = [
  ['weaver','ward','weaver'], ['weaver','bolt','brute'], ['tracer','mark','brute'],
  ['tracer','execute','brute'], ['weaver','bolt','brute'], ['guardian','guard','weaver'],
  ['tracer','execute','brute'], ['healer','heal','healer'], ['weaver','bolt','brute'],
  ['guardian','bash','raider'], ['healer','heal','weaver'], ['weaver','ward','weaver'],
  ['guardian','guard','healer'], ['guardian','guard','healer'], ['tracer','execute','raider'],
  ['weaver','bolt','raider'],
];
export const bossCombo: readonly Move[] = [
  ['guardian','bash','brute'], ['tracer','mark','brute'], ['tracer','execute','brute'],
  ['weaver','bolt','brute'], ['guardian','bash','brute'], ['guardian','guard','weaver'],
  ['tracer','execute','brute'], ['healer','prayer','party'], ['guardian','bash','brute'],
  ['tracer','execute','brute'], ['weaver','bolt','brute'], ['guardian','guard','weaver'],
  ['guardian','bash','brute'], ['tracer','execute','brute'],
];
export const bossSupport: readonly Move[] = [
  ['guardian','bash','brute'], ['tracer','execute','brute'], ['weaver','bolt','brute'],
  ['healer','heal','weaver'], ['guardian','bash','brute'], ['guardian','guard','weaver'],
  ['tracer','execute','brute'], ['weaver','bolt','brute'], ['guardian','bash','brute'],
  ['healer','prayer','party'], ['tracer','execute','brute'], ['weaver','ward','weaver'],
  ['guardian','bash','brute'], ['healer','heal','weaver'], ['tracer','execute','brute'],
  ['guardian','bash','brute'],
];
export const encounterRoutes = [
  { data: rearAmbush, name: 'rear combo', moves: rearCombo, hp: [76,20,4,8] },
  { data: rearAmbush, name: 'rear support', moves: rearSupport, hp: [55,20,2,8] },
  { data: riftWarden, name: 'boss combo', moves: bossCombo, hp: [30,14,6,8] },
  { data: riftWarden, name: 'boss support', moves: bossSupport, hp: [7,14,4,8] },
] as const;
