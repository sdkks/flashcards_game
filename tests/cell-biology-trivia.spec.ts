import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';
const id = 'trivia-cell-biology-essentials-en';
const name = 'Cell Biology Essentials — English (18)';
const csv = readFileSync(`public/sample_games/${id}.csv`, 'utf8');
const cards = parseCsv(csv, '|');
test('Cell Biology direct URL loads only its leaf CSV and reaches the ready screen', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.csv')) requests.push(request.url()); });
  await page.goto(`/?sample_game=${id}`);
  await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${name}`);
  await expect(page.getByText('Cards available: 18', { exact: true })).toBeVisible();
  await expect(page.locator('.game-timer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Flip', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Type', exact: true })).toBeEnabled();
  expect(requests).toEqual([expect.stringContaining(`/sample_games/${id}.csv`)]);
});

test('Cell Biology representative Flip and Type cards use the authored canonical answers', async ({ page }) => {
  await page.goto(`/?sample_game=${id}`);
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  const flipQuestion = await page.locator('.flashcard__front .flashcard__content').innerText();
  const flipCard = cards.find(candidate => candidate.key === flipQuestion);
  expect(flipCard).toBeDefined();
  await page.locator('.flashcard').click();
  await expect(page.locator('.flashcard__back .flashcard__content')).toHaveText(flipCard!.value);
  await page.goto(`/?sample_game=${id}`);
  await page.getByRole('button', { name: 'Type', exact: true }).click();
  const question = await page.locator('.quiz-card__question .flashcard__content').innerText();
  const card = cards.find(candidate => candidate.key === question);
  expect(card).toBeDefined();
  await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(`  ${card!.value.toUpperCase()}  `);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.locator('.quiz-card__feedback--correct')).toBeVisible();
  await expect(page.locator('.quiz-card__comparison').last()).toHaveText(`Expected answer: ${card!.value}`);
});
