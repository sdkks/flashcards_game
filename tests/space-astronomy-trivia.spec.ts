import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';

const id = 'trivia-space-astronomy-essentials-en';
const name = 'Space & Astronomy Essentials — English (25)';
const cards = parseCsv(readFileSync(`public/sample_games/${id}.csv`, 'utf8'), '|');

test('space deck is a 25-card parser-valid registered sample', async ({ page }) => {
  expect(cards).toHaveLength(25);
  expect(cards.every(card => card.key.length > 0 && card.value.length > 0)).toBe(true);
  expect(cards.every(card => !card.key.includes('|') && !card.value.includes('|'))).toBe(true);

  await page.goto('/');
  const registry = await page.evaluate(async () => {
    const { findSampleGameById } = await import('/flashcards_game/src/utils/sample-games.ts');
    return findSampleGameById('trivia-space-astronomy-essentials-en');
  });
  expect(registry).toEqual({
    id,
    name,
    categoryPath: ['trivia', 'science-nature', 'space'],
    language: 'en',
    lucky: 'default',
    separator: '|',
  });
});

test('space deck direct URL supports Flip and Type representative cards', async ({ page }) => {
  await page.goto(`/?sample_game=${id}`);
  await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${name}`);

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
  await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(typeCard!.value);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.locator('.quiz-card__feedback--correct')).toBeVisible();
});
