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
  unrecoverable: 'ออกจากระบบแล้วจะกลับเข้าบัญชีนี้ไม่ได้อีก · ผูก Google หรือออกรหัสกู้คืนก่อน',
  account_deleting: 'บัญชีนี้รอการลบ · ยกเลิกการลบก่อนจึงจะทำรายการนี้ได้',
  not_deleting: 'บัญชีนี้ไม่ได้รอการลบแล้ว',
  too_late: 'เลยวันลบแล้ว · ยกเลิกไม่ได้',
};
// P09-02g: the phrase the player types before the deletion request is sent.
export const DELETE_PHRASE = 'ลบบัญชี';
const privacyLink = () => `<p class="account-privacy"><a href="${import.meta.env.BASE_URL}privacy.html" target="_blank" rel="noopener">นโยบายความเป็นส่วนตัว</a></p>`;
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
  // P09-02f: the server said signing out would leave no way back; the next press confirms.
  private confirmOut = false;
  // P09-02g: the deletion confirm step is open.
  private confirmDelete = false;
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
    this.note = ''; this.code = undefined; this.conflict = undefined; this.confirmCode = false; this.confirmOut = false; this.confirmDelete = false;
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

  // P09-02g: an account that waits for deletion only shows the date and the way back.
  private renderDeleting(i: AccountInfo): void {
    const when = i.deleteAfter ? dateText(i.deleteAfter) : '—';
    this.el.innerHTML = `<div class="account-card"><h2 id="account-title" tabindex="-1">บัญชีบนเซิร์ฟเวอร์</h2>`
      + `<p class="account-status" data-status="deleting"><b>บัญชีนี้รอการลบ</b> · จะลบถาวรวันที่ ${when}</p>`
      + (this.note ? `<p class="account-note" role="status">${this.note}</p>` : '')
      + '<p>ระหว่างนี้เล่นต่อไม่ได้ · ยกเลิกได้จนถึงวันลบ แล้วบัญชีและความคืบหน้าจะกลับมาเหมือนเดิม · เครื่องอื่นเข้าด้วย Google หรือรหัสกู้คืนเพื่อยกเลิกได้</p>'
      + '<button type="button" class="primary" data-account="undelete">ยกเลิกการลบบัญชี</button>'
      + privacyLink() + '<button type="button" class="quiet" data-account="close">ปิด</button></div>';
    this.el.querySelector<HTMLElement>('[data-account="undelete"]')?.focus({ preventScroll: true });
  }

  private render(): void {
    const i = this.info;
    if (i?.status === 'deleting') { this.renderDeleting(i); return; }
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
      + (i ? '<section aria-labelledby="account-out"><h3 id="account-out">ออกจากระบบ</h3>'
        + (this.confirmOut ? `<p class="account-warn" role="alert">${ERRORS.unrecoverable}</p>` : '<p>ออกจากระบบเครื่องนี้แล้ว เครื่องนี้จะเริ่มบัญชีทดลองใหม่ · กลับเข้าบัญชีนี้ได้ด้วย Google หรือรหัสกู้คืน</p>')
        + `<button type="button" class="secondary" data-account="signout">${this.confirmOut ? 'ยืนยัน: ออกจากระบบ (กลับมาไม่ได้)' : 'ออกจากระบบเครื่องนี้'}</button>`
        + '<button type="button" class="secondary" data-account="signout-others">ออกจากระบบเครื่องอื่นทั้งหมด</button></section>' : '')
      + (i ? this.deleteSection(i) : '')
      + privacyLink() + '<button type="button" class="quiet" data-account="close">ปิด</button></div>';
    const slot = this.el.querySelector<HTMLElement>('#account-google-button');
    if (slot) void renderGoogleButton(slot, token => void this.google(token)).then(ok => { if (!ok && slot.isConnected) slot.innerHTML = '<p class="account-warn">โหลดปุ่ม Google ไม่ได้ · ตรวจการเชื่อมต่อแล้วเปิดหน้านี้ใหม่</p>'; });
    (this.el.querySelector<HTMLElement>('[data-account="switch"]') ?? this.el.querySelector<HTMLElement>('#account-title'))?.focus({ preventScroll: true });
  }

  private deleteSection(i: AccountInfo): string {
    const head = '<section class="account-delete" aria-labelledby="account-del"><h3 id="account-del">ลบบัญชี</h3>';
    if (!this.confirmDelete) {
      return `${head}<p>ลบบัญชีนี้และความคืบหน้าบนเซิร์ฟเวอร์ทั้งหมด · มีเวลา 14 วันให้เปลี่ยนใจ</p><button type="button" class="secondary" data-account="delete">ลบบัญชีนี้…</button></section>`;
    }
    return `${head}<div class="account-warn" role="alert"><p><b>ยืนยันการลบบัญชี</b></p><ul>`
      + '<li>บัญชีจะรอการลบ 14 วัน ระหว่างนี้เล่นไม่ได้ แต่ยกเลิกได้</li>'
      + '<li>เครื่องอื่นทั้งหมดจะถูกออกจากระบบทันที</li>'
      + '<li>พ้น 14 วันแล้ว ค่าย ทีม ไอเทม และประวัติคำสั่งบนเซิร์ฟเวอร์จะถูกลบถาวร กู้คืนไม่ได้</li>'
      + (!i.google && i.recoveryCodeAt === null ? '<li>บัญชีนี้ยังไม่ผูก Google และไม่มีรหัสกู้คืน · ถ้าล้างข้อมูลเบราว์เซอร์ระหว่างนี้ จะกลับมายกเลิกไม่ได้</li>' : '')
      + '<li>เซฟที่อยู่ในเครื่องนี้ (ถ้ามี) ไม่ถูกลบ</li></ul></div>'
      + `<label for="account-delete-input">พิมพ์ “${DELETE_PHRASE}” เพื่อยืนยัน</label>`
      + '<input id="account-delete-input" autocomplete="off" spellcheck="false" maxlength="20">'
      + '<div class="account-row"><button type="button" class="danger-button" data-account="delete-confirm">ยืนยันลบบัญชี</button><button type="button" class="secondary" data-account="delete-cancel">ไม่ลบ</button></div></section>';
  }

  private click(e: Event): void {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-account]');
    if (!button) return;
    const act = button.dataset.account;
    if (act === 'close') this.close();
    else if (act === 'cancel') { this.conflict = undefined; this.note = ''; this.render(); }
    else if (act === 'switch' && this.conflict) { const token = this.conflict; this.conflict = undefined; void this.signIn(token); }
    else if (act === 'code') void this.issueCode();
    else if (act === 'signout') void this.signOut();
    else if (act === 'signout-others') void this.signOutOthers();
    else if (act === 'delete') { this.confirmDelete = true; this.note = ''; this.render(); this.el.querySelector<HTMLElement>('#account-delete-input')?.focus({ preventScroll: true }); }
    else if (act === 'delete-cancel') { this.confirmDelete = false; this.render(); }
    else if (act === 'delete-confirm') void this.deleteAccount();
    else if (act === 'undelete') void this.undelete();
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
  private async signOut(): Promise<void> {
    const confirm = this.confirmOut; this.confirmOut = false;
    const out = await this.call('กำลังออกจากระบบ…', () => this.host.client.signOut('this', confirm));
    if (out.kind === 'refused' && out.error === 'unrecoverable') { this.confirmOut = true; this.note = ''; this.render(); return; }
    if (out.kind !== 'ok') { this.note = message(reasonOf(out)); this.render(); return; }
    this.close(); this.host.switched('ออกจากระบบแล้ว · เครื่องนี้เริ่มบัญชีทดลองใหม่');
  }
  private async signOutOthers(): Promise<void> {
    const out = await this.call('กำลังออกจากระบบเครื่องอื่น…', () => this.host.client.signOut('others'));
    this.note = out.kind === 'ok' ? (out.value ? `ออกจากระบบเครื่องอื่นแล้ว ${out.value} เครื่อง` : 'ไม่มีเครื่องอื่นที่เข้าบัญชีนี้อยู่') : message(reasonOf(out));
    this.render();
  }
  private async deleteAccount(): Promise<void> {
    const input = this.el.querySelector<HTMLInputElement>('#account-delete-input');
    if ((input?.value.trim() ?? '') !== DELETE_PHRASE) { this.note = `พิมพ์ “${DELETE_PHRASE}” ให้ตรงก่อนกดยืนยัน`; this.render(); this.el.querySelector<HTMLElement>('#account-delete-input')?.focus({ preventScroll: true }); return; }
    this.confirmDelete = false;
    const out = await this.call('กำลังส่งคำขอลบบัญชี…', () => this.host.client.deleteAccount());
    if (out.kind !== 'ok') { this.note = message(reasonOf(out)); this.render(); return; }
    this.info = out.value; this.note = 'ส่งคำขอลบบัญชีแล้ว'; this.render();
  }
  private async undelete(): Promise<void> {
    const out = await this.call('กำลังยกเลิกการลบ…', () => this.host.client.cancelDeletion());
    if (out.kind !== 'ok') { this.note = message(reasonOf(out)); this.render(); return; }
    this.close(); this.host.switched('ยกเลิกการลบบัญชีแล้ว · เล่นต่อได้ตามเดิม');
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
