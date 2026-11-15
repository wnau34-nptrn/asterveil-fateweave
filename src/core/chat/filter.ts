// P11 chat (docs/design/CHAT_P11_TH.md §3): the message filter, pure and shared. The device runs it to warn before
// sending; the server's `Chat` object runs it again and its answer is the one that counts.

export const CHAT_MAX = 160;
export type ChatRefusal = 'empty' | 'too_long' | 'link' | 'email' | 'number' | 'repeat';
export type FilterResult = { ok: true; text: string; masked: boolean } | { ok: false; error: ChatRefusal };

// Short draft list (Thai/English). Words that are part of ordinary game words are left out (e.g. หี in หีบ).
export const BLOCKED_WORDS: readonly string[] = [
  'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'nigger', 'nigga', 'faggot', 'retard',
  'เหี้ย', 'ควย', 'เย็ด', 'สัส', 'ไอ้สัตว์', 'อีสัตว์', 'ระยำ', 'แตด', 'จัญไร', 'อีดอก', 'กะหรี่',
];

// Control characters, zero-width and bidi overrides (they can hide or reorder text).
// eslint-disable-next-line no-control-regex
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/g;
const LINK = /(?:https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(?:com|net|org|io|gg|me|th|co|ly|xyz|app|dev|link|site|info|biz|ru|cn|tk|to|tv|cc)\b)/i;
const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
// Eight or more digits, allowing spaces, dots and dashes between them (phone or ID numbers).
const LONG_NUMBER = /\d(?:[\s.-]?\d){7,}/;
const REPEAT = /(.)\1{10,}/u;

export function normalizeChat(raw: string): string {
  return raw.normalize('NFC').replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim();
}

export function filterChat(raw: string): FilterResult {
  const text = normalizeChat(raw);
  if (!text) return { ok: false, error: 'empty' };
  if ([...text].length > CHAT_MAX) return { ok: false, error: 'too_long' };
  if (EMAIL.test(text)) return { ok: false, error: 'email' };
  if (LINK.test(text)) return { ok: false, error: 'link' };
  if (LONG_NUMBER.test(text)) return { ok: false, error: 'number' };
  if (REPEAT.test(text)) return { ok: false, error: 'repeat' };
  let out = text; let masked = false;
  const lower = () => out.toLowerCase();
  for (const w of BLOCKED_WORDS) {
    let at = lower().indexOf(w);
    while (at >= 0) { out = out.slice(0, at) + '*'.repeat(3) + out.slice(at + w.length); masked = true; at = lower().indexOf(w, at + 3); }
  }
  return { ok: true, text: out, masked };
}

export const CHAT_REFUSAL_TEXT: Record<ChatRefusal, string> = {
  empty: 'พิมพ์ข้อความก่อนส่ง',
  too_long: `ข้อความยาวเกิน ${CHAT_MAX} ตัวอักษร`,
  link: 'ส่งลิงก์หรือชื่อเว็บไม่ได้',
  email: 'ส่งอีเมลไม่ได้ · อย่าใส่ข้อมูลส่วนตัว',
  number: 'ส่งตัวเลขยาว (เบอร์โทร/เลขบัตร) ไม่ได้ · อย่าใส่ข้อมูลส่วนตัว',
  repeat: 'ตัวอักษรซ้ำยาวเกินไป',
};
