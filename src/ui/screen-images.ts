// The artwork each screen paints (image-blank fix 2026-11-21, B1/B2). `main` is what a screen switch waits for (the
// scene the player sees at once); `extra` is fetched ahead but never waited on (heavy or secondary layers).
// URLs must match the ones the screens use exactly (CSS `url('/assets/…')` is rewritten to the same BASE_URL path).
import type { Profile } from '../core/world/types';
import { actorArt, artUrl, lobbyArt, lobbyPose, NPC_IDS, npcAtlasUrl, npcBustsUrl, npcStationsUrl, portraitsHalfUrl } from '../game/visuals/assets';
import { fogFills, worldArtUrl } from '../game/visuals/world-art';

export interface ScreenImages { main: string[]; extra: string[] }
const base = (): string => import.meta.env.BASE_URL;
const uniq = (list: (string | undefined)[]): string[] => [...new Set(list.filter((u): u is string => !!u))];
const teamPortraits = (ids: readonly string[]): string[] => uniq(ids.map(id => actorArt[id] ? portraitsHalfUrl(actorArt[id].sheet) : undefined));

/** Camp: backdrop, fire, the six NPCs at their stations and the main team's pose sheets. */
export function campImages(profile: Pick<Profile, 'party' | 'company'>): ScreenImages {
  const team = profile.party.deployed.slice(0, 5);
  return {
    main: uniq([lobbyArt('lobby_bg'), lobbyArt('lobby_fg'), lobbyArt('lobby_firepit'), `${base()}assets/lobby/camp_flame.webp`,
      npcStationsUrl(), ...NPC_IDS.map(npcAtlasUrl), ...team.map(id => lobbyPose(id, 'sit')?.url)]),
    extra: uniq([`${base()}assets/title/title_bg.webp`, npcBustsUrl(), ...teamPortraits(profile.company)]),
  };
}

const fogLayersAll = [...fogFills, ...['n', 's', 'e', 'w'].map(d => `fog_edge_${d}`), ...['ne', 'nw', 'se', 'sw'].flatMap(d => [`fog_inner_${d}`, `fog_corner_${d}`])];
const landmarks = ['landmark_camp', 'landmark_start', 'landmark_gate', 'landmark_gate_open', 'boss_pedestal', 'landmark_boss_cleared'];
/** Map: floor tiles, props, fog and landmarks (shared by every map); the team's portraits are fetched ahead only. */
export function worldImages(team: readonly string[] = []): ScreenImages {
  return {
    main: ['tileset', 'decor', 'map_props', 'token_frame', ...fogFills, ...landmarks].map(worldArtUrl),
    extra: uniq([...fogLayersAll.filter(l => !(fogFills as readonly string[]).includes(l)), 'step_hint', 'step_dust', 'puzzle', 'chests', 'items'].map(worldArtUrl).concat(teamPortraits(team))),
  };
}

export type BattleBackdrop = 'ruins' | 'forest' | 'riftline';
/** The battle painting behind the whole battle view (`#battle-view[data-scene]` in game-feel.css). */
export function battleBackdropUrl(scene: BattleBackdrop): string {
  return scene === 'ruins' ? artUrl('ruins') : `${base()}assets/art/battle_${scene}.webp`;
}
export const battleSceneOf = (mapId: string): BattleBackdrop => mapId === 'deep-forest' ? 'forest' : mapId === 'veil-frontier' ? 'riftline' : 'ruins';
