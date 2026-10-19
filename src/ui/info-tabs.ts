// Shared navigation for expandable in-game information and preference panels.
export function infoTabs(prefix: string, history = false): string {
  return `<div class="info-tabs" role="tablist" aria-label="ข้อมูลและการตั้งค่า">${[
    ['guide', 'คำแนะนำ'], ['settings', 'ตั้งค่า'], ...(history ? [['history', 'บันทึก']] : []),
  ].map(([id, label]) => `<button id="${prefix}-tab-${id}" type="button" role="tab" aria-controls="${prefix}-panel-${id}" aria-selected="${id === 'guide'}" tabindex="${id === 'guide' ? 0 : -1}">${label}</button>`).join('')}</div>`;
}

export function bindInfoTabs(root: HTMLElement): void {
  const select = (tab: HTMLButtonElement) => {
    const list = tab.closest('[role=tablist]')!;
    list.querySelectorAll<HTMLButtonElement>('[role=tab]').forEach(button => {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      root.querySelector<HTMLElement>(`#${button.getAttribute('aria-controls')}`)!.hidden = !active;
    });
  };
  root.addEventListener('click', e => {
    const tab = (e.target as HTMLElement).closest<HTMLButtonElement>('.info-tabs [role=tab]');
    if (tab) select(tab);
  });
  root.addEventListener('keydown', e => {
    const tab = (e.target as HTMLElement).closest<HTMLButtonElement>('.info-tabs [role=tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const tabs = [...tab.parentElement!.querySelectorAll<HTMLButtonElement>('[role=tab]')];
    const index = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (tabs.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    e.preventDefault();
    const next = tabs[index]!; select(next); next.focus();
  });
}
