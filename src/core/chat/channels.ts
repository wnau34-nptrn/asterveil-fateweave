// Chat channels (owner 2026-11-19: "เตรียมไว้" for 1:1 chat and guild chat; docs/design/CHAT_CHANNELS_TH.md). The world
// and, since OD-56 (owner 2026-11-19 "เพิ่มระบบเพื่อน และ chat 1:1", docs/design/FRIENDS_TH.md), the private channel are
// open; the Worker admits a private channel only for two mutual friends (and the `FRIENDS` flag). Guild stays closed
// (`open: false`) until the game has guilds. Pure, no I/O.
export type ChannelKind = 'world' | 'dm' | 'guild';
export interface ChannelInfo { kind: ChannelKind; open: boolean; label: string; why: string }
export const CHANNELS: Readonly<Record<ChannelKind, ChannelInfo>> = {
  world: { kind: 'world', open: true, label: 'แชทโลก', why: '' },
  dm: { kind: 'dm', open: true, label: 'เพื่อน', why: '' },
  guild: { kind: 'guild', open: false, label: 'แชทกิลด์', why: 'ยังไม่เปิด · เกมยังไม่มีกิลด์' },
};
export const channelKinds = Object.keys(CHANNELS) as ChannelKind[];

const ACCOUNT = /^[0-9a-f]{32}$/;
const GUILD = /^[0-9a-f]{16}$/;
// Stored channel ids: `world`, `dm:<accountA>:<accountB>` (the two account ids in sorted order, so both sides share one
// channel), `guild:<guild id>`. The id never reaches a device: a device only ever names a kind.
export const WORLD_CHANNEL = 'world';
export const dmChannel = (a: string, b: string): string | undefined => ACCOUNT.test(a) && ACCOUNT.test(b) && a !== b ? `dm:${a < b ? a : b}:${a < b ? b : a}` : undefined;
export const guildChannel = (id: string): string | undefined => GUILD.test(id) ? `guild:${id}` : undefined;
export function channelKind(channel: string): ChannelKind | undefined {
  if (channel === WORLD_CHANNEL) return 'world';
  const p = channel.split(':');
  if (p[0] === 'dm' && p.length === 3 && p[1]! < p[2]! && dmChannel(p[1]!, p[2]!) === channel) return 'dm';
  if (p[0] === 'guild' && p.length === 2 && guildChannel(p[1]!) === channel) return 'guild';
  return undefined;
}
export const channelOpen = (channel: string): boolean => { const k = channelKind(channel); return k !== undefined && CHANNELS[k].open; };
// Who may read a channel. The world is for everyone; a private channel only for its two accounts; a guild only for its
// members (the member list is supplied by the guild system when it exists, so an unknown guild admits nobody).
export function mayRead(channel: string, account: string, members: readonly string[] = []): boolean {
  const k = channelKind(channel);
  if (k === 'world') return true;
  if (k === 'dm') return channel.split(':').slice(1).includes(account);
  if (k === 'guild') return members.includes(account);
  return false;
}
