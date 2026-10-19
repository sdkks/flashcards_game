import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';

const id = 'trivia-greek-underworld-afterlife-en';
const name = 'Greek Underworld & Afterlife — English (18)';
const csv = readFileSync(`public/sample_games/${id}.csv`, 'utf8');
const cards = parseCsv(csv, '|');
test('Greek Underworld leaf appears under Mythology without changing direct loading', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Show decks: Trivia', exact: true }).click();
  await page.getByRole('button', { name: 'Show decks: Trivia / Mythology', exact: true }).click();
  await expect(page.getByRole('button', { name, exact: false })).toBeVisible();
  await page.getByRole('button', { name, exact: false }).click();
  await expect(page).toHaveURL(new RegExp(`sample_game=${id}`));
  await expect(page.locator('#loaded-deck-heading')).toBeFocused();
  await expect(page.getByText('Cards available: 18', { exact: true })).toBeVisible();
});

test('Greek Underworld representative Flip reveals the canonical answer', async ({ page }) => {
  await page.goto(`/?sample_game=${id}`);
  await expect(page.getByText('Cards available: 18', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  const question = await page.locator('.flashcard__front .flashcard__content').innerText();
  const card = cards.find(candidate => candidate.key === question);
  expect(card).toBeDefined();
  await page.locator('.flashcard').click();
  await expect(page.locator('.flashcard__back .flashcard__content')).toHaveText(card!.value);
  await expect(page.getByRole('button', { name: 'Correct', exact: true })).toBeEnabled();
});

test('Greek Underworld representative Type checks the canonical answer', async ({ page }) => {
  await page.goto(`/?sample_game=${id}`);
  await page.getByRole('button', { name: 'Type', exact: true }).click();
  const question = await page.locator('.quiz-card__question .flashcard__content').innerText();
  const card = cards.find(candidate => candidate.key === question);
  expect(card).toBeDefined();
  await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(card!.value);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.locator('.quiz-card__feedback--correct')).toBeVisible();
  await expect(page.locator('.quiz-card__comparison').last()).toHaveText(`Expected answer: ${card!.value}`);
});
