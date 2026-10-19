import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';
import { release021EdgeDraws, release021Pool } from './release-021-pool-fixtures';

const id = 'trivia-waitangi-signing-documents-en';
const name = 'Te Tiriti o Waitangi: Signing and Documents — English';
const csv = readFileSync(`public/sample_games/${id}.csv`, 'utf8');
const cards = parseCsv(csv, '|');
const archives = 'https://www.archives.govt.nz/discover-our-stories/the-treaty-of-waitangi';
const quick = `${archives}/the-treaty-of-waitangi-quick-facts`;
const documents = `${archives}/the-sheets-and-signatures-of-te-tiriti-o-waitangi`;

function observeRequests(page: Page) {
  const requests: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    requests.push(`${url.origin}${url.pathname}`); // Deliberately omit queries, fragments and headers.
  });
  return requests;
}

async function verifyRequests(page: Page, info: TestInfo, requests: string[]) {
  const path = info.outputPath('runtime-request-destinations.json');
  writeFileSync(path, JSON.stringify({ queryAndFragmentOmitted: true, requests }, null, 2));
  await info.attach('runtime-request-destinations', { path, contentType: 'application/json' });
  expect(requests.filter(url => /(^|\.)(archives\.govt\.nz|waitangitribunal\.govt\.nz|justice\.govt\.nz|tvmaze\.com|opentdb\.com|learnclash\.com|starwars\.com)$/.test(new URL(url).hostname))).toEqual([]);
  expect(requests.filter(url => url.endsWith('.csv'))).toEqual([new URL(`/flashcards_game/sample_games/${id}.csv`, page.url()).href]);
}

for (const width of [1280, 320]) {
  test(`Waitangi four-level keyboard browse at ${width}, one CSV and all five manual Flip ratings`, async ({ page }, info) => {
    const requests = observeRequests(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    if (width === 320) await page.locator('#sample-games-button').click();
    for (const category of ['Trivia', 'Trivia / History', 'Trivia / History / Oceania', 'Trivia / History / Oceania / Aotearoa New Zealand']) {
      const disclosure = page.getByRole('button', { name: `Show decks: ${category}`, exact: true });
      await disclosure.focus();
      await disclosure.press('Enter');
    }
    await expect(page.getByText('Eligible decks: 24', { exact: true })).toBeVisible();
    expect(requests.filter(url => url.endsWith('.csv'))).toEqual([]);
    const deck = page.getByRole('button', { name: `${name} English content`, exact: true });
    await deck.focus();
    await deck.press('Enter');
    await expect(page.locator('#loaded-deck-heading')).toBeFocused();
    await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${name}`);
    await expect(page.locator('.game-timer')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`browse-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Flip', exact: true }).click();
    const seen = new Set<string>();
    for (let index = 0; index < 5; index++) {
      const question = await page.locator('.flashcard__front .flashcard__content').innerText();
      const card = cards.find(card => card.key === question);
      if (!card) throw new Error(`Unexpected question: ${question}`);
      expect(seen.has(question)).toBe(false);
      seen.add(question);
      await page.locator('.flashcard').click();
      await expect(page.locator('.flashcard__back .flashcard__content')).toHaveText(card.value);
      await page.getByRole('button', { name: index % 2 ? 'Wrong' : 'Correct', exact: true }).click();
    }
    expect(seen.size).toBe(5);
    for (const text of ['Rated 5 of 5', 'Correct: 3', 'Wrong: 2', 'Unrated: 0']) await expect(page.getByText(text, { exact: true })).toBeVisible();
    await verifyRequests(page, info, requests);
  });
}

for (const variant of ['canonical', 'trim-case', 'rejected']) {
  for (const width of [320, 390]) {
    test(`Waitangi base-path direct link, all five Type ${variant} at ${width}, explicit continuation`, async ({ page }, info) => {
      const requests = observeRequests(page);
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`/flashcards_game/?sample_game=${id}`);
      await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${name}`);
      await expect(page.getByText('Cards available: 5', { exact: true })).toBeVisible();
      await expect(page.locator('.game-timer')).toHaveCount(0);
      await page.getByRole('button', { name: 'Type', exact: true }).click();
      const rejected: Record<string, string> = { '1840': '6 February 1840', 'Māori': 'Maori', '9': 'nine', 'Parchment': 'vellum', 'Paihia': 'Paihia, New Zealand' };
      const seen = new Set<string>();
      for (let index = 0; index < 5; index++) {
        const question = await page.locator('.quiz-card__question .flashcard__content').innerText();
        const card = cards.find(card => card.key === question);
        if (!card) throw new Error(`Unexpected question: ${question}`);
        expect(seen.has(question)).toBe(false);
        seen.add(question);
        if (card.value === 'Māori') await page.screenshot({ path: info.outputPath('macron-prompt.png'), fullPage: true });
        const answer = variant === 'rejected' ? rejected[card.value] : variant === 'trim-case' ? `  ${card.value.toUpperCase()}  ` : card.value;
        await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(answer);
        await page.getByRole('button', { name: 'Submit', exact: true }).click();
        await expect(page.locator(`.quiz-card__feedback--${variant === 'rejected' ? 'incorrect' : 'correct'}`)).toBeVisible();
        await expect(page.locator('.quiz-card__comparison').last()).toHaveText(`Expected answer: ${card.value}`);
        await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 5`);
        if (card.value === 'Māori') {
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
          await page.screenshot({ path: info.outputPath('macron-correction.png'), fullPage: true });
        }
        const next = page.getByRole('button', { name: index === 4 ? 'See results' : 'Next card', exact: true });
        await expect(next).toBeFocused();
        await next.press('Enter');
      }
      expect(seen.size).toBe(5);
      await verifyRequests(page, info, requests);
    });
  }
}

for (const answer of ['Maori', 'te reo Māori', 'Ma\u0304ori', 'Māori', '  MĀORI  ']) {
  test(`Māori exact Type preserves the macron and Unicode boundary: ${JSON.stringify(answer)}`, async ({ page }, info) => {
    const requests = observeRequests(page);
    await page.goto(`/?sample_game=${id}`);
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    for (let index = 0; index < 5; index++) {
      const question = await page.locator('.quiz-card__question .flashcard__content').innerText();
      if (question === cards[1].key) {
        await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(answer);
        await page.getByRole('button', { name: 'Submit', exact: true }).click();
        const correct = answer.trim().toLowerCase() === 'māori';
        await expect(page.locator(`.quiz-card__feedback--${correct ? 'correct' : 'incorrect'}`)).toBeVisible();
        await expect(page.locator('.quiz-card__comparison').last()).toHaveText('Expected answer: Māori');
        await verifyRequests(page, info, requests);
        return;
      }
      await page.getByRole('button', { name: 'Skip', exact: true }).click();
      await page.getByRole('button', { name: 'Next card', exact: true }).click();
    }
    throw new Error('Māori question was not encountered');
  });
}

test('Waitangi independent general twenty-four, Trivia thirty-five, History two, regional leaf and unchanged fiction pools and edges', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/flashcards_game/src/utils/sample-games.ts';
    const { SAMPLE_GAMES, getEligibleDecks, pickLuckyDeck } = await import(path);
    const scopes = [null, ['trivia'], ['trivia', 'history'], ['trivia', 'history', 'world'], ['trivia', 'history', 'oceania'], ['trivia', 'history', 'oceania', 'aotearoa-new-zealand'], ['trivia', 'history', 'prehistory'], ['trivia', 'television'], ['trivia', 'film'], ['trivia', 'film', 'star-wars'], ['trivia', 'mythology'], ['study'], ['missing']];
    const counts = [24, 155, 17, 1, 1, 1, 1, 4, 1, 1, 2, 0, 0];
    const ids = (decks: { id: string }[]) => decks.map(deck => deck.id);
    const legacy = SAMPLE_GAMES.filter((deck: { lucky: string }) => deck.lucky === 'never');
    return {
      scopes,
      counts,
      game: SAMPLE_GAMES[14], total: SAMPLE_GAMES.length,
      pools: scopes.map(scope => ids(getEligibleDecks(scope))),
      draws: scopes.map((scope, i) => Array.from({ length: counts[i] }, (_, bucket) => [(bucket + 0.00001) / counts[i], (bucket + 1) / counts[i] - 0.00001].map(random => pickLuckyDeck(scope, SAMPLE_GAMES, () => random)?.id)).flat()),
      empty: pickLuckyDeck(['study']), legacyCount: legacy.length,
      excluded: legacy.every((deck: { id: string; categoryPath: string[] }) => [...scopes, deck.categoryPath].every(scope => !ids(getEligibleDecks(scope)).includes(deck.id))),
    };
  });
  const history = 'trivia-world-history-short-round-en';
  const defaults = ['trivia-science-nature-starter-en', 'trivia-space-astronomy-essentials-en', 'trivia-world-geography-starter-en', history, 'trivia-human-origins-starter-en', 'trivia-sports-rules-milestones-en', 'trivia-food-ingredients-en', id, 'trivia-reef-building-corals-en'];
  const tv = ['trivia-friends-cast-production-en', 'trivia-himym-cast-production-en', 'trivia-twd-cast-production-en', 'trivia-star-trek-tos-cast-production-en'];
  const starWars = 'trivia-star-wars-original-production-en';
  const myth = 'trivia-mythology-names-symbols-en';
  const underworld = 'trivia-greek-underworld-afterlife-en';
  const ancestor = ['trivia-science-nature-starter-en', 'trivia-chemistry-foundations-en', 'trivia-space-astronomy-essentials-en', 'trivia-world-geography-starter-en', history, 'trivia-human-origins-starter-en', 'trivia-sports-rules-milestones-en', 'trivia-food-ingredients-en', myth, ...tv, starWars, id, 'trivia-reef-building-corals-en'];
  defaults.push('trivia-japanese-woodblock-prints-en', 'trivia-human-body-clocks-en', 'trivia-rocks-faults-volcanoes-en', 'trivia-cell-biology-essentials-en', 'trivia-water-landscapes-en', 'trivia-flight-aviation-history-en', 'trivia-railway-engineering-world-railways-en', 'trivia-bicycles-motorcycles-en', 'trivia-ancient-civilizations-en', 'trivia-medieval-castles-tournaments-en', 'trivia-invertebrates-body-plans-en', 'trivia-world-cities-transit-landmarks-en');
  defaults.push('trivia-literature-authors-characters-forms-en', 'trivia-body-science-medical-history-imaging-en', 'trivia-light-optics-telescopes-en');
  ancestor.push('trivia-japanese-woodblock-prints-en', 'trivia-human-body-clocks-en', 'trivia-rocks-faults-volcanoes-en', 'trivia-dinosaurs-fossils-mesozoic-en', 'trivia-plant-adaptations-reproduction-en', 'trivia-cell-biology-essentials-en', 'trivia-water-landscapes-en', underworld, 'trivia-flight-aviation-history-en', 'trivia-car-engines-vehicle-engineering-en', 'trivia-railway-engineering-world-railways-en', 'trivia-bicycles-motorcycles-en', 'trivia-ancient-civilizations-en', 'trivia-medieval-castles-tournaments-en', 'trivia-invertebrates-body-plans-en', 'trivia-world-cities-transit-landmarks-en');
  ancestor.push('trivia-literature-authors-characters-forms-en', 'trivia-body-science-medical-history-imaging-en', 'trivia-light-optics-telescopes-en');
  expect(result.pools).toEqual(result.scopes.map(scope => release021Pool(scope)));
  expect(result.draws).toEqual(release021EdgeDraws(result.scopes, result.counts));
  expect(result.game).toEqual({ id, name, categoryPath: ['trivia', 'history', 'oceania', 'aotearoa-new-zealand'], language: 'en', lucky: 'default', separator: '|' });
  expect(result.total).toBe(162);
  expect(result.legacyCount).toBe(7);
  expect(result.excluded).toBe(true);
  expect(result.empty).toBeNull();
});

for (const scope of ['General', 'Trivia', 'History', 'Oceania', 'Aotearoa New Zealand']) {
  test(`Waitangi real ${scope} Lucky loads exactly this whole CSV without auto-start or search opt-in`, async ({ page }, info) => {
    const requests = observeRequests(page);
    await page.goto('/');
    for (const category of ['Trivia', 'Trivia / History', 'Trivia / History / Oceania']) await page.getByRole('button', { name: `Show decks: ${category}`, exact: true }).click();
    if (scope !== 'General') await page.getByRole('button', { name: scope, exact: true }).click();
    await page.locator('#sample-search').fill('Star Wars');
    await expect(page.getByText(`Eligible decks: ${scope === 'General' ? 24 : scope === 'Trivia' ? 155 : scope === 'History' ? 17 : 1}`, { exact: true })).toBeVisible();
    await page.evaluate(draw => { Math.random = () => draw; }, scope === 'General' ? 7.5 / 24 : scope === 'Trivia' ? 14.5 / 155 : scope === 'History' ? 2.99 / 17 : 0.99);
    await page.getByRole('button', { name: 'I’m feeling lucky' }).click();
    await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${name}`);
    await expect(page.locator('.catalog-notice')).toContainText(`Lucky picked “${name}”`);
    await expect(page.getByRole('button', { name: 'Type', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Flip', exact: true })).toBeEnabled();
    await expect(page.locator('.game-timer')).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('flashcards_dictionary') || 'null'))).toEqual([...cards].sort((a, b) => a.key.localeCompare(b.key)));
    await verifyRequests(page, info, requests);
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

for (const locale of ['en', 'de', 'es', 'pt', 'ar', 'fa', 'tr', 'ms', 'th', 'vi', 'zh-Hans', 'ja']) {
  test(`Waitangi ${locale} localizes regional labels and whole inventory, never card text`, async ({ page }) => {
    const copy = JSON.parse(readFileSync(`src/i18n/locales/${locale}.json`, 'utf8'));
    await page.goto(`/?lang=${locale}&sample_game=${id}`);
    await expect(page.getByText(copy.catalog.inventory.replace('{count}', '162'), { exact: true })).toBeVisible();
    await page.locator('#sample-search').fill('Waitangi');
    await expect(page.getByText(`${copy.categories.trivia} / ${copy.categories.history} / ${copy.categories.oceania} / ${copy.categories['aotearoa-new-zealand']}`, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('flashcards_dictionary') || 'null'))).toEqual([...cards].sort((a, b) => a.key.localeCompare(b.key)));
  });
}
