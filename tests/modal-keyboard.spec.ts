import { test, expect, type Locator, type Page } from '@playwright/test';

const sampleName = 'Spanish to English — 300 Common Terms';

async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 35; i++) {
    if (await target.evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

async function expectModal(page: Page, dialog: Locator) {
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveJSProperty('open', true);
  expect(await dialog.evaluate(element => element.matches(':modal'))).toBe(true);
  // Even a direct focus attempt must not reach the obscured page.
  await page.locator('header button').first().evaluate(element => element.focus());
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press(key);
      // Native dialogs can move focus to browser chrome, but never to background controls.
      expect(await dialog.evaluate(element =>
        document.activeElement === document.body || element.contains(document.activeElement)
      )).toBe(true);
    }
  }
}

test.describe('Keyboard modal journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });
  test('search, select and load a sample with only the keyboard', async ({ page }) => {
    await page.goto('/');
    const opener = page.getByRole('button', { name: 'Browse sample decks', exact: true });
    await tabTo(page, opener);
    await page.keyboard.press('Enter');
    const search = page.getByRole('searchbox', { name: 'Search sample decks' });
    await expect(page.getByRole('heading', { name: 'Decks', exact: true })).toBeFocused();
    await tabTo(page, search);
    await page.keyboard.type('Spanish');
    const deck = page.getByRole('button', { name: sampleName });
    await tabTo(page, deck);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: `Sample: ${sampleName}` })).toBeVisible();
    // Successful loads focus the new ready deck after modal cleanup.
    await expect(page.locator('#loaded-deck-heading')).toBeFocused();
  });

  test('sample modal contains focus and Escape restores its opener', async ({ page }) => {
    await page.goto('/');
    const opener = page.getByRole('button', { name: 'Sample Games', exact: true });
    await tabTo(page, opener);
    await page.keyboard.press('Enter');
    await expectModal(page, page.getByRole('dialog', { name: 'Decks', exact: true }));
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(opener).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Decks', exact: true })).toBeFocused();
    await tabTo(page, page.getByRole('button', { name: 'Close browser', exact: true }));
    await page.keyboard.press('Enter');
    await expect(opener).toBeFocused();
  });

  test('disclosures and scope use native keyboard controls; filtering restores expansion', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sample Games', exact: true }).click();
    const disclosure = page.getByRole('button', { name: 'Show decks: Trivia', exact: true });
    await tabTo(page, disclosure);
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Hide decks: Trivia', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Trivia', exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Trivia', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const search = page.getByRole('searchbox', { name: 'Search sample decks' });
    await tabTo(page, search);
    await page.keyboard.type('no such deck');
    await expect(page.locator('.catalog__deck')).toHaveCount(0);
    await expect(page.getByText('No matching decks')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Lucky: Trivia and subcategories' })).toBeVisible();
    await tabTo(page, page.getByRole('button', { name: 'Clear search' }));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Hide decks: Trivia', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('failed sample load remains an accessible modal with a retry action', async ({ page }) => {
    await page.route('**/sample_games/Spanish-to-English-Common-Terms.csv', route => route.fulfill({ status: 500 }));
    await page.goto('/');
    const opener = page.getByRole('button', { name: 'Browse sample decks' });
    await opener.click();
    await page.locator('#sample-search').fill('Spanish');
    await page.getByRole('button', { name: sampleName }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeEnabled();
    await expectModal(page, page.getByRole('dialog', { name: 'Decks', exact: true }));
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
  });

  test('settings and nested export keep the correct layer modal and restore focus', async ({ page }) => {
    await page.goto('/');
    const opener = page.getByRole('button', { name: 'Settings', exact: true });
    await tabTo(page, opener);
    await page.keyboard.press('Enter');
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
    await expect(page.getByRole('button', { name: 'Close settings' })).toBeFocused();
    await expectModal(page, settings);
    const exportButton = settings.getByRole('button', { name: 'Export', exact: true });
    await tabTo(page, exportButton);
    await page.keyboard.press('Enter');
    const exported = page.getByRole('dialog', { name: 'Export Dictionary' });
    await expect(exported.getByRole('combobox', { name: 'Format' })).toBeFocused();
    await expectModal(page, exported);
    await page.locator('#card-count').evaluate(element => element.focus());
    expect(await exported.evaluate(element => element.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(exported).toHaveCount(0);
    await expect(settings).toBeVisible();
    await expect(exportButton).toBeFocused();
    await page.keyboard.press('Enter');
    await tabTo(page, page.getByRole('button', { name: 'Cancel', exact: true }));
    await page.keyboard.press('Enter');
    await expect(exportButton).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(settings).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test('settings returns to its header action when adding a card removes the entry opener', async ({ page }) => {
    await page.goto('/');
    const opener = page.getByRole('button', { name: 'Add your own cards' });
    await tabTo(page, opener);
    await page.keyboard.press('Enter');
    await tabTo(page, page.locator('summary').filter({ hasText: 'Add card' }));
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('textbox', { name: 'Question', exact: true })).toBeFocused();
    await page.keyboard.type('Question');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Answer');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(opener).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
  });

  test('settings controls and export selects have accessible labels; download restores focus', async ({ page }) => {
    await page.goto('/?sample_game=Spanish-to-English-Common-Terms');
    await expect(page.getByRole('heading', { name: `Sample: ${sampleName}` })).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByLabel('Separator', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Cards per game')).toBeVisible();
    await expect(page.getByLabel('Timer (minutes)')).toBeVisible();
    await page.getByText('Upload CSV', { exact: true }).click();
    await expect(page.getByLabel('Upload CSV', { exact: true })).toBeVisible();
    await page.getByText('Add by link', { exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Add by link' })).toBeVisible();
    await page.getByText('Add card', { exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Question', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Answer', exact: true })).toBeVisible();
    const exportButton = page.getByRole('button', { name: 'Export', exact: true });
    await exportButton.click();
    const dialog = page.getByRole('dialog', { name: 'Export Dictionary' });
    await expect(dialog.getByRole('combobox', { name: 'Separator' })).toBeVisible();
    await dialog.getByRole('combobox', { name: 'Format' }).selectOption('json');
    await expect(dialog.getByRole('combobox', { name: 'Separator' })).toHaveCount(0);
    const downloadPromise = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Download' }).click();
    expect((await downloadPromise).suggestedFilename()).toMatch(/\.json$/);
    await expect(dialog).toHaveCount(0);
    await expect(exportButton).toBeFocused();
  });

  test('backdrop clicks dismiss only the top modal, while inside clicks do not', async ({ page }) => {
    await page.goto('/');
    const sampleButton = page.getByRole('button', { name: 'Sample Games', exact: true });
    await sampleButton.click();
    await page.getByRole('heading', { name: 'Decks', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Decks', exact: true })).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(sampleButton).toBeFocused();
    const settingsButton = page.getByRole('button', { name: 'Settings', exact: true });
    await settingsButton.click();
    const exportButton = page.getByRole('button', { name: 'Export', exact: true });
    await exportButton.click();
    await page.mouse.click(5, 5);
    await expect(page.getByRole('dialog', { name: 'Export Dictionary' })).toHaveCount(0);
    await expect(exportButton).toBeFocused();
    await page.mouse.click(5, 5);
    await expect(settingsButton).toBeFocused();
  });

  test('modal controls remain within a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Sample Games', exact: true }).click();
    for (const selector of ['.sample-dialog', '.sample-dialog__header', '.sample-dialog__body']) {
      const rect = await page.locator(selector).boundingBox();
      expect(rect).not.toBeNull();
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(320);
    }
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const rect = await page.getByRole('dialog', { name: 'Export Dictionary' }).boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(320);
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
  });
});
