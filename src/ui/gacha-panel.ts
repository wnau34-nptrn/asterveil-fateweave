import { exchangeReason, gachaRates, pullReason } from '../core/world/gacha';
import type { GachaEntry, GachaGrant, GachaResult, MapDefinition, Profile } from '../core/world/types';
import { icon } from './icons';
import { portrait } from './portraits';
import { heroText } from './th';
import art from './gacha-art.json';

// ART-UI-GACHA-003 R1 (owner pick 2026-11-21) on the ART-UI-GACHA-002 key art. The stage is a 390×500 window of the
// 390×844 layout the art was drawn for (y 90–590: the loom and the reward centre, above the button area), so every anchor
// and width from layers.json is a percentage of the stage. Files load only while the cabinet is on screen (CSS urls on
// cabinet elements). The pull timeline is CSS only and starts when the committed result is drawn; skip and reduced motion
// cut straight to the cards.
type ArtKey = keyof typeof art.files;
const url = (k: ArtKey) => `${import.meta.env.BASE_URL}assets/gacha/${art.files[k].file}`;
const TOP = 90, H = 500;
const at = (x: number, y: number, w: number) => `--x:${(x / 390 * 100).toFixed(2)}%;--y:${((y - TOP) / H * 100).toFixed(2)}%;--w:${(w / 390 * 100).toFixed(2)}%`;
function layer(k: Exclude<ArtKey, 'key-art'>, x: number, y: number, extra = ''): string {
  const f = art.files[k] as { cell: number[]; frames?: number; pivot: number[]; width_390: number };
  // The pivot of the cell sits on the anchor; the cell is drawn `width_390` wide.
  const px = f.pivot[0]! / f.cell[0]! * 100, py = f.pivot[1]! / f.cell[1]! * 100;
  return `<i class="gacha-fx" data-fx="${k}" style="${at(x, y, f.width_390)};--px:${px.toFixed(2)}%;--py:${py.toFixed(2)}%;--n:${f.frames ?? 1};--ratio:${f.cell[0]}/${f.cell[1]};background-image:url(${url(k)});${extra}" aria-hidden="true"></i>`;
}
const A = art.anchors;
// The sequence for one committed entry (ms): charge → pillar → reveal (one) or ten-burst (ten). Returns layers and the end.
function timeline(e: GachaEntry): { html: string; end: number } {
  const ms = (k: 'loom-charge' | 'thread-pillar' | 'ten-burst' | 'reveal-character' | 'reveal-shard') => art.files[k].ms.reduce((a: number, b) => a + (b ?? 0), 0);
  let t = 0; const parts: string[] = [];
  const add = (k: Parameters<typeof ms>[0], x: number, y: number) => { const d = ms(k); parts.push(layer(k, x, y, `--t:${t}ms;--d:${d}ms`)); t += d; };
  add('loom-charge', A.loom_crystal[0]!, A.loom_crystal[1]!); add('thread-pillar', A.loom_platform[0]!, A.loom_platform[1]!);
  if (e.results.length > 1) add('ten-burst', A.loom_platform[0]!, A.loom_platform[1]!);
  else add(e.results[0]!.full ? 'reveal-character' : 'reveal-shard', A.reward_center[0]!, A.reward_center[1]!);
  return { html: parts.join(''), end: t };
}
function stage(inner: string, run = false): string {
  return `<div class="gacha-stage"${run ? ' data-run="true"' : ''} style="background-image:url(${url('key-art')})" aria-hidden="true">${layer('idle', A.loom_crystal[0]!, A.loom_crystal[1]!)}${layer('sparkles', 120, 260)}${layer('sparkles', 290, 400, 'animation-delay:-900ms')}${inner}</div>`;
}
export const gachaBannerUrl = (): string => url('key-art');
export const gachaTicketUrl = (): string => url('fate-ticket');
const tIcon = `<img class="gacha-icon" src="${url('fate-ticket')}" alt="" width="20" height="20">`, pIcon = `<img class="gacha-icon" src="${url('exchange-knot')}" alt="" width="20" height="20">`;

// P10 free-ticket cabinet (docs/design/GACHA_P10_SPEC_TH.md, OD-58). DOM-native, built only from the committed profile:
// tickets, points, rates and every result come from state and the map's `gacha` rules; nothing here draws, spends or
// grants. A pull or exchange is sent only from the confirmation step, and the result view shows the newest committed
// history entry, so closing, reloading or skipping the reveal never draws again or pays twice.
export type GachaView = 'home' | 'confirm' | 'rates' | 'exchange' | 'history' | 'result';
export interface GachaState { view: GachaView; count: number; pick?: string; skip: boolean }

const pct = (x: number, digits = 2) => `${(x * 100).toFixed(digits).replace(/\.?0+$/, '')}%`;
export const gachaReasonText: Record<string, string> = {
  locked: 'เปิดหลังจบแผนที่ 2', config: 'ตู้มีการปรับ โหลดข้อมูลใหม่แล้วลองอีกครั้ง', count: 'สุ่มได้ครั้งละ 1 หรือ 10',
  tickets: 'ตั๋วไม่พอ', points: 'แต้มไม่พอ', full: 'คลังเศษเต็ม', unknown: 'ตัวนี้ไม่อยู่ในตู้',
};
const grantText = (r: GachaResult, map: MapDefinition): string => ({
  joined: 'ตัวใหม่ · เข้าค่าย ★1', duplicate: `ตัวซ้ำ → เศษ +${r.qty}`, universal: `ดาวเต็ม → เศษกลาง +${r.qty}`,
  shards: `เศษ +${r.qty}`, stored: `เก็บเศษ +${r.qty} (ครบ ${map.gacha.unlockShards} เข้าค่าย)`, unlocked: `เศษครบ ${map.gacha.unlockShards} · เข้าค่าย ★1`,
} satisfies Record<GachaGrant, string>)[r.grant];
const name = (id: string) => heroText[id]?.name ?? id;
const wallet = (p: Profile, map: MapDefinition) => {
  const g = p.gacha; const t = g?.tickets ?? 0, pts = g?.points ?? 0;
  return `<div class="gacha-wallet" role="group" aria-label="ตั๋ว ${t} ใบ · แต้มแลก ${pts}/${map.gacha.exchangePoints}">
    <span class="ui-pill" id="gacha-tickets">${tIcon}ตั๋ว <b>${t}</b></span><span class="ui-pill" id="gacha-points">${pIcon}แต้ม <b>${pts}</b>/${map.gacha.exchangePoints}</span></div>`;
};
const back = (to: GachaView = 'home', label = 'กลับหน้าตู้') => `<button id="gacha-back" data-lobby="gacha-view" data-view="${to}" class="secondary">${icon('left')}<span>${label}</span></button>`;

function home(p: Profile, maps: readonly MapDefinition[], map: MapDefinition): string {
  const g = map.gacha; const { full, shards } = gachaRates(g); const pts = p.gacha?.points ?? 0;
  const pull = (n: number) => { const why = pullReason(p, maps, map, n, g.version);
    return `<button id="gacha-pull-${n}" data-lobby="gacha-ask" data-count="${n}" class="${n === 10 ? 'primary' : 'secondary'} gacha-pull"${why ? ' data-blocked="true"' : ''}>${icon('reroll')}<span>สุ่ม ${n} ครั้ง<small>ใช้ตั๋ว ${n * g.ticketCost}${why ? ` · ${gachaReasonText[why] ?? why}` : ''}</small></span></button>`; };
  const pending = Object.entries(p.gacha?.pending ?? {});
  return `<section class="gacha-shrine" aria-labelledby="gacha-title">${stage('')}
    <h3 id="gacha-title">แท่นทอชะตา</h3><p class="gacha-lede">ทุกครั้ง: ตัวเต็ม ${pct(full)} (สุ่มเท่ากัน ${g.pool.length} คน) · นอกนั้นเศษเฉพาะตัว ${shards.map(s => `${s.qty} ชิ้น ${pct(s.chance)}`).join(' / ')} · ไม่มีการันตีในสิบครั้ง</p>
    ${wallet(p, map)}<div class="gacha-pulls">${pull(1)}${pull(10)}</div>
    <div class="gacha-points-bar" role="progressbar" aria-label="แต้มแลกตัวที่เลือก" aria-valuemin="0" aria-valuemax="${g.exchangePoints}" aria-valuenow="${Math.min(pts, g.exchangePoints)}"><i style="width:${Math.min(100, pts / g.exchangePoints * 100)}%"></i></div>
    <p class="camp-note">สุ่ม 1 ครั้ง = 1 แต้ม ไม่หมดอายุ · ครบ ${g.exchangePoints} แต้มแลกตัวที่เลือกได้ 1 ตัว</p>
    <div class="gacha-links"><button id="gacha-open-exchange" data-lobby="gacha-view" data-view="exchange" class="secondary">${pIcon}<span>แลกแต้ม</span></button><button id="gacha-open-rates" data-lobby="gacha-view" data-view="rates" class="secondary">${icon('info')}<span>อัตราทั้งหมด</span></button><button id="gacha-open-history" data-lobby="gacha-view" data-view="history" class="secondary">${icon('flag')}<span>ประวัติ</span></button></div>
    ${pending.length ? `<p class="camp-note gacha-pending">เศษรอเข้าค่าย: ${pending.map(([id, n]) => `${name(id)} ${n}/${g.unlockShards}`).join(' · ')}</p>` : ''}
    <p class="camp-note">ตั๋วฟรีจากงานรายวัน งานรายสัปดาห์ และบอสโลก · ไม่มีการขาย · ทุกคนยังได้จากเนื้อเรื่องและป้ายจ้างเหมือนเดิม</p></section>`;
}
function confirm(p: Profile, maps: readonly MapDefinition[], map: MapDefinition, count: number): string {
  const g = map.gacha; const why = pullReason(p, maps, map, count, g.version); const t = p.gacha?.tickets ?? 0, pts = p.gacha?.points ?? 0;
  return `<section class="gacha-confirm" role="dialog" aria-modal="false" aria-labelledby="gacha-confirm-title"><h3 id="gacha-confirm-title" tabindex="-1">ยืนยันสุ่ม ${count} ครั้ง</h3>
    <dl class="gacha-cost"><dt>ใช้ตั๋ว</dt><dd>${count * g.ticketCost} (เหลือ ${t} → ${t - count * g.ticketCost})</dd><dt>ได้แต้ม</dt><dd>+${count} (${pts} → ${pts + count})</dd>
    <dt>โอกาสตัวเต็มต่อครั้ง</dt><dd>${pct(g.fullBp / 10_000)}</dd>${count === 10 ? `<dt>สิบครั้งไม่มีตัวเต็มเลย</dt><dd>${pct((1 - g.fullBp / 10_000) ** 10)}</dd>` : ''}<dt>ตู้รุ่น</dt><dd>${g.version}</dd></dl>
    ${why ? `<p class="forge-reason" role="status">${gachaReasonText[why] ?? why}</p>` : '<p class="camp-note">ยังไม่ใช้ตั๋วจนกว่าจะกดยืนยัน</p>'}
    <div class="gacha-actions">${back('home', 'ยกเลิก')}<button id="gacha-confirm" data-lobby="gacha-pull" data-count="${count}" class="primary"${why ? ' disabled' : ''}>${icon('reroll')}<span>ยืนยันสุ่ม</span></button></div></section>`;
}
function rates(map: MapDefinition): string {
  const r = gachaRates(map.gacha);
  return `<section class="gacha-rates" aria-labelledby="gacha-rates-title"><h3 id="gacha-rates-title" tabindex="-1">อัตราทั้งหมด · ตู้รุ่น ${map.gacha.version}</h3>
    <p class="camp-note">ตัวเต็ม ${pct(r.full)} · ${r.shards.map(s => `เศษ ${s.qty} ชิ้น ${pct(s.chance)}`).join(' · ')} · รวม 100% · ทุกคนโอกาสเท่ากัน ไม่มีความหายาก</p>
    <table class="gacha-rate-table"><thead><tr><th scope="col">ตัวละคร</th><th scope="col">ตัวเต็ม</th>${r.shards.map(s => `<th scope="col">เศษ ${s.qty}</th>`).join('')}</tr></thead>
    <tbody>${r.rates.map(x => `<tr><th scope="row">${name(x.heroId)}</th><td>${pct(x.full, 3)}</td>${x.shards.map(s => `<td>${pct(s.chance, 4)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <p class="camp-note">ตัวซ้ำ = เศษตัวนั้น 10 · ตัวที่ดาวเต็มได้ตัวซ้ำ = เศษกลาง 10 · เศษของตัวที่ยังไม่มีเก็บไว้ ครบ ${map.gacha.unlockShards} เข้าค่าย ★1</p>${back()}</section>`;
}
function exchange(p: Profile, maps: readonly MapDefinition[], map: MapDefinition, pick?: string): string {
  const g = map.gacha; const pts = p.gacha?.points ?? 0;
  const card = (id: string) => { const m = p.members[id]; const pend = p.gacha?.pending?.[id];
    const status = m ? `${m.stars >= map.company.maxStars ? 'ดาวเต็ม → เศษกลาง' : `★${m.stars} · ได้เศษ ${map.company.shardsPerDuplicate}`}` : `ยังไม่มี · เข้าค่าย ★1${pend ? ` · เศษ ${pend}/${g.unlockShards}` : ''}`;
    return `<li><button id="gacha-pick-${id}" data-lobby="gacha-pick" data-hero="${id}" class="gacha-pick" aria-pressed="${pick === id}">${portrait(id)}<span><b>${name(id)}</b><small>${status}</small></span></button></li>`; };
  const why = pick ? exchangeReason(p, maps, map, pick, g.version) : 'pick';
  return `<section class="gacha-exchange" aria-labelledby="gacha-exchange-title"><h3 id="gacha-exchange-title" tabindex="-1">แลกแต้ม · ${pts}/${g.exchangePoints}</h3>
    <p class="camp-note">ใช้ ${g.exchangePoints} แต้มได้ตัวเต็มของคนที่เลือก 1 ตัว แต้มที่เหลือเก็บไว้</p><ul class="gacha-pick-list">${g.pool.map(card).join('')}</ul>
    <div class="gacha-actions">${back()}<button id="gacha-exchange-confirm" data-lobby="gacha-exchange" class="primary"${why ? ' disabled' : ''}>${icon('starFilled')}<span>${pick ? `แลก ${name(pick)} · ${g.exchangePoints} แต้ม` : 'เลือกตัวละครก่อน'}${why && why !== 'pick' ? `<small>${gachaReasonText[why] ?? why}</small>` : ''}</span></button></div></section>`;
}
function resultCard(r: GachaResult, map: MapDefinition, i: number): string {
  const label = `${name(r.heroId)} · ${r.full ? 'ตัวเต็ม' : `เศษ ×${r.qty}`} · ${grantText(r, map)}`;
  // The portrait sits under the frame, clipped by the frame's mask (white = the face window).
  const frame = r.full ? (r.grant === 'joined' ? 'character-card-new' : 'character-card') : 'character-shard';
  const mask = r.full ? 'mask' : 'mask-shard';
  const face = `<span class="gacha-frame" data-frame="${frame}"><span class="gacha-face" style="-webkit-mask-image:url(${url(mask)});mask-image:url(${url(mask)})">${portrait(r.heroId, true)}</span><img src="${url(frame)}" alt="" draggable="false">${r.full ? '' : `<i>×${r.qty}</i>`}</span>`;
  return `<li class="gacha-card" data-kind="${r.full ? 'full' : 'shard'}" data-grant="${r.grant}" style="--i:${i}" aria-label="${label}">${face}<b>${name(r.heroId)}</b><span class="gacha-tag">${r.full ? 'ตัวเต็ม' : 'เศษ'}</span><small>${grantText(r, map)}</small></li>`;
}
function result(p: Profile, map: MapDefinition, skip: boolean): string {
  const e = p.gacha?.history.at(-1); if (!e) return home(p, [map], map);
  const fulls = e.results.filter(r => r.full).length; const run = skip ? { html: '', end: 0 } : timeline(e);
  return `<section class="gacha-result" data-skip="${skip}" style="--t0:${run.end}ms" aria-labelledby="gacha-result-title">${skip ? '' : stage(run.html, true)}<h3 id="gacha-result-title" tabindex="-1">${e.kind === 'exchange' ? 'แลกสำเร็จ' : `ผลสุ่ม ${e.results.length} ครั้ง`} <small>${e.kind === 'pull' ? (fulls ? `ตัวเต็ม ${fulls}` : 'ได้เศษทั้งหมด') : ''}</small></h3>
    <ol class="gacha-cards" role="list">${e.results.map((r, i) => resultCard(r, map, i)).join('')}</ol>
    <p class="camp-note" role="status">บันทึกแล้ว · รายการ #${e.serial}${e.kind === 'pull' ? ` · ใช้ตั๋ว ${e.tickets} · แต้ม +${e.points}` : ` · ใช้แต้ม ${e.points}`}</p>${wallet(p, map)}
    <div class="gacha-actions">${skip ? '' : `<button id="gacha-skip" data-lobby="gacha-skip" class="secondary">ข้ามแอนิเมชัน</button>`}${back('home', 'กลับหน้าตู้')}</div></section>`;
}
function history(p: Profile, map: MapDefinition): string {
  const rows = [...(p.gacha?.history ?? [])].reverse();
  const row = (e: GachaEntry) => `<li><b>#${e.serial} ${e.kind === 'pull' ? `สุ่ม ${e.results.length}` : 'แลกแต้ม'}</b><small>${e.kind === 'pull' ? `ตั๋ว −${e.tickets} · แต้ม +${e.points}` : `แต้ม −${e.points}`} · ตู้รุ่น ${e.config}</small><span>${e.results.map(r => `${name(r.heroId)} ${r.full ? 'ตัวเต็ม' : `เศษ×${r.qty}`}`).join(' · ')}</span></li>`;
  return `<section class="gacha-history" aria-labelledby="gacha-history-title"><h3 id="gacha-history-title" tabindex="-1">ประวัติ ${rows.length ? `· ${rows.length} รายการล่าสุด` : ''}</h3>
    ${rows.length ? `<ol class="gacha-history-list">${rows.map(row).join('')}</ol>` : '<p class="camp-note">ยังไม่เคยสุ่ม</p>'}<p class="camp-note">เก็บ ${map.gacha.historyKeep} รายการล่าสุดในเซฟ (ออนไลน์: server เก็บครบทุกรายการ)</p>${back()}</section>`;
}
// OD-59: the first fate weave (the starter picks after the prologue): one guaranteed character, shown with the cabinet's
// reveal on the stage (outside the published rates; no ticket, no point). `role` names what is guaranteed.
// Owner 2026-11-22: the player presses to weave; before that the loom only idles (`pulled` false). The result was fixed
// when the run offered it, so the press changes the presentation only. The stage keeps its full height in the dialog and
// the card opens on the loom at the reward centre (nothing overflows or is cut off).
// How long the first fate weave's reveal runs (ms), so the dialog can hold the name and the accept button until then.
export function fateRevealMs(map: MapDefinition): number {
  return timeline({ serial: 0, kind: 'pull', config: map.gacha.version, tickets: 0, points: 0, results: [{ heroId: map.gacha.pool[0]!, full: true, qty: 0, grant: 'joined' }] }).end;
}
export function fateWeave(heroId: string, map: MapDefinition, role: string, pulled: boolean): string {
  if (!pulled) return `<section class="gacha-fate" data-pulled="false" aria-label="ทอชะตาครั้งแรก (${role} แน่นอน)">${stage('')}</section>`;
  const result: GachaResult = { heroId, full: true, qty: 0, grant: 'joined' };
  const run = timeline({ serial: 0, kind: 'pull', config: map.gacha.version, tickets: 0, points: 0, results: [result] });
  const A = art.anchors.reward_center;
  return `<section class="gacha-fate" data-pulled="true" style="--t0:${run.end}ms" aria-label="ทอชะตาครั้งแรก ได้${name(heroId)} (${role})">${stage(run.html, true)}
    <ol class="gacha-cards gacha-fate-card" role="list" style="${at(A[0]!, A[1]!, 150)}">${resultCard(result, map, 0)}</ol></section>`;
}
export function gachaPage(p: Profile, maps: readonly MapDefinition[], map: MapDefinition, s: GachaState): string {
  switch (s.view) {
    case 'confirm': return confirm(p, maps, map, s.count);
    case 'rates': return rates(map);
    case 'exchange': return exchange(p, maps, map, s.pick);
    case 'history': return history(p, map);
    case 'result': return result(p, map, s.skip);
    default: return home(p, maps, map);
  }
}
