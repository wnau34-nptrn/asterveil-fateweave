// Shared navigation for expandable in-game information and preference panels.
export function infoTabs(prefix: string, history = false, status = false, loot = false): string {
  const initial = status ? 'status' : 'guide';
  return `<div class="info-tabs" role="tablist" aria-label="ข้อมูลและการตั้งค่า">${[
    ...(status ? [['status', 'สถานะ']] : []),
    ['guide', 'คำแนะนำ'], ['settings', 'ตั้งค่า'], ...(loot?[['loot','แหล่งอุปกรณ์']]:[]), ...(history ? [['history', 'บันทึก']] : []),
  ].map(([id, label]) => `<button id="${prefix}-tab-${id}" type="button" role="tab" aria-controls="${prefix}-panel-${id}" aria-selected="${id === initial}" tabindex="${id === initial ? 0 : -1}">${label}</button>`).join('')}</div>`;
}

export function selectInfoTab(tab: HTMLButtonElement): void {
  const list = tab.closest('[role=tablist]')!;
  list.querySelectorAll<HTMLButtonElement>('[role=tab]').forEach(button => {
    const active = button === tab;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    tab.closest('dialog')!.querySelector<HTMLElement>(`#${button.getAttribute('aria-controls')}`)!.hidden = !active;
  });
}

export function bindInfoTabs(root: HTMLElement): void {
  root.addEventListener('click', e => {
    const tab = (e.target as HTMLElement).closest<HTMLButtonElement>('.info-tabs [role=tab]');
    if (tab) selectInfoTab(tab);
  });
  root.addEventListener('keydown', e => {
    const tab = (e.target as HTMLElement).closest<HTMLButtonElement>('.info-tabs [role=tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = [...tab.parentElement!.querySelectorAll<HTMLButtonElement>('[role=tab]')];
    const index = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    e.preventDefault();
    const next = tabs[index]!; selectInfoTab(next); next.focus();
  });
}
