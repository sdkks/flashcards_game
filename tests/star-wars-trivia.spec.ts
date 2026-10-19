import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';
import { release021EdgeDraws, release021Pool } from './release-021-pool-fixtures';

const id = 'trivia-star-wars-original-production-en';
const name = 'Star Wars: A New Hope — Original Production — English';
const csv = readFileSync(`public/sample_games/${id}.csv`, 'utf8');
const cards = parseCsv(csv, '|');
const productionUrl = 'https://www.starwars.com/news/star-wars-50-filming-begins';
const producerUrl = 'https://www.starwars.com/news/gary-kurtz-passes-away';
const identityUrl = 'https://www.starwars.com/news/star-wars-50th-anniversary-theatrical-release';
const filmUrl = 'https://www.starwars.com/films/star-wars-episode-iv-a-new-hope';

function observeRequests(page: Page) {
  const requests: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    requests.push(`${url.origin}${url.pathname}`); // Omit query/fragment identifiers, including analytics.
  });
  return requests;
}

async function verifyRequests(page: Page, info: TestInfo, requests: string[], chosenId = id) {
  const path = info.outputPath('runtime-request-destinations.json');
  writeFileSync(path, JSON.stringify({ queryAndFragmentOmitted: true, requests }, null, 2));
  await info.attach('runtime-request-destinations', { path, contentType: 'application/json' });
  expect(requests.filter(url => /(^|\.)(starwars\.com|disney\.com|disneyplus\.com|disneytermsofuse\.com|lucasfilm\.com|wikidata\.org|wikimedia\.org|tvmaze\.com|opentdb\.com|learnclash\.com)$/.test(new URL(url).hostname))).toEqual([]);
  expect(requests.filter(url => url.endsWith('.csv'))).toEqual([new URL(`/flashcards_game/sample_games/${chosenId}.csv`, page.url()).href]);
}

test('public catalog keeps the current inventory and Lucky scope', () => {
  const readme = readFileSync('docs/trivia-catalog.md', 'utf8');
  expect(readme).toContain('One hundred fifty-five bundled English trivia decks contain **4,264 questions**');
  expect(readme).toContain('**Star Wars: A New Hope — Original Production** — 6 questions');
  expect(readme).toContain('**Trivia** includes all 155 trivia decks');
  expect(readme).toContain('Searching or expanding categories alone does not change the Lucky scope');
  expect(readme).not.toMatch(/(?:staging|ledger|candidate|answer_target|B\d{2}-\d{4}|(?:TASK|BUG|STORY|EPIC|SPEC|RELEASE)[-_ ]?\d+)/i);
});

test('public license summary keeps source terms and omits internal provenance', () => {
  const readme = readFileSync('docs/content-licenses.md', 'utf8');
  expect(readme).toContain('155 English trivia CSVs');
  expect(readme).toContain('53 LearnClash adaptations, 14 OpenTDB adaptations, 33 TVmaze-derived records and 4,164 original contributor questions');
  expect(readme).toContain('421 previously summarized plus 3,743 newly integrated contributor-authored cards');
  expect(53 + 14 + 33 + 4164).toBe(4264);
  expect(readme).toContain('Credit Open Trivia Database / PixelTail Games');
  expect(readme).toContain('Credit LearnClash / Pluxia GmbH');
  expect(readme).toContain('Credit TVmaze and Flashcards Game contributors');
  expect(readme).toContain('CC BY-SA 4.0');
  expect(readme).toContain('original contributor wording, selection and arrangement');
  expect(readme).toContain('CC BY 4.0');
  expect(readme).toContain('../public/sample_games/starter-trivia-notices.html');
  expect(readme).not.toMatch(/(?:staging|ledger|candidate|answer_target|B\d{2}-\d{4}|(?:TASK|BUG|STORY|EPIC|SPEC|RELEASE)[-_ ]?\d+)/i);
});

test('Trivia → Film → Star Wars: one CSV, all six manual Flip ratings and no provider HTTP', async ({ page }, info) => {
  const requests = observeRequests(page);
  await page.goto('/');
  for (const category of ['Trivia', 'Trivia / Film', 'Trivia / Film / Star Wars']) {
    await page.getByRole('button', { name: `Show decks: ${category}`, exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Lucky: General trivia', exact: true })).toBeVisible();
  await expect(page.getByText('Eligible decks: 24', { exact: true })).toBeVisible();
  expect(requests.filter(url => url.endsWith('.csv'))).toEqual([]);
  await page.getByRole('button', { name: `${name} English content`, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`sample_game=${id}`));
  await expect(page.locator('#loaded-deck-heading')).toBeFocused();
  await expect(page.locator('#loaded-deck-heading')).toHaveText(`Sample: ${name}`);
  await expect(page.getByText('Cards available: 6', { exact: true })).toBeVisible();
  await expect(page.locator('.game-timer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Type', exact: true })).toBeEnabled();
  await page.screenshot({ path: info.outputPath('star-wars-browse-ready.png'), fullPage: true });
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  const seen = new Set<string>();
  for (let index = 0; index < 6; index++) {
    await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 6`);
    const question = await page.locator('.flashcard__front .flashcard__content').innerText();
    const card = cards.find(card => card.key === question);
    if (!card) throw new Error(`Unexpected production question: ${question}`);
    expect(seen.has(question)).toBe(false);
    seen.add(question);
    await page.locator('.flashcard').click();
    await expect(page.locator('.flashcard__back .flashcard__content')).toHaveText(card.value);
    await page.getByRole('button', { name: index % 2 ? 'Wrong' : 'Correct', exact: true }).click();
  }
  expect(seen.size).toBe(6);
  await expect(page.getByRole('heading', { name: 'Your self-rated results' })).toBeVisible();
  for (const text of ['Rated 6 of 6', 'Correct: 3', 'Wrong: 3', 'Unrated: 0']) await expect(page.getByText(text, { exact: true })).toBeVisible();
  await verifyRequests(page, info, requests);
  await page.screenshot({ path: info.outputPath('star-wars-flip-complete.png'), fullPage: true });
});

for (const variant of ['canonical', 'trim-case', 'rejected', 'internal-spaces']) {
  test(`Star Wars nested-base direct link: all six Type answers ${variant}, mobile prompt/correction and explicit Next`, async ({ page }, info) => {
    const requests = observeRequests(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/flashcards_game/?sample_game=${id}`);
    await expect(page.getByText('Cards available: 6', { exact: true })).toBeVisible();
    await expect(page.locator('.game-timer')).toHaveCount(0);
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    const rejected: Record<string, string> = {
      'George Lucas': 'Lucas', 'Gary Kurtz': 'GK', 'John Williams': 'John Wiliams',
      'Ben Burtt': 'Burtt', 'Gil Taylor': 'Gilbert Taylor', 'Tunisia': 'Tunis',
    };
    const wrong = variant === 'rejected' || variant === 'internal-spaces';
    const seen = new Set<string>();
    for (let index = 0; index < 6; index++) {
      await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 6`);
      const question = await page.locator('.quiz-card__question .flashcard__content').innerText();
      const card = cards.find(card => card.key === question);
      if (!card) throw new Error(`Unexpected production question: ${question}`);
      expect(seen.has(question)).toBe(false);
      seen.add(question);
      if (card.value === 'Gil Taylor') await page.screenshot({ path: info.outputPath(`gil-prompt-${variant}.png`), fullPage: true });
      const answer = variant === 'rejected' ? rejected[card.value] : variant === 'internal-spaces' ? card.value === 'Tunisia' ? 'Tuni sia' : card.value.replace(' ', '  ') : variant === 'trim-case' ? `  ${card.value.toUpperCase()}  ` : card.value;
      await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(answer);
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      await expect(page.locator(`.quiz-card__feedback--${wrong ? 'incorrect' : 'correct'}`)).toBeVisible();
      await expect(page.locator('.quiz-card__comparison').last()).toHaveText(`Expected answer: ${card.value}`);
      await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 6`);
      if (card.value === 'Gil Taylor') {
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.screenshot({ path: info.outputPath(`gil-correction-${variant}.png`), fullPage: true });
      }
      await page.getByRole('button', { name: index === 5 ? 'See results' : 'Next card', exact: true }).click();
    }
    expect(seen.size).toBe(6);
    await verifyRequests(page, info, requests);
  });
}

test('Star Wars registry: independent default, Trivia, Film/Star Wars, TV, shows/Mythology and all bucket edges', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/flashcards_game/src/utils/sample-games.ts';
    const { SAMPLE_GAMES, getEligibleDecks, pickLuckyDeck, getSampleGameUrl } = await import(path);
    const ids = (decks: { id: string }[]) => decks.map(deck => deck.id);
    const scopes = [null, ['trivia'], ['trivia', 'film'], ['trivia', 'film', 'star-wars'], ['trivia', 'television'], ['trivia', 'television', 'friends'], ['trivia', 'television', 'how-i-met-your-mother'], ['trivia', 'television', 'the-walking-dead'], ['trivia', 'television', 'star-trek-the-original-series'], ['trivia', 'mythology']];
    const counts = [24, 155, 1, 1, 4, 1, 1, 1, 1, 2];
    const legacy = SAMPLE_GAMES.filter((deck: { lucky: string }) => deck.lucky === 'never');
    return {
      scopes,
      counts,
      game: SAMPLE_GAMES[13], url: getSampleGameUrl(SAMPLE_GAMES[13]), total: SAMPLE_GAMES.length,
      pools: scopes.map(scope => ids(getEligibleDecks(scope))),
      draws: scopes.map((scope, i) => {
        const count = counts[i]
        return Array.from({ length: count }, (_, bucket) => [(bucket + 0.00001) / count, (bucket + 1) / count - 0.00001].map(random => pickLuckyDeck(scope, SAMPLE_GAMES, () => random)?.id)).flat();
      }),
      legacyCount: legacy.length,
      legacyExcluded: legacy.every((deck: { id: string; categoryPath: string[] }) => [...scopes, deck.categoryPath].every(scope => !ids(getEligibleDecks(scope)).includes(deck.id))),
    };
  });
  const defaults = ['trivia-science-nature-starter-en', 'trivia-space-astronomy-essentials-en', 'trivia-world-geography-starter-en', 'trivia-world-history-short-round-en', 'trivia-human-origins-starter-en', 'trivia-sports-rules-milestones-en', 'trivia-food-ingredients-en', 'trivia-waitangi-signing-documents-en', 'trivia-reef-building-corals-en'];
  const television = ['trivia-friends-cast-production-en', 'trivia-himym-cast-production-en', 'trivia-twd-cast-production-en', 'trivia-star-trek-tos-cast-production-en'];
  const mythology = ['trivia-mythology-names-symbols-en', 'trivia-greek-underworld-afterlife-en'];
  const ancestor = ['trivia-science-nature-starter-en', 'trivia-chemistry-foundations-en', 'trivia-space-astronomy-essentials-en', 'trivia-world-geography-starter-en', 'trivia-world-history-short-round-en', 'trivia-human-origins-starter-en', 'trivia-sports-rules-milestones-en', 'trivia-food-ingredients-en', 'trivia-mythology-names-symbols-en', ...television, id, 'trivia-waitangi-signing-documents-en', 'trivia-reef-building-corals-en'];
  defaults.push('trivia-japanese-woodblock-prints-en', 'trivia-human-body-clocks-en', 'trivia-rocks-faults-volcanoes-en', 'trivia-cell-biology-essentials-en', 'trivia-water-landscapes-en', 'trivia-flight-aviation-history-en', 'trivia-railway-engineering-world-railways-en', 'trivia-bicycles-motorcycles-en', 'trivia-ancient-civilizations-en', 'trivia-medieval-castles-tournaments-en', 'trivia-invertebrates-body-plans-en', 'trivia-world-cities-transit-landmarks-en');
  defaults.push('trivia-literature-authors-characters-forms-en', 'trivia-body-science-medical-history-imaging-en', 'trivia-light-optics-telescopes-en');
  ancestor.push('trivia-japanese-woodblock-prints-en', 'trivia-human-body-clocks-en', 'trivia-rocks-faults-volcanoes-en', 'trivia-dinosaurs-fossils-mesozoic-en', 'trivia-plant-adaptations-reproduction-en', 'trivia-cell-biology-essentials-en', 'trivia-water-landscapes-en', 'trivia-greek-underworld-afterlife-en', 'trivia-flight-aviation-history-en', 'trivia-car-engines-vehicle-engineering-en', 'trivia-railway-engineering-world-railways-en', 'trivia-bicycles-motorcycles-en', 'trivia-ancient-civilizations-en', 'trivia-medieval-castles-tournaments-en', 'trivia-invertebrates-body-plans-en', 'trivia-world-cities-transit-landmarks-en');
  ancestor.push('trivia-literature-authors-characters-forms-en', 'trivia-body-science-medical-history-imaging-en', 'trivia-light-optics-telescopes-en');
  expect(result.pools).toEqual(result.scopes.map(scope => release021Pool(scope)));
  expect(result.draws).toEqual(release021EdgeDraws(result.scopes, result.counts));
  expect(result.pools[4]).not.toContain(id);
  expect(result.total).toBe(162);
  expect(result.legacyCount).toBe(7);
  expect(result.legacyExcluded).toBe(true);
  expect(result.game).toEqual({ id, name, categoryPath: ['trivia', 'film', 'star-wars'], language: 'en', lucky: 'category', separator: '|' });
  expect(result.url).toBe(`/flashcards_game/sample_games/${id}.csv`);
});

for (const scope of ['General', 'Trivia', 'Film', 'Star Wars']) {
  test(`Star Wars disclosure/search is not opt-in: ${scope} Lucky loads one deck before mode choice`, async ({ page }, info) => {
    const requests = observeRequests(page);
    await page.goto('/');
    for (const category of ['Trivia', 'Trivia / Film', 'Trivia / Film / Star Wars']) await page.getByRole('button', { name: `Show decks: ${category}`, exact: true }).click();
    if (scope !== 'General') await page.getByRole('button', { name: scope, exact: true }).click();
    await page.locator('#sample-search').fill('Star Wars');
    await expect(page.getByRole('button', { name, exact: false })).toBeVisible();
    await expect(page.getByText(`Eligible decks: ${scope === 'General' ? 24 : scope === 'Trivia' ? 155 : 1}`, { exact: true })).toBeVisible();
    await page.evaluate(draw => { Math.random = () => draw; }, scope === 'General' ? 6.5 / 24 : scope === 'Trivia' ? 13.5 / 155 : 0.99);
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
    await verifyRequests(page, info, requests, chosenId);
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
