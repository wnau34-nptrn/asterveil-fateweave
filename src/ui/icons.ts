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
// Spear class icons (2C-2, code-drawn line icons in the shipped grammar).
import brace from './svg/brace.svg?raw';
import pierce from './svg/pierce.svg?raw';
// Archer class icons (2C-2).
import hinder from './svg/hinder.svg?raw';
import volley from './svg/volley.svg?raw';
// Alchemist class icons (2C-2).
import acid from './svg/acid.svg?raw';
import haste from './svg/haste.svg?raw';
// Scout (2C-2): code-drawn line icons until a painted set exists.
import ambush from './svg/ambush.svg?raw';
import evade from './svg/evade.svg?raw';
import rally from './svg/rally.svg?raw';
import finisher from './svg/finisher.svg?raw';
import sigil from './svg/sigil.svg?raw';
import sanctuary from './svg/sanctuary.svg?raw';
import spearwall from './svg/spearwall.svg?raw';
import weakshot from './svg/weakshot.svg?raw';
import bomb from './svg/bomb.svg?raw';
import backstab from './svg/backstab.svg?raw';
import quake from './svg/quake.svg?raw';
import finale from './svg/finale.svg?raw';
import taunt from './svg/taunt.svg?raw';
import slam from './svg/slam.svg?raw';
import valor from './svg/valor.svg?raw';
import mend from './svg/mend.svg?raw';
import up from './svg/up.svg?raw';
import down from './svg/down.svg?raw';
import left from './svg/left.svg?raw';
import right from './svg/right.svg?raw';
import camp from './svg/camp.svg?raw';
// Music toggle (BGM, 2026-10-16).
import music from './svg/music.svg?raw';
import musicOff from './svg/music-off.svg?raw';
import sound from './svg/sound.svg?raw';
import soundOff from './svg/sound-off.svg?raw';
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
import gold from './svg/gold.svg?raw';
import forge from './svg/forge.svg?raw';
import enhance from './svg/enhance.svg?raw';
import fuse from './svg/fuse.svg?raw';
import reroll from './svg/reroll.svg?raw';
import salvage from './svg/salvage.svg?raw';
import brew from './svg/brew.svg?raw';
import set from './svg/set.svg?raw';
import seal from './svg/seal.svg?raw';
import pack from './svg/pack.svg?raw';
import starFilled from './svg/star-filled.svg?raw';
import starBadge from './svg/star_badge.svg?raw';
import starBadgeEmpty from './svg/star_badge_empty.svg?raw';
// Equipment slots and veil dust (2D-2): code-drawn placeholders until ART-UI-EQUIP-001.
import gearWeapon from './svg/gear-weapon.svg?raw';
import gearHead from './svg/gear-head.svg?raw';
import gearBody from './svg/gear-body.svg?raw';
import gearGloves from './svg/gear-gloves.svg?raw';
import gearBoots from './svg/gear-boots.svg?raw';
import gearCharm from './svg/gear-charm.svg?raw';
import dust from './svg/dust.svg?raw';
// Map potions (2D-5): code-drawn placeholders.
import potionSalve from './svg/potion-salve.svg?raw';
import potionTonic from './svg/potion-tonic.svg?raw';
import potionRepel from './svg/potion-repel.svg?raw';

// ART-UI-ICONS-002 (accepted 2026-10-22): stat, tab and action line icons, named by file (`stat-hp`, `tab-gear`, `act-lock`, …).
const UI_ICON_NAMES = ['stat-hp', 'stat-attack', 'stat-support', 'stat-speed', 'stat-armour', 'stat-resist', 'stat-leech', 'stat-barrier', 'stat-regen', 'stat-luck', 'stat-level', 'stat-exp',
  'tab-overview', 'tab-gear', 'tab-skills', 'tab-tree', 'tab-forge', 'tab-bag', 'tab-team', 'tab-hire', 'tab-pet', 'tab-map', 'tab-settings',
  'act-wear', 'act-remove', 'act-lock', 'act-unlock', 'act-compare', 'act-filter', 'act-sort', 'act-reset', 'act-confirm'] as const;
type UiIconName = typeof UI_ICON_NAMES[number];
const uiFiles = import.meta.glob<string>('./svg/{stat,tab,act}-*.svg', { query: '?raw', import: 'default', eager: true });
const uiSvgs = Object.fromEntries(UI_ICON_NAMES.map(n => [n, uiFiles[`./svg/${n}.svg`]!])) as Record<UiIconName, string>;

// Original ART-UI-WORLD-001 line icons (24px viewBox, currentColor). Inlined so they inherit state colour.
const svgs = { attack, guard, bash, mark, execute, bolt, ward, heal, prayer, brace, pierce, hinder, volley, acid, haste, ambush, evade, taunt, slam, valor, mend, rally, finisher, sigil, sanctuary, spearwall, weakshot, bomb, backstab, quake, finale, challenge: taunt, bulwark: guard, rouse: prayer, up, down, left, right, camp, rest, flag, goal, star, danger, safe, talk, info, map, boss, check, circle, close, footprints, chest, chestOpen, ore, gold, forge, enhance, fuse, reroll, salvage, brew, set, ember, seal, pack, starFilled, starBadge, starBadgeEmpty, gearWeapon, gearHead, gearBody, gearGloves, gearBoots, gearCharm, dust, potionSalve, potionTonic, potionRepel, music, musicOff, sound, soundOff } as const;
const restartPath = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></svg>';
export type IconName = ActionId | keyof typeof svgs | UiIconName | 'restart';
export function icon(name: IconName): string {
  const svg = name === 'restart' ? restartPath : name in uiSvgs ? uiSvgs[name as UiIconName] : svgs[name as keyof typeof svgs];
  return svg.replace('<svg ', '<svg class="icon" aria-hidden="true" focusable="false" ');
}
