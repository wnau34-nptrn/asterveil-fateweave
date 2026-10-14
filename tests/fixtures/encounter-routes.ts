import { rearAmbush, riftWarden } from '../../src/content/encounters/catalog';
import type { Move } from './party-routes';
export const rearCombo: readonly Move[] = [
 ['guardian','bash','raider'], ['tracer','execute','brute'], ['weaver','bolt','raider'],
 ['healer','prayer','party'], ['guardian','guard','weaver'], ['tracer','execute','raider'],
 ['weaver','bolt','brute'], ['healer','prayer','party'], ['guardian','bash','brute'],
 ['tracer','mark','brute'], ['weaver','bolt','brute'], ['healer','heal','weaver'],
 ['guardian','guard','weaver'], ['tracer','execute','brute'],
];
export const rearSupport: readonly Move[] = [
 ['guardian','bash','raider'], ['tracer','execute','brute'], ['weaver','bolt','raider'],
 ['healer','heal','weaver'], ['guardian','guard','weaver'], ['tracer','execute','raider'],
 ['weaver','bolt','brute'], ['healer','prayer','party'], ['guardian','guard','healer'],
 ['tracer','execute','brute'], ['weaver','ward','weaver'], ['healer','prayer','party'],
 ['guardian','bash','brute'], ['tracer','execute','brute'], ['weaver','bolt','brute'],
];
export const bossCombo: readonly Move[] = [
 ['guardian','bash','brute'], ['tracer','mark','brute'], ['weaver','bolt','brute'],
 ['healer','heal','weaver'], ['guardian','bash','brute'], ['tracer','execute','brute'],
 ['weaver','bolt','brute'], ['healer','prayer','party'], ['guardian','bash','brute'],
 ['tracer','execute','brute'], ['weaver','bolt','brute'], ['healer','prayer','party'],
 ['guardian','bash','brute'], ['tracer','execute','brute'],
];
export const bossSupport: readonly Move[] = [
 ['guardian','bash','brute'], ['tracer','execute','brute'], ['weaver','bolt','brute'],
 ['healer','heal','weaver'], ['guardian','bash','brute'], ['tracer','execute','brute'],
 ['weaver','bolt','brute'], ['healer','prayer','party'], ['guardian','bash','brute'],
 ['tracer','execute','brute'], ['weaver','ward','weaver'], ['healer','heal','weaver'],
 ['guardian','bash','brute'], ['tracer','execute','brute'], ['weaver','bolt','brute'],
];
export const encounterRoutes = [
 {data:rearAmbush,name:'rear combo',moves:rearCombo,hp:[70,51,7,5]},
 {data:rearAmbush,name:'rear support',moves:rearSupport,hp:[76,56,1,5]},
 {data:riftWarden,name:'boss combo',moves:bossCombo,hp:[70,36,2,30]},
 {data:riftWarden,name:'boss support',moves:bossSupport,hp:[60,26,6,20]},
] as const;
