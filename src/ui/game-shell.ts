import type { BattleState, Outcome } from '../core/battle/types';
import { clearLegacySaves, loadExpedition, saveExpedition } from '../core/save/expedition-save';
import type { Direction, ExpeditionState, MapDefinition, WorldEvent } from '../core/world/types';
import { finishBattle, move, newExpedition, recordBattle, rest, type EncounterLookup } from '../core/world/world';
import { browserStorage } from '../platform/browser-storage';
import type { BattleUI } from './battle-ui';
import { WorldUI } from './world-ui';

// Owns the authoritative expedition state and switches between title, world and
// battle views. Every world or battle commit is saved before anything animates.
export class GameShell {
  private state: ExpeditionState | undefined;
  private readonly storage = browserStorage();
  private saved = true;
  private message = '';
  private locked = false;
  private banner: { eyebrow: string; title: string; detail: string } | undefined;
  private world: WorldUI;
  private onBattleVisibility: (visible: boolean) => void = () => {};
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private readonly root: HTMLElement, private readonly map: MapDefinition, private readonly lookup: EncounterLookup, private readonly battle: BattleUI,
    private readonly views: { title: HTMLElement; world: HTMLElement; battle: HTMLElement }) {
    clearLegacySaves(this.storage);
    this.state = loadExpedition(this.storage, map, lookup);
    this.world = new WorldUI(views.world, map, lookup(map.tutorialEncounterId)!.heroes, {
      move: dir => this.move(dir), rest: () => this.rest(), newExpedition: () => this.begin(),
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
    this.views.title.innerHTML = `<div class="title-card"><p class="eyebrow">บันทึกการเดินทาง</p><h1>Asterveil · Fateweave</h1><p class="title-copy">นำทีมสี่คนข้ามชายแดนม่านเวล เดินทีละช่อง อ่านแผนศัตรู และไปให้ถึงประตูรอยแยก</p>
      ${s ? `<p class="title-save">${s.completed ? 'การเดินทางนี้สำเร็จแล้ว' : `เดินแล้ว ${s.steps} ก้าว · ชนะ ${s.wins} ศึก${s.battle ? ' · ค้างอยู่ในศึก' : ''}`}</p><button id="continue" data-title="continue" class="primary">เล่นต่อ →</button>` : ''}
      <button id="new-game" data-title="new" class="${s ? 'quiet' : 'primary'}">เริ่มการเดินทางใหม่</button>
      ${this.storage ? '' : '<p class="title-save">เบราว์เซอร์นี้ไม่อนุญาตให้บันทึก เล่นได้แต่จะไม่จำความคืบหน้า</p>'}</div>`;
    this.show('title');
    this.views.title.querySelector<HTMLElement>(s ? '#continue' : '#new-game')?.focus({ preventScroll: true });
  }
  private persist(): void { if (this.state) this.saved = saveExpedition(this.storage, this.state); }
  private begin(): void {
    // Seed only chooses future rolls; rules never read the clock.
    this.state = newExpedition(this.map, this.lookup, (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0);
    this.persist(); this.banner = undefined; this.locked = false;
    this.message = 'เริ่มเดินทางจากค่ายชายแดน · ใช้ลูกศรหรือแตะช่องติดกันเพื่อเดิน';
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
    this.world.render({ state: this.state!, message: this.message, locked: this.locked, saved: this.saved && !!this.storage, banner: this.banner });
  }
  private completedBanner() {
    const s = this.state!;
    return { eyebrow: 'สำเร็จการเดินทาง', title: 'ประตูรอยแยกปิดลงแล้ว', detail: `เดิน ${s.steps} ก้าว · ชนะ ${s.wins} ศึก · แพ้ ${s.defeats} ครั้ง` };
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
      this.banner = { eyebrow: result.event.kind === 'boss' ? 'บอส' : result.event.kind === 'tutorial' ? 'ศึกแรก' : 'พบศัตรู!', title: data.name, detail: data.enemies.map(e => e.displayName ?? e.name).join(' · ') };
      this.renderWorld();
      setTimeout(() => { this.banner = undefined; this.openBattle(); }, this.reducedMotion.matches ? 250 : 750);
      return;
    }
    this.renderWorld();
  }
  private rest(): void {
    if (!this.state) return;
    const result = rest(this.state, this.map, this.lookup);
    if (result.event.type !== 'rested') return;
    this.state = result.state; this.persist();
    this.message = 'พักที่แคมป์แล้ว · ทุกคนเลือดเต็ม ชุบคนที่ล้ม และบันทึกแคมป์นี้เป็นจุดกลับเมื่อแพ้';
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
      this.message = result.event.type === 'victory'
        ? kind === 'boss' ? 'ผู้คุมรอยแยกล้มแล้ว · ทางไปประตูเปิดออก' : `ชนะศึก · เดินทางต่อด้วยเลือดที่เหลือ${fallen ? ` (${fallen} คนล้มอยู่ ต้องพักที่แคมป์)` : ''}`
        : kind === 'tutorial' ? 'ลองศึกสอนอีกครั้งด้วยเลือดเต็ม' : 'ทีมถอยกลับมาฟื้นตัว · เลือดเต็มแล้ว';
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
