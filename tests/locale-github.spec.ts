import { test, expect } from '@playwright/test';

const sampleId = 'trivia-science-nature-starter-en';
const locales = ['en', 'de', 'es', 'pt', 'ar', 'fa', 'tr', 'ms', 'th', 'vi', 'zh-Hans', 'ja'] as const;

for (const viewport of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`GitHub link is accessible and safe in ${viewport.name} layout`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto('/?lang=de');
    const link = page.getByRole('link', { name: 'Quellcode auf GitHub ansehen', exact: true });
    await expect(link).toHaveAttribute('href', 'https://github.com/sdkks/flashcards_game');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await link.focus();
    await expect(link).toBeFocused();
    await expect(link).toHaveCSS('outline-style', 'solid');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('stored non-English locale synchronizes the URL while an explicit locale wins', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('flashcards_locale', 'de'));
  await page.goto('/?keep=1');
  await expect(page.locator('h1')).toHaveText('Lernkarten');
  expect(new URL(page.url()).searchParams.get('lang')).toBe('de');
  expect(new URL(page.url()).searchParams.get('keep')).toBe('1');
  await page.goto('/?lang=es&keep=1');
  await expect(page.locator('h1')).toHaveText('Tarjetas didácticas');
  expect(new URL(page.url()).searchParams.get('lang')).toBe('es');
  await page.goto('/?lang=toString&keep=1');
  await expect(page.locator('h1')).toHaveText('Lernkarten');
  expect(new URL(page.url()).searchParams.get('lang')).toBe('de');
});

test('sample-game and external cards deeplinks retain locale and unrelated parameters', async ({ page }) => {
  await page.goto('/?lang=de&keep=1');
  await page.evaluate(async id => {
    const { findSampleGameById, setSampleGameParam } = await import('/flashcards_game/src/utils/sample-games.ts');
    const game = findSampleGameById(id);
    if (!game) throw new Error(`Missing sample game: ${id}`);
    setSampleGameParam(game);
  }, sampleId);

  expect(new URL(page.url()).searchParams.get('lang')).toBe('de');
  expect(new URL(page.url()).searchParams.get('sample_game')).toBe(sampleId);
  expect(new URL(page.url()).searchParams.get('keep')).toBe('1');

  await page.goto(`/?lang=de&sample_game=${sampleId}&keep=1`);
  await expect(page.locator('#loaded-deck-heading')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('lang')).toBe('de');
  expect(new URL(page.url()).searchParams.get('sample_game')).toBe(sampleId);
  expect(new URL(page.url()).searchParams.get('keep')).toBe('1');

  const remote = 'https://cards.example.test/cards.csv';
  await page.route(remote, route => route.fulfill({ contentType: 'text/csv', body: 'question,answer\nQuestion,Answer' }));
  await page.goto(`/?lang=es&cards=${encodeURIComponent(remote)}&keep=1`);
  await expect(page.locator('#loaded-deck-heading')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('lang')).toBe('es');
  expect(new URL(page.url()).searchParams.get('cards')).toBe(remote);
  expect(new URL(page.url()).searchParams.get('keep')).toBe('1');
});

test('language picker changes the stored locale and deeplink', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.getByRole('button', { name: 'Language', exact: true }).click();
  await page.getByText('Deutsch', { exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Lernkarten');
  expect(new URL(page.url()).searchParams.get('lang')).toBe('de');
  expect(await page.evaluate(() => localStorage.getItem('flashcards_locale'))).toBe('de');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
});

test('all supported locales provide a localized GitHub accessible label', async ({ page }) => {
  for (const locale of locales) {
    await page.goto(`/?lang=${locale}`);
    const link = page.locator('.header__btn--github');
    const label = await link.getAttribute('aria-label');
    expect(label, locale).toBeTruthy();
    expect(await link.getAttribute('title'), locale).toBe(label);
  }
});
