import { COMMANDER_COLORS, COMMANDER_CRESTS, NAME_MAX, commanderReason } from '../core/world/profile';
import type { Commander } from '../core/world/types';
import { icon } from './icons';

export interface CommanderHost { create(c: Commander): void; back(): void }
// Dedicated line art: never route identity crests through the skill-icon renderer.
const crestPaths: Record<string, string> = {
  moon: '<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  mountain: '<path d="m2 20 7-14 4 7 3-5 6 12ZM6 12l3 2 2-3"/>',
  diamond: '<path d="m12 2 9 10-9 10L3 12Z"/><path d="M8 12h8"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',
  guard: '<path d="m12 3 7 3v6c0 4-4 7-7 9-3-2-7-5-7-9V6Z"/>',
  flag: '<path d="M5 21V3h14l-4 5 4 5H5"/>',
  bolt: '<path d="m13 2-8 12h6l-1 8 9-13h-7Z"/>',
  heal: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
  mark: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
};
export const crestName: Record<string, string> = { moon: 'จันทร์เสี้ยว', sun: 'ตะวัน', mountain: 'ขุนเขา', diamond: 'เพชร', star: 'ดาวนำทาง', guard: 'โล่พิทักษ์', flag: 'ธงศึก', bolt: 'สายฟ้า', heal: 'แสงเยียวยา', mark: 'ตราล่า' };
const crestArt = (crest: string): string => `<svg class="icon crest-art" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${crestPaths[crest] ?? crestPaths.star}</svg>`;
const colorName: Record<string, string> = { gold: 'ทอง', cyan: 'ฟ้าแสงดาว', violet: 'ม่วงรอยแยก', coral: 'ปะการัง', mint: 'มิ้นต์', rose: 'กุหลาบ' };
export const commanderBadge = (c: Commander): string =>
  `<span class="commander-crest" data-color="${c.color}" aria-hidden="true">${crestArt(c.crest)}</span>`;

// Commander creation (L2): shown once between Home and the Lobby. The commander leads the
// company but never fights. Nothing is saved until the player confirms.
export class CommanderUI {
  private draft: Commander = { name: '', crest: COMMANDER_CRESTS[0], color: COMMANDER_COLORS[0], camp: '' };
  private touched = false;
  constructor(private readonly root: HTMLElement, private readonly host: CommanderHost) {
    root.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-cmd]'); if (!b) return;
      if (b.dataset.cmd === 'crest') { this.draft.crest = b.dataset.value!; this.draw('#crest-' + b.dataset.value); }
      if (b.dataset.cmd === 'color') { this.draft.color = b.dataset.value!; this.draw('#color-' + b.dataset.value); }
      if (b.dataset.cmd === 'back') this.host.back();
    });
    root.addEventListener('input', e => {
      const input = e.target as HTMLInputElement;
      if (input.id !== 'commander-name') return;
      this.draft.name = input.value; this.touched = true;
      this.draft.camp = this.draft.name; // Legacy save field; identity uses the commander name.
      this.update();
    });
    root.addEventListener('submit', e => {
      e.preventDefault(); this.touched = true;
      const reason = commanderReason(this.draft);
      if (reason) { this.update(); this.root.querySelector<HTMLElement>(reason === 'camp' ? '#commander-camp' : '#commander-name')?.focus(); return; }
      this.host.create({ ...this.draft });
    });
  }
  open(): void { this.draft = { name: '', crest: COMMANDER_CRESTS[0], color: COMMANDER_COLORS[0], camp: '' }; this.touched = false; this.draw('#commander-name'); }
  private draw(focus?: string): void {
    const d = this.draft;
    this.root.innerHTML = `<form class="commander-shell" novalidate>
      <header class="commander-top"><button type="button" data-cmd="back" class="round-glass" aria-label="กลับหน้าแรก">${icon('left')}</button>
        <div><p class="eyebrow">ก่อนเข้าค่าย</p><h1>สร้างผู้บัญชาการ</h1></div></header>
      <section class="commander-panel">
        <div class="commander-preview" data-color="${d.color}" aria-live="polite">
          <div class="commander-stage"><span class="commander-pole" aria-hidden="true"></span>
            <span class="commander-banner" data-color="${d.color}" data-crest="${d.crest}">${commanderBadge(d)}</span></div>
          <div class="commander-identity"><p class="eyebrow">ผู้บัญชาการกองทหารรับจ้าง</p><b id="commander-preview-name">${this.escape(d.name.trim()) || 'ตั้งชื่อของคุณ'}</b>
            <small>${crestName[d.crest]} · ธง${colorName[d.color]}</small><small>นำทีมจากค่าย ไม่ลงสนามรบ ทหารรับจ้างคือผู้ต่อสู้</small></div></div>
        <div class="commander-form">
        <label class="commander-field" for="commander-name"><span>ชื่อผู้บัญชาการ</span>
          <input id="commander-name" name="name" type="text" autocomplete="nickname" enterkeyhint="done" maxlength="${NAME_MAX * 2}" value="${this.escape(d.name)}" aria-describedby="commander-name-hint" required>
          <small id="commander-name-hint" class="commander-hint"></small></label>
        <fieldset class="commander-choice"><legend>ตราประจำตัว</legend><div class="choice-row">
          ${COMMANDER_CRESTS.map(c => `<button type="button" id="crest-${c}" data-cmd="crest" data-value="${c}" aria-pressed="${d.crest === c}" aria-label="${crestName[c]}">${crestArt(c)}</button>`).join('')}</div></fieldset>
        <fieldset class="commander-choice"><legend>สีธง</legend><div class="choice-row">
          ${COMMANDER_COLORS.map(c => `<button type="button" id="color-${c}" class="swatch" data-color="${c}" data-cmd="color" data-value="${c}" aria-pressed="${d.color === c}" aria-label="${colorName[c]}"></button>`).join('')}</div></fieldset>
        </div>
      </section>
      <footer class="commander-footer"><p class="commander-note">ชื่อผู้บัญชาการเปลี่ยนภายหลังไม่ได้</p><button id="commander-create" type="submit" class="primary">${icon('camp')} ยืนยันและเข้าค่าย</button></footer>
    </form>`;
    this.update();
    if (focus) this.root.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true });
  }
  private update(): void {
    const reason = commanderReason(this.draft);
    const hint = this.root.querySelector('#commander-name-hint')!;
    hint.textContent = reason === 'name' && this.touched ? `ใส่ชื่อ 1–${NAME_MAX} ตัวอักษร (ไม่ใช้ < >)` : `สูงสุด ${NAME_MAX} ตัวอักษร`;
    hint.classList.toggle('error', reason === 'name' && this.touched);
    this.root.querySelector('#commander-name')!.setAttribute('aria-invalid', String(reason === 'name' && this.touched));
    this.root.querySelector('#commander-preview-name')!.textContent = this.draft.name.trim() || 'ตั้งชื่อของคุณ';

  }
  private escape(s: string): string { return s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!); }
}
