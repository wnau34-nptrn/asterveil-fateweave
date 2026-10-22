import type { ActionId, TalentCap, TalentRule } from '../../core/battle/types';
import type { TalentNodeDef, TalentTree } from '../../core/world/types';

// Passive talent trees (2D-1b, owner-approved 2026-10-16, draft numbers). Same shape for every class:
// root (1 rank) → branch A and B: tier 1 (2) → tier 2 (2) → capstone (1). 11 ranks, 9 points at level 10.
const hp = (name: string, percent = 5, id: TalentNodeDef['id'] = 'b1', max = 2): TalentNodeDef => ({ id, name, max, effect: { stat: 'hp', percent } });
const atk = (name: string, percent = 4, id: TalentNodeDef['id'] = 'a1', max = 2): TalentNodeDef => ({ id, name, max, effect: { stat: 'attack', percent } });
const skill = (name: string, percent = 4, id: TalentNodeDef['id'] = 'a1', max = 2): TalentNodeDef => ({ id, name, max, effect: { stat: 'skill', percent } });
const power = (id: TalentNodeDef['id'], name: string, action: ActionId, amount: number): TalentNodeDef => ({ id, name, max: 2, effect: { power: action, amount } });
const rule = (id: TalentNodeDef['id'], name: string, r: TalentRule, amount: number): TalentNodeDef => ({ id, name, max: 2, effect: { rule: r, amount } });
const cap = (id: 'a3' | 'b3', name: string, c: TalentCap, amount?: number): TalentNodeDef => ({ id, name, max: 1, effect: amount === undefined ? { cap: c } : { cap: c, amount } });

// Big skill trees (master plan A6, owner-approved 2026-10-21, draft numbers): three branches of four tiers. A node
// can raise a stat, unlock an active skill, modify one (pick one of two per `choice`) or switch on a passive.
type Big = Pick<TalentNodeDef, 'branch' | 'tier' | 'choice' | 'needs' | 'legacyStars'>;
const node = (id: string, name: string, effect: TalentNodeDef['effect'], at: Big, max = 1): TalentNodeDef => ({ id, name, max, effect, ...at });
export const talentTrees: Readonly<Record<string, TalentTree>> = {
  // Knight (docs/design/SKILL_TREE_KNIGHT_TH.md): A bulwark, B retribution, C banner. Guard and Shield Bash are his from the start.
  guardian: [
    node('a1', 'ใจอัศวิน', { stat: 'hp', percent: 5 }, { branch: 'a', tier: 1 }, 2),
    node('a2i', 'กำแพงเหล็ก', { rule: 'guardReduction', amount: 0.1 }, { branch: 'a', tier: 2, choice: 'guard' }),
    node('a2t', 'ไม่ทิ้งกัน', { cap: 'twoguard', amount: 5 }, { branch: 'a', tier: 2, choice: 'guard' }),
    node('a3', 'ผิวเหล็ก', { stat: 'armour', percent: 6 }, { branch: 'a', tier: 3 }),
    node('a3s', 'ปราการหิน', { unlock: 'bulwark' }, { branch: 'a', tier: 3 }),
    node('a4', 'ยืนหยัด', { passive: 'stand' }, { branch: 'a', tier: 4, legacyStars: 5 }),
    node('b1', 'แขนเหล็ก', { stat: 'attack', percent: 4 }, { branch: 'b', tier: 1 }, 2),
    node('b2', 'ท้าดวล', { unlock: 'challenge' }, { branch: 'b', tier: 2 }),
    node('b3r', 'ทุบซ้ำ', { cap: 'retribution', amount: 8 }, { branch: 'b', tier: 3, choice: 'bash' }),
    node('b3f', 'โล่สะท้อน', { cap: 'reflectbash', amount: 30 }, { branch: 'b', tier: 3, choice: 'bash' }),
    node('b4', 'ตอบโต้ไม่หยุด', { cap: 'guardcounter', amount: 8 }, { branch: 'b', tier: 4 }),
    node('c1', 'ใจผู้นำ', { stat: 'skill', percent: 5 }, { branch: 'c', tier: 1 }, 2),
    node('c1s', 'ตั้งรับหมู่', { unlock: 'rally' }, { branch: 'c', tier: 1, legacyStars: 3 }),
    node('c2b', 'ธงสว่าง', { cap: 'brightbanner', amount: 6 }, { branch: 'c', tier: 2, choice: 'rally', needs: 'c1s' }),
    node('c2v', 'ขวัญกล้า', { cap: 'valorbanner', amount: 10 }, { branch: 'c', tier: 2, choice: 'rally', needs: 'c1s' }),
    node('c3', 'ปลุกพล', { unlock: 'rouse' }, { branch: 'c', tier: 3 }),
    node('c4', 'ธงแห่งชะตา', { cap: 'fatebanner', amount: 10 }, { branch: 'c', tier: 4 }),
  ],
  // Release A big trees (docs/design/SKILL_TREES_ALL_TH.md, owner-approved 2026-10-22). Each class keeps its two
  // starting skills; the tree adds its old ★3 skill and three new ones, and its old ★5 passive is a capstone.
  // Duelist: A mark hunt, B finishing, C blade dance.
  tracer: [
    node('a1', 'คมดาบ', { stat: 'attack', percent: 4 }, { branch: 'a', tier: 1 }, 2),
    node('a2d', 'ตราลึก', { cap: 'deepmark', amount: 6 }, { branch: 'a', tier: 2, choice: 'mark' }),
    node('a2s', 'ตราร่วม', { cap: 'sharedmark', amount: 4 }, { branch: 'a', tier: 2, choice: 'mark' }),
    node('a3', 'ตัวเบา', { stat: 'armour', percent: 6 }, { branch: 'a', tier: 3 }),
    node('a3s', 'พุ่งตัด', { unlock: 'lunge' }, { branch: 'a', tier: 3 }),
    node('a4', 'สายตาคม', { passive: 'keeneye' }, { branch: 'a', tier: 4, legacyStars: 5 }),
    node('b1', 'มือนิ่ง', { stat: 'attack', percent: 3 }, { branch: 'b', tier: 1 }, 2),
    node('b2', 'ปลิดชีพ', { unlock: 'finisher' }, { branch: 'b', tier: 2, legacyStars: 3 }),
    node('b3d', 'ดาบดูดพลัง', { rule: 'executeHeal', amount: 6 }, { branch: 'b', tier: 3, choice: 'execute' }),
    node('b3r', 'ไม่หยุดมือ', { cap: 'relentless' }, { branch: 'b', tier: 3, choice: 'execute' }),
    node('b4', 'เส้นตาย', { cap: 'deadline', amount: 50 }, { branch: 'b', tier: 4 }),
    node('c1', 'ฝีเท้าเบา', { stat: 'hp', percent: 5 }, { branch: 'c', tier: 1 }, 2),
    node('c1s', 'ปัดดาบ', { unlock: 'parry' }, { branch: 'c', tier: 1 }),
    node('c2m', 'ปัดแล้วตรา', { cap: 'parrymark' }, { branch: 'c', tier: 2, choice: 'parry', needs: 'c1s' }),
    node('c2w', 'ปัดรอบตัว', { cap: 'parryall', amount: 40 }, { branch: 'c', tier: 2, choice: 'parry', needs: 'c1s' }),
    node('c3', 'ฟันกวาด', { unlock: 'sweep' }, { branch: 'c', tier: 3 }),
    node('c4', 'ระบำไม่สิ้นสุด', { cap: 'endlessdance' }, { branch: 'c', tier: 4 }),
  ],
  // Mage: A battle magic, B warding, C sealing.
  weaver: [
    node('a1', 'พลังเวท', { stat: 'skill', percent: 4 }, { branch: 'a', tier: 1 }, 2),
    node('a2s', 'ศรแยก', { cap: 'splitbolt' }, { branch: 'a', tier: 2, choice: 'bolt' }),
    node('a2p', 'ศรทะลวง', { cap: 'piercebolt', amount: 4 }, { branch: 'a', tier: 2, choice: 'bolt' }),
    node('a3', 'กระแสเวท', { stat: 'skill', percent: 5 }, { branch: 'a', tier: 3 }),
    node('a3s', 'พายุเวท', { unlock: 'storm' }, { branch: 'a', tier: 3 }),
    node('a4', 'ประจุเวท', { cap: 'arcanecharge' }, { branch: 'a', tier: 4 }),
    node('b1', 'ใจสงบ', { stat: 'hp', percent: 5 }, { branch: 'b', tier: 1 }, 2),
    node('b2r', 'โล่สะท้อน', { cap: 'wardreflect', amount: 6 }, { branch: 'b', tier: 2, choice: 'ward' }),
    node('b2t', 'โล่คู่', { cap: 'twinward' }, { branch: 'b', tier: 2, choice: 'ward' }),
    node('b3', 'เกราะผลึก', { unlock: 'aegis' }, { branch: 'b', tier: 3 }),
    node('b4', 'ก้องสะท้อน', { passive: 'echo' }, { branch: 'b', tier: 4, legacyStars: 5 }),
    node('c1', 'ประกายเวท', { stat: 'attack', percent: 4 }, { branch: 'c', tier: 1 }, 2),
    node('c1s', 'ตรึงเวท', { unlock: 'sigil' }, { branch: 'c', tier: 1, legacyStars: 3 }),
    node('c2r', 'ผนึกสะท้อน', { cap: 'sigilreflect', amount: 30 }, { branch: 'c', tier: 2, choice: 'sigil', needs: 'c1s' }),
    node('c2d', 'ผนึกถ่วง', { cap: 'sigildelay' }, { branch: 'c', tier: 2, choice: 'sigil', needs: 'c1s' }),
    node('c3', 'สลายเวท', { unlock: 'dispel' }, { branch: 'c', tier: 3 }),
    node('c4', 'ผนึกชะตา', { cap: 'fateseal', amount: 10 }, { branch: 'c', tier: 4 }),
  ],
  // Priest: A healing, B protection, C blessings.
  healer: [
    node('a1', 'ศรัทธา', { stat: 'skill', percent: 4 }, { branch: 'a', tier: 1 }, 2),
    node('a2t', 'รักษาคู่', { cap: 'twinheal' }, { branch: 'a', tier: 2, choice: 'heal' }),
    node('a2b', 'พรคุ้มกาย', { rule: 'healBarrier', amount: 4 }, { branch: 'a', tier: 2, choice: 'heal' }),
    node('a3', 'ฟื้นคืน', { unlock: 'revive' }, { branch: 'a', tier: 3 }),
    node('a4', 'แสงอุ่น', { passive: 'afterglow' }, { branch: 'a', tier: 4, legacyStars: 5 }),
    node('b1', 'ใจมั่น', { stat: 'hp', percent: 5 }, { branch: 'b', tier: 1 }, 2),
    node('b1s', 'พรคุ้มภัย', { unlock: 'sanctuary' }, { branch: 'b', tier: 1, legacyStars: 3 }),
    node('b2s', 'ปลอบขวัญ', { cap: 'solace', amount: 15 }, { branch: 'b', tier: 2, choice: 'sanctuary', needs: 'b1s' }),
    node('b2d', 'คุ้มภัยสองชั้น', { cap: 'sanctuaryward', amount: 8 }, { branch: 'b', tier: 2, choice: 'sanctuary', needs: 'b1s' }),
    node('b3', 'วงแสงคุ้มกัน', { unlock: 'halo' }, { branch: 'b', tier: 3 }),
    node('b4', 'พรสุดท้าย', { cap: 'lastprayer', amount: 10 }, { branch: 'b', tier: 4 }),
    node('c1', 'อาภรณ์ศักดิ์สิทธิ์', { stat: 'armour', percent: 5 }, { branch: 'c', tier: 1 }, 2),
    node('c2l', 'พรยาว', { cap: 'longprayer' }, { branch: 'c', tier: 2, choice: 'prayer' }),
    node('c2q', 'พรทันใจ', { cap: 'quickprayer' }, { branch: 'c', tier: 2, choice: 'prayer' }),
    node('c3', 'พรกล้า', { unlock: 'bless' }, { branch: 'c', tier: 3 }),
    node('c4', 'รุ่งอรุณ', { cap: 'dawn' }, { branch: 'c', tier: 4 }),
  ],
  // Spear: A bracing, B thrusting, C holding the line.
  garran: [
    node('a1', 'ด้ามมั่น', { stat: 'hp', percent: 5 }, { branch: 'a', tier: 1 }, 2),
    node('a2k', 'ปลายทวนคม', { power: 'brace', amount: 6 }, { branch: 'a', tier: 2, choice: 'brace' }),
    node('a2f', 'แนวหน้าแกร่ง', { cap: 'frontwall', amount: 10 }, { branch: 'a', tier: 2, choice: 'brace' }),
    node('a3', 'กำแพงทวน', { unlock: 'spearwall' }, { branch: 'a', tier: 3, legacyStars: 3 }),
    node('a4', 'โต้หนัก', { passive: 'heavycounter' }, { branch: 'a', tier: 4, legacyStars: 5 }),
    node('b1', 'แรงแทง', { stat: 'attack', percent: 4 }, { branch: 'b', tier: 1 }, 2),
    node('b2l', 'ทะลุแนว', { cap: 'pierceline' }, { branch: 'b', tier: 2, choice: 'pierce' }),
    node('b2d', 'ทะลวงลึก', { cap: 'deeppierce', amount: 30 }, { branch: 'b', tier: 2, choice: 'pierce' }),
    node('b3', 'แทงหยุดยั้ง', { unlock: 'halt' }, { branch: 'b', tier: 3 }),
    node('b4', 'ทวนพิฆาต', { cap: 'spearfury' }, { branch: 'b', tier: 4 }),
    node('c1', 'ตั้งหลัก', { stat: 'armour', percent: 5 }, { branch: 'c', tier: 1 }, 2),
    node('c1s', 'ปักหลัก', { unlock: 'hold' }, { branch: 'c', tier: 1 }),
    node('c2b', 'หลังพิง', { cap: 'holdfirm', amount: 20 }, { branch: 'c', tier: 2, choice: 'hold', needs: 'c1s' }),
    node('c2r', 'ทวนตอบแทน', { cap: 'holdcounter' }, { branch: 'c', tier: 2, choice: 'hold', needs: 'c1s' }),
    node('c3', 'เสียงศึกทวน', { unlock: 'warcry' }, { branch: 'c', tier: 3 }),
    node('c4', 'ไม่ถอยสักก้าว', { cap: 'unyielding' }, { branch: 'c', tier: 4 }),
  ],
  // Archer: A marksman, B arrow rain, C ranger.
  mira: [
    node('a1', 'สายธนูตึง', { stat: 'attack', percent: 4 }, { branch: 'a', tier: 1 }, 2),
    node('a2h', 'ล่าเหยื่อ', { cap: 'hunter', amount: 6 }, { branch: 'a', tier: 2, choice: 'hinder' }),
    node('a2s', 'สกัดหนัก', { cap: 'heavyhinder', amount: 15 }, { branch: 'a', tier: 2, choice: 'hinder' }),
    node('a3', 'ศรจุดอ่อน', { unlock: 'weakshot' }, { branch: 'a', tier: 3, legacyStars: 3 }),
    node('a4', 'ศรไล่ล่า', { cap: 'chase' }, { branch: 'a', tier: 4 }),
    node('b1', 'ตาเหยี่ยว', { stat: 'attack', percent: 3 }, { branch: 'b', tier: 1 }, 2),
    node('b2t', 'ห่าธนูหนา', { power: 'volley', amount: 4 }, { branch: 'b', tier: 2, choice: 'volley' }),
    node('b2h', 'ห่าธนูสกัด', { cap: 'volleyhinder' }, { branch: 'b', tier: 2, choice: 'volley' }),
    node('b3', 'ศรตรึงแถว', { unlock: 'pin' }, { branch: 'b', tier: 3 }),
    node('b4', 'ลมส่ง', { passive: 'tailwind' }, { branch: 'b', tier: 4, legacyStars: 5 }),
    node('c1', 'ระยะปลอดภัย', { stat: 'hp', percent: 5 }, { branch: 'c', tier: 1 }, 2),
    node('c1s', 'ถอยยิง', { unlock: 'disengage' }, { branch: 'c', tier: 1 }),
    node('c2q', 'ถอยไว', { cap: 'quickstep' }, { branch: 'c', tier: 2, choice: 'disengage', needs: 'c1s' }),
    node('c2c', 'ยิงคุ้มกัน', { cap: 'covershot' }, { branch: 'c', tier: 2, choice: 'disengage', needs: 'c1s' }),
    node('c3', 'ศรตามรอย', { unlock: 'track' }, { branch: 'c', tier: 3 }),
    node('c4', 'พรานเงียบ', { cap: 'stalker' }, { branch: 'c', tier: 4 }),
  ],
  toma: [skill('สูตรพิเศษ', 4, 'root', 1),
    power('a1', 'กรดเข้มข้น', 'acid', 2), rule('a2', 'กร่อนลึก', 'corrodeBonus', 2), cap('a3', 'กรดลาม', 'acidspread'),
    hp('ภูมิต้านทาน'), rule('b2', 'ยาเร่งผสม', 'hasteHeal', 4), cap('b3', 'ยาคู่', 'quickbrew')],
  sefa: [atk('ฝีเท้าเงียบ', 4, 'root', 1),
    atk('มีดคม'), rule('a2', 'จู่โจมแรง', 'ambushBonus', 4), cap('a3', 'เงาซ้อน', 'shadowlayer'),
    hp('ตัวเบา'), rule('b2', 'หายใจในเงา', 'dodgeHeal', 3), cap('b3', 'เงาสองชั้น', 'doubleshadow')],
  brann: [hp('หินผา', 5, 'root', 1),
    atk('แขนหนัก'), power('a2', 'รูนลึก', 'slam', 4), cap('a3', 'ค้อนตอบโต้', 'hammercounter', 6),
    hp('กายหิน', 6), rule('b2', 'ท้าทายแกร่ง', 'tauntReduction', 0.05), cap('b3', 'หินฟื้นตัว', 'stoneregen', 6)],
  lio: [skill('เสียงใส', 4, 'root', 1),
    power('a1', 'จังหวะเร้า', 'valor', 1), atk('ท่อนเร้า', 5, 'a2'), cap('a3', 'ประสานเสียง', 'chorus', 2),
    hp('ลมหายใจยาว'), power('b2', 'ทำนองอุ่น', 'mend', 2), cap('b3', 'เปิดม่าน', 'overture')],
};
