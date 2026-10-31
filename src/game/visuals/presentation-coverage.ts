import type { ActionId, EncounterDefinition, IntentDefinition } from '../../core/battle/types';
import { targetKind } from '../../core/battle/engine';
import { encounters } from '../../content/encounters/catalog';
import { veilSiege } from '../../content/encounters/veil-siege';
import { heroes } from '../../content/heroes/team';
import { mercenaries } from '../../content/heroes/mercenaries';
import { talentTrees } from '../../content/heroes/talents';
import { actionPoses } from './unit-animation-map';
import { sequence, unitClip, unitDefinition, unitDownFrame, unitRegistry, unitSheets, type UnitClip } from './unit-frames';
import atlasManifest from './unit-atlases.json';
import { isProjectileSkill } from './projectile-fx';
import { isCommandSkill } from './command-fx';
import { isSongSkill } from './song-fx';
import { isSdSkill, saintSkills } from './saint-dance-fx';
import { isSealSkill } from './arcane-seal-fx';
import { isAlchemySkill } from './alchemy-fx';
import { isEarthSkill } from './earth-fx';
import { isHealingSkill } from './healing-fx';
import { isDefenseSkill } from './defense-fx';
import { isBladeSkill } from './blade-fx';
import { isFoeSignatureMove, isGroundMove } from './foe-signature-fx';
import { bossMoves } from './boss-signature-fx';
import defenseArt from './defense-art.json';

// W8 presentation coverage (docs/combat-presentation/COVERAGE_TH.md): every visual identity × every ActionId/intent it can
// really perform → body clip + VFX module + target + effect point, built from the registry and the content, never by hand.
// `vfxModule` mirrors the routing order of BattleScene.prepare/play; tests/presentation-coverage.test.ts fails when the
// committed table no longer matches this code. Presentation only.

// Parked identities (OD-14, owner 2026-10-30): redesigned still + procedural motion, no atlas until A7-003.
export const PARKED: Readonly<Record<string, string>> = {
  thiran: 'OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง)',
  wila: 'OD-14 พัก: ภาพนิ่งใหม่ (PR #120) + procedural; atlas รอ A7-003 (PR #122 ค้าง)',
};
const heroRoster = [...heroes, ...mercenaries.filter(m => !heroes.some(h => h.id === m.id))];
const roles: Readonly<Record<string, string>> = Object.fromEntries(heroRoster.map(h => [h.id, h.role]));

// Every ActionId a character can use: its starting actions plus every tree unlock.
export function heroActions(id: string): ActionId[] {
  const hero = heroRoster.find(h => h.id === id)!;
  const unlocked = (talentTrees[id] ?? []).flatMap(n => 'unlock' in n.effect && n.effect.unlock ? [n.effect.unlock] : []);
  return [...new Set([...hero.actions, ...unlocked])];
}

export type VfxModule = 'projectile-fx' | 'basic-attack-fx' | 'command-fx' | 'song-shadow-fx' | 'saint-dance-fx' | 'arcane-seal-fx'
  | 'alchemy-fx' | 'earth-fx' | 'healing-fx' | 'defense-fx' | 'blade-fx' | 'exec-ward-fx' | 'bolt-fx'
  | 'foe-signature-fx' | 'boss-signature-fx' | 'generic-code';
// Painted (own atlas) vs intentionally shared/code-drawn.
export const vfxKind = (module: VfxModule, shared: boolean): 'painted' | 'shared' | 'code' =>
  module === 'generic-code' || module === 'basic-attack-fx' ? 'code' : shared ? 'shared' : 'painted';

// Same order as BattleScene.prepare for a hero turn.
export function heroVfx(action: ActionId, role: string): VfxModule {
  if (isProjectileSkill(action)) return 'projectile-fx';
  if (action === 'attack' && (role === 'Archer' || role === 'Alchemist')) return 'basic-attack-fx';
  if (isCommandSkill(action)) return 'command-fx';
  if (isSongSkill(action)) return 'song-shadow-fx';
  if (isSdSkill(action)) return 'saint-dance-fx';
  if (isSealSkill(action)) return 'arcane-seal-fx';
  if (isAlchemySkill(action)) return 'alchemy-fx';
  if (isEarthSkill(action)) return 'earth-fx';
  if (isHealingSkill(action)) return 'healing-fx';
  if (isDefenseSkill(action)) return 'defense-fx';
  if (isBladeSkill(action)) return 'blade-fx';
  if (action === 'ward' || action === 'execute') return 'exec-ward-fx';
  if (action === 'bolt') return 'bolt-fx';
  return 'generic-code';
}
// Same order for an enemy turn (phase turns carry the phase name).
export function foeVfx(name: string, kind: IntentDefinition['kind']): VfxModule {
  if (isFoeSignatureMove(name)) return 'foe-signature-fx';
  if (Object.hasOwn(bossMoves, name)) return 'boss-signature-fx';
  if (kind === 'physical') return 'blade-fx';
  return 'generic-code';
}

const heroTargets: Readonly<Record<string, string>> = {
  enemy: 'ศัตรู 1 ตัว (ตรวจซ้ำตอน commit)', enemies: 'ศัตรูทุกตัวที่ยืนอยู่', ally: 'พันธมิตร 1 คน', self: 'ตัวเอง', party: 'ทั้งทีม',
};
// Where the effect lands (the event recipient that the module reads), per module.
function heroPoint(module: VfxModule, action: ActionId): string {
  switch (module) {
    case 'projectile-fx': return 'ออกจากจุดปล่อยบนเฟรมร่างกาย → อกผู้รับ damage/dodge จริง (หลบ = เลยตัว)';
    case 'basic-attack-fx': return 'ออกจากจุดปล่อย → ขอบหน้าผู้รับ damage จริง';
    case 'command-fx': return action === 'challenge' ? 'โล่ผู้ร่าย → ศัตรูที่ถูกท้าจริง 1 ตัว' : action === 'warcry' ? 'อกผู้ร่าย (buff) + เป้าที่ถูกสวนจริงต่อ event' : 'อก/ค้อนผู้ร่าย (stance ตัวเอง)';
    case 'song-shadow-fx': return action === 'evade' ? 'เท้าผู้ร่าย' : action === 'decoy' ? 'ข้างพันธมิตรที่ถูกคุ้มจริง' : action === 'solo' ? 'หลังพันธมิตรที่ได้ Solo จริง'
      : action === 'note' ? 'ผู้รับ damage จริง' : action === 'dread' ? 'ฝั่งศัตรูที่ยืนอยู่ (ไม่ใช่ฮิต)' : action === 'finale' ? 'ศัตรูที่โดนจริง / พันธมิตรที่ได้ heal-โล่จริง' : 'ผู้ร่าย → พันธมิตรที่ยืนอยู่';
    case 'saint-dance-fx': return (saintSkills as readonly string[]).includes(action) ? 'ศัตรูที่โดนจริง + เส้นถึงพันธมิตรที่ได้ heal จริง'
      : action === 'echofoot' ? 'ศัตรูที่โดนจริง (เส้นเดียว)' : 'พันธมิตรที่ได้ cooldown จริงเท่านั้น';
    case 'arcane-seal-fx': return action === 'sigil' ? 'เท้าศัตรูจริง' : action === 'storm' ? 'กลางตัว → เท้าศัตรูที่โดนจริงทุกตัว' : 'กลางตัวเป้าจริง';
    case 'alchemy-fx': return 'ผู้รับ event จริง (ศัตรู: ตัว, พันธมิตร: ตัว) รวม chain ของ catalyst';
    case 'earth-fx': return 'พื้นใต้ศัตรูที่โดนจริง (+ heal จริงแยก)';
    case 'healing-fx': return 'ฐานเท้าผู้รับ heal/barrier จริง (รวม upkeep)';
    case 'defense-fx': { const p = (defenseArt.profiles as Record<string, { placement: string; anchor: string }>)[action];
      return `${p?.placement === 'source' ? 'ผู้ร่าย' : 'ผู้รับจริง'} — ${p?.anchor === 'feet' ? 'ขา/พื้น' : 'ตัว'}`; }
    case 'blade-fx': return action === 'parry' ? 'ผู้ร่าย (stance) + ผู้รับ counter จริง' : 'ตัวผู้รับ damage จริง';
    case 'exec-ward-fx': return action === 'ward' ? 'ผู้รับ barrier จริง' : 'ตัวผู้รับ damage จริง (+ ตราเมื่อติด Mark จริง)';
    case 'bolt-fx': return 'ไม้เท้า → ตัวผู้รับจริง';
    default: return 'เส้นจากผู้กระทำถึงผู้รับจริง';
  }
}
function foeTarget(intent: Pick<IntentDefinition, 'targetSlot' | 'all' | 'charge'> & { phase?: boolean; summon?: boolean }): string {
  if (intent.phase) return intent.summon ? 'ตัวเอง + กำลังเสริมที่ปรากฏจริง' : 'ตัวเอง (เปลี่ยนช่วง)';
  if (intent.charge) return 'ตัวเอง (รวมพลัง ไม่มี damage)';
  if (intent.all) return 'ฮีโร่ทุกคนที่ยืนอยู่';
  return `ฮีโร่ช่อง ${intent.targetSlot + 1} (freeze ตอนเริ่มเทิร์น; Guard/Taunt เปลี่ยนผู้รับ)`;
}
function foePoint(module: VfxModule, name: string, route?: string): string {
  if (module === 'foe-signature-fx') return isFoeSignatureMove(name) && isGroundMove(name) ? 'เท้าศัตรู → พื้นใต้ผู้รับจริง' : 'มือหน้าศัตรู → อกผู้รับ damage จริง (หลบ = เลยตัว)';
  if (module === 'boss-signature-fx') return route === 'charge' ? 'ตัวบอส + ค้างจนปล่อยท่า' : route === 'caster' ? 'ตัวบอส' : route === 'summon' ? 'ตำแหน่งตัวที่ถูกเรียกจริง' : route === 'all' ? 'ฮีโร่ที่โดนจริงทุกคน' : 'ผู้รับ damage จริง';
  if (module === 'blade-fx') return 'ตัวผู้รับ damage จริง (ชุดดาบร่วม)';
  return 'เส้น+แกนพลังงานถึงผู้รับจริง (วาดด้วยโค้ด)';
}

export interface BodyCoverage { kind: 'sprite' | 'procedural'; clip?: UnitClip; frames?: { prepare: readonly number[]; recover: readonly number[] }; pose: string; reason?: string }
function body(art: string, pose: string, action?: string, intent?: string): BodyCoverage {
  if (PARKED[art]) return { kind: 'procedural', pose, reason: PARKED[art] };
  if (!unitDefinition(art)) return { kind: 'procedural', pose, reason: 'ไม่มี atlas ใน registry' };
  const clip = unitClip(art, action, intent);
  if (!clip) return { kind: 'procedural', pose, reason: 'ไม่มี clip สำหรับท่านี้ใน registry' };
  // The same lookup BattleScene's frame view uses (the pose argument does not select frames).
  const prepare = sequence('slash', 'prepare', clip, art), recover = sequence('slash', 'recover', clip, art);
  if (!prepare || !recover) return { kind: 'procedural', pose, clip, reason: 'clip ไม่อยู่ใน layout ของ atlas' };
  return { kind: 'sprite', clip, frames: { prepare, recover }, pose };
}
export interface ReactionCoverage { hit: string; block: string; dodge: string; down: string; counter?: string }
function reactions(art: string): ReactionCoverage {
  const dodge = 'procedural (เลื่อนหลบ ไม่มีเฟรมเฉพาะ)';
  if (PARKED[art] || !unitDefinition(art)) return { hit: 'procedural', block: 'procedural', dodge, down: 'procedural (ภาพนิ่งจาง)' };
  const show = (pose: 'hit' | 'block' | 'down' | 'counter', fallback: string) => { const f = sequence(pose, 'reaction', undefined, art); return f ? `sprite ${f.join(',')}` : fallback; };
  const counter = sequence('counter', 'reaction', undefined, art);
  return { hit: show('hit', 'procedural'), block: show('block', 'procedural (tint/lift)'), dodge, down: `${show('down', 'procedural')} · ค้าง ${unitDownFrame(art)}`,
    ...(counter ? { counter: `sprite ${counter.join(',')}` } : {}) };
}
export interface CoverageRow {
  identity: string; side: 'hero' | 'enemy'; move: string; name: string; kind?: string;
  body: BodyCoverage; vfx: { module: VfxModule; kind: 'painted' | 'shared' | 'code'; note?: string }; target: string; point: string; encounters?: string[];
}
export interface AtlasInfo { image: string; atlas: string; frames: number; decodedBytes: number; downloadBytes: number }
export interface IdentityCoverage { identity: string; side: 'hero' | 'enemy'; name: string; sheet?: string; atlas?: AtlasInfo; parked?: string; reactions: ReactionCoverage }

// Enemy moves an identity really performs: announced intents plus generated phase turns, from every catalog encounter.
interface FoeMove { name: string; kind: IntentDefinition['kind']; charge?: boolean; all?: boolean; targetSlot: number; phase?: boolean; summon?: boolean; encounters: Set<string> }
function foeMoves(list: readonly EncounterDefinition[]): Map<string, { name: string; moves: Map<string, FoeMove> }> {
  const out = new Map<string, { name: string; moves: Map<string, FoeMove> }>();
  for (const data of list) {
    const arts = new Map<string, EncounterDefinition['enemies'][number]>(data.enemies.map(e => [e.id, e]));
    const add = (sourceId: string, m: Omit<FoeMove, 'encounters'>) => {
      const e = arts.get(sourceId); if (!e) return;
      const art = e.art ?? e.id, entry = out.get(art) ?? { name: e.displayName ?? e.name, moves: new Map() };
      out.set(art, entry);
      const key = m.name, prior = entry.moves.get(key);
      if (prior) { prior.encounters.add(data.id); prior.all ||= m.all; prior.charge ||= m.charge; } else entry.moves.set(key, { ...m, encounters: new Set([data.id]) });
    };
    for (const i of data.intents) add(i.sourceId, { name: i.name, kind: i.kind, charge: i.charge, all: i.all, targetSlot: i.targetSlot });
    for (const p of data.phases ?? []) add(p.sourceId, { name: p.name, kind: 'energy', targetSlot: 0, phase: true, summon: !!(p.summon?.length || p.hardSummon?.length) });
  }
  return out;
}

export interface PresentationCoverage {
  counts: { identities: number; heroes: number; enemies: number; atlases: number; parked: number; actionIds: number; heroRows: number; intents: number; foeRows: number;
    spriteRows: number; proceduralRows: number; paintedRows: number; sharedRows: number; codeRows: number };
  identities: IdentityCoverage[]; rows: CoverageRow[];
}
export function presentationCoverage(list: readonly EncounterDefinition[] = encounters): PresentationCoverage {
  const rows: CoverageRow[] = [], identities: IdentityCoverage[] = [];
  const skills = veilSiege.skills as Record<string, { name: string }>;
  const ident = (identity: string, side: 'hero' | 'enemy', name: string): IdentityCoverage => {
    const sheet = (unitSheets as Record<string, string>)[identity];
    const entry = sheet ? (atlasManifest as Record<string, AtlasInfo>)[sheet] : undefined;
    return { identity, side, name, ...(sheet ? { sheet } : {}),
      ...(entry ? { atlas: { image: entry.image, atlas: entry.atlas, frames: entry.frames, decodedBytes: entry.decodedBytes, downloadBytes: entry.downloadBytes } } : {}),
      ...(PARKED[identity] ? { parked: PARKED[identity] } : {}), reactions: reactions(identity) };
  };
  for (const hero of heroRoster) {
    identities.push(ident(hero.id, 'hero', hero.name));
    for (const action of heroActions(hero.id)) {
      const module = heroVfx(action, roles[hero.id]!);
      const shared = module === 'blade-fx' && action === 'attack';
      rows.push({ identity: hero.id, side: 'hero', move: action, name: skills[action]?.name ?? action,
        body: body(hero.id, action === 'attack' ? 'role basic' : actionPoses[action], action),
        vfx: { module, kind: vfxKind(module, shared), ...(shared ? { note: 'ฟันร่วมตามสีอาชีพ (ตั้งใจ)' } : module === 'basic-attack-fx' ? { note: 'ลูกธนู/ขวดวาดด้วยโค้ด (AV03 ตั้งใจ ไม่ใช้ภาพสกิล)' } : {}) },
        target: heroTargets[targetKind(action)]!, point: heroPoint(module, action) });
    }
  }
  for (const [art, entry] of [...foeMoves(list)].sort(([a], [b]) => a.localeCompare(b))) {
    identities.push(ident(art, 'enemy', entry.name));
    for (const m of entry.moves.values()) {
      const module = foeVfx(m.name, m.kind), shared = module === 'blade-fx';
      const pose = m.phase || m.charge ? 'cast' : m.name === 'Shadow Knife' ? 'throw' : m.kind === 'energy' ? 'cast' : 'weapon';
      rows.push({ identity: art, side: 'enemy', move: m.phase ? `phase:${m.name}` : m.name, name: m.name, kind: m.phase ? 'phase' : m.charge ? `${m.kind}/charge` : m.kind,
        body: body(art, pose, undefined, m.name),
        vfx: { module, kind: vfxKind(module, shared), ...(shared ? { note: 'ชุดดาบร่วมของท่ากายภาพศัตรู (ตั้งใจ)' } : module === 'generic-code' ? { note: 'ท่าพลังงานทั่วไป: เส้น+แกนวาดด้วยโค้ด' } : {}) },
        target: foeTarget(m), point: foePoint(module, m.name, bossMoves[m.name]), encounters: [...m.encounters].sort() });
    }
  }
  const heroRows = rows.filter(r => r.side === 'hero'), foeRows = rows.filter(r => r.side === 'enemy');
  return {
    counts: { identities: identities.length, heroes: identities.filter(i => i.side === 'hero').length, enemies: identities.filter(i => i.side === 'enemy').length,
      atlases: identities.filter(i => i.atlas).length, parked: identities.filter(i => i.parked).length,
      actionIds: new Set(heroRows.map(r => r.move)).size, heroRows: heroRows.length, intents: new Set(foeRows.map(r => r.move)).size, foeRows: foeRows.length,
      spriteRows: rows.filter(r => r.body.kind === 'sprite').length, proceduralRows: rows.filter(r => r.body.kind === 'procedural').length,
      paintedRows: rows.filter(r => r.vfx.kind === 'painted').length, sharedRows: rows.filter(r => r.vfx.kind === 'shared').length, codeRows: rows.filter(r => r.vfx.kind === 'code').length },
    identities, rows,
  };
}
// Registry identities that no hero or catalog foe uses (would be dead art).
export const unusedRegistry = (coverage: PresentationCoverage): string[] => Object.keys(unitRegistry).filter(id => !coverage.identities.some(i => i.identity === id));
