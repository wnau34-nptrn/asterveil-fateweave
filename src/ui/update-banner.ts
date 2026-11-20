// The notice that a newer game version is live: a slim glass bar at the top of the frame, never over a dialog's content,
// with "refresh" and "later". "Later" hides it until the next build is published (kept for this tab only). The game
// saves every committed command at once, so a refresh loses nothing.
const KEY = 'asterveil.fateweave.update-later.v1';
export class UpdateBanner {
  private readonly el: HTMLElement;
  constructor(parent: HTMLElement, private readonly reload: () => void = () => location.reload()) {
    this.el = document.createElement('section'); this.el.id = 'update-banner'; this.el.hidden = true; this.el.setAttribute('role', 'status'); parent.append(this.el);
    this.el.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-update]'); if (!b) return;
      if (b.dataset.update === 'now') { this.reload(); return; }
      try { sessionStorage.setItem(KEY, this.el.dataset.build ?? ''); } catch { /* this page only */ }
      this.el.hidden = true;
    });
  }
  show(build: string): void {
    try { if (sessionStorage.getItem(KEY) === build) return; } catch { /* shown */ }
    this.el.dataset.build = build;
    this.el.innerHTML = '<p><b>มีเวอร์ชันใหม่พร้อมแล้ว</b><span>รีเฟรชเพื่ออัปเดต · เซฟไว้แล้ว</span></p>'
      + '<div><button type="button" class="primary" id="update-now" data-update="now">รีเฟรช</button><button type="button" class="secondary" id="update-later" data-update="later">ภายหลัง</button></div>';
    this.el.hidden = false;
  }
}
