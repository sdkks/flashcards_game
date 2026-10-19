import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';
import { release021EdgeDraws, release021Pool } from './release-021-pool-fixtures';

const id = 'trivia-reef-building-corals-en';
const name = 'Reef-Building Corals: A Short Ecology Round — English';
const scienceId = 'trivia-science-nature-starter-en';
const scienceName = 'Science & Nature Essentials — English (25)';
const csv = readFileSync(`public/sample_games/${id}.csv`, 'utf8');
const cards = parseCsv(csv, '|');
const intro = 'https://oceanservice.noaa.gov/education/tutorial_corals/coral01_intro.html';
const algae = 'https://oceanservice.noaa.gov/education/tutorial_corals/coral02_zooxanthellae.html';
const bleaching = 'https://flowergarden.noaa.gov/education/bleaching.html';

function observeRequests(page: Page) {
  const requests: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    requests.push(`${url.origin}${url.pathname}`); // No query identifiers, fragments, cookies or headers.
  });
  return requests;
}

async function verifyRequests(page: Page, info: TestInfo, requests: string[], chosen = [id]) {
  const path = info.outputPath('runtime-request-destinations.json');
  writeFileSync(path, JSON.stringify({ queryAndFragmentOmitted: true, requests }, null, 2));
  await info.attach('runtime-request-destinations', { path, contentType: 'application/json' });
  expect(requests.filter(url => /(^|\.)(noaa\.gov|tvmaze\.com|opentdb\.com|learnclash\.com)$/.test(new URL(url).hostname))).toEqual([]);
  expect(requests.filter(url => url.endsWith('.csv'))).toEqual(chosen.map(deck => new URL(`/flashcards_game/sample_games/${deck}.csv`, page.url()).href));
}

async function expandScience(page: Page) {
  for (const category of ['Trivia', 'Trivia / Science & nature']) {
    const button = page.getByRole('button', { name: `Show decks: ${category}`, exact: true });
    await button.focus();
    await button.press('Enter');
  }
}

for (const width of [1280, 320]) {
  test(`coral ${width} nested keyboard browse preserves direct Science starter alongside child`, async ({ page }, info) => {
    const requests = observeRequests(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    if (width === 320) await page.locator('#sample-games-button').click();
    await expandScience(page);
    const starter = page.getByRole('button', { name: `${scienceName} English content`, exact: true });
    await expect(starter).toBeVisible();
    const child = page.getByRole('button', { name: 'Show decks: Trivia / Science & nature / Coral reefs', exact: true });
    await child.focus();
    await child.press('Enter');
    await expect(page.getByRole('button', { name: `${name} English content`, exact: true })).toBeVisible();
    await expect(starter).toBeVisible();
    await expect(page.getByText('Eligible decks: 24', { exact: true })).toBeVisible();
    expect(requests.filter(url => url.endsWith('.csv'))).toEqual([]);
    if (width === 320) await starter.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`science-parent-child-${width}.png`), fullPage: true, animations: 'disabled' });
    await starter.focus();
    await starter.press('Enter');
    await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${scienceName}`);
    await expect(page.locator('#loaded-deck-heading')).toBeFocused();
    await expect(page.getByText('Cards available: 25', { exact: true })).toBeVisible();
    if (width === 320) await page.locator('#sample-games-button').click();
    const coral = page.getByRole('button', { name: `${name} English content`, exact: true });
    await coral.focus();
    await coral.press('Enter');
    await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${name}`);
    await expect(page.locator('#loaded-deck-heading')).toBeFocused();
    await expect(page.getByText('Cards available: 6', { exact: true })).toBeVisible();
    await expect(page.locator('.game-timer')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath(`coral-ready-${width}.png`), fullPage: true, animations: 'disabled' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await verifyRequests(page, info, requests, [scienceId, id]);
  });

  test(`coral ${width} all six Flip manual ratings and read-only revisit without score inflation`, async ({ page }, info) => {
    const requests = observeRequests(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/?sample_game=${id}`);
    await page.getByRole('button', { name: 'Flip', exact: true }).click();
    const seen = new Set<string>();
    for (let index = 0; index < 6; index++) {
      const question = await page.locator('.flashcard__front .flashcard__content').innerText();
      const card = cards.find(card => card.key === question);
      if (!card) throw new Error(`Unexpected question: ${question}`);
      expect(seen.has(question)).toBe(false);
      seen.add(question);
      await page.locator('.flashcard').click();
      await expect(page.locator('.flashcard__back .flashcard__content')).toHaveText(card.value);
      await page.getByRole('button', { name: index % 2 ? 'Wrong' : 'Correct', exact: true }).click();
      if (index === 0) {
        await page.getByRole('button', { name: 'Previous', exact: true }).click();
        await page.locator('.flashcard').click();
        await expect(page.getByText('Your rating: Correct', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Correct', exact: true })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Wrong', exact: true })).toHaveCount(0);
        await page.getByRole('button', { name: 'Next', exact: true }).click();
      }
    }
    expect(seen.size).toBe(6);
    for (const text of ['Rated 6 of 6', 'Correct: 3', 'Wrong: 3', 'Unrated: 0']) await expect(page.getByText(text, { exact: true })).toBeVisible();
    await verifyRequests(page, info, requests);
  });
}

const variants: Record<string, string[]> = {
  canonical: ['Polyps', 'Calcium carbonate', 'Tentacles', 'Mutualism', 'Photosynthesis', 'No'],
  'trim-case': ['  POLYPS  ', '  CALCIUM CARBONATE  ', '  TENTACLES  ', '  MUTUALISM  ', '  PHOTOSYNTHESIS  ', '  NO  '],
  'rejected-forms': ['Polyp', 'CaCO3', 'Tentacle', 'Symbiosis', 'photo synthesis', 'not necessarily'],
  'rejected-alternatives': ['coral polyps', 'aragonite', 'nematocysts', 'mutualistic', 'photosynthetic', 'false'],
  'rejected-spacing-suffix': ['Polyps extra', 'Calcium  carbonate', 'Tentacles extra', 'Mutualism extra', 'Photosynthesis extra', 'No, it can recover if conditions improve'],
};
for (const [variant, answers] of Object.entries(variants)) {
  test(`coral base-path direct link all six Type ${variant}, 320px long prompt/correction and explicit Next`, async ({ page }, info) => {
    const requests = observeRequests(page);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`/flashcards_game/?sample_game=${id}`);
    await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${name}`);
    await expect(page.locator('.game-timer')).toHaveCount(0);
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    const seen = new Set<string>();
    for (let index = 0; index < 6; index++) {
      const question = await page.locator('.quiz-card__question .flashcard__content').innerText();
      const row = cards.findIndex(card => card.key === question);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(seen.has(question)).toBe(false);
      seen.add(question);
      if (row === 3) await page.screenshot({ path: info.outputPath('long-prompt-320.png'), fullPage: true });
      await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(answers[row]);
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      await expect(page.locator(`.quiz-card__feedback--${variant.startsWith('rejected') ? 'incorrect' : 'correct'}`)).toBeVisible();
      await expect(page.locator('.quiz-card__comparison').last()).toHaveText(`Expected answer: ${cards[row].value}`);
      await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 6`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (row === 3 || (row === 5 && variant === 'rejected-spacing-suffix')) await page.screenshot({ path: info.outputPath(`correction-${row}-320.png`), fullPage: true });
      const next = page.getByRole('button', { name: index === 5 ? 'See results' : 'Next card', exact: true });
      await expect(next).toBeFocused();
      await next.press('Enter');
    }
    expect(seen.size).toBe(6);
    await verifyRequests(page, info, requests);
  });
}

test('coral independently enumerated twenty-four-deck default, 155-deck ancestor, all leaves, history and fiction pools and both bucket edges', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/flashcards_game/src/utils/sample-games.ts';
    const { SAMPLE_GAMES, getEligibleDecks, pickLuckyDeck, groupDecks } = await import(path);
    const scopes = [null, ['trivia'], ['trivia', 'science-nature'], ['trivia', 'science-nature', 'paleontology'], ['trivia', 'science-nature', 'coral-reefs'], ['trivia', 'history'], ['trivia', 'history', 'world'], ['trivia', 'history', 'oceania'], ['trivia', 'history', 'oceania', 'aotearoa-new-zealand'], ['trivia', 'history', 'prehistory'], ['trivia', 'television'], ...['friends', 'how-i-met-your-mother', 'the-walking-dead', 'star-trek-the-original-series'].map(show => ['trivia', 'television', show]), ['trivia', 'film'], ['trivia', 'film', 'star-wars'], ['trivia', 'mythology'], ['study'], ['missing']];
    const counts = [24, 155, 86, 1, 1, 17, 1, 1, 1, 1, 4, 1, 1, 1, 1, 1, 1, 2, 0, 0];
    const ids = (decks: { id: string }[]) => decks.map(deck => deck.id);
    const legacy = SAMPLE_GAMES.filter((deck: { lucky: string }) => deck.lucky === 'never');
    const science = groupDecks(SAMPLE_GAMES).children.get('trivia').children.get('science-nature');
    return {
      scopes,
      counts,
      game: SAMPLE_GAMES[15], total: SAMPLE_GAMES.length,
      pools: scopes.map(scope => ids(getEligibleDecks(scope))),
      edges: scopes.map((scope, i) => Array.from({ length: counts[i] }, (_, bucket) => [(bucket + 0.00001) / counts[i], (bucket + 1) / counts[i] - 0.00001].map(random => pickLuckyDeck(scope, SAMPLE_GAMES, () => random)?.id)).flat()),
      empty: pickLuckyDeck(['missing']), legacyCount: legacy.length,
      excluded: legacy.every((deck: { id: string; categoryPath: string[] }) => [...scopes, deck.categoryPath].every(scope => !ids(getEligibleDecks(scope)).includes(deck.id))),
      direct: ids(science.decks), child: ids(science.children.get('coral-reefs').decks),
    };
  });
  const history = 'trivia-world-history-short-round-en';
  const waitangi = 'trivia-waitangi-signing-documents-en';
  const base = [scienceId, 'trivia-space-astronomy-essentials-en', 'trivia-world-geography-starter-en', history, 'trivia-human-origins-starter-en', 'trivia-sports-rules-milestones-en', 'trivia-food-ingredients-en'];
  const tv = ['trivia-friends-cast-production-en', 'trivia-himym-cast-production-en', 'trivia-twd-cast-production-en', 'trivia-star-trek-tos-cast-production-en'];
  const starWars = 'trivia-star-wars-original-production-en';
  const myth = 'trivia-mythology-names-symbols-en';
  const underworld = 'trivia-greek-underworld-afterlife-en';
  const woodblock = 'trivia-japanese-woodblock-prints-en';
  const bodyClocks = 'trivia-human-body-clocks-en';
  const cellBiology = 'trivia-cell-biology-essentials-en';
  const earthScience = 'trivia-rocks-faults-volcanoes-en';
  const water = 'trivia-water-landscapes-en';
  const plant = 'trivia-plant-adaptations-reproduction-en';
  expect(result.pools).toEqual(result.scopes.map(scope => release021Pool(scope)));
  expect(result.edges).toEqual(release021EdgeDraws(result.scopes, result.counts));
  expect(result.game).toEqual({ id, name, categoryPath: ['trivia', 'science-nature', 'coral-reefs'], language: 'en', lucky: 'default', separator: '|' });
  expect(result.total).toBe(162);
  expect(result.legacyCount).toBe(7);
  expect(result.excluded).toBe(true);
  expect(result.empty).toBeNull();
  expect(result.direct).toEqual(expect.arrayContaining([scienceId, 'b00-science-technology']));
  expect(result.child).toEqual([id]);
});

for (const scope of ['General', 'Trivia', 'Science & nature', 'Coral reefs']) {
  test(`coral real ${scope} Lucky loads one whole CSV; search and disclosure never opt in fiction`, async ({ page }, info) => {
    const requests = observeRequests(page);
    await page.goto('/');
    await expandScience(page);
    if (scope !== 'General') await page.getByRole('button', { name: scope, exact: true }).click();
    await page.locator('#sample-search').fill('Star Wars');
    await expect(page.getByText(`Eligible decks: ${scope === 'General' ? 24 : scope === 'Trivia' ? 155 : scope === 'Science & nature' ? 86 : 1}`, { exact: true })).toBeVisible();
    await page.evaluate(draw => { Math.random = () => draw; }, scope === 'General' ? 8.5 / 24 : scope === 'Trivia' ? 15.5 / 155 : scope === 'Science & nature' ? 3.5 / 86 : 0.99);
    await page.getByRole('button', { name: 'I’m feeling lucky' }).click();
    await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${name}`);
    await expect(page.locator('.catalog-notice')).toContainText(`Lucky picked “${name}”`);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('flashcards_dictionary') || 'null'))).toEqual([...cards].sort((a, b) => a.key.localeCompare(b.key)));
    for (const mode of ['Flip', 'Type']) await expect(page.getByRole('button', { name: mode, exact: true })).toBeEnabled();
    await expect(page.locator('.game-timer')).toHaveCount(0);
    await verifyRequests(page, info, requests);
  });
}

for (const locale of ['en', 'de', 'es', 'pt', 'ar', 'fa', 'tr', 'ms', 'th', 'vi', 'zh-Hans', 'ja']) {
  test(`coral ${locale} localized leaf and complete inventory retain English card content`, async ({ page }) => {
    const copy = JSON.parse(readFileSync(`src/i18n/locales/${locale}.json`, 'utf8'));
    await page.goto(`/?lang=${locale}&sample_game=${id}`);
    await expect(page.getByText(copy.catalog.inventory.replace('{count}', '162'), { exact: true })).toBeVisible();
    await page.locator('#sample-search').fill(copy.categories['coral-reefs']);
    await expect(page.getByText(`${copy.categories.trivia} / ${copy.categories['science-nature']} / ${copy.categories['coral-reefs']}`, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `${name} ${copy.catalog.english}`, exact: false })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('flashcards_dictionary') || 'null'))).toEqual([...cards].sort((a, b) => a.key.localeCompare(b.key)));
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
