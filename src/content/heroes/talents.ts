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
  tracer: [atk('สายตานักดาบ', 4, 'root', 1),
    atk('คมดาบ'), power('a2', 'จุดตาย', 'execute', 4), cap('a3', 'ตราลึก', 'deepmark', 6),
    hp('ฝีเท้าเบา'), rule('b2', 'ดาบดูดพลัง', 'executeHeal', 3), cap('b3', 'ไม่หยุดมือ', 'relentless')],
  weaver: [atk('ประกายเวท', 4, 'root', 1),
    atk('พลังเวท'), power('a2', 'ศรเวทคม', 'bolt', 4), cap('a3', 'ศรแยก', 'splitbolt'),
    hp('ใจสงบ'), power('b2', 'โล่หนา', 'ward', 3), cap('b3', 'โล่สะท้อน', 'wardreflect', 6)],
  healer: [skill('ศรัทธา', 4, 'root', 1),
    power('a1', 'มือสว่าง', 'heal', 3), power('a2', 'พรยาว', 'prayer', 2), cap('a3', 'รักษาคู่', 'twinheal'),
    hp('ใจมั่น'), rule('b2', 'พรคุ้มกาย', 'healBarrier', 2), cap('b3', 'ปลอบขวัญ', 'solace', 15)],
  garran: [hp('ด้ามมั่น', 5, 'root', 1),
    atk('แรงแทง'), power('a2', 'ทะลวงลึก', 'pierce', 4), cap('a3', 'ทะลุแนว', 'pierceline'),
    hp('ตั้งหลัก'), power('b2', 'ปลายทวนคม', 'brace', 3), cap('b3', 'แนวหน้าแกร่ง', 'frontwall', 10)],
  mira: [atk('ตาเหยี่ยว', 4, 'root', 1),
    atk('สายธนูตึง'), power('a2', 'ศรสกัดคม', 'hinder', 3), cap('a3', 'ล่าเหยื่อ', 'hunter', 6),
    hp('ระยะปลอดภัย'), power('b2', 'ห่าธนูหนา', 'volley', 2), cap('b3', 'ห่าธนูสกัด', 'volleyhinder')],
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
