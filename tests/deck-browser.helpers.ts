import { expect, type Page } from '@playwright/test';

export async function openBrowser(page: Page) {
  if (!await page.locator('#sample-search').isVisible()) {
    await page.locator('#sample-games-button').click();
  }
  await expect(page.locator('#sample-search')).toBeVisible();
}

export async function selectDeck(page: Page, name: string) {
  await openBrowser(page);
  await page.locator('#sample-search').fill(name);
  await page.getByRole('button', { name, exact: false }).click();
}

export async function confirmSwitch(page: Page) {
  const confirmation = page.getByRole('dialog', { name: 'Replace current cards?', exact: true });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Switch deck', exact: true }).click();
}
