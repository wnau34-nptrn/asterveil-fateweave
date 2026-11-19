import { CHANNELS, channelKinds } from '../core/chat/channels';
import { CHAT_MAX, CHAT_REFUSAL_TEXT, filterChat, type ChatRefusal } from '../core/chat/filter';
import type { ChatAdminRow, ChatMessage, ChatReportReason, ServerClient } from '../platform/server-client';
import type { StoragePort } from '../core/save/expedition-save';
import { FriendsPanel } from './friends-panel';

// P11 chat (docs/design/CHAT_P11_TH.md): the world channel as a modal <dialog> opened from the camp. Server play only
// (the camp button is disabled offline with its reason). Polls every 8 s while open and the page is visible; message
// text is always set with textContent. "ซ่อนค่ายนี้" is kept on this device only (localStorage), never in the save.
// Admins (D1 `admins`) also get the reported/hidden list with hide, restore and mute. OD-56: the "เพื่อน" tab
// (friends-panel.ts) holds friends and private chat; the world polling runs only while the world tab shows, and the camp
// chat button carries a small unread badge for private messages (read when the friends tab polls, and once a minute at
// most when the camp is shown).

export const CHAT_POLL_MS = 8000;
// The translucent feed on the camp (owner 2026-11-19): off by default, a per-device preference like the lessons. It reads
// every 10 s only while the camp is showing, the page is visible and the full chat is closed; each line fades after 45 s.
export const CHAT_FEED_POLL_MS = 10_000; export const FEED_LINES = 3; export const FEED_FADE_MS = 45_000;
const FEED_KEY = 'asterveil.fateweave.chatfeed.v1';
const feedPref = (): boolean => { try { return localStorage.getItem(FEED_KEY) === 'on'; } catch { return false; } };
const KEEP = 200;
const BLOCK_KEY = 'fateweave-chat-blocked';
const REASONS: Record<ChatReportReason, string> = { abuse: 'หยาบคาย/คุกคาม', spam: 'สแปม/โฆษณา', personal: 'ข้อมูลส่วนตัว', other: 'อื่น ๆ' };
const ERRORS: Record<string, string> = {
  ...CHAT_REFUSAL_TEXT,
  too_fast: 'ส่งเร็วเกินไป · รอสักครู่', duplicate: 'ข้อความซ้ำกับที่เพิ่งส่ง', rate_limited: 'ส่งบ่อยเกินไป · รอสักครู่',
  chat_linked_only: 'ตอนนี้พิมพ์ได้เฉพาะบัญชีที่ผูก Google · ผูกได้ที่หน้าบัญชี', chat_readonly: 'แชทเปิดให้อ่านอย่างเดียวชั่วคราว',
  account_deleting: 'บัญชีนี้รอการลบ · พิมพ์แชทไม่ได้', account_suspended: 'บัญชีนี้ถูกระงับ · พิมพ์แชทไม่ได้',
  chat_unavailable: 'เชื่อมต่อแชทไม่ได้ตอนนี้ · เกมเล่นต่อได้ตามปกติ', network: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ · ข้อความยังอยู่ ลองส่งอีกครั้ง',
  server: 'เซิร์ฟเวอร์ยังไม่ตอบ · ลองอีกครั้ง', unauthorized: 'บัญชีบนเครื่องนี้ใช้ไม่ได้แล้ว', own: 'แจ้งข้อความของตัวเองไม่ได้', no_message: 'ข้อความนี้ถูกลบแล้ว',
};
const clock = (ms: number) => new Date(ms).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };

export class ChatPanel {
  private readonly dialog: HTMLDialogElement;
  private messages: ChatMessage[] = [];
  private last = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private reading = false;
  private sending = false;
  private menuFor: number | undefined;
  private block: string | null = null;
  private muted: number | null = null;
  private wait = 0;
  private admin: boolean | undefined;
  private blocked: Set<string>;
  private tab: 'world' | 'dm' = 'world'; private readonly friends: FriendsPanel; private unread = 0;
  private readonly feed: HTMLButtonElement; private feedOn = feedPref(); private campShown = false; private feedTimer: ReturnType<typeof setInterval> | undefined; private readonly seenAt = new Map<number, number>();
  constructor(parent: HTMLElement, private readonly client: ServerClient, private readonly storage: StoragePort | undefined) {
    this.blocked = new Set(this.loadBlocked());
    this.dialog = el('dialog', 'feedback-dialog chat-dialog');
    this.dialog.id = 'chat-dialog'; this.dialog.setAttribute('aria-labelledby', 'chat-title');
    this.dialog.innerHTML = '<div class="account-card chat-card"><header class="chat-head"><h2 id="chat-title">แชทโลก</h2><button type="button" class="secondary" data-chat="close">ปิด</button></header>'
      // Channels (owner 2026-11-19): only the world is open; private and guild show why they are closed.
      + `<nav class="chat-tabs" aria-label="ช่องแชท">${channelKinds.map(k => `<button type="button" class="chat-tab" data-chat-tab="${k}"${k === 'world' ? ' aria-current="true"' : CHANNELS[k].open ? ' aria-current="false"' : ' disabled aria-disabled="true" title="' + CHANNELS[k].why + '"'}>${CHANNELS[k].label}${CHANNELS[k].open ? (k === 'dm' ? '<small data-chat-unread hidden></small>' : '') : '<small>เร็ว ๆ นี้</small>'}</button>`).join('')}</nav>`
      + '<div id="chat-world"><p class="chat-note">ชื่อในแชทเป็นชื่อแฝงของค่าย · อย่าใส่ข้อมูลส่วนตัว · ข้อความเก็บ 7 วัน · แตะ ⋯ เพื่อแจ้งหรือซ่อนค่าย</p>'
      + '<div class="chat-tools"><button type="button" class="secondary" id="chat-feed-toggle" data-chat="feed-toggle" data-chat-feed-toggle aria-pressed="false">แถบแชทในค่าย: <span data-feed-state>ปิด</span></button>'
      + '<details id="chat-blocked" class="chat-blocked"><summary id="chat-blocked-summary">ค่ายที่ซ่อนไว้ (0)</summary><div id="chat-blocked-list"></div></details></div>'
      + '<ol id="chat-log" class="chat-log" role="log" aria-live="polite" aria-label="ข้อความแชทโลก"></ol>'
      + '<p class="chat-status" id="chat-status" role="status" hidden></p>'
      + `<form class="chat-form"><label for="chat-text" class="chat-sr">ข้อความ</label><input id="chat-text" type="text" maxlength="${CHAT_MAX}" autocomplete="off" enterkeyhint="send" placeholder="พิมพ์ข้อความถึงทุกค่าย…"><button type="submit" class="primary" id="chat-send" data-chat="send">ส่ง</button></form>`
      + `<p class="feedback-count" id="chat-count">0 / ${CHAT_MAX}</p></div><div id="chat-admin"></div></div>`;
    parent.append(this.dialog);
    this.friends = new FriendsPanel(client, n => this.setUnread(n));
    this.dialog.querySelector('#chat-world')!.after(this.friends.root);
    this.feed = el('button', 'chat-feed'); this.feed.id = 'chat-feed'; this.feed.type = 'button'; this.feed.hidden = true; this.feed.dataset.chatOpen = '';
    this.feed.setAttribute('aria-label', 'แชทโลก · ข้อความล่าสุด · แตะเพื่อเปิดแชท'); parent.append(this.feed);
    this.feed.addEventListener('click', () => this.open());
    this.dialog.addEventListener('click', e => this.click(e));
    this.dialog.addEventListener('submit', e => { e.preventDefault(); void this.send(); });
    this.dialog.addEventListener('input', e => { if ((e.target as HTMLElement).id === 'chat-text') this.count(); });
    this.dialog.addEventListener('close', () => { this.stop(); this.friends.show(false); this.syncFeed(); });
    document.addEventListener('visibilitychange', () => { if (((this.dialog.open && this.tab === 'world') || this.feedActive) && document.visibilityState === 'visible') void this.poll(); });
  }
  // ---- the camp feed ----
  get feedEnabled(): boolean { return this.feedOn; }
  private get feedActive(): boolean { return this.feedOn && this.campShown && !this.dialog.open; }
  setFeed(on: boolean): void {
    this.feedOn = on; try { localStorage.setItem(FEED_KEY, on ? 'on' : 'off'); } catch { /* this session only */ }
    this.syncFeed(); this.syncToggles();
  }
  // The shell tells the panel whether the camp is the visible view.
  showOnCamp(shown: boolean): void {
    this.campShown = shown; this.syncFeed(); this.syncToggles();
    if (shown && !this.dialog.open && Date.now() - this.friends.fetchedAt > 60_000) void this.friends.refresh();
  }
  // Private unread messages: the "เพื่อน" tab and the camp chat button show the count.
  private setUnread(n: number): void { this.unread = Math.max(0, n); this.syncBadge(); }
  private syncBadge(): void {
    const tab = this.dialog.querySelector<HTMLElement>('[data-chat-unread]');
    if (tab) { tab.textContent = this.unread ? `ใหม่ ${Math.min(this.unread, 99)}` : ''; tab.hidden = !this.unread; }
    const camp = document.querySelector<HTMLElement>('#lobby-chat');
    if (!camp || camp.hasAttribute('disabled')) return;
    let badge = camp.querySelector<HTMLElement>('.chat-badge');
    if (!badge) { badge = el('span', 'chat-badge'); badge.id = 'chat-unread-badge'; camp.append(badge); }
    badge.textContent = this.unread ? String(Math.min(this.unread, 99)) : ''; badge.hidden = !this.unread;
    camp.setAttribute('aria-label', this.unread ? `เปิดแชท · ข้อความส่วนตัวใหม่ ${this.unread}` : 'เปิดแชทโลก');
  }
  private setTab(tab: 'world' | 'dm'): void {
    this.tab = tab;
    for (const b of this.dialog.querySelectorAll<HTMLButtonElement>('[data-chat-tab]:not(:disabled)')) b.setAttribute('aria-current', String(b.dataset.chatTab === tab));
    const title = this.dialog.querySelector('#chat-title'); if (title) title.textContent = tab === 'world' ? 'แชทโลก' : 'เพื่อน';
    const world = this.dialog.querySelector<HTMLElement>('#chat-world'); if (world) world.hidden = tab !== 'world';
    this.stop();
    if (tab === 'world') {
      this.friends.show(false);
      if (this.dialog.open) { void this.poll(); this.timer = setInterval(() => { if (document.visibilityState === 'visible') void this.poll(); }, CHAT_POLL_MS); }
    } else this.friends.show(this.dialog.open);
  }
  private syncFeed(): void {
    if (this.feedTimer) clearInterval(this.feedTimer); this.feedTimer = undefined;
    const active = this.feedActive; this.feed.hidden = !active || !this.feedLines().length;
    if (!active) return;
    void this.poll();
    this.feedTimer = setInterval(() => { if (document.visibilityState === 'visible') void this.poll(); }, CHAT_FEED_POLL_MS);
  }
  private shownMessages(): ChatMessage[] { return this.messages.filter(m => m.mine || !this.blocked.has(m.handle)); }
  // A line is fresh for 45 s from when this device received it (the server clock may differ); on the first read of a
  // session only the messages the server stamped in the last 45 s count, so old history never pops up.
  private feedLines(): ChatMessage[] { const now = Date.now(); return this.shownMessages().filter(m => now - (this.seenAt.get(m.id) ?? 0) < FEED_FADE_MS).slice(-FEED_LINES); }
  private renderFeed(): void {
    const lines = this.feedLines();
    this.feed.replaceChildren(...lines.map(m => { const p = el('span', m.mine ? 'chat-feed-line mine' : 'chat-feed-line'); p.append(el('b', '', m.handle), document.createTextNode(` ${m.text}`)); return p; }));
    this.feed.hidden = !this.feedActive || !lines.length;
  }
  // Every on/off button for the feed (the camp, the chat window, Setup) shows the same state.
  syncToggles(): void {
    this.syncBadge();
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-chat-feed-toggle]')) {
      b.setAttribute('aria-pressed', String(this.feedOn));
      const label = b.querySelector('[data-feed-state]'); if (label) label.textContent = this.feedOn ? 'เปิด' : 'ปิด';
    }
  }
  get isOpen(): boolean { return this.dialog.open; }

  open(): void {
    if (!this.dialog.open) this.dialog.showModal();
    this.syncFeed(); this.renderBlockedList(); this.syncToggles();
    if (this.admin === undefined) void this.client.account().then(o => { this.admin = o.kind === 'ok' && o.value.admin === true; this.renderAdmin(); });
    this.renderAdmin(); this.render(); this.inputState();
    this.setTab(this.tab);
    if (this.tab === 'world') this.input()?.focus({ preventScroll: true });
  }
  close(): void { if (this.dialog.open) this.dialog.close(); }
  private stop(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  private input(): HTMLInputElement | null { return this.dialog.querySelector<HTMLInputElement>('#chat-text'); }

  private loadBlocked(): string[] {
    try { const v: unknown = JSON.parse(this.storage?.getItem(BLOCK_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(-100) : []; } catch { return []; }
  }
  private saveBlocked(): void { try { this.storage?.setItem(BLOCK_KEY, JSON.stringify([...this.blocked].slice(-100))); } catch { /* this page only */ } }

  async poll(): Promise<void> {
    if (this.reading) return;
    this.reading = true;
    const out = await this.client.chatRead(this.last);
    this.reading = false;
    if (out.kind !== 'ok') { this.status(ERRORS[out.kind === 'refused' ? out.error : out.reason] ?? ERRORS.chat_unavailable!); this.dialog.dataset.chat = 'down'; return; }
    if (this.dialog.dataset.chat === 'down') { this.status(''); }
    this.dialog.dataset.chat = 'live';
    const r = out.value;
    const gone = new Set(r.hidden);
    const have = new Set(this.messages.map(m => m.id));
    const firstRead = this.last === 0;
    for (const m of r.messages) if (!have.has(m.id)) this.seenAt.set(m.id, firstRead ? m.at : Date.now());
    this.messages = [...this.messages.filter(m => !gone.has(m.id)), ...r.messages.filter(m => !have.has(m.id))].slice(-KEEP);
    this.last = Math.max(this.last, r.last, ...r.messages.map(m => m.id));
    for (const id of this.seenAt.keys()) if (!this.messages.some(m => m.id === id)) this.seenAt.delete(id);
    this.block = r.write; this.muted = r.muted;
    this.render(); this.inputState(); this.renderFeed();
  }

  // The hidden camps (this device only): each can be shown again, and the whole list cleared.
  private renderBlockedList(): void {
    const box = this.dialog.querySelector<HTMLElement>('#chat-blocked-list'), head = this.dialog.querySelector<HTMLElement>('#chat-blocked-summary');
    if (!box || !head) return;
    const list = [...this.blocked]; head.textContent = `ค่ายที่ซ่อนไว้ (${list.length})`;
    const rows = list.map(h => { const row = el('div', 'chat-blocked-row'); const b = el('button', 'secondary', 'เลิกซ่อน'); b.type = 'button'; b.dataset.chat = 'unblock'; b.dataset.handle = h;
      b.setAttribute('aria-label', `เลิกซ่อน ${h}`); row.append(el('span', '', h), b); return row; });
    if (list.length > 1) { const all = el('button', 'secondary', 'เลิกซ่อนทั้งหมด'); all.type = 'button'; all.dataset.chat = 'unblock-all'; rows.push(all as unknown as HTMLDivElement); }
    box.replaceChildren(...(rows.length ? rows : [el('p', 'chat-note', 'ยังไม่ได้ซ่อนค่ายไหน · แตะ ⋯ ที่ข้อความเพื่อซ่อนค่ายนั้นบนเครื่องนี้')]));
  }
  private render(): void {
    const log = this.dialog.querySelector<HTMLOListElement>('#chat-log');
    if (!log) return;
    const stick = log.scrollTop + log.clientHeight >= log.scrollHeight - 24;
    const shown = this.shownMessages();
    log.replaceChildren(...(shown.length ? shown.map(m => this.row(m)) : [el('li', 'chat-empty', 'ยังไม่มีข้อความ · ทักทายค่ายอื่นได้เลย')]));
    if (stick || this.menuFor === undefined) log.scrollTop = log.scrollHeight;
  }
  private row(m: ChatMessage): HTMLLIElement {
    const li = el('li', m.mine ? 'chat-msg mine' : 'chat-msg'); li.dataset.id = String(m.id);
    const meta = el('p', 'chat-meta'); meta.append(el('b', '', m.mine ? `${m.handle} (คุณ)` : m.handle), el('time', '', clock(m.at)));
    if (!m.mine) {
      const more = el('button', 'chat-more', '⋯'); more.type = 'button'; more.dataset.chat = 'menu'; more.dataset.id = String(m.id);
      more.setAttribute('aria-label', `ตัวเลือกข้อความของ ${m.handle}`); more.setAttribute('aria-expanded', String(this.menuFor === m.id));
      meta.append(more);
    }
    li.append(meta, el('p', 'chat-text', m.text));
    if (this.menuFor === m.id && !m.mine) {
      const menu = el('div', 'chat-menu'); menu.setAttribute('role', 'group'); menu.setAttribute('aria-label', `แจ้งหรือซ่อนข้อความของ ${m.handle}`);
      for (const [reason, text] of Object.entries(REASONS)) { const b = el('button', 'secondary', `แจ้ง: ${text}`); b.type = 'button'; b.dataset.chat = 'report'; b.dataset.id = String(m.id); b.dataset.reason = reason; menu.append(b); }
      const hide = el('button', 'secondary', 'ซ่อนค่ายนี้บนเครื่องนี้'); hide.type = 'button'; hide.dataset.chat = 'block'; hide.dataset.handle = m.handle; menu.append(hide);
      li.append(menu);
    }
    return li;
  }

  private inputState(): void {
    const input = this.input(); const send = this.dialog.querySelector<HTMLButtonElement>('#chat-send');
    if (!input || !send) return;
    const why = this.muted ? `ถูกระงับการพิมพ์ถึง ${clock(this.muted)}` : this.block ? ERRORS[this.block] ?? 'พิมพ์แชทไม่ได้ตอนนี้' : '';
    input.disabled = !!why; send.disabled = !!why || this.sending;
    input.placeholder = why || 'พิมพ์ข้อความถึงทุกค่าย…';
    this.dialog.dataset.write = why ? 'blocked' : 'open';
  }
  private count(): void {
    const n = [...(this.input()?.value ?? '')].length; const out = this.dialog.querySelector('#chat-count');
    if (out) { out.textContent = `${n} / ${CHAT_MAX}`; out.classList.toggle('account-warn', n > CHAT_MAX); }
  }
  private status(text: string): void {
    const s = this.dialog.querySelector<HTMLElement>('#chat-status');
    if (s) { s.textContent = text; s.hidden = !text; }
  }

  private click(e: Event): void {
    const tab = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-chat-tab]:not(:disabled)');
    if (tab) { this.setTab(tab.dataset.chatTab === 'dm' ? 'dm' : 'world'); tab.focus(); return; }
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-chat]');
    if (!b || b.disabled) return;
    const id = Number(b.dataset.id);
    switch (b.dataset.chat) {
      case 'close': this.close(); break;
      case 'menu': this.menuFor = this.menuFor === id ? undefined : id; this.render(); this.dialog.querySelector<HTMLElement>(`li[data-id="${id}"] .chat-menu button, li[data-id="${id}"] .chat-more`)?.focus(); break;
      case 'report': void this.report(id, b.dataset.reason as ChatReportReason); break;
      case 'block': if (b.dataset.handle) { this.blocked.add(b.dataset.handle); this.saveBlocked(); this.menuFor = undefined; this.render(); this.renderBlockedList(); this.renderFeed(); this.status(`ซ่อน ${b.dataset.handle} บนเครื่องนี้แล้ว`); } break;
      case 'unblock': if (b.dataset.handle && this.blocked.delete(b.dataset.handle)) { this.saveBlocked(); this.render(); this.renderBlockedList(); this.renderFeed(); this.status(`เลิกซ่อน ${b.dataset.handle} แล้ว`); } break;
      case 'unblock-all': this.blocked.clear(); this.saveBlocked(); this.render(); this.renderBlockedList(); this.renderFeed(); this.status('เลิกซ่อนทุกค่ายแล้ว'); break;
      case 'feed-toggle': this.setFeed(!this.feedOn); break;
      case 'admin-list': void this.adminList(); break;
      case 'admin-hide': void this.adminAct(this.client.chatHide(id, b.dataset.hidden === 'true')); break;
      case 'admin-mute': void this.adminAct(this.client.chatMute(b.dataset.account ?? '', Number(b.dataset.minutes))); break;
    }
  }
  private async send(): Promise<void> {
    const input = this.input();
    if (!input || this.sending || input.disabled) return;
    const check = filterChat(input.value);
    if (!check.ok) { this.status(CHAT_REFUSAL_TEXT[check.error]); return; }
    const wait = Math.ceil((this.wait - Date.now()) / 1000);
    if (wait > 0) { this.status(`ส่งเร็วเกินไป · รอ ${wait} วินาที`); return; }
    this.sending = true; this.inputState(); this.status('');
    const out = await this.client.chatSend(input.value);
    this.sending = false;
    if (out.kind === 'ok') {
      input.value = ''; this.count();
      if (!this.messages.some(m => m.id === out.value.id)) { this.messages = [...this.messages, out.value].slice(-KEEP); this.seenAt.set(out.value.id, Date.now()); }
      this.menuFor = undefined; this.render();
      this.wait = Date.now() + 4000;
      void this.poll();
    } else {
      const err = out.kind === 'refused' ? out.error : out.reason;
      if (err === 'muted' && out.until) this.muted = out.until;
      if (out.kind === 'refused' && (err === 'chat_linked_only' || err === 'chat_readonly' || err.startsWith('account_'))) this.block = err;
      this.status(err === 'too_fast' && out.retryAfter ? `ส่งเร็วเกินไป · รอ ${out.retryAfter} วินาที` : ERRORS[err as ChatRefusal] ?? ERRORS[err] ?? 'ส่งไม่สำเร็จ · ลองอีกครั้ง');
    }
    this.inputState();
  }
  private async report(id: number, reason: ChatReportReason): Promise<void> {
    const out = await this.client.chatReport(id, reason);
    this.menuFor = undefined; this.render();
    this.status(out.kind === 'ok' ? 'แจ้งแล้ว ขอบคุณ · ผู้ดูแลจะตรวจ (แจ้ง 3 ค่ายข้อความจะถูกซ่อน)' : ERRORS[out.kind === 'refused' ? out.error : out.reason] ?? 'แจ้งไม่สำเร็จ');
  }

  // ---- admin ----
  private renderAdmin(): void {
    const box = this.dialog.querySelector('#chat-admin');
    if (!box || !this.admin || box.childElementCount) return;
    box.innerHTML = '<section class="feedback-admin chat-admin" aria-labelledby="chat-admin-title"><h3 id="chat-admin-title">ผู้ดูแลแชท</h3><div class="account-row"><button type="button" class="secondary" data-chat="admin-list">ข้อความที่ถูกแจ้ง/ซ่อน</button></div><div id="chat-admin-out"></div></section>';
  }
  private async adminAct(p: Promise<{ kind: string }>): Promise<void> {
    const out = await p;
    this.status(out.kind === 'ok' ? 'บันทึกแล้ว' : 'ทำไม่สำเร็จ');
    await this.adminList(); this.last = 0; this.messages = []; await this.poll();
  }
  private async adminList(): Promise<void> {
    const box = this.dialog.querySelector('#chat-admin-out');
    if (!box) return;
    const out = await this.client.chatAdmin();
    if (out.kind !== 'ok') { box.replaceChildren(el('p', 'account-warn', 'อ่านไม่ได้')); return; }
    const { rows, mutes } = out.value;
    const list = el('ol', 'feedback-list chat-admin-list');
    const btn = (text: string, data: Record<string, string>) => { const b = el('button', 'secondary', text); b.type = 'button'; Object.assign(b.dataset, data); return b; };
    for (const r of rows as ChatAdminRow[]) {
      const li = el('li'); li.dataset.id = String(r.id);
      li.append(el('p', '', `${r.channel === 'dm' ? 'แชทส่วนตัว · ' : ''}${r.handle} · ${clock(r.at)} · แจ้ง ${r.reports} (${r.reasons.map(x => REASONS[x as ChatReportReason] ?? x).join(', ') || '-'})${r.hidden ? ` · ซ่อนแล้ว (${r.hidden === 'admin' ? 'ผู้ดูแล' : 'แจ้งครบ'})` : ''}`));
      // A reported private message comes with the few messages before it (OD-56); nothing else of that conversation.
      if (r.context?.length) { const ctx = el('ol', 'chat-admin-context'); ctx.setAttribute('aria-label', 'ข้อความก่อนหน้า'); for (const c of r.context) ctx.append(el('li', '', `${c.handle} ${clock(c.at)}: ${c.text}`)); li.append(ctx); }
      li.append(el('p', 'chat-text', r.text), el('p', '', `บัญชี ${r.account}`));
      const row = el('div', 'account-row');
      row.append(btn(r.hidden ? 'คืนข้อความ' : 'ซ่อนข้อความ', { chat: 'admin-hide', id: String(r.id), hidden: String(!r.hidden) }),
        btn('ระงับ 1 ชม.', { chat: 'admin-mute', account: r.account, minutes: '60' }), btn('ระงับ 1 วัน', { chat: 'admin-mute', account: r.account, minutes: '1440' }));
      li.append(row); list.append(li);
    }
    const muteList = el('ul', 'feedback-list');
    for (const m of mutes) { const li = el('li', '', `${m.account.slice(0, 8)}… ถึง ${new Date(m.until).toLocaleString('th-TH')}`); li.append(btn('ยกเลิกการระงับ', { chat: 'admin-mute', account: m.account, minutes: '0' })); muteList.append(li); }
    box.replaceChildren(...(rows.length ? [list] : [el('p', '', 'ไม่มีข้อความที่ถูกแจ้ง')]), el('h3', '', `ระงับอยู่ ${mutes.length}`), muteList);
  }
}
