import { test, expect, type Page } from '@playwright/test';
import { selectDeck, confirmSwitch } from './deck-browser.helpers';

const sampleId = 'Spanish-to-English-Common-Terms';
const sampleName = 'Spanish to English — 300 Common Terms';

async function addCard(page: Page) {
  await page.getByText('Add card', { exact: true }).click();
  await page.getByPlaceholder('Question', { exact: true }).fill('Test question');
  await page.getByPlaceholder('Answer', { exact: true }).fill('Test answer');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
}

async function chooseSample(page: Page) {
  await selectDeck(page, sampleName);
}

test.describe('Deck entry and session readiness', () => {
  test('fresh entry offers a sample journey ending with truthful deck and session context', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Choose a deck to start' })).toBeVisible();
    await expect(page.locator('.error-message')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add your own cards' })).toBeVisible();
    await page.getByRole('button', { name: 'Browse sample decks' }).click();
    await chooseSample(page);
    await expect(page.getByRole('heading', { name: `Sample: ${sampleName}`, exact: true })).toBeVisible();
    await expect(page.getByText('Cards available: 301', { exact: true })).toBeVisible();
    await expect(page.locator('.session-summary')).toHaveText('Next session · Cards: 50 · Time limit: 15:00');
    await expect(page.getByRole('heading', { name: 'Choose a deck to start' })).toHaveCount(0);
    await expect(page.locator('.error-message')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Flip' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Type' })).toBeVisible();
  });

  test('first manual card replaces the neutral empty state without a stale error', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add your own cards' }).click();
    await addCard(page);
    await expect(page.getByRole('heading', { name: 'Current cards', exact: true })).toBeVisible();
    await expect(page.getByText('Cards available: 1', { exact: true })).toBeVisible();
    await expect(page.locator('.session-summary')).toHaveText('Next session · Cards: 1 · Time limit: 15:00');
    await expect(page.locator('.error-message')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Choose a deck to start' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Flip' }).click();
    await expect(page.locator('.card-counter')).toHaveText('1 / 1');
  });

  test('summary follows settings immediately and matches the started session', async ({ page }) => {
    await page.goto(`/?sample_game=${sampleId}`);
    await expect(page.locator('.session-summary')).toContainText('Cards: 50');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByLabel('Cards per game').fill('3');
    await page.getByLabel('Cards per game').press('Tab');
    await page.getByLabel('Timer (minutes)').fill('0.5');
    await page.getByLabel('Timer (minutes)').press('Tab');
    await expect(page.locator('.session-summary')).toHaveText('Next session · Cards: 3 · Time limit: 0:30');
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    await page.getByRole('button', { name: 'Type' }).click();
    await expect(page.locator('.card-counter')).toHaveText('1 / 3');
    await expect(page.locator('.game-timer')).toHaveText('0:30');
    await page.reload();
    await expect(page.locator('.session-summary')).toHaveText('Next session · Cards: 3 · Time limit: 0:30');
  });

  test('edited sample and saved cards do not claim unverified provenance', async ({ page }) => {
    await page.goto(`/?sample_game=${sampleId}`);
    await expect(page.getByRole('heading', { name: `Sample: ${sampleName}`, exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await addCard(page);
    await expect(page.getByRole('heading', { name: 'Current cards', exact: true })).toBeVisible();
    // Existing storage deduplicates the sample's repeated keys when cards are merged.
    await expect(page.getByText('Cards available: 300', { exact: true })).toBeVisible();
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Current cards', exact: true })).toBeVisible();
    await expect(page.getByText('Cards available: 300', { exact: true })).toBeVisible();
  });

  test('genuine load errors survive manual addition and clear on successful sample recovery', async ({ page }) => {
    const url = 'https://cards.example.test/unavailable.csv';
    await page.route(url, route => route.fulfill({ status: 404 }));
    await page.goto(`/?cards=${encodeURIComponent(url)}`);
    await expect(page.locator('.error-message')).toContainText('404');
    await page.getByRole('button', { name: 'Add your own cards' }).click();
    await addCard(page);
    await expect(page.locator('.error-message')).toContainText('404');
    await expect(page.getByRole('heading', { name: 'Current cards', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Sample Games', exact: true }).click();
    await chooseSample(page);
    await confirmSwitch(page);
    await expect(page.locator('.error-message')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: `Sample: ${sampleName}`, exact: true })).toBeVisible();
  });

  test('failed sample reload does not label saved cards as the requested sample', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Add your own cards' }).click();
    await addCard(page);
    await page.route(`**/sample_games/${sampleId}.csv`, route => route.fulfill({ status: 500 }));
    await page.goto(`/?sample_game=${sampleId}`);
    await expect(page.locator('.error-message')).toContainText('HTTP 500');
    await expect(page.getByRole('heading', { name: 'Current cards', exact: true })).toBeVisible();
    await expect(page.getByText('Cards available: 1', { exact: true })).toBeVisible();
  });

  test('linked cards show source type without exposing the URL and cap the session to available cards', async ({ page }) => {
    const url = 'https://cards.example.test/deck.csv?token=private-test-value';
    await page.route(url, route => route.fulfill({ contentType: 'text/csv', body: 'question,answer\none,uno\ntwo,dos' }));
    await page.goto(`/?cards=${encodeURIComponent(url)}`);
    await expect(page.getByRole('heading', { name: 'Cards loaded from link', exact: true })).toBeVisible();
    await expect(page.locator('.session-summary')).toHaveText('Next session · Cards: 2 · Time limit: 15:00');
    await expect(page.locator('main')).not.toContainText('private-test-value');
    await expect(page.locator('main')).not.toContainText('cards.example.test');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Current cards', exact: true })).toBeVisible();
  });
});
