import { COMMANDER_COLORS, COMMANDER_CRESTS, NAME_MAX, commanderReason } from '../core/world/profile';
import type { Commander } from '../core/world/types';
import { icon, type IconName } from './icons';

export interface CommanderHost { create(c: Commander): void; back(): void }
const crestIcon: Record<string, IconName> = { star: 'star', guard: 'guard', flag: 'flag', bolt: 'bolt', heal: 'heal', mark: 'mark' };
const crestName: Record<string, string> = { star: 'ดาวนำทาง', guard: 'โล่พิทักษ์', flag: 'ธงศึก', bolt: 'ศรเวท', heal: 'แสงเยียวยา', mark: 'ตราล่า' };
const colorName: Record<string, string> = { gold: 'ทอง', cyan: 'ฟ้าม่านเวล', violet: 'ม่วงรอยแยก', coral: 'ปะการัง', mint: 'มิ้นต์', rose: 'กุหลาบ' };
export const commanderBadge = (c: Commander): string =>
  `<span class="commander-crest" data-color="${c.color}" aria-hidden="true">${icon(crestIcon[c.crest] ?? 'star')}</span>`;

// Commander creation (L2): shown once between Home and the Lobby. The commander leads the
// company but never fights. Nothing is saved until the player confirms.
export class CommanderUI {
  private draft: Commander = { name: '', crest: COMMANDER_CRESTS[0], color: COMMANDER_COLORS[0] };
  private touched = false;
  constructor(private readonly root: HTMLElement, private readonly host: CommanderHost) {
    root.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-cmd]'); if (!b) return;
      if (b.dataset.cmd === 'crest') { this.draft.crest = b.dataset.value!; this.draw('#crest-' + b.dataset.value); }
      if (b.dataset.cmd === 'color') { this.draft.color = b.dataset.value!; this.draw('#color-' + b.dataset.value); }
      if (b.dataset.cmd === 'back') this.host.back();
    });
    root.addEventListener('input', e => {
      const input = e.target as HTMLInputElement; if (input.id !== 'commander-name') return;
      this.draft.name = input.value; this.touched = true; this.update();
    });
    root.addEventListener('submit', e => {
      e.preventDefault(); this.touched = true;
      if (commanderReason(this.draft)) { this.update(); this.root.querySelector<HTMLElement>('#commander-name')?.focus(); return; }
      this.host.create({ ...this.draft });
    });
  }
  open(): void { this.draft = { name: '', crest: COMMANDER_CRESTS[0], color: COMMANDER_COLORS[0] }; this.touched = false; this.draw('#commander-name'); }
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
          ${COMMANDER_CRESTS.map(c => `<button type="button" id="crest-${c}" data-cmd="crest" data-value="${c}" aria-pressed="${d.crest === c}" aria-label="${crestName[c]}">${icon(crestIcon[c]!)}</button>`).join('')}</div></fieldset>
        <fieldset class="commander-choice"><legend>สีธง</legend><div class="choice-row">
          ${COMMANDER_COLORS.map(c => `<button type="button" id="color-${c}" class="swatch" data-color="${c}" data-cmd="color" data-value="${c}" aria-pressed="${d.color === c}" aria-label="${colorName[c]}"></button>`).join('')}</div></fieldset>
        </div>
      </section>
      <footer class="commander-footer"><p class="commander-note">เปลี่ยนภายหลังไม่ได้ในเวอร์ชันนี้</p><button id="commander-create" type="submit" class="primary">${icon('camp')} ยืนยันและเข้าค่าย</button></footer>
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
