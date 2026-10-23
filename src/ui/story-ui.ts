import { shortcutBlocked } from '../platform/keyboard';
import { storyArt } from '../game/visuals/assets';
import { heroText } from './th';
import { portrait } from './portraits';

// Story scenes (lore 2026-10-16): a few full-screen panels with a speaker and one line each, shown between
// views. They own no rules: the host saves first, then plays the scene, then continues. Skippable at any time.
export type Speaker = 'narrator' | 'vargoth' | 'guardian' | 'tracer' | 'weaver' | 'healer';
// `scene`: the painted backdrop (ART-STORY-PROLOGUE-001): dusk awakening, the open rift, or the retreat before dawn.
export type StoryScene = 'awaken' | 'rift' | 'retreat';
export interface StoryPanel { speaker: Speaker; text: string; scene: StoryScene }

const VARGOTH = { name: 'วาร์กอธ', role: 'จ้าวเผ่าอสูรรอยแยก', art: 'vargoth' };

export const prologue = (commander: string): readonly StoryPanel[] => [
  { speaker: 'narrator', text: `ความเงียบ… แล้วเสียงฟ้าแตกดังสนั่น ${commander} ลืมตาขึ้นท่ามกลางซากป้อมชายแดนแอสเตอร์เวล ท้องฟ้าเหนือหัวฉีกเป็นรอยแยกสีม่วง`, scene: 'awaken' },
  { speaker: 'guardian', text: 'ท่านฟื้นแล้ว! ท่านคือผู้ทอชะตา คนที่มองเห็นเส้นด้ายชะตาของพวกเรา… ข้าเฝ้าท่านอยู่ที่นี่ และทหารสามคนที่หนีมาจากป้อมอื่นก็พร้อมช่วยรบ', scene: 'awaken' },
  { speaker: 'vargoth', text: 'ผู้ทอชะตาคนสุดท้ายยังหายใจอยู่อีกหรือ… แผ่นดินนี้จะเป็นของเผ่าข้า และเจ้าจะตายที่นี่!', scene: 'rift' },
  { speaker: 'tracer', text: 'มันส่งกองหน้ามาแล้ว! ผู้บัญชาการ สั่งพวกเราเถอะ ด้ายชะตาของท่านจะบอกว่าศัตรูจะโจมตีตรงไหน', scene: 'rift' },
];
// `parted` (owner 2026-10-23): the guests who have not joined yet part ways after the prologue, each saying where
// they go; they come back at their own story point (Aira at the camp, Seren as the boss fight starts).
export const prologueEnd = (parted: readonly string[] = []): readonly StoryPanel[] => [
  { speaker: 'vargoth', text: 'น่าสนใจ… ด้ายชะตาของเจ้ายังไม่ขาด ข้าจะรอเจ้าที่ประตูรอยแยก', scene: 'retreat' },
  ...(parted.length ? [
    ...(parted.includes('healer') ? [{ speaker: 'healer' as const, text: 'มันถอยกลับเข้ารอยแยกแล้ว แต่หัวหน้ากองหน้าของมันยังเฝ้าประตูอยู่ ข้าต้องกลับไปดูแลผู้บาดเจ็บที่ป้อมหลังก่อน แล้วจะตามไปสมทบที่ประตูรอยแยก', scene: 'retreat' as const }] : []),
    ...(parted.includes('weaver') ? [{ speaker: 'weaver' as const, text: 'ข้าจะล่วงหน้าไปจุดไฟที่แคมป์ในป้อม ถ้าท่านตามไปถึง ค่อยว่ากันว่าข้าจะอยู่ต่อหรือไม่', scene: 'retreat' as const }] : []),
    { speaker: 'narrator' as const, text: 'ทหารที่ช่วยรบแยกย้ายกันไป เหลือเพียงเอกิสยืนอยู่เคียงข้างผู้บัญชาการ', scene: 'retreat' as const },
  ] : [
    { speaker: 'healer' as const, text: 'มันถอยกลับเข้ารอยแยกแล้ว แต่แม่ทัพของมันเฝ้าประตูอยู่ ไปตั้งหลักที่แคมป์ในป้อมก่อน แล้วขับไล่หัวหน้ากองหน้าของมันออกไป', scene: 'retreat' as const },
  ]),
];

// Story recruits (master plan A2): the guest steps forward and joins the ค่ายทหารรับจ้าง for good.
const recruitLines: Readonly<Record<string, string>> = {
  tracer: 'ข้าชื่อไลรา ทหารจากป้อมตะวันออก… ถ้าท่านมองเห็นชะตาได้จริง ข้าจะตามท่านไปเอง',
  weaver: 'แคมป์นี้อุ่นกว่าที่คิด… ไอราจะอยู่ด้วย เวทของข้าควรใช้ปกป้องคนที่ยังสู้อยู่',
  garran: 'ข้าการ์แรน เฝ้าเส้นทางนี้มาคนเดียวตั้งแต่หน่วยของข้าถูกป่ากลืน… ถ้าท่านจะฝ่าไป ทวนของข้าขอไปด้วย',
  healer: 'ข้าตามมาทันแล้ว… หัวหน้ากองหน้าอยู่ตรงหน้า ท่านพาพวกเรามาถึงที่นี่ได้จริง เซเรนขอสู้เคียงข้างและเดินทางไปกับท่าน',
};
export const recruitStory = (heroes: readonly string[], camp: string): readonly StoryPanel[] => heroes.flatMap(id => [
  { speaker: id as Speaker, text: recruitLines[id] ?? `${heroText[id]?.name ?? ''} ขอเข้าร่วมทางไปกับท่าน`, scene: 'retreat' as const },
  { speaker: 'narrator' as const, text: `${heroText[id]?.role ?? ''} ${heroText[id]?.name ?? ''} เข้าร่วม${camp}แล้ว`, scene: 'retreat' as const },
]);

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
      if (root.hidden || shortcutBlocked(e)) return;
      if (e.key === 'Escape') { e.preventDefault(); this.finish(); }
    });
  }
  get open(): boolean { return !this.root.hidden; }
  play(panels: readonly StoryPanel[], finishLabel: string, done: () => void): void {
    this.panels = panels; this.index = 0; this.done = done; this.finishLabel = finishLabel;
    this.root.hidden = false;
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
    this.root.dataset.speaker = p.speaker; this.root.dataset.scene = p.scene;
    this.root.style.setProperty('--story-bg', `url(${storyArt(`story_${p.scene}`)})`);
    // Vargoth stands full-figure on the painted scene; the heroes speak from their portraits.
    const figure = p.speaker === 'vargoth' ? `<img class="story-vargoth" src="${storyArt('vargoth_full')}" alt="">` : who ? portrait(who.art) : '';
    const face = p.speaker === 'vargoth' ? `<span class="story-bust" aria-hidden="true" style="background-image:url(${storyArt('vargoth_bust')})"></span>` : '';
    this.root.innerHTML = `${figure ? `<div class="story-figure" aria-hidden="true">${figure}</div>` : ''}
      <div class="story-card">
        <p class="story-who" id="story-speaker">${face}${who ? `<b>${who.name}</b><small>${who.role}</small>` : '<b>บทนำ</b>'}</p>
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
