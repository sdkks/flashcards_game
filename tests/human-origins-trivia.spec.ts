import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';

const id = 'trivia-human-origins-starter-en';
const name = 'Human Origins: A Starter Round — English (18)';
const csv = readFileSync(`public/sample_games/${id}.csv`, 'utf8');
const cards = parseCsv(csv, '|');
test('Human Origins direct URL and History → Prehistory leaf preserve Flip and Type behavior', async ({ page }) => {
  await page.goto(`/?sample_game=${id}`);
  await expect(page.getByText('Cards available: 18', { exact: true })).toBeVisible();
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

test('Human Origins History → Prehistory leaf loads the registered deck', async ({ page }) => {
  await page.goto('/');
  for (const category of ['Trivia', 'Trivia / History', 'Trivia / History / Prehistory']) {
    await page.getByRole('button', { name: `Show decks: ${category}`, exact: true }).click();
  }
  await page.locator('#sample-search').fill(name);
  await page.getByRole('button', { name, exact: false }).click();
  await expect(page).toHaveURL(new RegExp(`sample_game=${id}`));
  await expect(page.getByText('Cards available: 18', { exact: true })).toBeVisible();
});
