export const actorFrames: Readonly<Record<string, number>> = {
  guardian: 0, tracer: 1, weaver: 2, healer: 3, raider: 4, brute: 5,
};
export const artUrl = (name: 'units' | 'portraits' | 'ruins'): string => `${import.meta.env.BASE_URL}assets/art/${name}.webp`;
