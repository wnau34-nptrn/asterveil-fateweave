// Friends and private (1:1) chat (owner 2026-11-19, OD-56: "เพิ่มระบบเพื่อน และ chat 1:1"; docs/design/FRIENDS_TH.md).
// Pure rules shared by the Worker and the device: the friend code format, the caps (drafts), and what a friend request
// by code leads to. No I/O. The server's answer is the one that counts; the device uses these only to warn early.

// Draft numbers (validated by use, not simulation; FRIENDS_TH.md §3).
export const FRIEND_LIMITS = {
  maxFriends: 50, maxOutgoing: 20, maxIncoming: 30, maxBlocks: 100,
  // Requests by code (the only lookup): per account in 10 minutes and per IP network in an hour.
  codePer10Minutes: 10, codePerIpHour: 30,
  // Every other change (accept, decline, cancel, remove, block, unblock) per account a minute; new codes a day.
  actionPerMinute: 30, rotatePerDay: 3,
  // Reads of the friend list per second (first filter).
  readPerSecond: 2,
} as const;
// Private messages (drafts): stricter pace than the world (4 s / 8 a minute), counted over all of the account's private
// conversations together; kept 7 days or the newest 200 per conversation; 160 characters like the world.
export const DM_LIMITS = { gapMs: 2000, perMinute: 20, perHour: 200, keepMessages: 200, keepMs: 7 * 86_400_000, contextMessages: 5 } as const;

// A friend code: 8 characters from the same unambiguous alphabet as the chat handle (no 0/O/1/I), shown as XXXX-XXXX.
// It is random (never derived from the account id), stored on the server and can be replaced (the old one stops working).
export const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const FRIEND_CODE_LENGTH = 8;
const CODE = new RegExp(`^[${FRIEND_CODE_ALPHABET}]{${FRIEND_CODE_LENGTH}}$`);
// 256 is a multiple of 32, so `byte & 31` picks each character without bias.
export function makeFriendCode(random: Uint8Array): string {
  if (random.length < FRIEND_CODE_LENGTH) throw new Error('friend code needs 8 random bytes');
  let out = '';
  for (let i = 0; i < FRIEND_CODE_LENGTH; i++) out += FRIEND_CODE_ALPHABET[random[i]! & 31];
  return out;
}
// What a player types: any case, spaces and dashes allowed. Undefined when it cannot be a code.
export function normalizeFriendCode(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || raw.length > 32) return undefined;
  const c = raw.toUpperCase().replace(/[\s-]/g, '');
  return CODE.test(c) ? c : undefined;
}
export const formatFriendCode = (code: string): string => `${code.slice(0, 4)}-${code.slice(4)}`;

// An opaque reference the device uses to name a friend, a request or a block. Random, scoped to the viewer's own rows,
// so a reference from someone else's list names nothing. Never an account id.
export const FRIEND_REF = /^[0-9a-f]{16}$/;

// What the server knows when a request by code arrives.
export interface RequestFacts {
  known: boolean; active: boolean; self: boolean;
  blockedByThem: boolean; blockedByMe: boolean;
  friends: boolean; outgoing: boolean; incoming: boolean;
  myFriends: number; myOutgoing: number; theirFriends: number; theirIncoming: number;
}
export type RequestOutcome = 'sent' | 'already_sent' | 'accepted' | 'unavailable' | 'self' | 'already_friends' | 'blocked_by_you' | 'list_full' | 'too_many_requests';
// An unknown code, a camp that blocked the sender, an account being deleted and a full inbox all answer `unavailable`:
// the sender cannot tell them apart, so codes cannot be probed for who exists or who blocked whom. When both sides asked,
// the second request accepts the first.
export function requestOutcome(f: RequestFacts): RequestOutcome {
  if (!f.known || !f.active || f.blockedByThem) return 'unavailable';
  if (f.self) return 'self';
  if (f.blockedByMe) return 'blocked_by_you';
  if (f.friends) return 'already_friends';
  if (f.incoming) return f.myFriends >= FRIEND_LIMITS.maxFriends ? 'list_full' : f.theirFriends >= FRIEND_LIMITS.maxFriends ? 'unavailable' : 'accepted';
  if (f.outgoing) return 'already_sent';
  if (f.myFriends >= FRIEND_LIMITS.maxFriends) return 'list_full';
  if (f.myOutgoing >= FRIEND_LIMITS.maxOutgoing) return 'too_many_requests';
  if (f.theirIncoming >= FRIEND_LIMITS.maxIncoming) return 'unavailable';
  return 'sent';
}
export type AcceptOutcome = 'accepted' | 'list_full' | 'their_list_full';
export function acceptOutcome(myFriends: number, theirFriends: number): AcceptOutcome {
  if (myFriends >= FRIEND_LIMITS.maxFriends) return 'list_full';
  if (theirFriends >= FRIEND_LIMITS.maxFriends) return 'their_list_full';
  return 'accepted';
}

// The device's words for the server's refusals.
export const FRIEND_ERROR_TEXT: Readonly<Record<string, string>> = {
  friend_code_unavailable: 'ส่งคำขอด้วยรหัสนี้ไม่ได้ · ตรวจรหัสอีกครั้ง',
  invalid_code: 'รหัสเพื่อนมี 8 ตัว เช่น ABCD-EF23',
  friend_self: 'นี่คือรหัสของคุณเอง',
  already_friends: 'เป็นเพื่อนกันอยู่แล้ว',
  blocked_by_you: 'คุณบล็อกค่ายนี้ไว้ · เลิกบล็อกก่อนจึงส่งคำขอได้',
  friend_list_full: `รายชื่อเพื่อนเต็มแล้ว (${FRIEND_LIMITS.maxFriends})`,
  friend_list_full_other: 'รายชื่อเพื่อนของอีกฝ่ายเต็มแล้ว',
  too_many_requests: `ส่งคำขอค้างไว้ครบ ${FRIEND_LIMITS.maxOutgoing} แล้ว · ยกเลิกบางคำขอก่อน`,
  block_list_full: `บล็อกได้สูงสุด ${FRIEND_LIMITS.maxBlocks} ค่าย`,
  not_found: 'รายการนี้เปลี่ยนไปแล้ว · ลองโหลดใหม่',
  not_friends: 'ส่งข้อความได้เฉพาะเพื่อนที่ยอมรับกันทั้งสองฝ่าย',
  friends_off: 'ระบบเพื่อนปิดชั่วคราว',
  rate_limited: 'ทำบ่อยเกินไป · รอสักครู่',
  account_deleting: 'บัญชีนี้รอการลบ · ใช้ระบบเพื่อนไม่ได้',
};
