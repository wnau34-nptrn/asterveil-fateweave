import type { ActionId } from '../../src/core/battle/types';
export type Move = readonly [string, ActionId, string];
// Every command belongs to the next living hero in roster order.
export const guided: readonly Move[] = [
  ['guardian','guard','tracer'], ['tracer','mark','brute'], ['weaver','bolt','brute'],
  ['healer','heal','weaver'], ['guardian','bash','brute'], ['tracer','execute','brute'],
  ['weaver','bolt','brute'], ['healer','heal','weaver'], ['guardian','bash','brute'],
  ['tracer','execute','brute'], ['weaver','bolt','raider'], ['healer','prayer','party'],
  ['guardian','bash','raider'], ['tracer','execute','raider'],
];
export const offensive: readonly Move[] = [
  ['guardian','bash','raider'], ['tracer','execute','brute'], ['weaver','bolt','brute'],
  ['healer','heal','weaver'], ['guardian','bash','brute'], ['tracer','mark','brute'],
  ['weaver','bolt','brute'], ['healer','heal','weaver'], ['guardian','bash','brute'],
  ['tracer','execute','brute'], ['weaver','bolt','raider'], ['healer','attack','raider'],
  ['guardian','bash','raider'],
];
export const defensive: readonly Move[] = [
  ['guardian','bash','brute'], ['tracer','execute','brute'], ['weaver','ward','weaver'],
  ['healer','heal','weaver'], ['guardian','bash','brute'], ['tracer','execute','brute'],
  ['weaver','bolt','brute'], ['healer','prayer','party'], ['guardian','bash','brute'],
  ['tracer','execute','brute'], ['weaver','bolt','raider'], ['healer','prayer','party'],
  ['guardian','bash','raider'], ['tracer','execute','raider'],
];
