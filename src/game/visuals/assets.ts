export const actorFrames: Readonly<Record<string, number>> = {
  guardian: 0, tracer: 1, weaver: 2, healer: 3, raider: 4, brute: 5,
  // PLACEHOLDER until ART-CHAR-MERC-ENEMY-001 is accepted: Garran borrows the Knight frame,
  // tinted teal on the canvas and hue-shifted in DOM portraits so he never reads as Aegis.
  garran: 0,
};
export const actorTints: Readonly<Record<string, number>> = { garran: 0x8fe8d6 };
export const actorHues: Readonly<Record<string, number>> = { garran: 150 };
// Anchor the illustrated soles, excluding transparent padding below enemies.
export const actorFootOrigins: Readonly<Record<string, number>> = { raider: 493 / 512, brute: 496 / 512 };
export const artUrl = (name: 'units' | 'portraits' | 'ruins'): string => `${import.meta.env.BASE_URL}assets/art/${name}.webp`;
