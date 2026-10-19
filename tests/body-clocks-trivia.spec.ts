import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';
import { release021EdgeDraws, release021Pool } from './release-021-pool-fixtures';

const id = 'trivia-human-body-clocks-en';
const name = 'Human Body Clocks: Timing and Signals — English';
const csv = readFileSync(`public/sample_games/${id}.csv`, 'utf8');
const cards = parseCsv(csv, '|');
const science = { id: 'trivia-science-nature-starter-en', name: 'Science & Nature Essentials — English (25)' };
const coral = { id: 'trivia-reef-building-corals-en', name: 'Reef-Building Corals: A Short Ecology Round — English' };
const sources = [
  'https://nigms.nih.gov/biobeat/2015/10/turning-back-every-clock',
  'https://nigms.nih.gov/biobeat/2023/07/why-am-i-so-tired',
  'https://nigms.nih.gov/biobeat/2014/10/4-timely-facts-about-our-biological-clocks',
];

function observeRequests(page: Page) {
  const requests: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    requests.push(`${url.origin}${url.pathname}`); // Omit query IDs, fragments, headers and cookies.
  });
  return requests;
}

async function verifyRequests(page: Page, info: TestInfo, requests: string[], chosen = [id]) {
  const path = info.outputPath('runtime-request-destinations.json');
  writeFileSync(path, JSON.stringify({ queryAndFragmentOmitted: true, requests }, null, 2));
  await info.attach('runtime-request-destinations', { path, contentType: 'application/json' });
  expect(requests.filter(url => /(^|\.)(nigms\.nih\.gov|noaa\.gov|clevelandart\.org|tvmaze\.com|opentdb\.com|learnclash\.com|starwars\.com)$/.test(new URL(url).hostname))).toEqual([]);
  expect(requests.filter(url => url.endsWith('.csv'))).toEqual(chosen.map(deck => new URL(`/flashcards_game/sample_games/${deck}.csv`, page.url()).href));
}

async function expandScience(page: Page) {
  for (const category of ['Trivia', 'Trivia / Science & nature', 'Trivia / Science & nature / Coral reefs', 'Trivia / Science & nature / Body clocks']) {
    const disclosure = page.getByRole('button', { name: `Show decks: ${category}`, exact: true });
    await disclosure.focus();
    await disclosure.press('Enter');
  }
}

for (const width of [1280, 320]) {
  test(`body clocks ${width} nested Science keyboard browse keeps direct starter and both children loadable`, async ({ page }, info) => {
    const requests = observeRequests(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    if (width === 320) await page.locator('#sample-games-button').click();
    await expandScience(page);
    await expect(page.getByText('Eligible decks: 24', { exact: true })).toBeVisible();
    for (const deck of [science, coral, { id, name }]) await expect(page.getByRole('button', { name: `${deck.name} English content`, exact: true })).toBeVisible();
    expect(requests.filter(url => url.endsWith('.csv'))).toEqual([]);
    await page.getByRole('button', { name: `${name} English content`, exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`nested-science-${width}.png`), fullPage: true, animations: 'disabled' });
    // Three deliberate selections, each loading only its own complete CSV; no startup bulk load.
    for (const [index, deck] of [science, coral, { id, name }].entries()) {
      if (width === 320 && index > 0) await page.locator('#sample-games-button').click();
      const button = page.getByRole('button', { name: `${deck.name} English content`, exact: true });
      await button.focus();
      await button.press('Enter');
      await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${deck.name}`);
      await expect(page.locator('#loaded-deck-heading')).toBeFocused();
      const expected = parseCsv(readFileSync(`public/sample_games/${deck.id}.csv`, 'utf8'), '|');
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('flashcards_dictionary') || 'null'))).toEqual(expected.sort((a, b) => a.key.localeCompare(b.key)));
      await expect(page.locator('.game-timer')).toHaveCount(0);
      for (const mode of ['Flip', 'Type']) await expect(page.getByRole('button', { name: mode, exact: true })).toBeEnabled();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await verifyRequests(page, info, requests, [science.id, coral.id, id]);
  });

  test(`body clocks ${width} all five Flip reveals, manual ratings, read-only revisit and odd-count results`, async ({ page }, info) => {
    const requests = observeRequests(page);
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/?sample_game=${id}`);
    await page.getByRole('button', { name: 'Flip', exact: true }).click();
    const seen = new Set<string>();
    for (let index = 0; index < 5; index++) {
      const question = await page.locator('.flashcard__front .flashcard__content').innerText();
      const card = cards.find(card => card.key === question);
      if (!card) throw new Error(`Unexpected question: ${question}`);
      expect(seen.has(question)).toBe(false);
      seen.add(question);
      await expect(page.getByRole('button', { name: 'Correct', exact: true })).toHaveCount(0);
      expect(await page.locator('.flashcard__front').evaluate(el => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.locator('.flashcard').click();
      await expect(page.locator('.flashcard__back')).toHaveAttribute('aria-hidden', 'false');
      await expect(page.locator('.flashcard__back .flashcard__content')).toHaveText(card.value);
      const rating = page.getByRole('button', { name: index % 2 ? 'Wrong' : 'Correct', exact: true });
      expect((await rating.boundingBox())?.height).toBeGreaterThanOrEqual(48);
      await rating.click();
      if (index === 0) {
        await page.getByRole('button', { name: 'Previous', exact: true }).click();
        await page.locator('.flashcard').click();
        await expect(page.getByText('Your rating: Correct', { exact: true })).toBeVisible();
        for (const label of ['Correct', 'Wrong']) await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
        await page.getByRole('button', { name: 'Next', exact: true }).click();
      }
    }
    expect(seen.size).toBe(5);
    for (const text of ['Rated 5 of 5', 'Correct: 3', 'Wrong: 2', 'Unrated: 0']) await expect(page.getByText(text, { exact: true })).toBeVisible();
    await verifyRequests(page, info, requests);
  });
}

const variants: Record<string, string[]> = {
  canonical: ['24', 'Brain', 'Sunlight', 'Feedback loop', 'No'],
  'trim-case': ['  24  ', '  BRAIN  ', '  SUNLIGHT  ', '  FEEDBACK LOOP  ', '  NO  '],
  'rejected-words': ['24 hours', 'The brain', 'Sun', 'Feedback', 'Nope'],
  'rejected-subtypes': ['Twenty-four', 'hypothalamus', 'Daylight', 'negative feedback loop', 'false'],
  'rejected-hyphen': ['24 hours', 'SCN', 'Sun light', 'feedback-loop', 'No, they do not stop'],
  'rejected-spacing': ['Twenty-four', 'The brain', 'Light', 'Feedback  loop', 'Nope'],
};
for (const [variant, answers] of Object.entries(variants)) {
  test(`body clocks base-path all five Type ${variant}, 320px correction and deliberate Next`, async ({ page }, info) => {
    const requests = observeRequests(page);
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto(`/flashcards_game/?sample_game=${id}`);
    await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${name}`);
    await expect(page.locator('.game-timer')).toHaveCount(0);
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    const seen = new Set<string>();
    for (let index = 0; index < 5; index++) {
      const question = await page.locator('.quiz-card__question .flashcard__content').innerText();
      const row = cards.findIndex(card => card.key === question);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(seen.has(question)).toBe(false);
      seen.add(question);
      if (row === 2) await page.screenshot({ path: info.outputPath('long-prompt-320.png'), fullPage: true, animations: 'disabled' });
      await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(answers[row]);
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      await expect(page.locator(`.quiz-card__feedback--${variant.startsWith('rejected') ? 'incorrect' : 'correct'}`)).toBeVisible();
      await expect(page.locator('.quiz-card__comparison').last()).toHaveText(`Expected answer: ${cards[row].value}`);
      await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 5`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (row === 2 || row === 3) await page.screenshot({ path: info.outputPath(`correction-${row}-320.png`), fullPage: true, animations: 'disabled' });
      const next = page.getByRole('button', { name: index === 4 ? 'See results' : 'Next card', exact: true });
      await expect(next).toBeFocused();
      await next.press('Enter');
    }
    expect(seen.size).toBe(5);
    await expect(page.getByText(`Correct: ${variant.startsWith('rejected') ? 0 : 5}`, { exact: true })).toBeVisible();
    await verifyRequests(page, info, requests);
  });
}

test('body clocks independent twenty-four/one hundred fifty-five/Science 86/leaf one, all real scopes, both bucket edges and seven legacy exclusions', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/flashcards_game/src/utils/sample-games.ts';
    const { SAMPLE_GAMES, getEligibleDecks, pickLuckyDeck, getSampleGameUrl, groupDecks } = await import(path);
    const scopes = [null, ['trivia'], ['trivia', 'science-nature'], ['trivia', 'science-nature', 'paleontology'], ['trivia', 'science-nature', 'body-clocks'], ['trivia', 'science-nature', 'coral-reefs'], ['trivia', 'arts'], ['trivia', 'arts', 'japanese-woodblock-prints'], ['trivia', 'history'], ['trivia', 'history', 'world'], ['trivia', 'history', 'oceania'], ['trivia', 'history', 'oceania', 'aotearoa-new-zealand'], ['trivia', 'history', 'prehistory'], ['trivia', 'geography'], ['trivia', 'geography', 'world'], ['trivia', 'geography', 'water-landscapes'], ['trivia', 'geography', 'cities'], ['trivia', 'sports'], ['trivia', 'food'], ['trivia', 'television'], ...['friends', 'how-i-met-your-mother', 'the-walking-dead', 'star-trek-the-original-series'].map(show => ['trivia', 'television', show]), ['trivia', 'film'], ['trivia', 'film', 'star-wars'], ['trivia', 'mythology'], ['study'], ['missing']];
    const counts = [24, 155, 86, 1, 1, 1, 2, 1, 17, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 4, 1, 1, 1, 1, 1, 1, 2, 0, 0];
    const ids = (decks: { id: string }[]) => decks.map(deck => deck.id);
    const legacy = SAMPLE_GAMES.filter((deck: { lucky: string }) => deck.lucky === 'never');
    const scienceGroup = groupDecks(SAMPLE_GAMES).children.get('trivia').children.get('science-nature');
    return {
      scopes,
      counts,
      game: SAMPLE_GAMES[17], total: SAMPLE_GAMES.length, url: getSampleGameUrl(SAMPLE_GAMES[17]),
      pools: scopes.map(scope => ids(getEligibleDecks(scope))),
      edges: scopes.map((scope, i) => Array.from({ length: counts[i] }, (_, bucket) => [(bucket + 0.00001) / counts[i], (bucket + 1) / counts[i] - 0.00001].map(random => pickLuckyDeck(scope, SAMPLE_GAMES, () => random)?.id)).flat()),
      empty: [pickLuckyDeck(['missing']), pickLuckyDeck(['study'])], legacyCount: legacy.length,
      excluded: legacy.every((deck: { id: string; categoryPath: string[] }) => [...scopes, deck.categoryPath].every(scope => !ids(getEligibleDecks(scope)).includes(deck.id))),
      direct: ids(scienceGroup.decks), children: [...scienceGroup.children.keys()],
    };
  });
  const geography = 'trivia-world-geography-starter-en';
  const history = 'trivia-world-history-short-round-en';
  const sports = 'trivia-sports-rules-milestones-en';
  const food = 'trivia-food-ingredients-en';
  const waitangi = 'trivia-waitangi-signing-documents-en';
  const woodblock = 'trivia-japanese-woodblock-prints-en';
  const base = [science.id, 'trivia-space-astronomy-essentials-en', geography, history, 'trivia-human-origins-starter-en', sports, food];
  const tv = ['trivia-friends-cast-production-en', 'trivia-himym-cast-production-en', 'trivia-twd-cast-production-en', 'trivia-star-trek-tos-cast-production-en'];
  const starWars = 'trivia-star-wars-original-production-en';
  const myth = 'trivia-mythology-names-symbols-en';
  const underworld = 'trivia-greek-underworld-afterlife-en';
  const cellBiology = 'trivia-cell-biology-essentials-en';
  const earthScience = 'trivia-rocks-faults-volcanoes-en';
  const water = 'trivia-water-landscapes-en';
  expect(result.pools).toEqual(result.scopes.map(scope => release021Pool(scope)));
  expect(result.edges).toEqual(release021EdgeDraws(result.scopes, result.counts));
  expect(result.game).toEqual({ id, name, categoryPath: ['trivia', 'science-nature', 'body-clocks'], language: 'en', lucky: 'default', separator: '|' });
  expect(result.total).toBe(162);
  expect(result.url).toBe(`/flashcards_game/sample_games/${id}.csv`);
  expect(result.legacyCount).toBe(7);
  expect(result.excluded).toBe(true);
  expect(result.empty).toEqual([null, null]);
  expect(result.direct).toEqual([science.id, 'b00-science-technology']);
  expect(result.children).toEqual(expect.arrayContaining(['chemistry', 'space', 'coral-reefs', 'body-clocks', 'earth-science', 'paleontology', 'botany', 'cell-biology', 'invertebrates', 'medical-history-imaging', 'optics']));
});

for (const scope of ['General', 'Trivia', 'Science & nature', 'Body clocks']) {
  test(`body clocks real ${scope} Lucky selects one whole CSV; search/disclosure never opts in fiction`, async ({ page }, info) => {
    const requests = observeRequests(page);
    await page.goto('/');
    await expandScience(page);
    await page.getByRole('button', { name: 'Show decks: Trivia / Film', exact: true }).click();
    if (scope !== 'General') await page.getByRole('button', { name: scope, exact: true }).click();
    await page.locator('#sample-search').fill('Star Wars');
    await expect(page.getByText(`Eligible decks: ${scope === 'General' ? 24 : scope === 'Trivia' ? 155 : scope === 'Science & nature' ? 86 : 1}`, { exact: true })).toBeVisible();
    await page.evaluate(draw => { Math.random = () => draw; }, scope === 'General' ? 10.5 / 24 : scope === 'Trivia' ? 17.5 / 155 : scope === 'Science & nature' ? 4.5 / 86 : 0.99);
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
  test(`body clocks ${locale} localized label and inventory retain English cards without autostart`, async ({ page }, info) => {
    const copy = JSON.parse(readFileSync(`src/i18n/locales/${locale}.json`, 'utf8'));
    await page.goto(`/?lang=${locale}&sample_game=${id}`);
    await expect(page.getByText(copy.catalog.inventory.replace('{count}', '162'), { exact: true })).toBeVisible();
    await page.locator('#sample-search').fill(copy.categories['body-clocks']);
    await expect(page.getByText(`${copy.categories.trivia} / ${copy.categories['science-nature']} / ${copy.categories['body-clocks']}`, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: `${name} ${copy.catalog.english}`, exact: false })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('flashcards_dictionary') || 'null'))).toEqual([...cards].sort((a, b) => a.key.localeCompare(b.key)));
    await expect(page.locator('.game-timer')).toHaveCount(0);
    if (locale === 'ar' || locale === 'fa') {
      // The existing picker applies direction; URL initialization selects copy only.
      await page.getByRole('button', { name: copy.app.language, exact: true }).click();
      await page.getByText(locale === 'ar' ? 'العربية' : 'فارسی', { exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      expect(await page.locator('.catalog').evaluate(el => getComputedStyle(el).direction)).toBe('rtl');
      await page.screenshot({ path: info.outputPath(`localized-${locale}.png`), fullPage: true, animations: 'disabled' });
    }
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
