import { CHAT_MAX, CHAT_REFUSAL_TEXT, filterChat } from '../core/chat/filter';
import { DM_LIMITS, FRIEND_ERROR_TEXT, normalizeFriendCode } from '../core/chat/friends';
import type { ChatMessage, ChatReportReason, FriendsView, ServerClient } from '../platform/server-client';

// OD-56 friends + private chat (docs/design/FRIENDS_TH.md): the "เพื่อน" tab of the chat dialog. My code (copy, new
// code), add by code, requests in/out, the friend list with unread counts, blocked camps, and one private conversation at
// a time. It polls only while the tab is showing (the list every 10 s, an open conversation every 4 s) and the page is
// visible. Text is always set with textContent; the device never holds an account id, only handles and refs.

export const FRIENDS_POLL_MS = 10_000; export const DM_POLL_MS = 4000;
const KEEP = DM_LIMITS.keepMessages;
const REASONS: Record<ChatReportReason, string> = { abuse: 'หยาบคาย/คุกคาม', spam: 'สแปม/โฆษณา', personal: 'ข้อมูลส่วนตัว', other: 'อื่น ๆ' };
const TEXT: Record<string, string> = {
  ...CHAT_REFUSAL_TEXT, ...FRIEND_ERROR_TEXT,
  too_fast: 'ส่งเร็วเกินไป · รอสักครู่', duplicate: 'ข้อความซ้ำกับที่เพิ่งส่ง', muted: 'ถูกระงับการพิมพ์ชั่วคราว',
  chat_linked_only: 'ตอนนี้พิมพ์ได้เฉพาะบัญชีที่ผูก Google', chat_readonly: 'แชทเปิดให้อ่านอย่างเดียวชั่วคราว',
  chat_unavailable: 'เชื่อมต่อแชทไม่ได้ตอนนี้', network: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ · ลองอีกครั้ง', server: 'เซิร์ฟเวอร์ยังไม่ตอบ · ลองอีกครั้ง',
  unauthorized: 'บัญชีบนเครื่องนี้ใช้ไม่ได้แล้ว', own: 'แจ้งข้อความของตัวเองไม่ได้', no_message: 'ข้อความนี้ถูกลบแล้ว',
};
const why = (o: { kind: string; error?: string; reason?: string }): string => TEXT[(o.kind === 'refused' ? o.error : o.reason) ?? ''] ?? 'ทำไม่สำเร็จ · ลองอีกครั้ง';
const clock = (ms: number) => new Date(ms).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
const btn = (text: string, data: Record<string, string>, cls = 'secondary', label?: string): HTMLButtonElement => {
  const b = el('button', cls, text); b.type = 'button'; Object.assign(b.dataset, data); if (label) b.setAttribute('aria-label', label); return b;
};

export class FriendsPanel {
  readonly root: HTMLElement;
  private view: FriendsView | undefined;
  private conv: { ref: string; handle: string } | undefined;
  private msgs: ChatMessage[] = [];
  private last = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private busy = false; private again = false; private reading = false; private sending = false;
  private menuFor: string | undefined; private msgMenu: number | undefined; private confirm: string | undefined;
  private block: string | null = null; private wait = 0;
  private active = false;
  fetchedAt = 0;
  constructor(private readonly client: ServerClient, private readonly onUnread: (n: number) => void) {
    this.root = el('section', 'friends-view'); this.root.id = 'friends-view'; this.root.hidden = true; this.root.setAttribute('aria-label', 'เพื่อนและแชทส่วนตัว');
    this.root.innerHTML = '<div id="friends-home">'
      + '<div class="friends-code"><p>รหัสเพื่อนของคุณ <b id="friend-code">…</b></p><div class="friends-code-row"><button type="button" class="secondary" id="friend-copy" data-friend="copy">คัดลอกรหัส</button><button type="button" class="secondary" id="friend-new-code" data-friend="new-code">ขอรหัสใหม่</button></div></div>'
      + '<form class="chat-form friends-add" id="friend-add"><label for="friend-code-input" class="chat-sr">รหัสเพื่อน</label><input id="friend-code-input" type="text" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="send" placeholder="รหัสเพื่อน 8 ตัว"><button type="submit" class="primary" id="friend-add-send">ส่งคำขอ</button></form>'
      + '<p class="chat-status" id="friends-status" role="status" hidden></p>'
      + '<div id="friends-lists"></div>'
      + '<p class="chat-note">ชื่อเพื่อนเป็นชื่อแฝงของค่าย · แชทส่วนตัวได้เฉพาะเพื่อนที่ยอมรับกันทั้งสองฝ่าย · บล็อกมีผลทุกเครื่องของบัญชีนี้ ค่ายที่ถูกบล็อกส่งคำขอหรือข้อความถึงคุณไม่ได้ · ข้อความเก็บ 7 วัน</p></div>'
      + '<div id="dm-view" hidden><header class="dm-head"><button type="button" class="secondary" id="dm-back" data-friend="back" aria-label="กลับไปรายชื่อเพื่อน">‹ เพื่อน</button><h3 id="dm-title"></h3><button type="button" class="secondary" id="dm-block" data-friend="block-conv">บล็อก</button></header>'
      + '<ol id="dm-log" class="chat-log dm-log" role="log" aria-live="polite" aria-labelledby="dm-title"></ol>'
      + '<p class="chat-status" id="dm-status" role="status" hidden></p>'
      + `<form class="chat-form" id="dm-form"><label for="dm-text" class="chat-sr">ข้อความส่วนตัว</label><input id="dm-text" type="text" maxlength="${CHAT_MAX}" autocomplete="off" enterkeyhint="send" placeholder="พิมพ์ข้อความส่วนตัว…"><button type="submit" class="primary" id="dm-send">ส่ง</button></form>`
      + `<p class="feedback-count" id="dm-count">0 / ${CHAT_MAX}</p></div>`;
    this.root.addEventListener('click', e => this.click(e));
    this.root.addEventListener('submit', e => { e.preventDefault(); if ((e.target as HTMLElement).id === 'friend-add') void this.add(); else void this.send(); });
    this.root.addEventListener('input', e => { if ((e.target as HTMLElement).id === 'dm-text') this.count(); });
    document.addEventListener('visibilitychange', () => { if (this.active && document.visibilityState === 'visible') void this.tick(); });
  }
  private q<T extends HTMLElement>(sel: string): T | null { return this.root.querySelector<T>(sel); }
  get unread(): number { return this.view?.unread ?? 0; }

  // The dialog shows the tab: start polling; hidden or dialog closed: stop.
  show(on: boolean): void {
    this.active = on; this.root.hidden = !on; this.stop();
    if (!on) return;
    this.renderFrame(); void this.tick();
    this.timer = setInterval(() => { if (document.visibilityState === 'visible') void this.tick(); }, this.conv ? DM_POLL_MS : FRIENDS_POLL_MS);
    (this.conv ? this.q('#dm-text') : this.q('#friend-code-input'))?.focus({ preventScroll: true });
  }
  private restart(): void { if (this.active) this.show(true); }
  private stop(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  private tick(): Promise<void> { return this.conv ? this.readConv() : this.refresh(); }

  // One read of the list (the camp badge also calls this, at most once a minute, while the camp is shown).
  // A refresh asked for while one is in flight (e.g. right after a block) runs once more afterwards, so the list never
  // keeps the answer of a read that started before the change.
  async refresh(): Promise<void> {
    if (this.busy) { this.again = true; return; }
    this.busy = true; const out = await this.client.friends(); this.busy = false;
    if (this.again) { this.again = false; return this.refresh(); }
    this.fetchedAt = Date.now();
    if (out.kind !== 'ok') { if (this.active && !this.conv) this.status(why(out)); this.root.dataset.friends = out.kind === 'refused' ? out.error : 'down'; return; }
    if (this.root.dataset.friends !== 'live') this.status('');
    this.root.dataset.friends = 'live'; this.view = out.value; this.onUnread(this.view.unread);
    if (this.conv && !this.view.friends.some(f => f.ref === this.conv!.ref)) this.leaveConv('ค่ายนี้ไม่ได้เป็นเพื่อนกับคุณแล้ว');
    if (this.active && !this.conv) this.renderLists();
  }

  private renderFrame(): void {
    const home = this.q('#friends-home'), dm = this.q('#dm-view');
    if (home) home.hidden = !!this.conv; if (dm) dm.hidden = !this.conv;
    if (this.conv) { const t = this.q('#dm-title'); if (t) t.textContent = this.conv.handle; this.renderLog(); this.inputState(); } else this.renderLists();
  }
  private renderLists(): void {
    const box = this.q('#friends-lists'); const v = this.view;
    const code = this.q('#friend-code'); if (code) code.textContent = v?.code ?? '…';
    if (!box) return;
    const focused = (document.activeElement as HTMLElement | null)?.dataset.key;
    if (!v) { box.replaceChildren(el('p', 'chat-note', 'กำลังโหลดรายชื่อเพื่อน…')); return; }
    const section = (id: string, title: string, rows: HTMLElement[], empty?: string) => {
      const s = el('section', 'friends-section'); s.setAttribute('aria-labelledby', id); const h = el('h3', '', title); h.id = id; s.append(h);
      if (rows.length) { const ul = el('ul', 'friends-list'); ul.append(...rows); s.append(ul); } else if (empty) s.append(el('p', 'chat-note', empty));
      return s;
    };
    const keyed = (b: HTMLButtonElement, key: string) => { b.dataset.key = key; return b; };
    const confirmBtn = (text: string, action: string, ref: string, handle: string) => {
      const k = `${action}:${ref}`; const sure = this.confirm === k;
      return keyed(btn(sure ? `ยืนยัน${text}` : text, { friend: action, ref }, sure ? 'secondary friends-danger' : 'secondary', sure ? `ยืนยัน${text} ${handle}` : `${text} ${handle}`), k);
    };
    const parts: HTMLElement[] = [];
    if (v.incoming.length) parts.push(section('friends-in-title', `คำขอที่ได้รับ (${v.incoming.length})`, v.incoming.map(r => {
      const li = el('li', 'friends-row'); li.dataset.ref = r.ref; li.append(el('span', 'friends-name', r.handle));
      const act = el('div', 'friends-actions');
      act.append(keyed(btn('รับ', { friend: 'accept', ref: r.ref }, 'primary', `รับคำขอของ ${r.handle}`), `accept:${r.ref}`), keyed(btn('ปฏิเสธ', { friend: 'decline', ref: r.ref }, 'secondary', `ปฏิเสธคำขอของ ${r.handle}`), `decline:${r.ref}`), confirmBtn('บล็อก', 'block', r.ref, r.handle));
      li.append(act); return li;
    })));
    parts.push(section('friends-list-title', `เพื่อน (${v.friends.length}/${v.limits.maxFriends})`, v.friends.map(f => {
      const li = el('li', 'friends-row'); li.dataset.ref = f.ref;
      const open = keyed(btn('', { friend: 'open', ref: f.ref, handle: f.handle }, 'secondary friends-open', `แชทกับ ${f.handle}${f.unread ? ` · ข้อความใหม่ ${f.unread}` : ''}`), `open:${f.ref}`);
      open.append(el('span', 'friends-name', f.handle)); if (f.unread) open.append(el('span', 'friends-unread', String(Math.min(f.unread, 99))));
      const more = keyed(btn('⋯', { friend: 'menu', ref: f.ref }, 'chat-more', `ตัวเลือกของ ${f.handle}`), `menu:${f.ref}`); more.setAttribute('aria-expanded', String(this.menuFor === f.ref));
      li.append(open, more);
      if (this.menuFor === f.ref) { const m = el('div', 'friends-actions friends-menu'); m.setAttribute('role', 'group'); m.setAttribute('aria-label', `ตัวเลือกของ ${f.handle}`); m.append(confirmBtn('ลบเพื่อน', 'remove', f.ref, f.handle), confirmBtn('บล็อก', 'block', f.ref, f.handle)); li.append(m); }
      return li;
    }), 'ยังไม่มีเพื่อน · ส่งรหัสของคุณให้เพื่อน หรือใส่รหัสของเพื่อนด้านบน'));
    if (v.outgoing.length) parts.push(section('friends-out-title', `คำขอที่ส่งไป (${v.outgoing.length}/${v.limits.maxOutgoing})`, v.outgoing.map(r => {
      const li = el('li', 'friends-row'); li.dataset.ref = r.ref; li.append(el('span', 'friends-name', `${r.handle} · รอตอบ`));
      li.append(keyed(btn('ยกเลิก', { friend: 'cancel', ref: r.ref }, 'secondary', `ยกเลิกคำขอถึง ${r.handle}`), `cancel:${r.ref}`)); return li;
    })));
    const blocked = el('details', 'chat-blocked friends-blocked'); blocked.id = 'friends-blocked'; blocked.open = box.querySelector<HTMLDetailsElement>('#friends-blocked')?.open ?? false;
    const sum = el('summary', '', `ค่ายที่บล็อกไว้ (${v.blocked.length})`); blocked.append(sum);
    const bl = el('div', 'friends-blocked-list');
    bl.append(...(v.blocked.length ? v.blocked.map(r => { const row = el('div', 'chat-blocked-row'); row.append(el('span', '', r.handle), keyed(btn('เลิกบล็อก', { friend: 'unblock', ref: r.ref }, 'secondary', `เลิกบล็อก ${r.handle}`), `unblock:${r.ref}`)); return row; })
      : [el('p', 'chat-note', 'ยังไม่ได้บล็อกค่ายไหน')]));
    blocked.append(bl); parts.push(blocked);
    box.replaceChildren(...parts);
    if (focused) box.querySelector<HTMLElement>(`[data-key="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
  }

  private click(e: Event): void {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-friend]');
    if (!b || b.disabled) return;
    const ref = b.dataset.ref ?? '';
    const act = b.dataset.friend!;
    if (act !== 'block' && act !== 'remove' && act !== 'block-conv') this.confirm = undefined;
    switch (act) {
      case 'copy': void this.copy(); break;
      case 'new-code': void this.newCode(); break;
      case 'accept': void this.act(this.client.friendAction('respond', ref, true), 'เป็นเพื่อนกันแล้ว'); break;
      case 'decline': void this.act(this.client.friendAction('respond', ref, false), 'ปฏิเสธคำขอแล้ว'); break;
      case 'cancel': void this.act(this.client.friendAction('cancel', ref), 'ยกเลิกคำขอแล้ว'); break;
      case 'unblock': void this.act(this.client.friendAction('unblock', ref), 'เลิกบล็อกแล้ว'); break;
      case 'block': case 'remove': {
        const k = `${act}:${ref}`;
        if (this.confirm !== k) { this.confirm = k; this.renderLists(); this.q<HTMLButtonElement>(`[data-key="${CSS.escape(k)}"]`)?.focus(); break; }
        this.confirm = undefined; this.menuFor = undefined;
        void this.act(this.client.friendAction(act, ref), act === 'block' ? 'บล็อกแล้ว · มีผลทุกเครื่องของบัญชีนี้' : 'ลบเพื่อนแล้ว');
        break;
      }
      case 'menu': this.menuFor = this.menuFor === ref ? undefined : ref; this.renderLists(); this.q<HTMLButtonElement>(`[data-key="${CSS.escape(`menu:${ref}`)}"]`)?.focus(); break;
      case 'open': this.openConv(ref, b.dataset.handle ?? ''); break;
      case 'back': this.leaveConv(); break;
      case 'block-conv': {
        if (!this.conv) break;
        if (this.confirm !== 'block-conv') { this.confirm = 'block-conv'; b.textContent = 'ยืนยันบล็อก'; b.classList.add('friends-danger'); break; }
        this.confirm = undefined; const r = this.conv.ref; this.leaveConv();
        void this.act(this.client.friendAction('block', r), 'บล็อกแล้ว · มีผลทุกเครื่องของบัญชีนี้');
        break;
      }
      case 'msg-menu': { const id = Number(b.dataset.id); this.msgMenu = this.msgMenu === id ? undefined : id; this.renderLog(); this.q<HTMLElement>(`#dm-log li[data-id="${id}"] .chat-menu button`)?.focus(); break; }
      case 'report': void this.report(Number(b.dataset.id), b.dataset.reason as ChatReportReason); break;
    }
  }
  private async act(p: Promise<{ kind: string; error?: string; reason?: string }>, done: string): Promise<void> {
    const out = await p;
    this.status(out.kind === 'ok' ? done : why(out));
    await this.refresh();
  }
  private async copy(): Promise<void> {
    const code = this.view?.code; if (!code) return;
    try { await navigator.clipboard.writeText(code); this.status(`คัดลอกรหัส ${code} แล้ว · ส่งให้เพื่อนได้เลย`); }
    catch { this.status(`รหัสของคุณ: ${code} (คัดลอกเองได้)`); }
  }
  private async newCode(): Promise<void> {
    if (this.confirm !== 'new-code') { this.confirm = 'new-code'; this.status('แตะ "ขอรหัสใหม่" อีกครั้งเพื่อยืนยัน · รหัสเดิมจะใช้ไม่ได้ (คำขอที่ส่งมาแล้วยังอยู่)'); return; }
    this.confirm = undefined;
    const out = await this.client.friendNewCode();
    if (out.kind === 'ok' && this.view) { this.view = { ...this.view, code: out.value }; this.renderLists(); }
    this.status(out.kind === 'ok' ? `รหัสใหม่ ${out.value} · รหัสเดิมใช้ไม่ได้แล้ว` : why(out));
  }
  private async add(): Promise<void> {
    const input = this.q<HTMLInputElement>('#friend-code-input'); if (!input) return;
    if (!normalizeFriendCode(input.value)) { this.status(FRIEND_ERROR_TEXT.invalid_code!); input.focus(); return; }
    const sendBtn = this.q<HTMLButtonElement>('#friend-add-send'); if (sendBtn) sendBtn.disabled = true;
    const out = await this.client.friendRequest(input.value);
    if (sendBtn) sendBtn.disabled = false;
    if (out.kind === 'ok') { input.value = ''; this.status(out.value === 'friends' ? 'อีกฝ่ายส่งคำขอมาก่อนแล้ว · เป็นเพื่อนกันแล้ว' : 'ส่งคำขอแล้ว · รออีกฝ่ายตอบรับ'); }
    else this.status(why(out));
    await this.refresh();
  }
  private status(text: string): void {
    const s = this.q<HTMLElement>(this.conv ? '#dm-status' : '#friends-status');
    if (s) { s.textContent = text; s.hidden = !text; }
  }

  // ---- one private conversation ----
  private openConv(ref: string, handle: string): void {
    this.conv = { ref, handle }; this.msgs = []; this.last = 0; this.msgMenu = undefined; this.block = null; this.confirm = undefined;
    const b = this.q<HTMLButtonElement>('#dm-block'); if (b) { b.textContent = 'บล็อก'; b.classList.remove('friends-danger'); b.setAttribute('aria-label', `บล็อก ${handle}`); }
    this.status(''); this.renderFrame(); this.restart();
  }
  private leaveConv(note = ''): void {
    const ref = this.conv?.ref; this.conv = undefined; this.msgs = []; this.last = 0;
    this.renderFrame(); this.status(note); this.restart();
    if (ref) this.q<HTMLElement>(`[data-key="${CSS.escape(`open:${ref}`)}"]`)?.focus();
  }
  private async readConv(): Promise<void> {
    const conv = this.conv; if (!conv || this.reading) return;
    this.reading = true; const out = await this.client.chatRead(this.last, conv.ref); this.reading = false;
    if (this.conv !== conv) return;
    if (out.kind !== 'ok') {
      if (out.kind === 'refused' && (out.error === 'not_friends' || out.error === 'friends_off')) { this.leaveConv(why(out)); void this.refresh(); return; }
      this.status(why(out)); return;
    }
    const r = out.value; const gone = new Set(r.hidden); const have = new Set(this.msgs.map(m => m.id));
    this.msgs = [...this.msgs.filter(m => !gone.has(m.id)), ...r.messages.filter(m => !have.has(m.id))].slice(-KEEP);
    this.last = Math.max(this.last, r.last);
    this.block = r.muted ? `ถูกระงับการพิมพ์ถึง ${clock(r.muted)}` : r.write ? TEXT[r.write] ?? 'พิมพ์ไม่ได้ตอนนี้' : null;
    // Reading clears this friend's unread on the server; mirror it here so the badge drops at once.
    if (this.view) { const f = this.view.friends.find(x => x.ref === conv.ref); if (f && f.unread) { this.view.unread -= f.unread; f.unread = 0; this.onUnread(this.view.unread); } }
    this.renderLog(); this.inputState();
  }
  private renderLog(): void {
    const log = this.q<HTMLOListElement>('#dm-log'); if (!log || !this.conv) return;
    const stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 24;
    log.replaceChildren(...(this.msgs.length ? this.msgs.map(m => this.row(m)) : [el('li', 'chat-empty', `เริ่มคุยกับ ${this.conv.handle} ได้เลย · อย่าใส่ข้อมูลส่วนตัว`)]));
    if (stick || this.msgMenu === undefined) log.scrollTop = log.scrollHeight;
  }
  private row(m: ChatMessage): HTMLLIElement {
    const li = el('li', m.mine ? 'chat-msg mine' : 'chat-msg'); li.dataset.id = String(m.id);
    const meta = el('p', 'chat-meta'); meta.append(el('b', '', m.mine ? 'คุณ' : m.handle), el('time', '', clock(m.at)));
    if (!m.mine) { const more = btn('⋯', { friend: 'msg-menu', id: String(m.id) }, 'chat-more', `แจ้งข้อความของ ${m.handle}`); more.setAttribute('aria-expanded', String(this.msgMenu === m.id)); meta.append(more); }
    li.append(meta, el('p', 'chat-text', m.text));
    if (!m.mine && this.msgMenu === m.id) {
      const menu = el('div', 'chat-menu'); menu.setAttribute('role', 'group'); menu.setAttribute('aria-label', `แจ้งข้อความของ ${m.handle}`);
      for (const [reason, text] of Object.entries(REASONS)) menu.append(btn(`แจ้ง: ${text}`, { friend: 'report', id: String(m.id), reason }));
      li.append(menu);
    }
    return li;
  }
  private inputState(): void {
    const input = this.q<HTMLInputElement>('#dm-text'), send = this.q<HTMLButtonElement>('#dm-send'); if (!input || !send) return;
    input.disabled = !!this.block; send.disabled = !!this.block || this.sending; input.placeholder = this.block ?? 'พิมพ์ข้อความส่วนตัว…';
  }
  private count(): void {
    const n = [...(this.q<HTMLInputElement>('#dm-text')?.value ?? '')].length; const out = this.q('#dm-count');
    if (out) { out.textContent = `${n} / ${CHAT_MAX}`; out.classList.toggle('account-warn', n > CHAT_MAX); }
  }
  private async send(): Promise<void> {
    const input = this.q<HTMLInputElement>('#dm-text'); const conv = this.conv;
    if (!input || !conv || this.sending || input.disabled) return;
    const check = filterChat(input.value);
    if (!check.ok) { this.status(CHAT_REFUSAL_TEXT[check.error]); return; }
    const wait = Math.ceil((this.wait - Date.now()) / 1000);
    if (wait > 0) { this.status(`ส่งเร็วเกินไป · รอ ${wait} วินาที`); return; }
    this.sending = true; this.inputState(); this.status('');
    const out = await this.client.chatSend(input.value, conv.ref);
    this.sending = false;
    if (out.kind === 'ok') {
      input.value = ''; this.count();
      if (!this.msgs.some(m => m.id === out.value.id)) this.msgs = [...this.msgs, out.value].slice(-KEEP);
      this.msgMenu = undefined; this.renderLog(); this.wait = Date.now() + DM_LIMITS.gapMs;
    } else if (out.kind === 'refused' && out.error === 'not_friends') { this.leaveConv(why(out)); void this.refresh(); return; }
    else this.status(out.kind === 'refused' && out.error === 'too_fast' && out.retryAfter ? `ส่งเร็วเกินไป · รอ ${out.retryAfter} วินาที` : why(out));
    this.inputState(); input.focus({ preventScroll: true });
  }
  private async report(id: number, reason: ChatReportReason): Promise<void> {
    const conv = this.conv; if (!conv) return;
    const out = await this.client.chatReport(id, reason, conv.ref);
    this.msgMenu = undefined; this.renderLog();
    this.status(out.kind === 'ok' ? 'แจ้งแล้ว ขอบคุณ · ผู้ดูแลจะเห็นข้อความนี้กับข้อความก่อนหน้าไม่กี่ข้อความ · บล็อกค่ายนี้ได้ที่ปุ่มด้านบน' : why(out));
  }
}
