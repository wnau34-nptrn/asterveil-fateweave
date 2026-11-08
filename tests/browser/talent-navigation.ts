import type {Page} from '@playwright/test';
// Native skill details trap focus; close them before returning to the tree/tab/member picker.
export async function closeTalentDetails(page:Page):Promise<void>{
  const popup=page.locator('dialog.talent-detail-dialog[open]');
  if(await popup.count())await popup.locator('[data-world=talent-detail-close]').click();
}
