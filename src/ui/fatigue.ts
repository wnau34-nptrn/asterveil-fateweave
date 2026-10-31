// P02 (owner 2026-10-31): fatigue reads as a coloured dot (green fresh, yellow −10%, red −20%); the words live in the
// ⓘ status panel.
const FATIGUE_LEVELS = [
  { tone: 'fresh', name: 'ไม่ล้า', detail: 'พลังโจมตีและการรักษาเต็ม' },
  { tone: 'tired', name: 'ล้า', detail: 'พลังโจมตีและการรักษาลด 10%' },
  { tone: 'worn', name: 'ล้ามาก', detail: 'พลังโจมตีและการรักษาลด 20%' },
] as const;
const fatigueLevel = (cut = 0) => FATIGUE_LEVELS[Math.min(FATIGUE_LEVELS.length - 1, Math.round(cut / 10))]!;
export function fatigueDot(cut?: number): string {
  const l = fatigueLevel(cut);
  return `<i class="fatigue-dot ${l.tone}" role="img" aria-label="${l.name} · ${l.detail}" title="${l.name} · ${l.detail}"></i>`;
}
export function fatigueSection(cut?: number): string {
  const l = fatigueLevel(cut);
  return `<section class="status-group fatigue" data-fatigue-tone="${l.tone}"><h4>ความเหนื่อยล้า</h4><p class="fatigue-now">${fatigueDot(cut)} <strong>${l.name}</strong> · ${l.detail}</p>`
    + `<p class="fatigue-legend">${FATIGUE_LEVELS.map(x => `${fatigueDot(x === FATIGUE_LEVELS[0] ? 0 : x === FATIGUE_LEVELS[1] ? 10 : 20)} ${x.name}`).join(' · ')}</p>`
    + `<p>ลงสนามศึกละ +1 นั่งสำรอง −1 · พักแคมป์หรือยาฟื้นความเหนื่อยช่วยลด · ไม่ลดความเร็วหรือเทิร์น</p></section>`;
}
