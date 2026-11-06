import { formation } from './formation';
import { reserveSlots } from './profile';
import { canManage, recommendedLane, reserveCap, rosterIds, type EncounterLookup } from './world';
import { PARTY_SLOTS, PRESET_NAME_MAX, PRESET_SLOTS, type ExpeditionState, type MapDefinition, type Profile, type ProfileResult, type Roster, type TeamPreset, type WorldResult } from './types';

// Team presets (owner 2026-11-06, save v55; slot count and name length are drafts). A preset is a saved line-up:
// field order, reserve and the column each fielded member stood in. Applying one is the same as doing the existing
// one-at-a-time moves by hand: at the camp it rearranges `profile.party` within the reserve the camp has unlocked; on
// the map (outside battle only) it rearranges the members this run brought. Nothing else changes: formation keeps
// its column rule, fatigue still moves only when a battle is fought, and a battle in progress cannot be touched.

const blocked = (profile: Profile, reason: string): ProfileResult => ({ profile, event: { type: 'blocked', reason } });
export const presetOf = (profile: Pick<Profile, 'presets'>, slot: number): TeamPreset | undefined => profile.presets?.[slot] ?? undefined;
export const defaultPresetName = (slot: number): string => `ชุด ${slot + 1}`;
// A name is 1..PRESET_NAME_MAX visible characters (Thai marks count with their letter), no control characters.
export function presetNameReason(name: string): string {
  const t = name.trim(); if (!t) return 'empty';
  if (/[\p{Cc}\p{Cf}]/u.test(t)) return 'invalid';
  return [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(t)].length > PRESET_NAME_MAX ? 'long' : '';
}
const slotOk = (slot: number) => Number.isInteger(slot) && slot >= 0 && slot < PRESET_SLOTS;
// Write `preset` into `slot`, keeping the list as short as it can be (trailing empty slots dropped, none = missing).
function put(profile: Profile, slot: number, preset: TeamPreset | null): void {
  const list = Array.from({ length: PRESET_SLOTS }, (_, i) => i === slot ? preset : profile.presets?.[i] ?? null);
  while (list.length && list[list.length - 1] === null) list.pop();
  if (list.length) profile.presets = list; else delete profile.presets;
}

// The current camp team as a preset: every fielded member's actual column is written down so it stands there again.
export function snapshot(roster: Roster, recommended: (id: string) => 'front' | 'back', name: string): TeamPreset {
  return { name, deployed: [...roster.deployed], reserve: [...roster.reserve], lanes: formation(roster, recommended) };
}
export function savePreset(initial: Profile, map: MapDefinition, lookup: EncounterLookup, slot: number, name?: string): ProfileResult {
  if (!slotOk(slot)) return blocked(initial, 'unknown');
  const label = (name ?? presetOf(initial, slot)?.name ?? defaultPresetName(slot)).trim();
  const reason = presetNameReason(label); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); put(profile, slot, snapshot(profile.party, recommendedLane(lookup, map), label));
  return { profile, event: { type: 'party', preset: slot, presetAction: 'save' } };
}
export function renamePreset(initial: Profile, slot: number, name: string): ProfileResult {
  const preset = slotOk(slot) ? presetOf(initial, slot) : undefined; if (!preset) return blocked(initial, 'unknown');
  const reason = presetNameReason(name); if (reason) return blocked(initial, reason);
  const profile = structuredClone(initial); put(profile, slot, { ...structuredClone(preset), name: name.trim() });
  return { profile, event: { type: 'party', preset: slot, presetAction: 'rename' } };
}
export function clearPreset(initial: Profile, slot: number): ProfileResult {
  if (!slotOk(slot) || !presetOf(initial, slot)) return blocked(initial, 'unknown');
  const profile = structuredClone(initial); put(profile, slot, null);
  return { profile, event: { type: 'party', preset: slot, presetAction: 'clear' } };
}
// A dismissed member leaves every preset (a preset left with nobody empties; the first reserve steps up if the field
// emptied). Called by `dismiss`.
export function dropFromPresets(profile: Profile, id: string): void {
  if (!profile.presets) return;
  for (let i = 0; i < profile.presets.length; i++) {
    const p = profile.presets[i]; if (!p || ![...p.deployed, ...p.reserve].includes(id)) continue;
    const deployed = p.deployed.filter(m => m !== id), reserve = p.reserve.filter(m => m !== id), lanes = { ...p.lanes }; delete lanes[id];
    if (!deployed.length && reserve.length) deployed.push(reserve.shift()!);
    put(profile, i, deployed.length ? { ...p, deployed, reserve, lanes } : null);
  }
}

// What applying `slot` at the camp gives: the field as saved, the reserve up to the slots unlocked now (`left` = saved
// reserve members with no free slot; they stay in the camp). Everyone named is still owned (`dismiss` keeps presets clean).
export interface PresetPlan { roster: Roster; left: string[] }
export function campPresetPlan(profile: Profile, map: Pick<MapDefinition, 'company'>, slot: number): PresetPlan | undefined {
  const p = presetOf(profile, slot); if (!p) return undefined;
  const owned = (id: string) => profile.company.includes(id);
  const deployed = p.deployed.filter(owned).slice(0, PARTY_SLOTS); if (!deployed.length) return undefined;
  const saved = p.reserve.filter(owned), cap = reserveSlots(profile, map);
  return { roster: { deployed, reserve: saved.slice(0, cap), lanes: { ...profile.party.lanes, ...p.lanes } }, left: saved.slice(cap) };
}
export function applyPreset(initial: Profile, map: Pick<MapDefinition, 'company'>, slot: number): ProfileResult {
  const plan = campPresetPlan(initial, map, slot); if (!plan) return blocked(initial, 'unknown');
  const profile = structuredClone(initial); profile.party = plan.roster;
  // Bringing someone back into the team takes them out of the archive (as `placeMember` does).
  const team = [...plan.roster.deployed, ...plan.roster.reserve];
  if (profile.archived) { profile.archived = profile.archived.filter(id => !team.includes(id)); if (!profile.archived.length) delete profile.archived; }
  return { profile, event: { type: 'party', preset: slot, presetAction: 'apply', ...(plan.left.length ? { left: plan.left } : {}) } };
}

// On the map (outside battle) a preset rearranges the members this run brought; nobody joins or leaves the run.
// Saved field members who were brought take the field in the saved order; saved reserve members fill the reserve next.
// Everyone else brought keeps a place: in the reserve while it has room, else on the field (current field members first).
// `absent` = saved members this run did not bring.
export interface RunPresetPlan { roster: Roster; absent: string[] }
export function runPresetPlan(state: ExpeditionState, preset: TeamPreset): RunPresetPlan | undefined {
  const carried = rosterIds(state), here = (id: string) => carried.includes(id);
  const deployed = preset.deployed.filter(here).slice(0, PARTY_SLOTS); if (!deployed.length) return undefined;
  const savedReserve = preset.reserve.filter(id => here(id) && !deployed.includes(id));
  const others = [...state.roster.deployed, ...state.roster.reserve].filter(id => !deployed.includes(id) && !savedReserve.includes(id));
  const cap = reserveCap(state); const reserve = [...savedReserve, ...others];
  // Too many for the reserve: the unsaved members step onto the field first (current field members before reserve),
  // then saved reserve members from the back of the list.
  while (reserve.length > cap && deployed.length < PARTY_SLOTS) {
    const from = reserve.length > savedReserve.length ? reserve.findIndex(id => !savedReserve.includes(id)) : reserve.length - 1;
    deployed.push(reserve.splice(from, 1)[0]!);
  }
  if (reserve.length > cap) return undefined;
  return { roster: { deployed, reserve, lanes: { ...state.roster.lanes, ...preset.lanes } }, absent: [...preset.deployed, ...preset.reserve].filter(id => !here(id)) };
}
export function applyRunPreset(initial: ExpeditionState, preset: TeamPreset | undefined, slot: number): WorldResult {
  const plan = preset && canManage(initial) ? runPresetPlan(initial, preset) : undefined;
  if (!plan) return { state: initial, event: { type: 'blocked', reason: 'busy' } };
  const state = structuredClone(initial); state.roster = plan.roster;
  return { state, event: { type: 'roster', preset: slot, ...(plan.absent.length ? { absent: plan.absent } : {}) } };
}
// Whether the team stands exactly as `preset` (same field order, same reserve, same columns).
export function matchesPreset(roster: Roster, preset: TeamPreset | null | undefined, lanes: Readonly<Record<string, 'front' | 'back'>>): boolean {
  if (!preset) return false;
  const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  return same(roster.deployed, preset.deployed) && same([...roster.reserve].sort(), [...preset.reserve].sort())
    && roster.deployed.every(id => !preset.lanes[id] || preset.lanes[id] === lanes[id]);
}
export const presetSlots = (): number[] => Array.from({ length: PRESET_SLOTS }, (_, i) => i);
