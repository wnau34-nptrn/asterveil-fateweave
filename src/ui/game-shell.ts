import type { BattleState, Outcome } from '../core/battle/types';
import { clearLegacySaves, loadExpedition, saveExpedition } from '../core/save/expedition-save';
import type { Direction, ExpeditionState, MapDefinition, WorldEvent } from '../core/world/types';
import { finishBattle, move, newExpedition, openChest, recordBattle, rest, revive, type EncounterLookup } from '../core/world/world';
import { browserStorage } from '../platform/browser-storage';
import type { BattleUI } from './battle-ui';
import { heroText, lootThai } from './th';
import { WorldUI, type WorldBanner } from './world-ui';

// Owns the authoritative expedition state and switches between title, world and
// battle views. Every world or battle commit is saved before anything animates.
export class GameShell {
  private state: ExpeditionState | undefined;
  private readonly storage = browserStorage();
  private saved = true;
  private message = '';
  private locked = false;
  private banner: WorldBanner | undefined;
  private effect: 'rest' | 'loot' | undefined;
  private world: WorldUI;
  private onBattleVisibility: (visible: boolean) => void = () => {};
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private readonly root: HTMLElement, private readonly map: MapDefinition, private readonly lookup: EncounterLookup, private readonly battle: BattleUI,
    private readonly views: { title: HTMLElement; world: HTMLElement; battle: HTMLElement }) {
    clearLegacySaves(this.storage);
    this.state = loadExpedition(this.storage, map, lookup);
    this.world = new WorldUI(views.world, map, lookup(map.tutorialEncounterId)!.heroes, {
      move: dir => this.move(dir), rest: () => this.rest(), revive: id => this.revive(id), openChest: () => this.openChest(), newExpedition: () => this.begin(),
    });
    views.title.addEventListener('click', e => {
      const button = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-title]');
      if (!button) return;
      if (button.dataset.title === 'continue' && this.state) this.resume();
      if (button.dataset.title === 'new') {
        if (this.state && button.dataset.confirm !== 'yes') { button.dataset.confirm = 'yes'; button.textContent = 'ยืนยัน: ลบการเดินทางเดิมแล้วเริ่มใหม่'; return; }
        this.begin();
      }
    });
    this.showTitle();
  }
  setBattleVisibilityListener(listener: (visible: boolean) => void): void { this.onBattleVisibility = listener; }

  private show(view: 'title' | 'world' | 'battle'): void {
    this.views.title.hidden = view !== 'title'; this.views.world.hidden = view !== 'world';
    // The battle view keeps its layout while hidden so Phaser never sizes to zero.
    this.views.battle.classList.toggle('view-off', view !== 'battle');
    this.views.battle.inert = view !== 'battle';
    this.root.dataset.view = view;
    this.onBattleVisibility(view === 'battle');
  }
  private showTitle(): void {
    const s = this.state;
    this.views.title.innerHTML = `<div class="title-card"><h1 class="title-logo"><img src="${import.meta.env.BASE_URL}assets/title/logo.svg" alt="Asterveil · Fateweave" width="700" height="224"></h1><p class="title-copy">ข้ามม่านเวล · ถักทอโชคชะตา</p>
      <div class="title-actions">${s ? `<p class="title-save">${s.completed ? 'การเดินทางนี้สำเร็จแล้ว' : `เดินแล้ว ${s.steps} ก้าว · ชนะ ${s.wins} ศึก${s.battle ? ' · ค้างอยู่ในศึก' : ''}`}</p><button id="continue" data-title="continue" class="primary">เล่นต่อ →</button>` : ''}
      <button id="new-game" data-title="new" class="${s ? 'secondary' : 'primary'}">เริ่มการเดินทางใหม่</button>
      ${this.storage ? '' : '<p class="title-warning">เบราว์เซอร์นี้ไม่อนุญาตให้บันทึก เล่นได้แต่จะไม่จำความคืบหน้า</p>'}</div><p class="title-footer">ชายแดนม่านเวล</p></div>`;
    this.show('title');
    this.views.title.querySelector<HTMLElement>(s ? '#continue' : '#new-game')?.focus({ preventScroll: true });
  }
  private persist(): void { if (this.state) this.saved = saveExpedition(this.storage, this.state); }
  private begin(): void {
    // Seed only chooses future rolls; rules never read the clock.
    this.state = newExpedition(this.map, this.lookup, (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    this.persist(); this.banner = undefined; this.locked = false;
    this.message = 'แตะช่องที่ไฮไลต์หรือใช้ลูกศรเพื่อเดิน';
    this.renderWorld();
  }
  private resume(): void {
    this.locked = false;
    if (this.state?.battle) { this.openBattle(); return; }
    this.message = this.state?.completed ? '' : 'กลับมาเดินทางต่อจากจุดที่บันทึกไว้';
    this.banner = this.state?.completed ? this.completedBanner() : undefined;
    this.renderWorld();
  }
  private renderWorld(): void {
    this.show('world');
    this.world.render({ state: this.state!, message: this.message, locked: this.locked, saved: this.saved && !!this.storage, banner: this.banner, effect: this.effect });
    this.effect = undefined;
  }
  private completedBanner() {
    const s = this.state!;
    return { kind: 'complete' as const, eyebrow: 'สำเร็จการเดินทาง', title: 'ประตูรอยแยกปิดลงแล้ว', detail: `เดิน ${s.steps} ก้าว · ชนะ ${s.wins} ศึก · แพ้ ${s.defeats} ครั้ง` };
  }

  private move(dir: Direction): void {
    if (!this.state || this.locked) return;
    const result = move(this.state, this.map, dir);
    if (result.event.type === 'blocked') { this.message = result.event.reason === 'wall' ? 'ทางนี้ไปต่อไม่ได้' : this.message; this.renderWorld(); return; }
    this.state = result.state; this.persist();
    this.message = this.describe(result.event);
    if (result.event.type === 'goal') this.banner = this.completedBanner();
    if (result.event.type === 'encounter') {
      const data = this.lookup(result.event.encounterId)!;
      this.locked = true;
      const kind = result.event.kind === 'random' ? 'encounter' : result.event.kind;
      this.banner = { kind, eyebrow: kind === 'boss' ? 'บอส · รอยแยกกำลังตื่นขึ้น' : kind === 'tutorial' ? 'ศึกแรก' : 'พบศัตรู!', title: data.name, detail: data.enemies.map(e => e.displayName ?? e.name).join(' · ') };
      this.renderWorld();
      // Veil-shatter presentation (720 ms, 100 ms crossfade under reduced motion); the battle is already saved.
      setTimeout(() => { this.banner = undefined; this.openBattle(); }, this.reducedMotion.matches ? 100 : 720);
      return;
    }
    this.renderWorld();
  }
  private rest(): void {
    if (!this.state) return;
    const result = rest(this.state, this.map, this.lookup);
    if (result.event.type !== 'rested') return;
    this.state = result.state; this.persist();
    this.message = `พักที่แคมป์แล้ว · คนที่ยืนอยู่ฟื้นเลือด ${this.map.camp.restHealPercent}% ไฟแคมป์จะจุดใหม่เมื่อชนะศึก`;
    this.effect = 'rest';
    this.renderWorld();
  }
  private revive(heroId: string): void {
    if (!this.state || this.locked) return;
    const result = revive(this.state, this.map, this.lookup, heroId);
    if (result.event.type !== 'revived') return;
    this.state = result.state; this.persist();
    this.message = `ชุบ${heroText[heroId]?.name ?? ''}แล้ว · ใช้ถ่านม่านเวล 1 เหลือ ${this.state.resources.ember}`;
    this.effect = 'rest';
    this.renderWorld();
  }
  private openChest(): void {
    if (!this.state || this.locked) return;
    const result = openChest(this.state, this.map);
    if (result.event.type !== 'chest') return;
    this.state = result.state; this.persist();
    this.message = `เปิดกล่องสมบัติ · ${lootThai(result.event.loot)}`;
    this.effect = 'loot';
    this.renderWorld();
  }
  private describe(event: WorldEvent): string {
    switch (event.type) {
      case 'moved': return event.chance ? `ก้าวต่อไป · ไม่พบศัตรู (โอกาส ${event.chance}%)` : 'พื้นที่ปลอดภัย';
      case 'encounter': return event.kind === 'boss' ? 'ผู้คุมรอยแยกขวางประตูไว้!' : 'พบศัตรู!';
      case 'goal': return 'ถึงประตูรอยแยกแล้ว';
      default: return this.message;
    }
  }

  private openBattle(): void {
    const s = this.state!; const b = s.battle!; const data = this.lookup(b.encounterId)!;
    this.show('battle');
    this.battle.open({
      kind: b.kind, data, entry: { hp: b.entry }, commands: b.commands,
      commit: (state: BattleState) => this.commitBattle(state),
      leaveLabel: (outcome: Outcome) => outcome === 'victory' ? (b.kind === 'boss' ? 'ไปยังประตูรอยแยก →' : 'กลับสู่แผนที่ →') : b.kind === 'tutorial' ? 'ลองศึกสอนอีกครั้ง ↻' : this.state?.camp ? 'กลับแคมป์ →' : 'กลับจุดเริ่มต้น →',
      leave: () => this.leaveBattle(),
    });
  }
  private commitBattle(battle: BattleState): boolean {
    if (!this.state?.battle) return false;
    const kind = this.state.battle.kind;
    let next = recordBattle(this.state, this.lookup, battle.commands);
    if (battle.outcome !== 'active') {
      const result = finishBattle(next, this.map, this.lookup); next = result.state;
      const fallen = Object.values(next.hp).filter(hp => hp <= 0).length;
      if (result.event.type === 'victory') {
        const loot = lootThai(result.event.loot); this.effect = 'loot';
        this.message = kind === 'boss' ? `ผู้คุมรอยแยกล้มแล้ว · ${loot} · ทางไปประตูเปิดออก` : `ชนะศึก · ${loot}${fallen ? ` · ${fallen} คนล้มอยู่ ชุบที่แคมป์` : ''}`;
      } else this.message = kind === 'tutorial' ? 'ลองศึกสอนอีกครั้งด้วยเลือดเต็ม' : 'ทีมถอยกลับมาฟื้นตัว · เลือดเต็มแล้ว';
    }
    this.state = next; this.persist();
    return this.saved;
  }
  private leaveBattle(): void {
    if (this.state?.battle) { this.openBattle(); return; }
    this.locked = false;
    this.banner = undefined;
    this.renderWorld();
    this.views.world.querySelector<HTMLElement>('#move-up')?.focus({ preventScroll: true });
  }
}
