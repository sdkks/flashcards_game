import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';
import { release021EdgeDraws, release021Pool } from './release-021-pool-fixtures';

const id = 'trivia-mythology-names-symbols-en';
const name = 'Mythology: Names and Symbols — English (10)';
const csv = readFileSync(`public/sample_games/${id}.csv`, 'utf8');
const cards = parseCsv(csv, '|');
test('Mythology category directly loads all ten cards without opting into Lucky; every Flip reveal and manual rating', async ({ page }, testInfo) => {
  await page.goto('/');
  for (const category of ['Trivia', 'Trivia / Mythology']) {
    await page.getByRole('button', { name: `Show decks: ${category}`, exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Lucky: General trivia', exact: true })).toBeVisible();
  await expect(page.getByText('Eligible decks: 24', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `${name} English content`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`sample_game=${id}`));
  await expect(page.locator('#loaded-deck-heading')).toBeFocused();
  await expect(page.getByText('Cards available: 10', { exact: true })).toBeVisible();
  await expect(page.locator('.game-timer')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('mythology-direct-ready.png'), fullPage: true });
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  const seen = new Set<string>();
  for (let index = 0; index < 10; index++) {
    await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 10`);
    const question = await page.locator('.flashcard__front .flashcard__content').innerText();
    const card = cards.find(card => card.key === question);
    if (!card) throw new Error(`Unexpected Mythology question: ${question}`);
    expect(seen.has(question)).toBe(false);
    seen.add(question);
    await page.locator('.flashcard').click();
    await expect(page.locator('.flashcard__back .flashcard__content')).toHaveText(card.value);
    // Flip remains manual: players may rate a spoken spelling variant themselves.
    await page.getByRole('button', { name: index % 2 ? 'Wrong' : 'Correct', exact: true }).click();
  }
  expect(seen.size).toBe(10);
  await expect(page.getByRole('heading', { name: 'Your self-rated results' })).toBeVisible();
  await expect(page.getByText('Rated 10 of 10', { exact: true })).toBeVisible();
  await expect(page.getByText('Correct: 5', { exact: true })).toBeVisible();
  await expect(page.getByText('Wrong: 5', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('mythology-flip-complete.png'), fullPage: true });
});

for (const variant of ['canonical', 'trim-case', 'Mjölnir', 'Mjollnir']) {
  test(`mythology direct link: all ten Type cards with ${variant}`, async ({ page }, testInfo) => {
    await page.goto(`/?sample_game=${id}`);
    await expect(page.getByText('Cards available: 10', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    const seen = new Set<string>();
    for (let index = 0; index < 10; index++) {
      await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 10`);
      const question = await page.locator('.quiz-card__question .flashcard__content').innerText();
      const card = cards.find(card => card.key === question);
      if (!card) throw new Error(`Unexpected Mythology question: ${question}`);
      expect(seen.has(question)).toBe(false);
      seen.add(question);
      const wrong = card.value === 'Mjolnir' && (variant === 'Mjölnir' || variant === 'Mjollnir');
      const answer = wrong ? variant : variant === 'trim-case' ? `  ${card.value.toUpperCase()}  ` : card.value;
      await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(answer);
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      await expect(page.locator(`.quiz-card__feedback--${wrong ? 'incorrect' : 'correct'}`)).toBeVisible();
      await expect(page.locator('.quiz-card__comparison').last()).toHaveText(`Expected answer: ${card.value}`);
      await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 10`);
      if (card.value === 'Mjolnir') await page.screenshot({ path: testInfo.outputPath(`hammer-${variant}.png`), fullPage: true });
      await page.getByRole('button', { name: index === 9 ? 'See results' : 'Next card', exact: true }).click();
    }
    expect(seen.size).toBe(10);
  });
}

test('real Mythology metadata: independent default and explicit ancestor pools, every bucket edge, scoped deck and legacy exclusions', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/flashcards_game/src/utils/sample-games.ts';
    const { SAMPLE_GAMES, getEligibleDecks, pickLuckyDeck, getSampleGameUrl } = await import(path);
    const ids = (decks: { id: string }[]) => decks.map(deck => deck.id);
    const draws = (scope: string[] | null, count: number) => Array.from({ length: count }, (_, i) =>
      [(i + 0.00001) / count, (i + 1) / count - 0.00001].map(random => pickLuckyDeck(scope, SAMPLE_GAMES, () => random)?.id)).flat();
    const legacy = SAMPLE_GAMES.filter((deck: { lucky: string }) => deck.lucky === 'never');
    return {
      game: SAMPLE_GAMES[8], url: getSampleGameUrl(SAMPLE_GAMES[8]),
      defaults: ids(getEligibleDecks(null)), ancestor: ids(getEligibleDecks(['trivia'])), scoped: ids(getEligibleDecks(['trivia', 'mythology'])),
      defaultDraws: draws(null, 24), ancestorDraws: draws(['trivia'], 155),
      legacyCount: legacy.length,
      legacyExcluded: legacy.every((deck: { id: string; categoryPath: string[] }) =>
        [null, ['trivia'], ['trivia', 'mythology'], deck.categoryPath].every(scope => !ids(getEligibleDecks(scope)).includes(deck.id))),
    };
  });
  const defaults = ['trivia-science-nature-starter-en', 'trivia-space-astronomy-essentials-en', 'trivia-world-geography-starter-en', 'trivia-world-history-short-round-en', 'trivia-human-origins-starter-en', 'trivia-sports-rules-milestones-en', 'trivia-food-ingredients-en', 'trivia-waitangi-signing-documents-en', 'trivia-reef-building-corals-en'];
  const ancestor = ['trivia-science-nature-starter-en', 'trivia-chemistry-foundations-en', 'trivia-space-astronomy-essentials-en', 'trivia-world-geography-starter-en', 'trivia-world-history-short-round-en', 'trivia-human-origins-starter-en', 'trivia-sports-rules-milestones-en', 'trivia-food-ingredients-en', 'trivia-mythology-names-symbols-en', 'trivia-friends-cast-production-en', 'trivia-himym-cast-production-en', 'trivia-twd-cast-production-en', 'trivia-star-trek-tos-cast-production-en', 'trivia-star-wars-original-production-en', 'trivia-waitangi-signing-documents-en', 'trivia-reef-building-corals-en'];
  defaults.push('trivia-japanese-woodblock-prints-en', 'trivia-human-body-clocks-en', 'trivia-rocks-faults-volcanoes-en', 'trivia-cell-biology-essentials-en', 'trivia-water-landscapes-en', 'trivia-flight-aviation-history-en', 'trivia-railway-engineering-world-railways-en', 'trivia-bicycles-motorcycles-en', 'trivia-ancient-civilizations-en', 'trivia-medieval-castles-tournaments-en', 'trivia-invertebrates-body-plans-en', 'trivia-world-cities-transit-landmarks-en');
  defaults.push('trivia-literature-authors-characters-forms-en', 'trivia-body-science-medical-history-imaging-en', 'trivia-light-optics-telescopes-en');
  ancestor.push('trivia-japanese-woodblock-prints-en', 'trivia-human-body-clocks-en', 'trivia-rocks-faults-volcanoes-en', 'trivia-dinosaurs-fossils-mesozoic-en', 'trivia-plant-adaptations-reproduction-en', 'trivia-cell-biology-essentials-en', 'trivia-water-landscapes-en', 'trivia-greek-underworld-afterlife-en', 'trivia-flight-aviation-history-en', 'trivia-car-engines-vehicle-engineering-en', 'trivia-railway-engineering-world-railways-en', 'trivia-bicycles-motorcycles-en', 'trivia-ancient-civilizations-en', 'trivia-medieval-castles-tournaments-en', 'trivia-invertebrates-body-plans-en', 'trivia-world-cities-transit-landmarks-en');
  ancestor.push('trivia-literature-authors-characters-forms-en', 'trivia-body-science-medical-history-imaging-en', 'trivia-light-optics-telescopes-en');
  expect(result.defaults).toEqual(release021Pool(null));
  expect(result.ancestor).toEqual(release021Pool(['trivia']));
  expect(result.scoped).toEqual(release021Pool(['trivia', 'mythology']));
  expect(result.defaultDraws).toEqual(release021EdgeDraws([null], [24])[0]);
  expect(result.ancestorDraws).toEqual(release021EdgeDraws([['trivia']], [155])[0]);
  expect(result.legacyCount).toBe(7);
  expect(result.legacyExcluded).toBe(true);
  expect(result.game).toEqual({ id, name, categoryPath: ['trivia', 'mythology'], language: 'en', lucky: 'category', separator: '|' });
  expect(result.url).toBe(`/flashcards_game/sample_games/${id}.csv`);
});

for (const scope of ['General', 'Trivia', 'Mythology']) {
  test(`mythology search does not opt in: ${scope} Lucky selects one whole real deck before mode choice`, async ({ page }, testInfo) => {
    const requests: string[] = [];
    page.on('request', request => { if (request.url().endsWith('.csv')) requests.push(request.url()); });
    await page.goto('/');
    await page.getByRole('button', { name: 'Show decks: Trivia', exact: true }).click();
    await page.getByRole('button', { name: 'Show decks: Trivia / Mythology', exact: true }).click();
    if (scope !== 'General') await page.getByRole('button', { name: scope, exact: true }).click();
    await page.locator('#sample-search').fill('Mythology');
    await expect(page.getByRole('button', { name: name, exact: false })).toBeVisible();
    await expect(page.getByText(`Eligible decks: ${scope === 'General' ? 24 : scope === 'Trivia' ? 155 : scope === 'Mythology' ? 14 : 1}`, { exact: true })).toBeVisible();
    await page.evaluate(draw => { Math.random = () => draw; }, scope === 'Trivia' ? 8.5 / 155 : scope === 'Mythology' ? 1.5 / 14 : scope === 'General' ? 6.5 / 24 : 0.99);
    await page.getByRole('button', { name: 'I’m feeling lucky' }).click();
    const chosenId = scope === 'General' ? 'trivia-food-ingredients-en' : scope === 'Mythology' ? 'trivia-greek-underworld-afterlife-en' : id;
    const chosenName = scope === 'General' ? 'Food: Ingredients and Kitchen Basics — English (8)' : scope === 'Mythology' ? 'Greek Underworld & Afterlife — English (18)' : name;
    const chosenCards = parseCsv(readFileSync(`public/sample_games/${chosenId}.csv`, 'utf8'), '|');
    await expect(page.locator('#loaded-deck-heading')).toContainText(chosenName);
    await expect(page.locator('.catalog-notice')).toContainText(`Lucky picked “${chosenName}”`);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain(`/sample_games/${chosenId}.csv`);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('flashcards_dictionary') || 'null'))).toEqual([...chosenCards].sort((a, b) => a.key.localeCompare(b.key)));
    await expect(page.getByRole('button', { name: 'Flip', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Type', exact: true })).toBeEnabled();
    await expect(page.locator('.game-timer')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`mythology-search-${scope}-lucky.png`), fullPage: true });
    await page.getByRole('button', { name: 'Flip', exact: true }).click();
    const seen = new Set<string>();
    for (let index = 0; index < chosenCards.length; index++) {
      const question = await page.locator('.flashcard__front .flashcard__content').innerText();
      expect(chosenCards.map(card => card.key)).toContain(question);
      expect(seen.has(question)).toBe(false);
      seen.add(question);
      if (index < chosenCards.length - 1) await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    expect(seen.size).toBe(chosenCards.length);
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
