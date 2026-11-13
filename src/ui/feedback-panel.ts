import type { FeedbackCategory, FeedbackRow, ReportPlace, ServerClient, TelemetryRow } from '../platform/server-client';

// P09-03: the in-game feedback form (server play). A modal <dialog>, so it opens above the world/battle info dialogs
// that hold its button. The text goes to the server with the account it came from (privacy page); nothing is sent until
// the player presses send. Admins (D1 `admins`) also see the latest feedback and the daily telemetry totals here.

const CATEGORIES: Record<FeedbackCategory, string> = { bug: 'แจ้งปัญหา / บั๊ก', balance: 'ความยากง่าย / สมดุล', idea: 'ไอเดีย / อยากให้มี', other: 'อื่น ๆ' };
export const FEEDBACK_MAX = 1000;
const ERRORS: Record<string, string> = {
  rate_limited: 'ส่งบ่อยเกินไป · รอสักครู่แล้วลองใหม่',
  invalid_request: 'ข้อความว่างหรือยาวเกิน 1000 ตัวอักษร',
  account_deleting: 'บัญชีนี้รอการลบ · ส่งความเห็นไม่ได้',
  network: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ · ข้อความยังอยู่ ลองส่งอีกครั้ง',
  server: 'เซิร์ฟเวอร์ยังไม่ตอบ · ข้อความยังอยู่ ลองส่งอีกครั้ง',
  unauthorized: 'บัญชีบนเครื่องนี้ใช้ไม่ได้แล้ว',
};
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const when = (ms: number) => new Date(ms).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export class FeedbackPanel {
  private readonly dialog: HTMLDialogElement;
  private place: ReportPlace = 'unknown';
  private sending = false;
  private admin: boolean | undefined;
  constructor(parent: HTMLElement, private readonly client: ServerClient) {
    this.dialog = document.createElement('dialog');
    this.dialog.id = 'feedback-dialog'; this.dialog.className = 'feedback-dialog'; this.dialog.setAttribute('aria-labelledby', 'feedback-title');
    parent.append(this.dialog);
    this.dialog.addEventListener('click', e => this.click(e));
    this.dialog.addEventListener('submit', e => { e.preventDefault(); void this.send(); });
    this.dialog.addEventListener('input', e => { if ((e.target as HTMLElement).id === 'feedback-text') { this.count(); this.status(''); } });
  }
  get isOpen(): boolean { return this.dialog.open; }

  open(place: ReportPlace): void {
    this.place = place;
    const admin = this.admin === true;
    // Whether this account is an admin is asked once per page (the account answer says `admin: true`).
    if (this.admin === undefined) void this.client.account().then(o => { this.admin = o.kind === 'ok' && o.value.admin === true; if (this.admin && this.dialog.open) this.open(this.place); });
    this.dialog.innerHTML = `<div class="account-card feedback-card"><h2 id="feedback-title">ส่งความเห็น / แจ้งปัญหา</h2>`
      + '<form class="feedback-form"><fieldset><legend>เรื่อง</legend><div class="feedback-cats">'
      + Object.entries(CATEGORIES).map(([id, text], i) => `<label><input type="radio" name="category" value="${id}"${i === 0 ? ' checked' : ''}> ${text}</label>`).join('')
      + '</div></fieldset><label for="feedback-text">รายละเอียด</label>'
      + `<textarea id="feedback-text" rows="6" maxlength="${FEEDBACK_MAX}" placeholder="เกิดอะไรขึ้น ทำอะไรอยู่ตอนนั้น หรืออยากให้เกมเป็นแบบไหน"></textarea>`
      + `<p class="feedback-count" id="feedback-count">0 / ${FEEDBACK_MAX}</p>`
      + '<p class="feedback-note">ข้อความนี้เก็บไว้กับบัญชีของคุณเพื่อให้ผู้พัฒนาอ่าน · อย่าใส่ข้อมูลส่วนตัว · ลบไปพร้อมบัญชี</p>'
      + '<p class="account-note" id="feedback-status" role="status" hidden></p>'
      + '<div class="account-row"><button type="submit" class="primary" data-feedback="send">ส่ง</button><button type="button" class="secondary" data-feedback="close">ปิด</button></div></form>'
      + (admin ? '<section class="feedback-admin" aria-labelledby="feedback-admin-title"><h3 id="feedback-admin-title">ผู้ดูแล</h3><div class="account-row"><button type="button" class="secondary" data-feedback="admin-feedback">ความเห็นล่าสุด</button><button type="button" class="secondary" data-feedback="admin-telemetry">สถิติ 14 วัน</button></div><div id="feedback-admin-out"></div></section>' : '')
      + '</div>';
    if (!this.dialog.open) this.dialog.showModal();
    this.dialog.querySelector<HTMLElement>('#feedback-text')?.focus({ preventScroll: true });
  }
  close(): void { if (this.dialog.open) this.dialog.close(); }

  private count(): void {
    const text = this.dialog.querySelector<HTMLTextAreaElement>('#feedback-text')?.value ?? '';
    const out = this.dialog.querySelector('#feedback-count');
    if (out) out.textContent = `${[...text].length} / ${FEEDBACK_MAX}`;
  }
  private status(text: string): void {
    const el = this.dialog.querySelector<HTMLElement>('#feedback-status');
    if (el) { el.textContent = text; el.hidden = !text; }
  }
  private click(e: Event): void {
    const act = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-feedback]')?.dataset.feedback;
    if (act === 'close') this.close();
    else if (act === 'admin-feedback') void this.adminFeedback();
    else if (act === 'admin-telemetry') void this.adminTelemetry();
  }
  private async send(): Promise<void> {
    if (this.sending) return;
    const text = this.dialog.querySelector<HTMLTextAreaElement>('#feedback-text')?.value.trim() ?? '';
    const category = (this.dialog.querySelector<HTMLInputElement>('input[name="category"]:checked')?.value ?? 'other') as FeedbackCategory;
    if (!text) { this.status('เขียนรายละเอียดก่อนกดส่ง'); return; }
    this.sending = true;
    const button = this.dialog.querySelector<HTMLButtonElement>('[data-feedback="send"]');
    if (button) { button.disabled = true; button.textContent = 'กำลังส่ง…'; }
    const out = await this.client.feedback(category, text, this.place);
    this.sending = false;
    if (out.kind === 'ok') {
      const area = this.dialog.querySelector<HTMLTextAreaElement>('#feedback-text');
      if (area) area.value = '';
      this.count(); this.status('ส่งแล้ว ขอบคุณที่ช่วยบอก');
    } else this.status(ERRORS[out.kind === 'refused' ? out.error : out.reason] ?? 'ส่งไม่สำเร็จ · ลองอีกครั้ง');
    if (button) { button.disabled = false; button.textContent = 'ส่ง'; }
  }
  private adminOut(html: string): void { const el = this.dialog.querySelector('#feedback-admin-out'); if (el) el.innerHTML = html; }
  private async adminFeedback(): Promise<void> {
    const out = await this.client.adminFeedback();
    if (out.kind !== 'ok') { this.adminOut('<p class="account-warn">อ่านไม่ได้</p>'); return; }
    this.adminOut(out.value.length ? `<ol class="feedback-list">${out.value.map((r: FeedbackRow) =>
      `<li><p><b>${escape(CATEGORIES[r.category as FeedbackCategory] ?? r.category)}</b> · ${when(r.at)} · ${escape(r.place)} · <code>${r.accountId.slice(0, 8)}</code></p><p>${escape(r.text)}</p></li>`).join('')}</ol>` : '<p>ยังไม่มีความเห็น</p>');
  }
  private async adminTelemetry(): Promise<void> {
    const out = await this.client.adminTelemetry(14);
    if (out.kind !== 'ok') { this.adminOut('<p class="account-warn">อ่านไม่ได้</p>'); return; }
    const totals = new Map<string, number>();
    for (const r of out.value as TelemetryRow[]) totals.set(`${r.kind} · ${r.key}`, (totals.get(`${r.kind} · ${r.key}`) ?? 0) + r.count);
    const rows = [...totals].sort((a, b) => a[0].localeCompare(b[0]));
    this.adminOut(rows.length ? `<table class="feedback-table"><thead><tr><th scope="col">รายการ</th><th scope="col">14 วัน</th></tr></thead><tbody>${rows.map(([k, n]) => `<tr><td>${escape(k)}</td><td>${n}</td></tr>`).join('')}</tbody></table>` : '<p>ยังไม่มีข้อมูล</p>');
  }
}
