import { test, expect, type Page } from '@playwright/test';

async function expectFooterWithoutDonations(page: Page) {
  const footer = page.getByRole('contentinfo');
  const feedback = footer.getByRole('link', { name: 'Feedback / Report Site Issues' });
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute('href', 'https://forms.gle/KdhAgazLmXxnD6nw7');
  await expect(feedback).toHaveAttribute('target', '_blank');
  await expect(feedback).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(footer.locator('.disclaimer')).toBeVisible();
  await expect(footer.locator('.disclaimer')).toContainText('Disclaimer: This is a frontend-only application.');
  await expect(page.locator('a[href*="ko-fi.com"], a[href*="buymeacoffee.com"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /buy me a coffee|ko-fi/i })).toHaveCount(0);
  await expect(page.locator('img[src*="kofi"], img[alt*="coffee" i], img[alt*="ko-fi" i]')).toHaveCount(0);
  await expect(page.getByText('Please support my work', { exact: true })).toHaveCount(0);
}

for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 844 }]) {
  test(`footer retains feedback without donation UI at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto('./');
    await expect(page.getByRole('heading', { name: 'Choose a deck to start' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Browse sample decks' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Add your own cards' })).toBeEnabled();
    await expectFooterWithoutDonations(page);
    const capture = async (state: string) => {
      const path = testInfo.outputPath(`footer-${viewport.width}-${state}.png`);
      await page.screenshot({ path, fullPage: true });
      await testInfo.attach(state, { path, contentType: 'image/png' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    };
    await capture('empty');

    await page.goto('./?sample_game=Malay-to-English-Darjah-6-Vocabulary-Quiz');
    await expect(page.getByRole('button', { name: 'Flip', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Type', exact: true })).toBeEnabled();
    await expectFooterWithoutDonations(page);
    await capture('loaded');
    await page.getByRole('button', { name: 'Flip', exact: true }).click();
    await expect(page.locator('.card-counter')).toContainText('1 /');
    await page.locator('.flashcard').click();
    await expect(page.locator('.flashcard')).toHaveClass(/flashcard--flipped/);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.locator('.card-counter')).toContainText('2 /');
    await expectFooterWithoutDonations(page);
  });
}
