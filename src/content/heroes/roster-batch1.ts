import type { ActionId, HeroDefinition, SkillDefinition } from '../../core/battle/types';
import type { TalentNodeDef, TalentTree } from '../../core/world/types';

// C12 Batch 1. New members enter through the existing post-map-3 hiring board, never the prologue draft.
// Both members of a class start from the same base; only their paid personal branch differs.
export const rosterBatch1: readonly HeroDefinition[] = [
  { id: 'metta', name: 'Corin', role: 'Saint', lane: 'front', maxHp: 68, attack: 11, speed: 75, actions: ['attack', 'saintstrike', 'communion'], color: 0xd4b46b },
  { id: 'thiran', name: 'Odran', role: 'Saint', lane: 'front', maxHp: 68, attack: 11, speed: 75, actions: ['attack', 'saintstrike', 'communion'], color: 0x7cb6ac },
  { id: 'lalin', name: 'Cerise', role: 'Dancer', lane: 'back', maxHp: 50, attack: 9, speed: 95, actions: ['attack', 'cadence', 'duet'], color: 0xde9c9e },
  { id: 'wila', name: 'Isolde', role: 'Dancer', lane: 'back', maxHp: 50, attack: 9, speed: 95, actions: ['attack', 'cadence', 'duet'], color: 0x91a7d9 },
];

export const rosterBatch1Skills = {
  saintstrike: { name: 'หมัดเมตตา', english: 'Merciful Strike', icon: '✦', power: 20, cooldown: 2 },
  communion: { name: 'แบ่งแรงใจ', english: 'Communion', icon: '✚', power: 12, cooldown: 3 },
  saintarc: { name: 'กวาดคุ้มชีพ', english: 'Saint Arc', icon: '✦', power: 8, cooldown: 4 },
  vowstrike: { name: 'หมัดสัตย์', english: 'Vow Strike', icon: '✦', power: 22, cooldown: 3 },
  sharewound: { name: 'แบ่งบาดแผล', english: 'Shared Wound', icon: '✚', power: 16, cooldown: 3 },
  lastlight: { name: 'แสงสุดท้าย', english: 'Last Light', icon: '✦', power: 24, cooldown: 4 },
  cadence: { name: 'คืนจังหวะ', english: 'Cadence', icon: '♬', power: 0, cooldown: 3 },
  duet: { name: 'รำประสาน', english: 'Duet', icon: '♬', power: 0, cooldown: 4 },
  rounddance: { name: 'รำวง', english: 'Round Dance', icon: '♬', power: 0, cooldown: 5 },
  deepbeat: { name: 'ย้ำจังหวะ', english: 'Deep Beat', icon: '♬', power: 0, cooldown: 4 },
  echofoot: { name: 'ก้าวสะท้อน', english: 'Echo Foot', icon: '♬', power: 12, cooldown: 4 },
  closingstep: { name: 'ก้าวปิดท้าย', english: 'Closing Step', icon: '♬', power: 0, cooldown: 6 },
} satisfies Partial<Record<ActionId, SkillDefinition>>;

type Place = Pick<TalentNodeDef, 'branch' | 'tier' | 'choice' | 'needs'>;
const node = (id: string, name: string, effect: TalentNodeDef['effect'], place: Place, max = 1): TalentNodeDef => ({ id, name, max, effect, ...place });

// Sixteen shared nodes per class, plus four sequential paid personal nodes. Choice IDs are class-scoped.
const saintTree: TalentTree = [
  node('a1', 'กายคุ้มชีพ', { stat: 'hp', percent: 5 }, { branch: 'a', tier: 1 }, 2),
  node('a2x', 'หมัดมั่นคง', { power: 'saintstrike', amount: 3 }, { branch: 'a', tier: 2, choice: 'saint-a2' }),
  node('a2y', 'ใจแบ่งปัน', { cap: 'communionRatio', amount: 10 }, { branch: 'a', tier: 2, choice: 'saint-a2' }),
  node('a3', 'กวาดคุ้มชีพ', { unlock: 'saintarc' }, { branch: 'a', tier: 3 }),
  node('a4', 'สายใยชีวิต', { cap: 'saintRatio', amount: 5 }, { branch: 'a', tier: 4 }),
  node('b1', 'กำลังสัตย์', { stat: 'attack', percent: 4 }, { branch: 'b', tier: 1 }, 2),
  node('b2x', 'วงหมัดกว้าง', { power: 'saintarc', amount: 3 }, { branch: 'b', tier: 2, choice: 'saint-b2' }),
  node('b2y', 'ได้ยินคำขอ', { cap: 'vowThreshold', amount: 50 }, { branch: 'b', tier: 2, choice: 'saint-b2' }),
  node('b3', 'หมัดสัตย์', { unlock: 'vowstrike' }, { branch: 'b', tier: 3 }),
  node('b4', 'ชัยเพื่อชีวิต', { cap: 'saintFinish', amount: 45 }, { branch: 'b', tier: 4 }),
  node('c1', 'หัวใจหนักแน่น', { stat: 'hp', percent: 5 }, { branch: 'c', tier: 1 }, 2),
  node('c1s', 'แบ่งบาดแผล', { unlock: 'sharewound' }, { branch: 'c', tier: 1 }),
  node('c2x', 'ช่วยผู้ใกล้ล้ม', { cap: 'sharePriority', amount: 70 }, { branch: 'c', tier: 2, choice: 'saint-c2', needs: 'c1s' }),
  node('c2y', 'แบ่งสามทาง', { cap: 'shareThree' }, { branch: 'c', tier: 2, choice: 'saint-c2', needs: 'c1s' }),
  node('c3', 'แสงสุดท้าย', { unlock: 'lastlight' }, { branch: 'c', tier: 3 }),
  node('c4', 'แสงอุทิศ', { cap: 'lastlightRatio', amount: 45 }, { branch: 'c', tier: 4 }),
];
const dancerTree: TalentTree = [
  node('a1', 'ลมหายใจนิ่ง', { stat: 'hp', percent: 5 }, { branch: 'a', tier: 1 }, 2),
  node('a2x', 'รับจังหวะไว', { cap: 'dancerCadenceQuick', amount: 1 }, { branch: 'a', tier: 2, choice: 'dancer-a2' }),
  node('a2y', 'รอเพียงนิด', { cap: 'dancerCadenceShort' }, { branch: 'a', tier: 2, choice: 'dancer-a2' }),
  node('a3', 'รำวง', { unlock: 'rounddance' }, { branch: 'a', tier: 3 }),
  node('a4', 'ประสานคู่หน้า', { cap: 'dancerRoundPair' }, { branch: 'a', tier: 4 }),
  node('b1', 'ยืนจังหวะ', { stat: 'hp', percent: 5 }, { branch: 'b', tier: 1 }, 2),
  node('b2x', 'ประสานท่าเดียว', { cap: 'dancerDuetFocus' }, { branch: 'b', tier: 2, choice: 'dancer-b2' }),
  node('b2y', 'รำต่อเนื่อง', { cap: 'dancerDuetQuick', amount: 1 }, { branch: 'b', tier: 2, choice: 'dancer-b2' }),
  node('b3', 'ย้ำจังหวะ', { unlock: 'deepbeat' }, { branch: 'b', tier: 3 }),
  node('b4', 'จังหวะลึก', { cap: 'dancerDeep' }, { branch: 'b', tier: 4 }),
  node('c1', 'ก้าวมั่น', { stat: 'armour', percent: 5 }, { branch: 'c', tier: 1 }, 2),
  node('c1s', 'ก้าวสะท้อน', { unlock: 'echofoot' }, { branch: 'c', tier: 1 }),
  node('c2x', 'ก้าวหนักแน่น', { power: 'echofoot', amount: 4 }, { branch: 'c', tier: 2, choice: 'dancer-c2', needs: 'c1s' }),
  node('c2y', 'ส่งต่อจังหวะ', { cap: 'dancerEchoChoose' }, { branch: 'c', tier: 2, choice: 'dancer-c2', needs: 'c1s' }),
  node('c3', 'ก้าวปิดท้าย', { unlock: 'closingstep' }, { branch: 'c', tier: 3 }),
  node('c4', 'เหลือเพียงก้าว', { cap: 'dancerClosingQuick', amount: 1 }, { branch: 'c', tier: 4 }),
];

export const rosterBatch1Trees: Readonly<Record<string, TalentTree>> = {
  metta: [...saintTree,
    node('p1', 'ใจเมตตา', { cap: 'metta1', amount: 5 }, { branch: 'p', tier: 1 }),
    node('p2', 'หมัดช่วยเพื่อน', { cap: 'metta2', amount: 3 }, { branch: 'p', tier: 2, needs: 'p1' }),
    node('p3', 'แบ่งให้พอดี', { cap: 'metta3', amount: 60 }, { branch: 'p', tier: 3, needs: 'p2' }),
    node('p4', 'แสงเพื่อผู้อื่น', { cap: 'metta4', amount: 50 }, { branch: 'p', tier: 4, needs: 'p3' }),
  ],
  thiran: [...saintTree,
    node('p1', 'หมัดคนสร้างประตู', { power: 'saintarc', amount: 2 }, { branch: 'p', tier: 1 }),
    node('p2', 'ค้ำแนวหน้า', { cap: 'thiran2' }, { branch: 'p', tier: 2, needs: 'p1' }),
    node('p3', 'สัตย์หน้าด่าน', { cap: 'thiran3', amount: 3 }, { branch: 'p', tier: 3, needs: 'p2' }),
    node('p4', 'คุ้มสองชีวิต', { cap: 'thiran4' }, { branch: 'p', tier: 4, needs: 'p3' }),
  ],
  lalin: [...dancerTree,
    node('p1', 'รำเปิดขบวน', { cap: 'lalin1', amount: 1 }, { branch: 'p', tier: 1 }),
    node('p2', 'เลือกจังหวะ', { cap: 'lalin2' }, { branch: 'p', tier: 2, needs: 'p1' }),
    node('p3', 'ประคองผู้เหนื่อยล้า', { cap: 'lalin3', amount: 1 }, { branch: 'p', tier: 3, needs: 'p2' }),
    node('p4', 'ก้าวท้ายกระชับ', { cap: 'lalin4', amount: 1 }, { branch: 'p', tier: 4, needs: 'p3' }),
  ],
  wila: [...dancerTree,
    node('p1', 'รำเปิดวง', { cap: 'wila1', amount: 1 }, { branch: 'p', tier: 1 }),
    node('p2', 'ก้าวผู้ฝึกสอน', { power: 'echofoot', amount: 3 }, { branch: 'p', tier: 2, needs: 'p1' }),
    node('p3', 'จำทุกจังหวะ', { cap: 'wila3', amount: 1 }, { branch: 'p', tier: 3, needs: 'p2' }),
    node('p4', 'รำสองสหาย', { cap: 'wila4' }, { branch: 'p', tier: 4, needs: 'p3' }),
  ],
};
