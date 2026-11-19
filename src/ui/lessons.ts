import { activeGuides } from '../core/world/profile';
import { talentPoints, talentsSpent } from '../core/world/talents';
import type { ExpeditionState, MapDefinition, Profile } from '../core/world/types';
import { canOpenChest, fatigueOf, findTiles, levelOf, rosterIds } from '../core/world/world';

// OD-54 (owner 2026-11-19, docs/design/TUTORIAL_FLOW_TH.md): short lessons after the prologue. One at a time, pointing at
// the real control; each shows once per device (a UI preference, like the battle coach) and all can be turned off. They
// read the committed state only and never act for the player, except the one-time calming draught the player taps for.
export type LessonId = 'levelup' | 'wear' | 'tree' | 'lanes' | 'walk' | 'chest' | 'lowhp' | 'fatigue' | 'calm' | 'elite' | 'boss' | 'battle' | 'home';
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
// The camp after the first expedition.
export function lobbyLesson(profile: Profile, seen: readonly LessonId[]): Lesson | undefined {
  if (profile.veteran || profile.cleared.length > 1 || seen.includes('home')) return undefined;
  return { id: 'home', target: '.lobby-guide, #lobby-depart', title: 'กลับค่ายแล้ว',
    text: 'ของที่เก็บมาเข้าคลัง ทีมฟื้นเต็ม งานแนะนำของ NPC อยู่ในการ์ดนี้ ทำแล้วรับรางวัลได้' };
}

export function loadPrefs(): LessonPrefs {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<LessonPrefs> | null; return { seen: Array.isArray(v?.seen) ? v!.seen : [], off: v?.off === true }; }
  catch { return { seen: [], off: false }; }
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
  }
  get seen(): readonly LessonId[] { return this.prefs.seen; }
  get off(): boolean { return this.prefs.off; }
  setOff(off: boolean): void { this.prefs.off = off; if (!off) this.prefs.seen = []; savePrefs(this.prefs); if (off) this.show(undefined); }
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
    const r = target.getBoundingClientRect(); ring.hidden = false;
    Object.assign(ring.style, { left: `${r.left - f.left - 4}px`, top: `${r.top - f.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px` });
    // Below the control when it sits in the top half of the frame, above it otherwise.
    const below = r.top - f.top < f.height / 2;
    bubble.style.top = below ? `${r.bottom - f.top + 12}px` : ''; bubble.style.bottom = below ? '' : `${f.bottom - r.top + 12}px`;
    bubble.dataset.side = below ? 'below' : 'above';
  }
}
