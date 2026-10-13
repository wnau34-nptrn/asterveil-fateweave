import type { ActionId } from '../../src/core/battle/types';
export type Move = readonly [string, ActionId, string];
export const offensive: readonly Move[] = [
  ['tracer','mark','brute'], ['tracer','execute','brute'], ['weaver','bolt','brute'],
  ['guardian','bash','brute'], ['tracer','execute','brute'], ['healer','prayer','party'],
  ['guardian','bash','brute'], ['tracer','execute','brute'], ['tracer','mark','raider'],
  ['weaver','bolt','raider'], ['tracer','execute','raider'],
];
export const defensive: readonly Move[] = [
  ['tracer','mark','brute'], ['guardian','guard','weaver'], ['tracer','execute','brute'],
  ['guardian','guard','tracer'], ['weaver','bolt','brute'], ['weaver','ward','weaver'],
  ['guardian','bash','raider'], ['healer','heal','guardian'], ['tracer','execute','brute'],
  ['guardian','bash','brute'], ['weaver','bolt','brute'], ['guardian','guard','weaver'],
  ['tracer','execute','brute'], ['healer','heal','weaver'], ['tracer','mark','raider'], ['tracer','execute','raider'],
];
