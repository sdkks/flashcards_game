import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';

const id = 'trivia-world-history-short-round-en';
const name = 'World History: A Short Round — English (10)';
const csv = readFileSync(`public/sample_games/${id}.csv`, 'utf8');
const cards = parseCsv(csv, '|');
test('162 registry entries, 155 English trivia decks / 4,264 cards and localized categories', async ({ page }) => {
  await page.goto('/');
  const registry = await page.evaluate(async () => {
    const path = '/flashcards_game/src/utils/sample-games.ts';
    const { SAMPLE_GAMES, getSampleGameUrl } = await import(path);
    return { games: SAMPLE_GAMES, url: getSampleGameUrl(SAMPLE_GAMES[4]) };
  });
  expect(registry.games).toHaveLength(162);
  expect(new Set(registry.games.map((game: { id: string }) => game.id)).size).toBe(162);
  expect(registry.games[4]).toEqual({ id, name, separator: '|', categoryPath: ['trivia', 'history', 'world'], language: 'en', lucky: 'default' });
  expect(registry.games.find((game: { id: string }) => game.id === 'trivia-cell-biology-essentials-en')).toEqual({ id: 'trivia-cell-biology-essentials-en', name: 'Cell Biology Essentials — English (18)', separator: '|', categoryPath: ['trivia', 'science-nature', 'cell-biology'], language: 'en', lucky: 'default' });
  expect(registry.games.find((game: { id: string }) => game.id === 'trivia-human-origins-starter-en')).toEqual({ id: 'trivia-human-origins-starter-en', name: 'Human Origins: A Starter Round — English (18)', separator: '|', categoryPath: ['trivia', 'history', 'prehistory'], language: 'en', lucky: 'default' });
  expect(registry.url).toBe(`/flashcards_game/sample_games/${id}.csv`);
  const trivia = registry.games.filter((game: { categoryPath: string[] }) => game.categoryPath[0] === 'trivia');
  expect(trivia).toHaveLength(155);
  expect(trivia.every((game: { language: string }) => game.language === 'en')).toBe(true);
  expect(trivia.reduce((count: number, game: { id: string }) => count + parseCsv(readFileSync(`public/sample_games/${game.id}.csv`, 'utf8'), '|').length, 0)).toBe(4264);
  await expect(page.getByText('162 published decks, including 155 English trivia decks with 4264 questions. More topics are planned, not yet available.', { exact: true })).toBeVisible();
  const locales = readdirSync('src/i18n/locales').filter(file => file.endsWith('.json'));
  expect(locales).toHaveLength(12);
  const english = JSON.parse(readFileSync('src/i18n/locales/en.json', 'utf8'));
  for (const file of locales) {
    const copy = JSON.parse(readFileSync(`src/i18n/locales/${file}`, 'utf8'));
    expect(Object.keys(copy.categories).sort()).toEqual(Object.keys(english.categories).sort());
    expect(copy.categories.history.trim().length).toBeGreaterThan(0);
    expect(copy.categories['ancient-civilizations'].trim().length).toBeGreaterThan(0);
    expect(copy.categories.aviation.trim().length).toBeGreaterThan(0);
    expect(copy.categories.prehistory.trim().length).toBeGreaterThan(0);
    expect(copy.categories.sports.trim().length).toBeGreaterThan(0);
    expect(copy.categories.food.trim().length).toBeGreaterThan(0);
    expect(copy.categories.mythology.trim().length).toBeGreaterThan(0);
    expect(copy.categories['greek-underworld'].trim().length).toBeGreaterThan(0);
    expect(copy.categories.television.trim().length).toBeGreaterThan(0);
    expect(copy.categories.friends).toBe('Friends');
    expect(copy.categories['how-i-met-your-mother']).toBe('How I Met Your Mother');
    expect(copy.categories['the-walking-dead']).toBe('The Walking Dead');
    expect(copy.categories['star-trek-the-original-series']).toBe('Star Trek: The Original Series');
    expect(copy.categories.film.trim().length).toBeGreaterThan(0);
    expect(copy.categories['star-wars']).toBe('Star Wars');
    expect(copy.categories.oceania.trim().length).toBeGreaterThan(0);
    expect(copy.categories['aotearoa-new-zealand'].trim().length).toBeGreaterThan(0);
    expect(copy.categories['coral-reefs'].trim().length).toBeGreaterThan(0);
    expect(copy.categories.arts.trim().length).toBeGreaterThan(0);
    expect(copy.categories['japanese-woodblock-prints'].trim().length).toBeGreaterThan(0);
    expect(copy.categories['body-clocks'].trim().length).toBeGreaterThan(0);
    expect(copy.categories['cell-biology'].trim().length).toBeGreaterThan(0);
    expect(copy.categories.paleontology.trim().length).toBeGreaterThan(0);
    expect(copy.categories.botany.trim().length).toBeGreaterThan(0);
    expect(copy.categories['vehicle-engineering'].trim().length).toBeGreaterThan(0);
    expect(copy.categories.transport.trim().length).toBeGreaterThan(0);
    expect(copy.categories['bicycles-motorcycles'].trim().length).toBeGreaterThan(0);
    if (file === 'tr.json') expect(copy.catalog.inventory).toContain('155’i toplam 4264');
    // Match whole counts so a deck total cannot pass on a prefix of the question total.
    const inventoryNumbers = copy.catalog.inventory
      .replace(/[۰-۹]/g, (digit: string) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).match(/\d+/g);
    expect(inventoryNumbers).toEqual(['155', '4264']);
  }
});

test('History → World loads the whole deck without starting; all ten Flip cards reveal and score', async ({ page }, testInfo) => {
  await page.goto('/');
  for (const category of ['Trivia', 'Trivia / History', 'Trivia / History / World']) {
    await page.getByRole('button', { name: `Show decks: ${category}`, exact: true }).click();
  }
  await page.getByRole('button', { name: `${name} English content`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`sample_game=${id}`));
  await expect(page.locator('#loaded-deck-heading')).toBeFocused();
  await expect(page.getByText('Cards available: 10', { exact: true })).toBeVisible();
  await expect(page.locator('.game-timer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  const seen = new Set<string>();
  for (let index = 0; index < 10; index++) {
    await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 10`);
    const question = await page.locator('.flashcard__front .flashcard__content').innerText();
    const card = cards.find(card => card.key === question);
    expect(card).toBeDefined();
    expect(seen.has(question)).toBe(false);
    seen.add(question);
    await page.locator('.flashcard').click();
    await expect(page.locator('.flashcard__back .flashcard__content')).toHaveText(card!.value);
    await page.getByRole('button', { name: 'Correct', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Your self-rated results' })).toBeVisible();
  await expect(page.getByText('Rated 10 of 10', { exact: true })).toBeVisible();
  await testInfo.attach('history-flip-complete', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

for (const variants of [false, true]) {
  test(`history direct link: all ten Type cards ${variants ? 'retain exact comparison without aliases' : 'accept canonical answers'}`, async ({ page }, testInfo) => {
    await page.goto(`/?sample_game=${id}`);
    await expect(page.getByText('Cards available: 10', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    const rejected: Record<string, string> = {
      '1989': 'nineteen eighty-nine',
      "Hundred Years' War": 'Hundred Years’ War',
      'Martin Luther King': 'Martin Luther King Jr.',
      'Lighthouse of Alexandria': 'Pharos',
    };
    const seen = new Set<string>();
    for (let index = 0; index < 10; index++) {
      await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 10`);
      const question = await page.locator('.quiz-card__question .flashcard__content').innerText();
      const card = cards.find(card => card.key === question);
      expect(card).toBeDefined();
      expect(seen.has(question)).toBe(false);
      seen.add(question);
      const wrong = variants && rejected[card!.value];
      const answer = wrong || (variants ? `  ${card!.value.toUpperCase()}  ` : card!.value);
      await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(answer);
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      await expect(page.locator(`.quiz-card__feedback--${wrong ? 'incorrect' : 'correct'}`)).toBeVisible();
      await expect(page.locator('.quiz-card__comparison').last()).toHaveText(`Expected answer: ${card!.value}`);
      await page.getByRole('button', { name: index === 9 ? 'See results' : 'Next card', exact: true }).click();
    }
    expect(seen.size).toBe(10);
    await testInfo.attach(variants ? 'history-type-exact' : 'history-type-canonical', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  });
}

for (const scoped of [false, true]) {
  test(`history ${scoped ? 'History-scoped' : 'default fourth-bucket'} Lucky selects one whole deck and waits for mode choice`, async ({ page }) => {
    const requests: string[] = [];
    page.on('request', request => { if (request.url().endsWith('.csv')) requests.push(request.url()); });
    await page.goto('/');
    if (scoped) {
      await page.getByRole('button', { name: 'Show decks: Trivia', exact: true }).click();
      await page.getByRole('button', { name: 'History', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Lucky: Trivia / History and subcategories', exact: true })).toBeVisible();
    }
    await expect(page.getByText(`Eligible decks: ${scoped ? 17 : 24}`, { exact: true })).toBeVisible();
    await page.evaluate(draw => { Math.random = () => draw; }, scoped ? 0.1 / 17 : 3.5 / 24);
    await page.getByRole('button', { name: 'I’m feeling lucky' }).click();
    await expect(page.locator('#loaded-deck-heading')).toContainText(name);
    await expect(page.locator('.catalog-notice')).toContainText(`Lucky picked “${name}”`);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain(`/sample_games/${id}.csv`);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('flashcards_dictionary')!))).toEqual([...cards].sort((a, b) => a.key.localeCompare(b.key)));
    await expect(page.getByRole('button', { name: 'Flip', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Type', exact: true })).toBeEnabled();
    await expect(page.locator('.game-timer')).toHaveCount(0);
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
