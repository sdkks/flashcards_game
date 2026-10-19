import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';
import { release021EdgeDraws, release021Pool } from './release-021-pool-fixtures';

const id = 'trivia-twd-cast-production-en';
const name = 'The Walking Dead: Original Series Cast and Production — English (8)';
const csv = readFileSync(`public/sample_games/${id}.csv`, 'utf8');
const cards = parseCsv(csv, '|');
const isProvider = (url: string) => /(^|\.)(tvmaze\.com|amc\.com|amcplus\.com|amcnetworks\.com|amcglobalmedia\.com|amcn\.com)$/.test(new URL(url).hostname);

test('Trivia → Television → TWD loads only its CSV; all eight Flip reveals and manual self-ratings, no provider HTTP', async ({ page }, testInfo) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  for (const category of ['Trivia', 'Trivia / Television', 'Trivia / Television / The Walking Dead']) {
    await page.getByRole('button', { name: `Show decks: ${category}`, exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Lucky: General trivia', exact: true })).toBeVisible();
  await expect(page.getByText('Eligible decks: 24', { exact: true })).toBeVisible();
  expect(requests.filter(url => url.endsWith('.csv'))).toEqual([]);
  await page.getByRole('button', { name: `${name} English content`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`sample_game=${id}`));
  await expect(page.locator('#loaded-deck-heading')).toBeFocused();
  await expect(page.getByText('Cards available: 8', { exact: true })).toBeVisible();
  await expect(page.locator('.game-timer')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Trivia sources & licenses (English, new tab)', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('twd-browse-ready.png'), fullPage: true });
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  const seen = new Set<string>();
  for (let index = 0; index < 8; index++) {
    await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 8`);
    const question = await page.locator('.flashcard__front .flashcard__content').innerText();
    const card = cards.find(card => card.key === question);
    if (!card) throw new Error(`Unexpected TWD question: ${question}`);
    expect(seen.has(question)).toBe(false);
    seen.add(question);
    await page.locator('.flashcard').click();
    await expect(page.locator('.flashcard__back .flashcard__content')).toHaveText(card.value);
    await page.getByRole('button', { name: index % 2 ? 'Wrong' : 'Correct', exact: true }).click();
  }
  expect(seen.size).toBe(8);
  await expect(page.getByRole('heading', { name: 'Your self-rated results' })).toBeVisible();
  for (const text of ['Rated 8 of 8', 'Correct: 4', 'Wrong: 4']) await expect(page.getByText(text, { exact: true })).toBeVisible();
  expect(requests.filter(url => url.endsWith('.csv'))).toEqual([new URL(`/flashcards_game/sample_games/${id}.csv`, page.url()).href]);
  expect(requests.filter(isProvider)).toEqual([]);
  writeFileSync(testInfo.outputPath('runtime-request-urls.json'), JSON.stringify(requests, null, 2));
  await testInfo.attach('runtime-request-urls', { path: testInfo.outputPath('runtime-request-urls.json'), contentType: 'application/json' });
  await page.screenshot({ path: testInfo.outputPath('twd-flip-complete.png'), fullPage: true });
});

for (const variant of ['canonical', 'trim-case', 'rejected']) {
  test(`TWD direct link: all eight Type answers ${variant}, correction and deliberate continuation, no provider HTTP`, async ({ page }, testInfo) => {
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto(`/?sample_game=${id}`);
    await expect(page.getByText('Cards available: 8', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    const rejected: Record<string, string> = {
      'Andrew Lincoln': 'Lincoln', 'Norman Reedus': 'NR', 'Melissa McBride': 'Melissa Mc Bride',
      'Lauren Cohan': 'Lauren Cohen', 'Christian Serratos': 'Christina Serratos',
      '2010': 'two thousand ten', '2022': '202 2', '11': 'eleven',
    };
    const seen = new Set<string>();
    for (let index = 0; index < 8; index++) {
      await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 8`);
      const question = await page.locator('.quiz-card__question .flashcard__content').innerText();
      const card = cards.find(card => card.key === question);
      if (!card) throw new Error(`Unexpected TWD question: ${question}`);
      expect(seen.has(question)).toBe(false);
      seen.add(question);
      const answer = variant === 'rejected' ? rejected[card.value] : variant === 'trim-case' ? `  ${card.value.toUpperCase()}  ` : card.value;
      await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(answer);
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      await expect(page.locator(`.quiz-card__feedback--${variant === 'rejected' ? 'incorrect' : 'correct'}`)).toBeVisible();
      await expect(page.locator('.quiz-card__comparison').last()).toHaveText(`Expected answer: ${card.value}`);
      await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 8`);
      if (card.value === 'Melissa McBride') await page.screenshot({ path: testInfo.outputPath(`twd-mcbride-${variant}.png`), fullPage: true });
      await page.getByRole('button', { name: index === 7 ? 'See results' : 'Next card', exact: true }).click();
    }
    expect(seen.size).toBe(8);
    expect(requests.filter(isProvider)).toEqual([]);
    expect(requests.filter(url => url.endsWith('.csv'))).toEqual([new URL(`/flashcards_game/sample_games/${id}.csv`, page.url()).href]);
    writeFileSync(testInfo.outputPath('runtime-request-urls.json'), JSON.stringify(requests, null, 2));
    await testInfo.attach('runtime-request-urls', { path: testInfo.outputPath('runtime-request-urls.json'), contentType: 'application/json' });
    await page.screenshot({ path: testInfo.outputPath(`twd-type-${variant}-complete.png`), fullPage: true });
  });
}

test('TWD registry: independent default twenty-four / Trivia thirty-five / TV four / each show and mythology one, all bucket edges and legacy exclusions', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/flashcards_game/src/utils/sample-games.ts';
    const { SAMPLE_GAMES, getEligibleDecks, pickLuckyDeck, getSampleGameUrl } = await import(path);
    const ids = (decks: { id: string }[]) => decks.map(deck => deck.id);
    const scopes = [null, ['trivia'], ['trivia', 'television'], ['trivia', 'television', 'friends'], ['trivia', 'television', 'how-i-met-your-mother'], ['trivia', 'television', 'the-walking-dead'], ['trivia', 'mythology']];
    const counts = [24, 155, 4, 1, 1, 1, 2];
    const draws = (scope: string[] | null, count: number) => Array.from({ length: count }, (_, i) =>
      [(i + 0.00001) / count, (i + 1) / count - 0.00001].map(random => pickLuckyDeck(scope, SAMPLE_GAMES, () => random)?.id)).flat();
    const legacy = SAMPLE_GAMES.filter((deck: { lucky: string }) => deck.lucky === 'never');
    return {
      scopes,
      counts,
      game: SAMPLE_GAMES[11], url: getSampleGameUrl(SAMPLE_GAMES[11]), total: SAMPLE_GAMES.length,
      pools: scopes.map(scope => ids(getEligibleDecks(scope))), draws: scopes.map((scope, i) => draws(scope, counts[i])),
      legacyCount: legacy.length,
      legacyExcluded: legacy.every((deck: { id: string; categoryPath: string[] }) =>
        [...scopes, deck.categoryPath].every(scope => !ids(getEligibleDecks(scope)).includes(deck.id))),
    };
  });
  const defaults = ['trivia-science-nature-starter-en', 'trivia-space-astronomy-essentials-en', 'trivia-world-geography-starter-en', 'trivia-world-history-short-round-en', 'trivia-human-origins-starter-en', 'trivia-sports-rules-milestones-en', 'trivia-food-ingredients-en', 'trivia-waitangi-signing-documents-en', 'trivia-reef-building-corals-en'];
  const ancestor = ['trivia-science-nature-starter-en', 'trivia-chemistry-foundations-en', 'trivia-space-astronomy-essentials-en', 'trivia-world-geography-starter-en', 'trivia-world-history-short-round-en', 'trivia-human-origins-starter-en', 'trivia-sports-rules-milestones-en', 'trivia-food-ingredients-en', 'trivia-mythology-names-symbols-en', 'trivia-friends-cast-production-en', 'trivia-himym-cast-production-en', 'trivia-twd-cast-production-en', 'trivia-star-trek-tos-cast-production-en', 'trivia-star-wars-original-production-en', 'trivia-waitangi-signing-documents-en', 'trivia-reef-building-corals-en'];
  defaults.push('trivia-japanese-woodblock-prints-en', 'trivia-human-body-clocks-en', 'trivia-rocks-faults-volcanoes-en', 'trivia-cell-biology-essentials-en', 'trivia-water-landscapes-en', 'trivia-flight-aviation-history-en', 'trivia-railway-engineering-world-railways-en', 'trivia-bicycles-motorcycles-en', 'trivia-ancient-civilizations-en', 'trivia-medieval-castles-tournaments-en', 'trivia-invertebrates-body-plans-en', 'trivia-world-cities-transit-landmarks-en');
  defaults.push('trivia-literature-authors-characters-forms-en', 'trivia-body-science-medical-history-imaging-en', 'trivia-light-optics-telescopes-en');
  ancestor.push('trivia-japanese-woodblock-prints-en', 'trivia-human-body-clocks-en', 'trivia-rocks-faults-volcanoes-en', 'trivia-dinosaurs-fossils-mesozoic-en', 'trivia-plant-adaptations-reproduction-en', 'trivia-cell-biology-essentials-en', 'trivia-water-landscapes-en', 'trivia-greek-underworld-afterlife-en', 'trivia-flight-aviation-history-en', 'trivia-car-engines-vehicle-engineering-en', 'trivia-railway-engineering-world-railways-en', 'trivia-bicycles-motorcycles-en', 'trivia-ancient-civilizations-en', 'trivia-medieval-castles-tournaments-en', 'trivia-invertebrates-body-plans-en', 'trivia-world-cities-transit-landmarks-en');
  ancestor.push('trivia-literature-authors-characters-forms-en', 'trivia-body-science-medical-history-imaging-en', 'trivia-light-optics-telescopes-en');
  expect(result.pools).toEqual(result.scopes.map(scope => release021Pool(scope)));
  expect(result.draws).toEqual(release021EdgeDraws(result.scopes, result.counts));
  expect(result.total).toBe(162);
  expect(result.legacyCount).toBe(7);
  expect(result.legacyExcluded).toBe(true);
  expect(result.game).toEqual({ id, name, categoryPath: ['trivia', 'television', 'the-walking-dead'], language: 'en', lucky: 'category', separator: '|' });
  expect(result.url).toBe(`/flashcards_game/sample_games/${id}.csv`);
});

for (const scope of ['General', 'Trivia', 'Television', 'The Walking Dead']) {
  test(`TWD search/disclosure does not opt in: ${scope} Lucky loads one whole deck before mode choice`, async ({ page }, testInfo) => {
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto('/');
    for (const category of ['Trivia', 'Trivia / Television', 'Trivia / Television / The Walking Dead']) {
      await page.getByRole('button', { name: `Show decks: ${category}`, exact: true }).click();
    }
    if (scope !== 'General') await page.getByRole('button', { name: scope, exact: true }).click();
    await page.locator('#sample-search').fill('The Walking Dead');
    await expect(page.getByRole('button', { name, exact: false })).toBeVisible();
    await expect(page.getByText(`Eligible decks: ${scope === 'General' ? 24 : scope === 'Trivia' ? 155 : scope === 'Television' ? 4 : scope === 'Mythology' ? 14 : 1}`, { exact: true })).toBeVisible();
    await page.evaluate(draw => { Math.random = () => draw; }, scope === 'Trivia' ? 11.5 / 155 : scope === 'Television' ? 2.5 / 4 : scope === 'General' ? 6.5 / 24 : 0.99);
    await page.getByRole('button', { name: 'I’m feeling lucky' }).click();
    const chosenId = scope === 'General' ? 'trivia-food-ingredients-en' : id;
    const chosenName = scope === 'General' ? 'Food: Ingredients and Kitchen Basics — English (8)' : name;
    const chosenCards = parseCsv(readFileSync(`public/sample_games/${chosenId}.csv`, 'utf8'), '|');
    await expect(page.locator('#loaded-deck-heading')).toContainText(chosenName);
    await expect(page.locator('.catalog-notice')).toContainText(`Lucky picked “${chosenName}”`);
    expect(requests.filter(url => url.endsWith('.csv'))).toEqual([new URL(`/flashcards_game/sample_games/${chosenId}.csv`, page.url()).href]);
    expect(requests.filter(isProvider)).toEqual([]);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('flashcards_dictionary') || 'null'))).toEqual([...chosenCards].sort((a, b) => a.key.localeCompare(b.key)));
    await expect(page.getByRole('button', { name: 'Flip', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Type', exact: true })).toBeEnabled();
    await expect(page.locator('.game-timer')).toHaveCount(0);
    writeFileSync(testInfo.outputPath('runtime-request-urls.json'), JSON.stringify(requests, null, 2));
    await page.screenshot({ path: testInfo.outputPath(`twd-search-${scope}-lucky.png`), fullPage: true });
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
