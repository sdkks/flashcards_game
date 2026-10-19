import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';

const id = 'trivia-food-ingredients-en';
const name = 'Food: Ingredients and Kitchen Basics — English (8)';
const csv = readFileSync(`public/sample_games/${id}.csv`, 'utf8');
const cards = parseCsv(csv, '|');
test('Food category loads all eight cards; every Flip answer reveals and self-scores', async ({ page }, testInfo) => {
  await page.goto('/');
  for (const category of ['Trivia', 'Trivia / Food']) {
    await page.getByRole('button', { name: `Show decks: ${category}`, exact: true }).click();
  }
  await page.getByRole('button', { name: `${name} English content`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`sample_game=${id}`));
  await expect(page.locator('#loaded-deck-heading')).toBeFocused();
  await expect(page.getByText('Cards available: 8', { exact: true })).toBeVisible();
  await expect(page.locator('.game-timer')).toHaveCount(0);
  await testInfo.attach('food-ready', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  const seen = new Set<string>();
  for (let index = 0; index < 8; index++) {
    await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 8`);
    const question = await page.locator('.flashcard__front .flashcard__content').innerText();
    const card = cards.find(card => card.key === question);
    if (!card) throw new Error(`Unexpected Food question: ${question}`);
    expect(seen.has(question)).toBe(false);
    seen.add(question);
    await page.locator('.flashcard').click();
    await expect(page.locator('.flashcard__back .flashcard__content')).toHaveText(card.value);
    await page.getByRole('button', { name: index % 2 ? 'Wrong' : 'Correct', exact: true }).click();
  }
  expect(seen.size).toBe(8);
  await expect(page.getByRole('heading', { name: 'Your self-rated results' })).toBeVisible();
  await expect(page.getByText('Rated 8 of 8', { exact: true })).toBeVisible();
  await expect(page.getByText('Correct: 4', { exact: true })).toBeVisible();
  await expect(page.getByText('Wrong: 4', { exact: true })).toBeVisible();
  await testInfo.attach('food-flip-complete', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

for (const variant of ['canonical', 'trim-case', 'no-aliases', 'exact-spelling']) {
  test(`food direct link: all eight Type cards with ${variant}`, async ({ page }, testInfo) => {
    await page.goto(`/?sample_game=${id}`);
    await expect(page.getByText('Cards available: 8', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    const rejected: Record<string, string> = variant === 'no-aliases'
      ? { Avocado: 'Avocados', Chickpeas: 'Garbanzo beans', Orecchiette: 'Little ears', 'Carbon dioxide': 'CO2', Deer: 'Venison', Almonds: 'Almond', Soybeans: 'Soy milk', Turmeric: 'Curcumin' }
      : variant === 'exact-spelling'
        ? { Chickpeas: 'Chickpea', Orecchiette: 'Orecchiete', 'Carbon dioxide': 'Carbon  dioxide', Soybeans: 'Soybean' } : {};
    const seen = new Set<string>();
    for (let index = 0; index < 8; index++) {
      await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 8`);
      const question = await page.locator('.quiz-card__question .flashcard__content').innerText();
      const card = cards.find(card => card.key === question);
      if (!card) throw new Error(`Unexpected Food question: ${question}`);
      expect(seen.has(question)).toBe(false);
      seen.add(question);
      const wrong = rejected[card.value];
      await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(wrong || (variant === 'trim-case' ? `  ${card.value.toUpperCase()}  ` : card.value));
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      await expect(page.locator(`.quiz-card__feedback--${wrong ? 'incorrect' : 'correct'}`)).toBeVisible();
      await expect(page.locator('.quiz-card__comparison').last()).toHaveText(`Expected answer: ${card.value}`);
      // Submission does not advance: the player explicitly continues after feedback.
      await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 8`);
      if (card.value === 'Orecchiette') await testInfo.attach(`food-pasta-${variant}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      await page.getByRole('button', { name: index === 7 ? 'See results' : 'Next card', exact: true }).click();
    }
    expect(seen.size).toBe(8);
  });
}

for (const scope of ['General', 'Food', 'Trivia']) {
  test(`food ${scope} Lucky loads exactly one whole CSV and waits for mode choice`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', request => { if (request.url().endsWith('.csv')) requests.push(request.url()); });
    await page.goto('/');
    if (scope !== 'General') {
      if (scope === 'Food') await page.getByRole('button', { name: 'Show decks: Trivia', exact: true }).click();
      await page.getByRole('button', { name: scope, exact: true }).click();
    }
    await expect(page.getByText(`Eligible decks: ${scope === 'Food' ? 1 : scope === 'Trivia' ? 155 : 24}`, { exact: true })).toBeVisible();
    await page.evaluate(draw => { Math.random = () => draw; }, scope === 'Trivia' ? 7.5 / 155 : scope === 'Food' ? 0.9 : 6.5 / 24);
    await page.getByRole('button', { name: 'I’m feeling lucky' }).click();
    await expect(page.locator('#loaded-deck-heading')).toContainText(name);
    await expect(page.locator('.catalog-notice')).toContainText(`Lucky picked “${name}”`);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain(`/sample_games/${id}.csv`);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('flashcards_dictionary') || 'null'));
    expect(stored).toEqual([...cards].sort((a, b) => a.key.localeCompare(b.key)));
    await expect(page.getByRole('button', { name: 'Flip', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Type', exact: true })).toBeEnabled();
    await expect(page.locator('.game-timer')).toHaveCount(0);
    const entry = await page.evaluate(async () => {
      const path = '/flashcards_game/src/utils/sample-games.ts';
      const { SAMPLE_GAMES, getSampleGameUrl } = await import(path);
      return { game: SAMPLE_GAMES[7], url: getSampleGameUrl(SAMPLE_GAMES[7]) };
    });
    expect(entry.game).toEqual({ id, name, separator: '|', categoryPath: ['trivia', 'food'], language: 'en', lucky: 'default' });
    expect(entry.url).toBe(`/flashcards_game/sample_games/${id}.csv`);
  });
}

test('public notice keeps high-level rights and redacts internal provenance', async ({ page }) => {
  await page.goto('sample_games/starter-trivia-notices.html');
  const main = page.locator('main');
  await expect(main).toContainText('155 English trivia decks, 4,264 questions');
  await expect(main).toContainText('Open Trivia Database / PixelTail Games');
  await expect(main).toContainText('LearnClash / Pluxia GmbH');
  await expect(main).toContainText('TVmaze');
  await expect(main).toContainText('CC BY-SA 4.0');
  await expect(main).toContainText('CC BY 4.0');
  await expect(main).toContainText('indicate changes');
  await expect(page.locator('article')).toHaveCount(0);
  const text = await main.innerText();
  expect(text).not.toMatch(/(?:\/Users\/|\.opi\b|\bsdlc\/|repository provenance|(?:staging|ledger|candidate|answer_target|tracker)\b)/i);
  expect(text).not.toMatch(/\b(?:TASK|BUG|STORY|EPIC|SPEC|RELEASE)[-_ ]?\d+\b/i);
  expect(text).not.toMatch(/\bB\d{2}-\d{4}\b/);
  expect(text).not.toMatch(/\b(?:T|L|FRC|HMC|TWC|STC|SWP|WTD|RCE|JWP|HBC|CB)\d{2}\b/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
