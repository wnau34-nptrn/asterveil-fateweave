import { activeGuides, featureMap, featureOpen, guideDone } from '../core/world/profile';
import { talentPoints, talentsSpent } from '../core/world/talents';
import { sweepReward } from '../core/world/sweep';
import type { ExpeditionState, GuideKind, LobbyFeature, MapDefinition, Profile } from '../core/world/types';
import { canOpenChest, fatigueOf, findTiles, levelOf, rosterIds } from '../core/world/world';

// OD-54 (owner 2026-11-19, docs/design/TUTORIAL_FLOW_TH.md): short lessons after the prologue. One at a time, pointing at
// the real control; each shows once per device (a UI preference, like the battle coach) and all can be turned off. They
// read the committed state only and never act for the player, except the one-time calming draught the player taps for.
// Stage C (owner 2026-11-19): `card:<guide>` points at the system an NPC card asks for, `claim:<guide>` at its claim
// button once done, `open:<feature>` at a camp system the moment its map is cleared.
export type LessonId = 'levelup' | 'wear' | 'tree' | 'lanes' | 'walk' | 'chest' | 'lowhp' | 'fatigue' | 'calm' | 'elite' | 'boss' | 'battle' | 'home' | 'farm' | 'sweeppick' | 'sweep' | 'hunt' | 'bosstarget' | 'tickets'
  | `card:${string}` | `claim:${string}` | `open:${string}`;
export interface Lesson { id: LessonId; target: string; title: string; text: string; action?: 'calm' }
export interface LessonPrefs { seen: LessonId[]; off: boolean }
const KEY = 'asterveil.fateweave.lessons.v1';

// A new company that has not cleared a map yet (the lessons belong to the first map).
export const learning = (profile: Profile): boolean => !profile.veteran && profile.cleared.length === 0;
const near = (run: ExpeditionState, p: { x: number; y: number }, d = 3) => Math.abs(run.position.x - p.x) + Math.abs(run.position.y - p.y) <= d;

// The next lesson on the map, in the order of the design (A1–A4, B1–B6, F).
export function worldLesson(profile: Profile, run: ExpeditionState, map: MapDefinition, maps: readonly MapDefinition[], seen: readonly LessonId[], maxHp: (id: string) => number): Lesson | undefined {
  if (!run.tutorialDone || run.battle || run.completed || run.draft) return undefined;
  const ids = rosterIds(run); const fresh = learning(profile);
  const list: (Lesson | false)[] = [
    fresh && levelOf(map, run) >= 2 && { id: 'levelup', target: '#world-party', title: 'ค่ายขึ้น Lv2!',
      text: 'ชนะบทนำแล้ว ทีมแข็งแรงขึ้น ได้แต้มสกิลกิ่ง 1 แต้ม (ป้าย +แต้ม) และได้อุปกรณ์ชิ้นแรกในกระเป๋า' },
    fresh && run.found.length > 0 && !ids.some(id => Object.keys(run.members[id]?.gear ?? {}).length) && { id: 'wear', target: '#world-pack',
      title: 'สวมอุปกรณ์', text: 'เปิดกระเป๋า → แท็บอุปกรณ์ → ดู/เปรียบเทียบ แล้วเลือกคนสวม ค่าพลังเพิ่มทันที' },
    fresh && ids.some(id => talentsSpent(run.members[id]?.talents) < talentPoints(map, levelOf(map, run), profile.cleared.length)) && {
      id: 'tree', target: '#world-party', title: 'ลงแต้มสกิลกิ่ง', text: 'แตะตัวละครที่มีป้าย +แต้ม → สกิลกิ่ง แล้วเลือกโหนดแรก ลองได้ฟรี รีเซ็ตได้ที่ค่าย' },
    fresh && { id: 'lanes', target: '#world-team', title: 'แนวหน้า / แนวหลัง',
      text: 'คนแนวหน้ารับท่ากายภาพก่อน แนวหลังปลอดภัยกว่า ศัตรูบางตัว "ตามฝูง" หรือ "ไล่สายสนับสนุน" ดูป้ายในศึก จัดแนวได้ที่ปุ่มทีม' },
    fresh && { id: 'walk', target: '.ghost-dpad', title: 'เดินทีละช่อง',
      text: 'กดปุ่มลูกศรด้านล่าง ลูกศรบนคีย์บอร์ด หรือแตะช่องข้าง ๆ ทุกก้าวเพิ่มภัยคุกคาม (มุมขวาบน) ยิ่งสูงยิ่งเจอศัตรูง่าย' },
    fresh && canOpenChest(run, map) && { id: 'chest', target: '#rest', title: 'หีบสมบัติ', text: 'เปิดเก็บของได้ ของที่ได้ติดตัวไปจนกลับค่าย' },
    fresh && ids.some(id => run.hp[id]! > 0 && run.hp[id]! * 2 < maxHp(id)) && { id: 'lowhp', target: '#world-pack',
      title: 'เลือดเหลือน้อย', text: 'ใช้ยาฟื้นเลือดในกระเป๋า หรือไปพักที่ค่ายบนแผนที่ (ฟื้น 70%) คนที่ล้มต้องรอพักที่ค่าย' },
    ids.some(id => fatigueOf(run, id) >= 5) && { id: 'fatigue', target: '#world-party', title: 'ความเหนื่อย',
      text: `ลงสนามต่อเนื่องเหนื่อยศึกละ 1 ครบ ${map.camp.fatigue.steps[0]} ตีและรักษาเบาลง ${map.camp.fatigue.stepPercent}% พักที่ค่ายลดทุกคน ${map.camp.fatigue.rest} แต้ม กลับบ้านแล้วหายหมด` },
    ids.some(id => fatigueOf(run, id) >= 5) && activeGuides(profile, maps).some(g => g.kind === 'calm') && run.potions.calm < map.potions.carry && {
      id: 'calm', target: '#world-pack', title: 'ยาฟื้นความเหนื่อย', text: 'รับยา 1 ขวด (ครั้งเดียว) แล้วใช้ในกระเป๋ากับคนที่เหนื่อยที่สุด ลด 4 แต้ม', action: 'calm' },
    fresh && map.elites.some(e => !e.forced && !run.elitesDefeated.includes(e.id) && near(run, e)) && { id: 'elite', target: '#objective-button',
      title: 'อีลีท', text: 'ศัตรูแข็งกว่าปกติ สู้หรือเดินอ้อมได้ ชนะแล้วได้รางวัลดีกว่า' },
    fresh && findTiles(map, 'boss').some(p => near(run, p)) && { id: 'boss', target: '#objective-button',
      title: 'บอสใกล้แล้ว', text: 'บอสประกาศท่าใหญ่ล่วงหน้า ใช้ตั้งรับแทนหรือขัดจังหวะ พักที่ค่ายให้เลือดเต็มก่อนเข้า' },
  ];
  return list.find((l): l is Lesson => !!l && !seen.includes(l.id));
}

// The first battle after the prologue: where the enemy's next move and its target are shown.
export function battleLessonTip(profile: Profile, kind: string, seen: readonly LessonId[]): Lesson | undefined {
  if (!learning(profile) || kind === 'tutorial' || seen.includes('battle')) return undefined;
  return { id: 'battle', target: '#intent', title: 'อ่านท่าศัตรู', text: 'แถบนี้บอกว่าศัตรูตัวถัดไปจะใช้ท่าอะไร เล็งใคร แรงเท่าไร แตะ ⓘ มุมขวาบนเพื่อดูรายละเอียด' };
}
// The camp: the first visit, then the NPC card in hand (where to do it, then claim it), then systems just opened.
// Where each camp system is opened from (the visible camp menu or banner).
const FEATURE_TARGET: Record<LobbyFeature, string> = {
  gear: '#lobby-tab-gear', tree: '#lobby-tab-team', team: '#lobby-tab-team', tomes: '#lobby-tab-team', forge: '#lobby-tab-forge', level: '#lobby-tab-forge',
  fuse: '#lobby-tab-forge', craft: '#lobby-tab-forge', transfer: '#lobby-tab-forge', bossCharm: '#lobby-tab-hunt', brew: '#lobby-tab-brew',
  hire: '#lobby-tab-hire', market: '#lobby-tab-hire', hunt: '#lobby-tab-hunt', quests: '#lobby-board', hard: '#lobby-maps', gacha: '#lobby-gacha',
};
const CARD_TEXT: Record<GuideKind, string> = {
  wear: 'เปิดอุปกรณ์ แล้วสวมของ 1 ชิ้นให้สมาชิก', talent: 'เปิดทีม → ตัวละคร → สกิลกิ่ง แล้วลงแต้ม 1 แต้ม', calm: 'กดรับยาฟื้นความเหนื่อยในการ์ดนี้',
  enhance: 'เปิดช่างตีเหล็ก แล้วตีบวกอุปกรณ์ 1 ชิ้น', brew: 'เปิดปรุงยา แล้วปรุงยา 1 ขวด', itemLevel: 'เปิดช่างตีเหล็ก → เพิ่ม Lv อุปกรณ์ 1 ชิ้น',
  hire: 'เปิดนายหน้า แล้วจ้างทหารรับจ้าง 1 คน', reserve: 'เปิดทีม แล้วจัดตัวสำรองอย่างน้อย 1 คน (ตัวสำรองหายเหนื่อยศึกละ 1)',
};
// Systems that get their own pointer when they open (the ones without an NPC card), in the order they unlock.
// `key` names the lesson (`open:<key>`) and defaults to the feature; `target` defaults to the feature's control.
type Opened = readonly [LobbyFeature, string, string, { key?: string; target?: string }?];
const OPENED: readonly Opened[] = [
  ['quests', 'กระดานภารกิจเปิดแล้ว', 'งานรายวัน/รายสัปดาห์ให้แร่ ทอง เศษดาว และตั๋วทอชะตา ทำได้ระหว่างเดินทาง'],
  // OD-59: the World Boss opens with the quest board; the cabinet opens after map 1 with 10 tickets from its first clear.
  ['quests', 'บอสโลกเปิดแล้ว', 'สู้ได้ 5 ครั้งต่อสัปดาห์ เลือกบอสตัวไหนก็ได้ ทุกครั้งได้แร่ ทอง และเศษบอสไว้สร้างของประจำบอส ครบ 2 และ 4 ครั้งได้ตั๋วทอชะตา', { key: 'wboss', target: '#lobby-wboss' }],
  ['gacha', 'แท่นทอชะตาเปิดแล้ว', 'จบแผนที่ 1 ได้ตั๋ว 10 ใบ ลองสุ่มสิบครั้งได้เลย · ได้ตัวเต็มหรือเศษ ทุกครั้งได้ 1 แต้ม ครบ 80 แลกตัวที่เลือกได้ · ดูอัตราทั้งหมดในตู้'],
  ['team', 'จัดทีมเปิดแล้ว', 'ลงสนามได้ 5 คน และมีตัวสำรอง จัดแนวหน้า/หลังและบันทึกชุดทีมได้'],
  ['market', 'ตลาดเปิดแล้ว', 'ที่นายหน้ามีแท็บตลาด ซื้อเศษดาว สัญญา กล่องอุปกรณ์ และยาไล่ศัตรูด้วยทอง'],
  ['hunt', 'ล่าของเปิดแล้ว', 'เลือกชุดหรือช่องที่อยากได้ แผนที่จะดรอปของแบบนั้นบ่อยขึ้น'],
  ['tomes', 'ตำราสกิลเปิดแล้ว', 'ใช้ตำราที่ได้จากบอส/อีลีทอัป Lv สกิลในหน้าตัวละคร'],
  ['fuse', 'หลอมรวมเปิดแล้ว', 'ที่ช่างตีเหล็ก หลอมของซ้ำเพื่อเพิ่มระดับ สร้างอาวุธ และย้าย affix ได้'],
  ['bossCharm', 'เป้าหมายบอสเปิดแล้ว', 'ที่แท็บล่าของ เลือกอุปกรณ์ที่อยากได้จากผู้คุมรอยแยกได้แล้ว'],
  ['hard', 'โหมดยากเปิดแล้ว', 'เลือกแผนที่ที่ผ่านแล้วแบบยาก มอนสเตอร์แรงขึ้น รางวัลครั้งแรกดีกว่า'],
];
// Farming (OD-54 follow-up, owner 2026-11-19 "ทำทั้ง 4 ข้อเลย"): lessons that point inside an open camp sheet (`sheet`: the
// maps sheet for the sweep row, the hunt sheet for the two targets), and the replay pointer at the maps button.
function farmingLessons(profile: Profile, maps: readonly MapDefinition[], seen: readonly LessonId[], sheet: string | undefined, picked: string | undefined): Lesson | undefined {
  const todo = (id: LessonId) => !seen.includes(id);
  if (sheet === 'maps' && todo('sweep')) {
    const m = maps.find(x => x.id === picked && profile.cleared.includes(x.id) && x.sweepReward) ?? maps.find(x => profile.cleared.includes(x.id) && x.sweepReward);
    // The sweep row belongs to the selected map's card: select a cleared map first when another one is shown.
    if (m && m.id !== picked && todo('sweeppick')) return { id: 'sweeppick', target: `#map-node-${m.id}`, title: 'แผนที่ที่ผ่านแล้ว',
      text: 'แตะแผนที่ที่ผ่านแล้ว จะเห็นปุ่มกวาดล้างและเล่นซ้ำ' };
    if (m && m.id === picked && sweepReward(m, false)) return { id: 'sweep', target: `#map-sweep-row-${m.id}`, title: 'กวาดล้าง',
      text: `จ่ายเสบียง ${m.sweep.cost} รับรางวัลทันทีโดยไม่ต้องเดิน วันละ ${m.sweep.perMapDaily} ครั้งต่อแผนที่ เสบียงเติมทุกวัน (เก็บได้ ${m.sweep.cap}) เดินจริงได้ของและ EXP มากกว่า` };
  }
  if (sheet === 'hunt') {
    if (todo('hunt') && featureOpen(profile, maps, 'hunt')) return { id: 'hunt', target: '#hunt-target', title: 'ล่าของ',
      text: 'เลือกอาชีพที่อยากได้อาวุธ แล้วกดบันทึก ออกเดินทางรอบหน้าจะดรอปของแบบนั้นบ่อยขึ้น' };
    if (todo('bosstarget') && featureOpen(profile, maps, 'bossCharm')) return { id: 'bosstarget', target: '#boss-target', title: 'เป้าหมายบอส',
      text: 'เลือกอุปกรณ์ที่อยากได้จากผู้คุมรอยแยก แล้วกดบันทึก รอบหน้าบอสจะดรอปชิ้นนั้นบ่อยขึ้น' };
  }
  return undefined;
}
export function lobbyLesson(profile: Profile, maps: readonly MapDefinition[], seen: readonly LessonId[], sheet?: string, picked?: string): Lesson | undefined {
  if (profile.veteran) return undefined;
  const inSheet = farmingLessons(profile, maps, seen, sheet, picked); if (inSheet) return inSheet;
  if (profile.cleared.length <= 1 && !seen.includes('home')) return { id: 'home', target: '.lobby-guide, #lobby-depart', title: 'กลับค่ายแล้ว',
    text: 'ของที่เก็บมาเข้าคลัง ทีมฟื้นเต็ม งานแนะนำของ NPC อยู่ในการ์ดนี้ ทำแล้วรับรางวัลได้' };
  const g = activeGuides(profile, maps)[0];
  if (g) {
    if (guideDone(profile, g.kind)) { const id: LessonId = `claim:${g.id}`; if (!seen.includes(id)) return { id, target: '#guide-claim', title: 'งานแนะนำเสร็จแล้ว', text: 'กดรับรางวัลในการ์ดได้เลย' }; }
    else { const id: LessonId = `card:${g.id}`; if (!seen.includes(id)) return { id, target: g.kind === 'calm' ? '#guide-claim' : FEATURE_TARGET[g.feature], title: 'งานแนะนำ', text: CARD_TEXT[g.kind] }; }
  }
  // Only the systems the latest cleared map just opened (a company far ahead does not get them all at once).
  for (const [feature, title, text, more] of OPENED) {
    const id = `open:${more?.key ?? feature}` as LessonId, at = featureMap(maps, feature);
    if (seen.includes(id) || !featureOpen(profile, maps, feature) || !at || profile.cleared.length !== at.chapter) continue;
    return { id, target: more?.target ?? FEATURE_TARGET[feature], title, text };
  }
  // OD-59: once the cabinet was introduced, the first time tickets for a 10-pull are waiting again.
  if (featureOpen(profile, maps, 'gacha') && seen.includes('open:gacha') && (profile.gacha?.serial ?? 0) > 0 && (profile.gacha?.tickets ?? 0) >= 10 && !seen.includes('tickets'))
    return { id: 'tickets', target: '#lobby-gacha', title: 'ตั๋วพอสุ่มสิบครั้งแล้ว', text: 'ตั๋วจากงานรายวัน/สัปดาห์และบอสโลกสะสมครบ 10 ใบ แตะทอชะตาเพื่อสุ่ม แต้มที่ได้สะสมไปแลกตัวที่อยากได้' };
  // Last: any cleared map can be played again (and the sweep row is in the same sheet).
  if (profile.cleared.length > 0 && !seen.includes('farm')) {
    const hard = featureMap(maps, 'hard'), hardOpen = featureOpen(profile, maps, 'hard');
    return { id: 'farm', target: '#lobby-maps', title: 'ฟาร์มซ้ำ',
      text: `แผนที่ที่ผ่านแล้วเล่นซ้ำได้ เก็บของ EXP และตำราสกิลเพิ่ม${hardOpen || !hard ? '' : ` โหมดยากเปิดหลังผ่านแผนที่ ${hard.chapter}`}` };
  }
  return undefined;
}

// An automated browser (navigator.webdriver: the browser test suites) starts with the lessons off unless a test saved
// its own preference, so lesson bubbles never sit over the controls other suites click; tests/browser/lessons.spec.ts
// saves one and covers the lessons themselves.
const automated = (): boolean => typeof navigator !== 'undefined' && navigator.webdriver === true;
export function loadPrefs(): LessonPrefs {
  try {
    const raw = localStorage.getItem(KEY); if (raw === null) return { seen: [], off: automated() };
    const v = JSON.parse(raw) as Partial<LessonPrefs> | null; return { seen: Array.isArray(v?.seen) ? v!.seen : [], off: v?.off === true };
  } catch { return { seen: [], off: automated() }; }
}
function savePrefs(p: LessonPrefs): void { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* private mode: the lesson shows again next time */ } }

// The overlay: a ring over the real control and a bubble beside it. It never blocks the control (the ring ignores
// pointer events) and is covered by any open modal dialog (top layer).
export class LessonGuide {
  private prefs = loadPrefs(); private current: Lesson | undefined; private readonly el: HTMLElement;
  constructor(private readonly frame: HTMLElement, private readonly onAction: (action: 'calm') => void, private readonly onDone: () => void = () => {}) {
    this.el = document.createElement('div'); this.el.id = 'lesson-layer'; this.el.hidden = true; frame.append(this.el);
    this.el.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-lesson]'); if (!b || !this.current) return;
      const kind = b.dataset.lesson, lesson = this.current;
      if (kind === 'off') this.prefs.off = true;
      this.markSeen(lesson.id);
      if (kind === 'action' && lesson.action) this.onAction(lesson.action); else this.onDone();
    });
    addEventListener('resize', () => this.place());
    // Tapping the highlighted control completes its lesson (the sheet or dialog it opens is not covered by the bubble).
    frame.addEventListener('click', e => {
      const lesson = this.current; if (!lesson || this.el.contains(e.target as Node)) return;
      const hit = (e.target as Element | null)?.closest?.(lesson.target); if (hit) this.markSeen(lesson.id);
    }, true);
  }
  get seen(): readonly LessonId[] { return this.prefs.seen; }
  get off(): boolean { return this.prefs.off; }
  setOff(off: boolean): void { this.prefs.off = off; if (!off) this.prefs.seen = []; savePrefs(this.prefs); if (off) this.show(undefined); }
  // A new company on this device (owner 2026-11-22: a restart lost every lesson): the lessons start again from the
  // first one. The player's own "turn all lessons off" choice is kept; Setup turns them back on.
  restart(): void { this.prefs.seen = []; savePrefs(this.prefs); this.show(undefined); }
  markSeen(id: LessonId): void { if (!this.prefs.seen.includes(id)) this.prefs.seen.push(id); savePrefs(this.prefs); this.show(undefined); }
  show(lesson: Lesson | undefined): void {
    if (this.prefs.off) lesson = undefined;
    this.current = lesson; this.el.hidden = !lesson;
    if (!lesson) { this.el.innerHTML = ''; return; }
    this.el.innerHTML = `<div class="lesson-ring" aria-hidden="true"></div><section class="lesson-bubble" role="dialog" aria-modal="false" aria-labelledby="lesson-title" data-lesson-id="${lesson.id}">
      <h3 id="lesson-title">${lesson.title}</h3><p>${lesson.text}</p>
      <div class="lesson-actions">${lesson.action ? '<button data-lesson="action" id="lesson-action" class="primary">รับยา</button>' : ''}<button data-lesson="ok" id="lesson-ok" class="${lesson.action ? 'secondary' : 'primary'}">เข้าใจแล้ว</button><button data-lesson="off" id="lesson-off" class="text-button">ปิดคำแนะนำทั้งหมด</button></div></section>`;
    this.place();
  }
  private place(): void {
    if (!this.current) return;
    const target = this.frame.querySelector<HTMLElement>(this.current.target), ring = this.el.querySelector<HTMLElement>('.lesson-ring')!, bubble = this.el.querySelector<HTMLElement>('.lesson-bubble')!;
    const f = this.frame.getBoundingClientRect();
    if (!target || !target.getClientRects().length) { ring.hidden = true; bubble.style.top = `${f.height * .35}px`; return; }
    // A target inside a scrolling camp sheet is brought into view first.
    if (target.closest('.lobby-content')) target.scrollIntoView({ block: 'nearest' });
    const r = target.getBoundingClientRect(); ring.hidden = false;
    Object.assign(ring.style, { left: `${r.left - f.left - 4}px`, top: `${r.top - f.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px` });
    // Below the control when it sits in the top half of the frame, above it otherwise.
    const below = r.top - f.top < f.height / 2;
    bubble.style.top = below ? `${r.bottom - f.top + 12}px` : ''; bubble.style.bottom = below ? '' : `${f.bottom - r.top + 12}px`;
    bubble.dataset.side = below ? 'below' : 'above';
  }
}
