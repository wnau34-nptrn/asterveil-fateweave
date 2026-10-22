import { sfx } from '../platform/sfx';
import type { Item } from '../core/world/types';
import { gearArt } from './equip-art';
import { itemName } from './th';
import atlas from './forge-strike-fx.json';

// Presentation only: painted hammer strike (ART-VFX-FORGE-STRIKE-001, public/assets/fx/forge_strike_fx.webp) over the
// finished piece. The forge result is already committed and saved before this runs; the overlay never takes input or
// changes state. Timing follows the art's NOTES: hits at 330 ms and 700 ms (the two clangs), label at 720 ms, gone at 1.7 s.
const atlasUrl = `${import.meta.env.BASE_URL}assets/fx/forge_strike_fx.webp`;
type Frame = { x: number; y: number; w: number; h: number; px: number; py: number };
const frames = atlas.frames as Record<string, Frame>;
let preloaded = false;
export function preloadForgeStrike(): void { if (!preloaded && typeof Image !== 'undefined') { preloaded = true; new Image().src = atlasUrl; } }

// One sprite element showing an atlas frame scaled so the frame's width is `width` px, centred on (x, y) of the card.
function sprite(layer: HTMLElement, frame: string, width: number, x: number, y: number, extra = ''): HTMLElement {
  const el = layer.ownerDocument.createElement('i'); el.className = 'fx'; el.style.cssText = `width:${width}px;left:${x}px;top:${y}px;${extra}`;
  el.style.backgroundImage = `url(${atlasUrl})`; setFrame(el, frame, width); layer.append(el); return el;
}
function setFrame(el: HTMLElement, frame: string, width: number): void {
  const f = frames[frame]!, k = width / f.w, h = f.h * k;
  el.style.height = `${h}px`; el.style.margin = `${-h * f.py}px 0 0 ${-width * f.px}px`;
  el.style.backgroundSize = `${atlas.size * k}px ${atlas.size * k}px`; el.style.backgroundPosition = `${-f.x * k}px ${-f.y * k}px`;
}
function flip(el: HTMLElement, name: string, count: number, width: number, start: number, step: number, timers: number[]): void {
  el.style.opacity = '0';
  for (let i = 0; i < count; i++) timers.push(window.setTimeout(() => { setFrame(el, `${name}_${String(i).padStart(2, '0')}`, width); el.style.opacity = ''; }, start + i * step));
  timers.push(window.setTimeout(() => { el.style.opacity = '0'; }, start + count * step));
}
const fxFrame = (name: string, i: number) => `${name}_${String(i).padStart(2, '0')}`;

export function forgeStrike(root: HTMLElement, item: Item, kind: 'enhance' | 'level', reduced: boolean): void {
  root.querySelector('.forge-strike')?.remove();
  const doc = root.ownerDocument, label = kind === 'enhance' ? `+${item.plus ?? 0}` : `Lv${item.level}`;
  const glow = kind === 'enhance' ? { name: 'result_glow', w: 168 } : { name: 'result_glow_cyan', w: 146 };
  const el = doc.createElement('div');
  el.className = 'forge-strike'; el.setAttribute('aria-hidden', 'true'); if (reduced) el.dataset.reduced = 'true';
  el.innerHTML = `<div class="strike-card"><div class="strike-back"></div><div class="strike-item">${gearArt(item)}</div><div class="strike-front"></div><div class="strike-text"><span class="strike-glow"></span><b class="strike-result">${label}</b></div><small>${itemName(item)}</small></div>`;
  root.append(el);
  const card = el.querySelector<HTMLElement>('.strike-card')!, back = card.querySelector<HTMLElement>('.strike-back')!, front = card.querySelector<HTMLElement>('.strike-front')!, glowHost = card.querySelector<HTMLElement>('.strike-glow')!;
  // Coordinates are relative to the 132 px tile's centre (the back/front layers are centred on it).
  const timers: number[] = [];
  if (reduced) {
    sprite(glowHost, 'result_glow_cyan_05', 146, 0, 0, 'opacity:.22');
    timers.push(window.setTimeout(() => sfx.play('clang'), 0), window.setTimeout(() => el.remove(), 900));
    return;
  }
  const hit = { x: -6, y: -28 };
  // Shock ring sits behind the tile for the second hit.
  const ring = sprite(back, fxFrame('shock_ring', 0), 184, hit.x, hit.y, 'opacity:.35;'); flip(ring, 'shock_ring', 6, 184, 700, 40, timers);
  // Hammer: pivot at the handle's lower end to the right of the tile; the head lands on the tile's upper edge.
  const hammer = sprite(front, 'hammer', 104, 58, 12, 'transform-origin:50% 94%;');
  const smear = sprite(front, 'hammer_smear', 116, 8, -30, 'opacity:0;');
  const pose = (deg: number, op: number, dy = 0) => ({ transform: `rotate(${deg}deg) translateY(${dy}px)`, opacity: op });
  const up = 26, down = -50;
  hammer.animate([{ ...pose(48, 0, -8), offset: 0 }, { ...pose(up, 1), offset: .13 }, { ...pose(up, 1), offset: .22 }, { ...pose(down, 1), offset: .273 }, { ...pose(down, 1), offset: .327 },
    { ...pose(12, 1), offset: .59 }, { ...pose(down, 1), offset: .636 }, { ...pose(down, 1), offset: .69 }, { ...pose(48, 0, -10), offset: 1 }], { duration: 1100, fill: 'both' });
  for (const [from, len] of [[250, 80], [630, 70]] as const) smear.animate([{ opacity: 0 }, { opacity: .5, offset: .4 }, { opacity: 0 }], { duration: len, delay: from, fill: 'both' });
  // Contact flashes inside the tile (coloured edges NORMAL, pale cores ADD).
  for (const [name, count, w, start, step, a] of [['hit_flash_a', 6, 110, 300, 30, .75], ['hit_flash_b', 8, 122, 700, 25, .9]] as const) {
    const base = sprite(front, fxFrame(name, 0), w, hit.x, hit.y, `opacity:${a};`), core = sprite(front, fxFrame(`${name}_core`, 0), w, hit.x, hit.y, 'mix-blend-mode:screen;');
    flip(base, name, count, w, start, step, timers); flip(core, `${name}_core`, count, w, start, step, timers);
    base.style.setProperty('--a', String(a)); timers.push(window.setTimeout(() => { base.style.opacity = String(a); }, start));
  }
  // Sparks: 2–3 at the first hit, 3–4 at the second; gravity is ours, the frames only flicker.
  for (const [start, n] of [[330, 3], [700, 4]] as const) for (let i = 0; i < n; i++) {
    const s = sprite(front, fxFrame('spark_arc', 0), 11, hit.x, hit.y, 'opacity:0;'), dir = (Math.random() - .5) * 2.2 - 1.57, speed = 30 + Math.random() * 40;
    const dx = Math.cos(dir) * speed, dy = Math.sin(dir) * speed;
    s.animate([{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${dx}px,${dy}px)`, opacity: 1, offset: .45 }, { transform: `translate(${dx * 1.4}px,${dy + 70}px)`, opacity: 0 }], { duration: 520, delay: start, fill: 'both', easing: 'ease-out' });
    for (let f = 0; f < 6; f++) timers.push(window.setTimeout(() => setFrame(s, fxFrame('spark_arc', f), 11), start + f * 40));
  }
  // Result bloom behind the label.
  const g = sprite(glowHost, fxFrame(glow.name, 0), glow.w, 0, 0, `opacity:0;`);
  const core = sprite(glowHost, fxFrame(`${glow.name}_core`, 0), glow.w, 0, 0, 'opacity:0;mix-blend-mode:screen;');
  for (let i = 0; i < 6; i++) timers.push(window.setTimeout(() => { setFrame(g, fxFrame(glow.name, i), glow.w); setFrame(core, fxFrame(`${glow.name}_core`, i), glow.w); g.style.opacity = kind === 'enhance' ? '.6' : '.45'; core.style.opacity = '.18'; }, 720 + i * 100));
  timers.push(window.setTimeout(() => sfx.play('clang'), 330), window.setTimeout(() => sfx.play('clang'), 700));
  timers.push(window.setTimeout(() => el.remove(), 1700));
}
