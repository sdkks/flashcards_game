import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';
import { release021EdgeDraws, release021Pool } from './release-021-pool-fixtures';

const id = 'trivia-star-trek-tos-cast-production-en';
const name = 'Star Trek: The Original Series — Cast and Original Run — English (5)';
const csv = readFileSync(`public/sample_games/${id}.csv`, 'utf8');
const cards = parseCsv(csv, '|');
const isProvider = (url: string) => /(^|\.)(tvmaze\.com|startrek\.com|paramount\.com|paramountplus\.com|viacomcbs\.legal)$/.test(new URL(url).hostname);

function observeRequests(page: Page) {
  const requests: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    // Retain destination evidence without analytics query identifiers.
    requests.push(`${url.origin}${url.pathname}`);
  });
  return requests;
}

async function verifyRequests(page: Page, testInfo: TestInfo, requests: string[], chosenId = id) {
  expect(requests.filter(isProvider)).toEqual([]);
  expect(requests.filter(url => url.endsWith('.csv'))).toEqual([new URL(`/flashcards_game/sample_games/${chosenId}.csv`, page.url()).href]);
  const path = testInfo.outputPath('runtime-request-destinations.json');
  writeFileSync(path, JSON.stringify({ queryAndFragmentOmitted: true, requests }, null, 2));
  await testInfo.attach('runtime-request-destinations', { path, contentType: 'application/json' });
}

test('Trivia → Television → TOS: one CSV, all five Flip reveals and odd-total manual ratings, no provider HTTP', async ({ page }, testInfo) => {
  const requests = observeRequests(page);
  await page.goto('/');
  for (const category of ['Trivia', 'Trivia / Television', 'Trivia / Television / Star Trek: The Original Series']) {
    await page.getByRole('button', { name: `Show decks: ${category}`, exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Lucky: General trivia', exact: true })).toBeVisible();
  await expect(page.getByText('Eligible decks: 24', { exact: true })).toBeVisible();
  expect(requests.filter(url => url.endsWith('.csv'))).toEqual([]);
  await page.getByRole('button', { name: `${name} English content`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`sample_game=${id}`));
  await expect(page.locator('#loaded-deck-heading')).toBeFocused();
  await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${name}`);
  await expect(page.getByText('Cards available: 5', { exact: true })).toBeVisible();
  await expect(page.locator('.game-timer')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Trivia sources & licenses (English, new tab)', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('tos-browse-ready.png'), fullPage: true });
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  const seen = new Set<string>();
  for (let index = 0; index < 5; index++) {
    await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 5`);
    const question = await page.locator('.flashcard__front .flashcard__content').innerText();
    const card = cards.find(card => card.key === question);
    if (!card) throw new Error(`Unexpected TOS question: ${question}`);
    expect(seen.has(question)).toBe(false);
    seen.add(question);
    if (card.value === 'William Shatner') await page.screenshot({ path: testInfo.outputPath('tos-kirk-flip-prompt.png'), fullPage: true });
    await page.locator('.flashcard').click();
    await expect(page.locator('.flashcard__back .flashcard__content')).toHaveText(card.value);
    await page.getByRole('button', { name: index % 2 ? 'Wrong' : 'Correct', exact: true }).click();
  }
  expect(seen.size).toBe(5);
  await expect(page.getByRole('heading', { name: 'Your self-rated results' })).toBeVisible();
  for (const text of ['Rated 5 of 5', 'Correct: 3', 'Wrong: 2', 'Unrated: 0']) await expect(page.getByText(text, { exact: true })).toBeVisible();
  await verifyRequests(page, testInfo, requests);
  await page.screenshot({ path: testInfo.outputPath('tos-flip-complete.png'), fullPage: true });
});

for (const variant of ['canonical', 'trim-case', 'rejected', 'internal-spaces']) {
  test(`TOS direct link: all five Type answers ${variant}, explicit feedback and continuation`, async ({ page }, testInfo) => {
    const requests = observeRequests(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/?sample_game=${id}`);
    await expect(page.getByText('Cards available: 5', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    const rejected: Record<string, string> = {
      'Leonard Nimoy': 'Nimoy', 'William Shatner': 'WS', '1966': 'nineteen sixty-six', '1969': 'nineteen sixty-nine', '3': 'three',
    };
    const spaced: Record<string, string> = {
      'Leonard Nimoy': 'Leonard  Nimoy', 'William Shatner': 'William  Shatner', '1966': '19 66', '1969': '196 9', '3': 'Season 3',
    };
    const wrong = variant === 'rejected' || variant === 'internal-spaces';
    const seen = new Set<string>();
    for (let index = 0; index < 5; index++) {
      await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 5`);
      const question = await page.locator('.quiz-card__question .flashcard__content').innerText();
      const card = cards.find(card => card.key === question);
      if (!card) throw new Error(`Unexpected TOS question: ${question}`);
      expect(seen.has(question)).toBe(false);
      seen.add(question);
      const answer = variant === 'rejected' ? rejected[card.value] : variant === 'internal-spaces' ? spaced[card.value] : variant === 'trim-case' ? `  ${card.value.toUpperCase()}  ` : card.value;
      await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(answer);
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      await expect(page.locator(`.quiz-card__feedback--${wrong ? 'incorrect' : 'correct'}`)).toBeVisible();
      await expect(page.locator('.quiz-card__comparison').last()).toHaveText(`Expected answer: ${card.value}`);
      await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 5`);
      if (card.value === 'William Shatner') {
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`tos-kirk-${variant}.png`), fullPage: true });
      }
      await page.getByRole('button', { name: index === 4 ? 'See results' : 'Next card', exact: true }).click();
    }
    expect(seen.size).toBe(5);
    await verifyRequests(page, testInfo, requests);
    await page.screenshot({ path: testInfo.outputPath(`tos-type-${variant}-complete.png`), fullPage: true });
  });
}

test('TOS registry: independent default twenty-four / Trivia thirty-five / TV four / all shows and mythology one; bucket edges and legacy exclusions', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/flashcards_game/src/utils/sample-games.ts';
    const { SAMPLE_GAMES, getEligibleDecks, pickLuckyDeck, getSampleGameUrl } = await import(path);
    const ids = (decks: { id: string }[]) => decks.map(deck => deck.id);
    const scopes = [null, ['trivia'], ['trivia', 'television'], ['trivia', 'television', 'friends'], ['trivia', 'television', 'how-i-met-your-mother'], ['trivia', 'television', 'the-walking-dead'], ['trivia', 'television', 'star-trek-the-original-series'], ['trivia', 'mythology']];
    const counts = [24, 155, 4, 1, 1, 1, 1, 2];
    const draws = (scope: string[] | null, count: number) => Array.from({ length: count }, (_, i) =>
      [(i + 0.00001) / count, (i + 1) / count - 0.00001].map(random => pickLuckyDeck(scope, SAMPLE_GAMES, () => random)?.id)).flat();
    const legacy = SAMPLE_GAMES.filter((deck: { lucky: string }) => deck.lucky === 'never');
    return {
      scopes,
      counts,
      game: SAMPLE_GAMES[12], url: getSampleGameUrl(SAMPLE_GAMES[12]), total: SAMPLE_GAMES.length,
      pools: scopes.map(scope => ids(getEligibleDecks(scope))), draws: scopes.map((scope, i) => draws(scope, counts[i])),
      legacyCount: legacy.length,
      legacyExcluded: legacy.every((deck: { id: string; categoryPath: string[] }) =>
        [...scopes, deck.categoryPath].every(scope => !ids(getEligibleDecks(scope)).includes(deck.id))),
    };
  });
  const defaults = ['trivia-science-nature-starter-en', 'trivia-space-astronomy-essentials-en', 'trivia-world-geography-starter-en', 'trivia-world-history-short-round-en', 'trivia-human-origins-starter-en', 'trivia-sports-rules-milestones-en', 'trivia-food-ingredients-en', 'trivia-waitangi-signing-documents-en', 'trivia-reef-building-corals-en'];
  const ancestor = ['trivia-science-nature-starter-en', 'trivia-chemistry-foundations-en', 'trivia-space-astronomy-essentials-en', 'trivia-world-geography-starter-en', 'trivia-world-history-short-round-en', 'trivia-human-origins-starter-en', 'trivia-sports-rules-milestones-en', 'trivia-food-ingredients-en', 'trivia-mythology-names-symbols-en', 'trivia-friends-cast-production-en', 'trivia-himym-cast-production-en', 'trivia-twd-cast-production-en', id, 'trivia-star-wars-original-production-en', 'trivia-waitangi-signing-documents-en', 'trivia-reef-building-corals-en'];
  defaults.push('trivia-japanese-woodblock-prints-en', 'trivia-human-body-clocks-en', 'trivia-rocks-faults-volcanoes-en', 'trivia-cell-biology-essentials-en', 'trivia-water-landscapes-en', 'trivia-flight-aviation-history-en', 'trivia-railway-engineering-world-railways-en', 'trivia-bicycles-motorcycles-en', 'trivia-ancient-civilizations-en', 'trivia-medieval-castles-tournaments-en', 'trivia-invertebrates-body-plans-en', 'trivia-world-cities-transit-landmarks-en');
  defaults.push('trivia-literature-authors-characters-forms-en', 'trivia-body-science-medical-history-imaging-en', 'trivia-light-optics-telescopes-en');
  ancestor.push('trivia-japanese-woodblock-prints-en', 'trivia-human-body-clocks-en', 'trivia-rocks-faults-volcanoes-en', 'trivia-dinosaurs-fossils-mesozoic-en', 'trivia-plant-adaptations-reproduction-en', 'trivia-cell-biology-essentials-en', 'trivia-water-landscapes-en', 'trivia-greek-underworld-afterlife-en', 'trivia-flight-aviation-history-en', 'trivia-car-engines-vehicle-engineering-en', 'trivia-railway-engineering-world-railways-en', 'trivia-bicycles-motorcycles-en', 'trivia-ancient-civilizations-en', 'trivia-medieval-castles-tournaments-en', 'trivia-invertebrates-body-plans-en', 'trivia-world-cities-transit-landmarks-en');
  ancestor.push('trivia-literature-authors-characters-forms-en', 'trivia-body-science-medical-history-imaging-en', 'trivia-light-optics-telescopes-en');
  expect(result.pools).toEqual(result.scopes.map(scope => release021Pool(scope)));
  expect(result.draws).toEqual(release021EdgeDraws(result.scopes, result.counts));
  expect(result.total).toBe(162);
  expect(result.legacyCount).toBe(7);
  expect(result.legacyExcluded).toBe(true);
  expect(result.game).toEqual({ id, name, categoryPath: ['trivia', 'television', 'star-trek-the-original-series'], language: 'en', lucky: 'category', separator: '|' });
  expect(result.url).toBe(`/flashcards_game/sample_games/${id}.csv`);
});

for (const scope of ['General', 'Trivia', 'Television', 'Star Trek: The Original Series']) {
  test(`TOS search/disclosure is not consent: ${scope} Lucky loads one whole deck before mode choice`, async ({ page }, testInfo) => {
    const requests = observeRequests(page);
    await page.goto('/');
    for (const category of ['Trivia', 'Trivia / Television', 'Trivia / Television / Star Trek: The Original Series']) {
      await page.getByRole('button', { name: `Show decks: ${category}`, exact: true }).click();
    }
    if (scope !== 'General') await page.getByRole('button', { name: scope, exact: true }).click();
    await page.locator('#sample-search').fill('Star Trek');
    await expect(page.getByRole('button', { name, exact: false })).toBeVisible();
    await expect(page.getByText(`Eligible decks: ${scope === 'General' ? 24 : scope === 'Trivia' ? 155 : scope === 'Television' ? 4 : scope === 'Mythology' ? 14 : 1}`, { exact: true })).toBeVisible();
    await page.evaluate(draw => { Math.random = () => draw; }, scope === 'Trivia' ? 12.5 / 155 : scope === 'General' ? 6.5 / 24 : 0.99);
    await page.getByRole('button', { name: 'I’m feeling lucky' }).click();
    const chosenId = scope === 'General' ? 'trivia-food-ingredients-en' : id;
    const chosenName = scope === 'General' ? 'Food: Ingredients and Kitchen Basics — English (8)' : name;
    const chosenCards = parseCsv(readFileSync(`public/sample_games/${chosenId}.csv`, 'utf8'), '|');
    await expect(page.locator('#loaded-deck-heading')).toContainText(chosenName);
    await expect(page.locator('.catalog-notice')).toContainText(`Lucky picked “${chosenName}”`);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('flashcards_dictionary') || 'null'))).toEqual([...chosenCards].sort((a, b) => a.key.localeCompare(b.key)));
    await expect(page.getByRole('button', { name: 'Flip', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Type', exact: true })).toBeEnabled();
    await expect(page.locator('.game-timer')).toHaveCount(0);
    await verifyRequests(page, testInfo, requests, chosenId);
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
