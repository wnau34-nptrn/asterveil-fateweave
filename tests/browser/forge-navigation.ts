import type { Page } from '@playwright/test';

// Follow the visible task launcher while keeping the selected item.
export async function openForgeTools(page:Page):Promise<void> {
  const button=page.locator('#forge-open-tasks');
  if(await button.count())await button.click();
}
export async function chooseForgeTask(page:Page,task:string):Promise<void>{await openForgeTools(page);await page.locator(`[data-forge=task][data-task="${task}"]`).click();}
