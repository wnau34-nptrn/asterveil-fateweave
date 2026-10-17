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

export const talentTrees: Readonly<Record<string, TalentTree>> = {
  guardian: [hp('ใจอัศวิน', 5, 'root', 1),
    atk('แขนเหล็ก'), power('a2', 'โล่หนัก', 'bash', 4), cap('a3', 'ทุบซ้ำ', 'retribution', 8),
    hp('กายเหล็ก'), rule('b2', 'รับแทนแน่น', 'guardReduction', 0.05), cap('b3', 'โต้กลับ', 'guardcounter', 8)],
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
