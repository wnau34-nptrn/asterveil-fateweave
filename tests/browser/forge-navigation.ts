import type { Page } from '@playwright/test';

// The pilot keeps the other forge operations in an explicit disclosure.
export async function openForgeTools(page:Page):Promise<void> {
  const menu=page.locator('.forge-other');
  if(await menu.count()&&!await menu.evaluate(el=>(el as HTMLDetailsElement).open))await menu.locator('summary').first().click();
}
