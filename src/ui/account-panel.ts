import { renderGoogleButton } from '../platform/google-identity';
import type { AccountInfo, AccountOutcome, ServerClient } from '../platform/server-client';

// P09-02d (owner D1): the account panel of server play, opened from the title. It links the account to Google, issues a
// one-time recovery code (shown once; the server keeps only its hash), and moves this device to another account by
// Google sign-in or a recovery code. Accounts are never merged: a Google identity on another account offers to switch.
// Every request locks the game like a command (`busy`/`idle`); after a switch the shell enters that account (D12).

export interface AccountHost {
  client: ServerClient;
  busy(note: string): void;
  idle(): void;
  // This device now plays another account: enter it and show the title again.
  switched(note: string): void;
}

const ERRORS: Record<string, string> = {
  identity_in_use: 'Google นี้ผูกกับบัญชีเกมอื่นอยู่แล้ว',
  already_linked: 'บัญชีนี้ผูกกับ Google อื่นอยู่แล้ว',
  not_linked: 'Google นี้ยังไม่ได้ผูกกับบัญชีเกมใด · เล่นบัญชีบนเครื่องนี้แล้วกดผูกก่อน',
  invalid_code: 'รหัสกู้คืนไม่ถูกต้อง หรือถูกใช้ไปแล้ว',
  google_token: 'Google ยืนยันตัวตนไม่ผ่าน · ลองกดปุ่ม Google อีกครั้ง',
  google_unset: 'เซิร์ฟเวอร์นี้ยังไม่ได้ตั้งค่า Google',
  rate_limited: 'ลองบ่อยเกินไป · รอสักครู่แล้วลองใหม่',
  network: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ · ลองอีกครั้ง',
  server: 'เซิร์ฟเวอร์ยังไม่ตอบ · ลองอีกครั้ง',
  unauthorized: 'บัญชีบนเครื่องนี้ใช้ไม่ได้แล้ว · ปิดแล้วเชื่อมต่อใหม่',
  content_version: 'เวอร์ชันเกมไม่ตรงกับเซิร์ฟเวอร์ · โหลดหน้าใหม่',
};
const reasonOf = <T>(out: AccountOutcome<T>) => out.kind === 'refused' ? out.error : out.kind === 'failed' ? out.reason : '';
const message = (code: string) => ERRORS[code] ?? `ทำรายการไม่สำเร็จ (${code})`;
const dateText = (ms: number) => new Date(ms).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

export class AccountPanel {
  private info: AccountInfo | undefined;
  private note = '';
  private code: string | undefined;
  // A Google ID token whose identity is on another account, kept while the player decides whether to switch.
  private conflict: string | undefined;
  private confirmCode = false;
  private readonly el: HTMLElement;
  constructor(parent: HTMLElement, private readonly host: AccountHost) {
    this.el = document.createElement('section');
    this.el.className = 'account-panel'; this.el.id = 'account-panel'; this.el.hidden = true;
    this.el.setAttribute('role', 'dialog'); this.el.setAttribute('aria-modal', 'true'); this.el.setAttribute('aria-labelledby', 'account-title');
    parent.append(this.el);
    this.el.addEventListener('click', e => this.click(e));
    this.el.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); this.close(); } });
    this.el.addEventListener('submit', e => { e.preventDefault(); this.recover(); });
  }
  get isOpen(): boolean { return !this.el.hidden; }

  async open(): Promise<void> {
    this.note = ''; this.code = undefined; this.conflict = undefined; this.confirmCode = false;
    this.el.hidden = false; this.el.innerHTML = '<div class="account-card"><p class="server-note">กำลังโหลดบัญชี…</p></div>';
    const out = await this.call('กำลังโหลดบัญชี…', () => this.host.client.account());
    if (out.kind === 'ok') this.info = out.value; else { this.info = undefined; this.note = message(reasonOf(out)); }
    this.render();
  }
  close(): void {
    this.el.hidden = true; this.el.innerHTML = ''; this.code = undefined;
    document.querySelector<HTMLElement>('#account-open')?.focus({ preventScroll: true });
  }

  private async call<T>(note: string, run: () => Promise<AccountOutcome<T>>): Promise<AccountOutcome<T>> {
    this.host.busy(note);
    try { return await run(); } finally { this.host.idle(); }
  }

  private render(): void {
    const i = this.info;
    const status = !i ? '' : i.google
      ? '<p class="account-status" data-status="linked"><b>ผูก Google แล้ว</b> · เข้าเล่นบัญชีนี้บนเครื่องอื่นได้ด้วยปุ่ม Google เดียวกัน</p>'
      : '<p class="account-status" data-status="guest"><b>บัญชีทดลอง · ยังไม่ผูก</b> · ถ้าล้างข้อมูลเบราว์เซอร์หรือเปลี่ยนเครื่อง จะกลับมาบัญชีนี้ได้ด้วย Google หรือรหัสกู้คืนเท่านั้น</p>';
    const conflict = this.conflict ? `<div class="account-conflict" role="alert"><p><b>${ERRORS.identity_in_use}</b> · ไม่รวมบัญชี: สลับเครื่องนี้ไปเล่นบัญชีนั้นได้</p>`
      + (i && !i.google && i.recoveryCodeAt === null ? '<p class="account-warn">บัญชีทดลองบนเครื่องนี้ยังไม่ผูกและไม่มีรหัสกู้คืน · สลับแล้วจะกลับมาไม่ได้ ออกรหัสกู้คืนก่อนถ้ายังอยากเก็บไว้</p>' : '')
      + '<div class="account-row"><button type="button" class="primary" data-account="switch">สลับไปบัญชีนั้น</button><button type="button" class="secondary" data-account="cancel">ยกเลิก</button></div></div>' : '';
    const code = this.code ? `<div class="account-code" role="status"><p>รหัสกู้คืน · แสดงครั้งเดียว ใช้ได้ครั้งเดียว</p><output id="account-code">${this.code}</output>`
      + '<p>จดหรือคัดลอกเก็บไว้ที่ปลอดภัย · ใครมีรหัสนี้เข้าบัญชีนี้ได้</p><button type="button" class="secondary" data-account="copy">คัดลอกรหัส</button></div>' : '';
    const codeLine = i ? (i.recoveryCodeAt === null ? 'ยังไม่มีรหัสกู้คืน' : `มีรหัสที่ออกเมื่อ ${dateText(i.recoveryCodeAt)} · ออกใหม่แล้วรหัสเดิมใช้ไม่ได้`) : '';
    this.el.innerHTML = `<div class="account-card"><h2 id="account-title">บัญชีบนเซิร์ฟเวอร์</h2>${status}`
      + (this.note ? `<p class="account-note" role="status">${this.note}</p>` : '')
      + conflict
      + (i ? `<section aria-labelledby="account-google"><h3 id="account-google">Google</h3><p>${i.google ? 'สลับไปบัญชีเกมที่ผูกกับ Google อื่น:' : 'ผูกบัญชีนี้กับ Google เพื่อเข้าเล่นบนเครื่องอื่น:'}</p><div class="account-google" id="account-google-button"></div></section>`
        + `<section aria-labelledby="account-recovery"><h3 id="account-recovery">รหัสกู้คืน</h3><p>${codeLine}</p>${code}`
        + `<button type="button" class="secondary" data-account="code">${this.confirmCode ? 'ยืนยัน: ออกรหัสใหม่ (รหัสเดิมใช้ไม่ได้)' : i.recoveryCodeAt === null ? 'ออกรหัสกู้คืน' : 'ออกรหัสใหม่'}</button></section>` : '')
      + '<form class="account-recover" aria-labelledby="account-use"><h3 id="account-use">มีรหัสกู้คืนของบัญชีอื่น</h3>'
      + (i && !i.google && i.recoveryCodeAt === null ? '<p class="account-warn">ใช้รหัสของบัญชีอื่นแล้ว บัญชีทดลองบนเครื่องนี้จะกลับมาไม่ได้ ถ้ายังไม่ผูกหรือออกรหัสไว้</p>' : '')
      + '<label for="account-code-input">รหัส 20 ตัว</label>'
      + '<input id="account-code-input" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="32" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX">'
      + '<button type="submit" class="secondary" data-account="recover">เข้าบัญชีด้วยรหัส</button></form>'
      + '<button type="button" class="quiet" data-account="close">ปิด</button></div>';
    const slot = this.el.querySelector<HTMLElement>('#account-google-button');
    if (slot) void renderGoogleButton(slot, token => void this.google(token)).then(ok => { if (!ok && slot.isConnected) slot.innerHTML = '<p class="account-warn">โหลดปุ่ม Google ไม่ได้ · ตรวจการเชื่อมต่อแล้วเปิดหน้านี้ใหม่</p>'; });
    (this.el.querySelector<HTMLElement>('[data-account="switch"]') ?? this.el.querySelector<HTMLElement>('#account-title'))?.focus({ preventScroll: true });
  }

  private click(e: Event): void {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-account]');
    if (!button) return;
    const act = button.dataset.account;
    if (act === 'close') this.close();
    else if (act === 'cancel') { this.conflict = undefined; this.note = ''; this.render(); }
    else if (act === 'switch' && this.conflict) { const token = this.conflict; this.conflict = undefined; void this.signIn(token); }
    else if (act === 'code') void this.issueCode();
    else if (act === 'copy' && this.code) { void navigator.clipboard?.writeText(this.code).then(() => { button.textContent = 'คัดลอกแล้ว'; }, () => { button.textContent = 'คัดลอกไม่ได้ · จดรหัสด้วยมือ'; }); }
  }

  // Google chose an account: link it to this one, or (already linked) sign in to the account it belongs to.
  private async google(idToken: string): Promise<void> {
    if (!this.info) return;
    if (this.info.google) { await this.signIn(idToken); return; }
    const out = await this.call('กำลังผูกบัญชีกับ Google…', () => this.host.client.link(idToken));
    if (out.kind === 'ok') { this.info = out.value; this.note = 'ผูก Google สำเร็จ'; this.conflict = undefined; }
    else if (out.kind === 'refused' && out.error === 'identity_in_use') { this.conflict = idToken; this.note = ''; }
    else this.note = message(reasonOf(out));
    this.render();
  }
  private async signIn(idToken: string): Promise<void> {
    const before = this.info?.accountId;
    const out = await this.call('กำลังเข้าสู่ระบบด้วย Google…', () => this.host.client.signIn(idToken));
    if (out.kind !== 'ok') { this.note = message(reasonOf(out)); this.render(); return; }
    if (out.value === before) { this.note = 'นี่คือบัญชีเดิมของเครื่องนี้'; this.render(); return; }
    this.close(); this.host.switched('เข้าสู่ระบบด้วย Google แล้ว · เล่นบัญชีนั้นบนเครื่องนี้');
  }
  private async issueCode(): Promise<void> {
    if (!this.info) return;
    if (this.info.recoveryCodeAt !== null && !this.confirmCode) { this.confirmCode = true; this.render(); return; }
    this.confirmCode = false;
    const out = await this.call('กำลังออกรหัสกู้คืน…', () => this.host.client.recoveryCode());
    if (out.kind === 'ok') { this.code = out.value; this.note = ''; this.info = { ...this.info, recoveryCodeAt: Date.now() }; }
    else this.note = message(reasonOf(out));
    this.render();
    this.el.querySelector<HTMLElement>('#account-code')?.scrollIntoView({ block: 'nearest' });
  }
  private async recover(): Promise<void> {
    const input = this.el.querySelector<HTMLInputElement>('#account-code-input');
    const code = input?.value.trim() ?? '';
    if (!code) { this.note = 'ใส่รหัสกู้คืนก่อน'; this.render(); return; }
    const out = await this.call('กำลังตรวจรหัสกู้คืน…', () => this.host.client.recover(code));
    if (out.kind !== 'ok') { this.note = message(reasonOf(out)); this.render(); return; }
    this.close(); this.host.switched(out.value === this.info?.accountId ? 'ใช้รหัสกู้คืนแล้ว · บัญชีเดิม' : 'ใช้รหัสกู้คืนแล้ว · เล่นบัญชีนั้นบนเครื่องนี้ · ออกรหัสใหม่ไว้ด้วย');
  }
}
