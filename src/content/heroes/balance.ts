import type { GearStat } from '../../core/world/types';
export const gearPreferences: Record<string, { main: GearStat[]; some: GearStat[] }> = {
  guardian: { main: ['hp', 'armour', 'speed'], some: ['attack', 'resist'] },
  tracer: { main: ['attack', 'speed', 'leech'], some: ['hp'] },
  weaver: { main: ['attack', 'support'], some: ['hp', 'speed', 'resist'] },
  healer: { main: ['hp', 'support', 'resist'], some: ['speed'] },
  garran: { main: ['hp', 'attack', 'armour'], some: ['leech'] },
  mira: { main: ['attack', 'speed'], some: ['hp', 'leech'] },
  toma: { main: ['support', 'speed'], some: ['hp', 'attack'] },
  sefa: { main: ['attack', 'speed', 'leech'], some: ['hp'] },
  brann: { main: ['hp', 'armour', 'resist'], some: ['attack'] },
  lio: { main: ['support', 'speed'], some: ['hp', 'attack', 'resist'] },
  metta: { main: ['attack', 'hp', 'armour'], some: ['leech', 'resist'] },
  thiran: { main: ['attack', 'hp', 'armour'], some: ['leech', 'resist'] },
  lalin: { main: ['hp', 'armour', 'speed'], some: ['attack', 'resist'] },
  wila: { main: ['hp', 'armour', 'speed'], some: ['attack', 'resist'] },
};
