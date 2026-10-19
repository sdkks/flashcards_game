import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';

const id = 'trivia-medieval-castles-tournaments-en';
const name = 'Medieval Castles and Tournaments — English (17)';
const csv = readFileSync(`public/sample_games/${id}.csv`, 'utf8');
const cards = parseCsv(csv, '|');
test('Medieval Castles direct URL loads its leaf CSV and supports Flip and Type', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.csv')) requests.push(request.url()); });
  await page.goto(`/?sample_game=${id}`);
  await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${name}`);
  await expect(page.getByText('Cards available: 17', { exact: true })).toBeVisible();
  expect(requests).toEqual([expect.stringContaining(`/sample_games/${id}.csv`)]);

  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  const flipQuestion = await page.locator('.flashcard__front .flashcard__content').innerText();
  const flipCard = cards.find(card => card.key === flipQuestion);
  expect(flipCard).toBeDefined();
  await page.locator('.flashcard').click();
  await expect(page.locator('.flashcard__back .flashcard__content')).toHaveText(flipCard!.value);

  await page.goto(`/?sample_game=${id}`);
  await page.getByRole('button', { name: 'Type', exact: true }).click();
  const typeQuestion = await page.locator('.quiz-card__question .flashcard__content').innerText();
  const typeCard = cards.find(card => card.key === typeQuestion);
  expect(typeCard).toBeDefined();
  await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(`  ${typeCard!.value.toUpperCase()}  `);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.locator('.quiz-card__feedback--correct')).toBeVisible();
});

test('Trivia → History → Medieval castles leaf loads the registered deck', async ({ page }) => {
  await page.goto('/');
  for (const category of ['Trivia', 'Trivia / History', 'Trivia / History / Medieval castles']) {
    await page.getByRole('button', { name: `Show decks: ${category}`, exact: true }).click();
  }
  await page.getByRole('button', { name, exact: false }).click();
  await expect(page).toHaveURL(new RegExp(`sample_game=${id}`));
  await expect(page.getByText('Cards available: 17', { exact: true })).toBeVisible();
});
