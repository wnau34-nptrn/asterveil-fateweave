import { artUrl } from '../game/visuals/assets';
import { heroText } from './th';
import { portrait } from './world-ui';

// Story scenes (lore 2026-10-16): a few full-screen panels with a speaker and one line each, shown between
// views. They own no rules: the host saves first, then plays the scene, then continues. Skippable at any time.
export type Speaker = 'narrator' | 'vargoth' | 'guardian' | 'tracer' | 'weaver' | 'healer';
export interface StoryPanel { speaker: Speaker; text: string }

// Vargoth has no art of his own yet: a dark silhouette of the rift sentinel stands in for him.
const VARGOTH = { name: 'วาร์กอธ', role: 'จ้าวเผ่าอสูรรอยแยก', art: 'foe_sentinel' };

export const prologue = (commander: string): readonly StoryPanel[] => [
  { speaker: 'narrator', text: `ความเงียบ… แล้วเสียงฟ้าแตกดังสนั่น ${commander} ลืมตาขึ้นท่ามกลางซากป้อมชายแดนแอสเตอร์เวล ท้องฟ้าเหนือหัวฉีกเป็นรอยแยกสีม่วง` },
  { speaker: 'guardian', text: 'ท่านฟื้นแล้ว! ท่านคือผู้ทอชะตา คนที่มองเห็นเส้นด้ายชะตาของพวกเรา… เราสี่คนรอท่านอยู่' },
  { speaker: 'vargoth', text: 'ผู้ทอชะตาคนสุดท้ายยังหายใจอยู่อีกหรือ… แผ่นดินนี้จะเป็นของเผ่าข้า และเจ้าจะตายที่นี่!' },
  { speaker: 'tracer', text: 'มันส่งกองหน้ามาแล้ว! ผู้บัญชาการ สั่งพวกเราเถอะ ด้ายชะตาของท่านจะบอกว่าศัตรูจะโจมตีตรงไหน' },
];
export const prologueEnd: readonly StoryPanel[] = [
  { speaker: 'vargoth', text: 'น่าสนใจ… ด้ายชะตาของเจ้ายังไม่ขาด ข้าจะรอเจ้าที่ประตูรอยแยก' },
  { speaker: 'healer', text: 'มันถอยกลับเข้ารอยแยกแล้ว แต่แม่ทัพของมันเฝ้าประตูอยู่ ไปตั้งหลักที่แคมป์ก่อน แล้วทำลายผนึกรอยแยกกัน' },
];

export class StoryUI {
  private panels: readonly StoryPanel[] = [];
  private index = 0;
  private done: (() => void) | undefined;
  private finishLabel = '';
  constructor(private readonly root: HTMLElement) {
    root.id = 'story-view'; root.className = 'story-view'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'story-speaker');
    root.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-story]');
      if (b?.dataset.story === 'next') this.next(); else if (b?.dataset.story === 'skip') this.finish();
    });
    root.ownerDocument.addEventListener('keydown', e => {
      if (root.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); this.finish(); }
    });
  }
  get open(): boolean { return !this.root.hidden; }
  play(panels: readonly StoryPanel[], finishLabel: string, done: () => void): void {
    this.panels = panels; this.index = 0; this.done = done; this.finishLabel = finishLabel;
    this.root.hidden = false; this.root.style.setProperty('--story-bg', `url(${artUrl('ruins')})`);
    this.draw();
  }
  private next(): void { if (this.index + 1 >= this.panels.length) this.finish(); else { this.index++; this.draw(); } }
  private finish(): void {
    if (this.root.hidden) return;
    this.root.hidden = true; this.root.innerHTML = '';
    // The next view lays out from an unscrolled page (iOS can leave it scrolled after the keyboard closes).
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    window.dispatchEvent(new Event('resize'));
    const done = this.done; this.done = undefined; done?.();
  }
  private draw(): void {
    const p = this.panels[this.index]!; const last = this.index + 1 >= this.panels.length;
    const who = p.speaker === 'narrator' ? undefined : p.speaker === 'vargoth' ? VARGOTH : { name: heroText[p.speaker]!.name, role: heroText[p.speaker]!.role, art: p.speaker };
    this.root.dataset.speaker = p.speaker;
    this.root.innerHTML = `<div class="story-rift" aria-hidden="true"></div>
      ${who ? `<div class="story-figure" aria-hidden="true">${portrait(who.art)}</div>` : ''}
      <div class="story-card">
        <p class="story-who" id="story-speaker">${who ? `<b>${who.name}</b><small>${who.role}</small>` : '<b>บทนำ</b>'}</p>
        <p class="story-text" aria-live="polite">${p.text}</p>
        <div class="story-actions"><span class="story-count" aria-label="ฉาก ${this.index + 1} จาก ${this.panels.length}">${this.index + 1}/${this.panels.length}</span>
          <button data-story="skip" class="quiet story-skip">ข้าม</button>
          <button data-story="next" id="story-next" class="primary">${last ? this.finishLabel : 'ต่อไป'}</button></div>
      </div>`;
    this.root.querySelector<HTMLElement>('#story-next')?.focus({ preventScroll: true });
  }
}

// The first battle's advice, spoken by the hero whose turn it is (lore 2026-10-16). The advisor still picks the
// move; this only gives it a voice. Unknown pairs fall back to a short battle cry.
const voices: Partial<Record<string, string>> = {
  'tracer:mark': 'ผู้บัญชาการ! ข้าจะติดตราไว้ที่มัน แล้วเราตีจุดเดิมกัน',
  'tracer:execute': 'ตรงตราเลย! จัดเต็ม!', 'tracer:attack': 'ฟันมันเลย!',
  'weaver:ward': 'ด้ายชะตาบอกว่าพลังงานจะลงตรงนั้น… โล่เวทก่อน!', 'weaver:bolt': 'รับศรเวทของข้าไป!',
  'guardian:guard': 'ข้ารับแทนเอง! อยู่หลังข้าไว้', 'guardian:bash': 'ไม่ให้แกได้ฟาดหรอก!', 'guardian:attack': 'ข้าจะเปิดทางให้!',
  'healer:heal': 'ใครเจ็บ ข้ารักษาให้เดี๋ยวนี้', 'healer:prayer': 'ขอพรให้ทุกคนลุกขึ้นสู้อีกครั้ง', 'healer:attack': 'ข้าก็สู้ได้นะ!',
};
export const heroVoice = (heroId: string, action: string): string => voices[`${heroId}:${action}`] ?? 'บุก!';
