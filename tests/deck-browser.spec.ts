import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';
import { openBrowser, selectDeck, confirmSwitch } from './deck-browser.helpers';

const science = { id: 'trivia-science-nature-starter-en', name: 'Science & Nature Essentials — English (25)' };
const space = { id: 'trivia-space-astronomy-essentials-en', name: 'Space & Astronomy Essentials — English (25)' };
const geography = { id: 'trivia-world-geography-starter-en', name: 'World Geography: A Short Round — English (5)' };
const history = { id: 'trivia-world-history-short-round-en', name: 'World History: A Short Round — English (10)' };
const sports = { id: 'trivia-sports-rules-milestones-en', name: 'Sports: Rules and Milestones — English (9)' };
const food = { id: 'trivia-food-ingredients-en', name: 'Food: Ingredients and Kitchen Basics — English (8)' };
const waitangi = { id: 'trivia-waitangi-signing-documents-en' };
const coral = { id: 'trivia-reef-building-corals-en' };
const woodblock = { id: 'trivia-japanese-woodblock-prints-en' };
const bodyClocks = { id: 'trivia-human-body-clocks-en' };
const spanish = { id: 'Spanish-to-English-Common-Terms', name: 'Spanish to English — 300 Common Terms' };
const toy = [{ key: 'My question', value: 'My answer' }];
const changed = 'Cards changed while this request was pending. Nothing was replaced. Retry to use the current cards.';
const storage = (page: Page) => page.evaluate(() => localStorage.getItem('flashcards_dictionary'));
const confirmation = (page: Page) => page.getByRole('dialog', { name: 'Replace current cards?', exact: true });

async function local(page: Page) {
  await page.addInitScript(cards => {
    localStorage.setItem('flashcards_dictionary', JSON.stringify(cards));
    localStorage.setItem('flashcards_timer_minutes', '1');
  }, toy);
  await page.goto('/');
}

function heldResponse(page: Page, id: string, body?: string) {
  let release = () => {};
  let requested = () => {};
  const waiting = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { requested = resolve; });
  const setup = page.route(`**/sample_games/${id}.csv`, async route => {
    requested();
    await waiting;
    await route.fulfill({ contentType: 'text/csv', body: body ?? readFileSync(`public/sample_games/${id}.csv`, 'utf8') });
  });
  return { release, started, setup };
}

test('desktop nested navigation, independent category/search/expansion, selected-only CSV fetch and focus', async ({ page }, testInfo) => {
  const files: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.csv')) files.push(request.url()); });
  await page.goto('/?lang=en');
  await expect(page.locator('.deck-sidebar')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#sample-search')).toHaveCount(1);
  await expect(page.getByRole('button', { name: geography.name })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show decks: Trivia', exact: true }).click();
  await page.getByRole('button', { name: 'Show decks: Trivia / Geography', exact: true }).click();
  await page.getByRole('button', { name: 'Show decks: Trivia / Geography / World', exact: true }).click();
  await expect(page.getByRole('button', { name: geography.name })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lucky: General trivia' })).toBeVisible();
  await page.getByRole('button', { name: 'Geography', exact: true }).click();
  await expect(page.getByText('Eligible decks: 9', { exact: true })).toBeVisible();
  await page.locator('#sample-search').fill('Science');
  await expect(page.getByRole('heading', { name: 'Lucky: Trivia / Geography and subcategories' })).toBeVisible();
  await expect(page.getByRole('button', { name: science.name })).toBeVisible();
  await expect(page.getByText('Trivia / Science & nature', { exact: true }).last()).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByRole('button', { name: geography.name })).toBeVisible();
  expect(files).toEqual([]);
  await page.getByRole('button', { name: geography.name }).click();
  await expect(page.locator('#loaded-deck-heading')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Flip', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Type', exact: true })).toBeEnabled();
  await expect(page.locator('.game-timer')).toHaveCount(0);
  expect(files).toHaveLength(1);
  expect(files[0]).toContain(`${geography.id}.csv`);
  expect(page.url()).toContain('lang=en');
  expect(page.url()).toContain(`sample_game=${geography.id}`);
  await expect(page.getByRole('button', { name: geography.name })).toHaveAttribute('aria-current', 'true');
  await page.locator('#sample-search').fill('does not exist');
  await expect(page.locator('.catalog__current')).toContainText(geography.name);
  await expect(page.getByText('No matching decks', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('desktop-search-current.png'), fullPage: true, animations: 'disabled' });
  console.log('Selected CSV requests:', JSON.stringify(files));
  await testInfo.attach('selected-file-requests', { body: JSON.stringify(files), contentType: 'application/json' });
  await page.getByRole('button', { name: 'Hide browser' }).click();
  await expect(page.locator('#sample-search')).toHaveCount(0);
  await openBrowser(page);
  await expect(page.locator('#sample-search')).toHaveValue('does not exist');
  await page.getByRole('button', { name: 'Language', exact: true }).click();
  await page.getByText('Deutsch', { exact: true }).click();
  await expect(page.locator('.catalog-notice')).toHaveText(`„${geography.name}“ geladen. Wähle Umdrehen oder Tippen zum Starten.`);
  await expect(page.locator('#sample-dialog-title')).toHaveText('Kartensätze');
});

test('a single-deck leaf exposes a direct load control without using Lucky', async ({ page }) => {
  const files: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.csv')) files.push(request.url()); });
  await page.goto('/?lang=en');
  await page.getByRole('button', { name: 'Show decks: Trivia', exact: true }).click();
  await page.getByRole('button', { name: 'Show decks: Trivia / Science & nature', exact: true }).click();
  await expect(page.getByRole('button', { name: 'space', exact: true })).toBeVisible();

  const spaceCategory = page.locator('.catalog__category').filter({ has: page.getByRole('button', { name: 'space', exact: true }) });
  const directRow = spaceCategory.locator('xpath=..').locator('.catalog__direct-row');
  const directLoad = directRow.locator('.catalog__deck--direct');
  await expect(directRow).toBeVisible();
  await expect(directLoad).toBeVisible();
  await expect(directLoad).toContainText(space.name);
  expect(await spaceCategory.evaluate(element => getComputedStyle(element).display)).toBe('grid');
  expect(await spaceCategory.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length)).toBe(2);
  const rowWidth = await directRow.evaluate(element => element.getBoundingClientRect().width);
  const categoryWidth = await spaceCategory.evaluate(element => element.getBoundingClientRect().width);
  expect(rowWidth).toBeLessThanOrEqual(categoryWidth);
  await directLoad.click();

  await expect(page.locator('#loaded-deck-heading')).toContainText(space.name);
  expect(files).toEqual([expect.stringContaining(`${space.id}.csv`)]);
  expect(page.url()).toContain(`sample_game=${space.id}`);
});

for (const width of [900, 320]) {
  test(`deep pending recovery is visible and stable at ${width}x${width === 900 ? 600 : 740}`, async ({ page }, testInfo) => {
    const height = width === 900 ? 600 : 740;
    await page.setViewportSize({ width, height });
    await page.goto('/?lang=en');
    await openBrowser(page);
    await page.locator('#sample-search').fill(space.name);
    await page.getByRole('button', { name: space.name, exact: false }).click();
    await expect(page.locator('#loaded-deck-heading')).toContainText(space.name);
    const beforeUrl = page.url();
    await openBrowser(page);
    await page.locator('#sample-search').fill('');
    await page.getByRole('button', { name: 'Show decks: Trivia', exact: true }).click();
    await page.getByRole('button', { name: 'Show decks: Trivia / Science & nature', exact: true }).click();
    await page.getByRole('button', { name: 'Show decks: Trivia / Science & nature / Astronomy', exact: true }).click();
    const leaf = page.getByRole('button', { name: 'Optical Principles & Sky Observing — English (38)', exact: false });
    await expect(leaf).toBeVisible();

    let releaseFirst = () => {};
    let releaseSecond = () => {};
    let firstStarted = () => {};
    let secondStarted = () => {};
    const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; });
    const secondGate = new Promise<void>(resolve => { releaseSecond = resolve; });
    const firstRequest = new Promise<void>(resolve => { firstStarted = resolve; });
    const secondRequest = new Promise<void>(resolve => { secondStarted = resolve; });
    let requests = 0;
    await page.route('**/sample_games/b07-optics-sky-observing.csv', async route => {
      requests++;
      if (requests === 1) {
        firstStarted();
        await firstGate;
      } else {
        secondStarted();
        await secondGate;
      }
      await route.fulfill({ status: 503 });
    });

    await leaf.click();
    await firstRequest;
    const pendingHeading = page.locator('#catalog-pending-heading');
    await expect(pendingHeading).toBeFocused();
    const pendingBox = await pendingHeading.boundingBox();
    const cancelBox = await page.getByRole('button', { name: 'Cancel', exact: true }).boundingBox();
    expect(pendingBox).not.toBeNull();
    expect(cancelBox).not.toBeNull();
    expect(pendingBox!.y).toBeGreaterThanOrEqual(0);
    expect(pendingBox!.y + pendingBox!.height).toBeLessThanOrEqual(height);
    expect(cancelBox!.y).toBeGreaterThanOrEqual(0);
    expect(cancelBox!.y + cancelBox!.height).toBeLessThanOrEqual(height);
    await expect(page.locator('#loaded-deck-heading')).toContainText(space.name);
    expect(page.url()).toBe(beforeUrl);

    const deliberateFocus = page.locator('#sample-search');
    const firstResponse = page.waitForResponse(response => response.url().endsWith('b07-optics-sky-observing.csv'));
    releaseFirst();
    await firstResponse;
    await expect(page.getByRole('alert')).toBeVisible();
    const retry = page.getByRole('button', { name: 'Retry', exact: true });
    const errorCancel = page.getByRole('button', { name: 'Cancel', exact: true });
    await expect(retry).toBeEnabled();
    const alertBox = await page.getByRole('alert').boundingBox();
    const retryBox = await retry.boundingBox();
    const errorCancelBox = await errorCancel.boundingBox();
    for (const box of [alertBox, retryBox, errorCancelBox]) {
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
    }
    await page.screenshot({ path: testInfo.outputPath(`deep-recovery-error-${width}.png`), animations: 'disabled' });
    await deliberateFocus.focus();
    await expect(deliberateFocus).toBeFocused();
    await expect(page.locator('#loaded-deck-heading')).toContainText(space.name);
    expect(page.url()).toBe(beforeUrl);

    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await secondRequest;
    await expect(pendingHeading).toBeFocused();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.locator('.catalog__pending')).toHaveCount(0);
    releaseSecond();
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await expect(page.locator('#loaded-deck-heading')).toContainText(space.name);
    expect(page.url()).toBe(beforeUrl);
    await page.screenshot({ path: testInfo.outputPath(`deep-recovery-${width}.png`), animations: 'disabled' });
  });
}

for (const width of [1280, 900]) {
  test(`desktop ${width}px keeps the deck browser header usable and tree scroll contained`, async ({ page }) => {
    await page.setViewportSize({ width, height: 600 });
    await page.goto('/?lang=en');
    const sidebar = page.locator('.deck-sidebar');
    const header = sidebar.locator('.sample-dialog__header');
    const body = sidebar.locator('.sample-dialog__body');
    await expect(sidebar).toBeVisible();
    await page.getByRole('button', { name: 'Show decks: Trivia', exact: true }).click();
    await page.getByRole('button', { name: 'Show decks: Trivia / Geography', exact: true }).click();
    await page.getByRole('button', { name: 'Show decks: Trivia / Geography / World', exact: true }).click();
    await expect(page.getByRole('button', { name: geography.name })).toBeVisible();
    const before = await header.boundingBox();
    const metrics = await body.evaluate(element => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowY: getComputedStyle(element).overflowY,
      overflowX: getComputedStyle(element).overflowX,
    }));
    expect(metrics.overflowY).toBe('auto');
    expect(metrics.overflowX).toBe('hidden');
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    await body.evaluate(element => { element.scrollTop = element.scrollHeight; });
    const after = await header.boundingBox();
    expect(after?.y).toBe(before?.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await body.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  });
}

test('default and ancestor Lucky load one real deck; search does not change pool and no mode starts', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { Math.random = () => 2.5 / 24; });
  await page.locator('#sample-search').fill('Spanish');
  await page.getByRole('button', { name: 'I’m feeling lucky' }).click();
  await expect(page.locator('#loaded-deck-heading')).toContainText(geography.name);
  await expect(page.locator('.catalog-notice')).toContainText(`Lucky picked “${geography.name}”`);
  expect(JSON.parse((await storage(page))!)).toEqual(parseCsv(readFileSync(`public/sample_games/${geography.id}.csv`, 'utf8'), '|').sort((a, b) => a.key.localeCompare(b.key)));
  await expect(page.locator('.game-timer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.getByRole('button', { name: 'Trivia', exact: true }).click();
  await expect(page.getByText('Eligible decks: 155', { exact: true })).toBeVisible();
  await page.evaluate(() => { Math.random = () => 0; });
  await page.getByRole('button', { name: 'I’m feeling lucky' }).click();
  await expect(page.locator('#loaded-deck-heading')).toContainText(science.name);
  await expect(confirmation(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  const members = parseCsv(readFileSync(`public/sample_games/${science.id}.csv`, 'utf8'), '|');
  for (let i = 0; i < members.length; i++) {
    expect(members.map(card => card.key)).toContain(await page.locator('.flashcard__front .flashcard__content').innerText());
    if (i < members.length - 1) await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
});

test('legacy categories have no Lucky fallback or mutation; reset uses general pool', async ({ page }) => {
  await page.goto(`/?sample_game=${science.id}`);
  const before = await storage(page);
  await page.getByRole('button', { name: 'Study decks', exact: true }).click();
  await expect(page.getByRole('button', { name: 'I’m feeling lucky' })).toBeDisabled();
  await expect(page.getByText('Eligible decks: 0', { exact: true })).toBeVisible();
  await expect(page.getByText(/No eligible English trivia decks/)).toBeVisible();
  expect(await storage(page)).toBe(before);
  await page.getByRole('button', { name: 'Use general trivia' }).click();
  await expect(page.getByText('Eligible decks: 24', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'I’m feeling lucky' })).toBeEnabled();
});

test('metadata policy: all seven exclusions, fiction ancestors, segment boundaries, uniform deck draw and 1000-entry filtering', async ({ page }, testInfo) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const path = '/flashcards_game/src/utils/sample-games.ts';
    const { SAMPLE_GAMES, getEligibleDecks, pickLuckyDeck, filterDecks, groupDecks } = await import(path);
    const fixtures = [
      { ...SAMPLE_GAMES[0], id: 'history', categoryPath: ['history', 'europe'] },
      { ...SAMPLE_GAMES[0], id: 'fiction', categoryPath: ['fiction', 'space', 'series'], lucky: 'category' },
      { ...SAMPLE_GAMES[0], id: 'prefix', categoryPath: ['fictional'], lucky: 'category' },
      { ...SAMPLE_GAMES[0], id: 'nonenglish', language: 'de' },
      { ...SAMPLE_GAMES[0], id: 'legacy', categoryPath: ['fiction'], lucky: 'never' },
    ];
    const ids = (decks: { id: string }[]) => decks.map(deck => deck.id);
    const scale = Array.from({ length: 1000 }, (_, i) => ({ ...SAMPLE_GAMES[0], id: `fixture-${i}`, name: `Deck ${i}`, categoryPath: ['history', i % 2 ? 'europe' : 'asia'] }));
    let labels = 0;
    const start = performance.now();
    const filtered = filterDecks('history / europe', (segment: string) => { labels++; return segment; }, scale);
    const groups = groupDecks(filtered);
    return {
      defaults: ids(getEligibleDecks(null)),
      legacy: SAMPLE_GAMES.filter((deck: { lucky: string }) => deck.lucky === 'never').length,
      allLegacyExcluded: SAMPLE_GAMES.filter((deck: { lucky: string }) => deck.lucky === 'never').every((deck: { categoryPath: string[]; id: string }) => !ids(getEligibleDecks(deck.categoryPath)).includes(deck.id)),
      fictionDefault: ids(getEligibleDecks(null, fixtures)),
      ancestor: ids(getEligibleDecks(['fiction'], fixtures)),
      descendants: ids(getEligibleDecks(['fiction', 'space'], fixtures)),
      empty: pickLuckyDeck(['absent'], fixtures),
      draws: Array.from({ length: 22 }, (_, bucket) => [(bucket + 0.00001) / 24, (bucket + 1) / 24 - 0.00001]).flat().map(random => pickLuckyDeck(null, SAMPLE_GAMES, () => random)?.id),
      scale: { size: scale.length, matches: filtered.length, labelCalls: labels, grouped: groups.children.get('history').children.get('europe').decks.length, elapsedMs: performance.now() - start },
    };
  });
  expect(result.defaults).toEqual([science.id, 'trivia-space-astronomy-essentials-en', geography.id, history.id, 'trivia-human-origins-starter-en', sports.id, food.id, waitangi.id, coral.id, woodblock.id, bodyClocks.id, 'trivia-rocks-faults-volcanoes-en', 'trivia-cell-biology-essentials-en', 'trivia-water-landscapes-en', 'trivia-flight-aviation-history-en', 'trivia-railway-engineering-world-railways-en', 'trivia-bicycles-motorcycles-en', 'trivia-ancient-civilizations-en', 'trivia-medieval-castles-tournaments-en', 'trivia-invertebrates-body-plans-en', 'trivia-world-cities-transit-landmarks-en', 'trivia-literature-authors-characters-forms-en', 'trivia-body-science-medical-history-imaging-en', 'trivia-light-optics-telescopes-en']);
  expect(result.legacy).toBe(7);
  expect(result.allLegacyExcluded).toBe(true);
  expect(result.fictionDefault).toEqual(['history']);
  expect(result.ancestor).toEqual(['fiction']);
  expect(result.descendants).toEqual(['fiction']);
  expect(result.empty).toBeNull();
  expect(result.draws).toEqual([science.id, science.id, 'trivia-space-astronomy-essentials-en', 'trivia-space-astronomy-essentials-en', geography.id, geography.id, history.id, history.id, 'trivia-human-origins-starter-en', 'trivia-human-origins-starter-en', sports.id, sports.id, food.id, food.id, waitangi.id, waitangi.id, coral.id, coral.id, woodblock.id, woodblock.id, bodyClocks.id, bodyClocks.id, 'trivia-rocks-faults-volcanoes-en', 'trivia-rocks-faults-volcanoes-en', 'trivia-cell-biology-essentials-en', 'trivia-cell-biology-essentials-en', 'trivia-water-landscapes-en', 'trivia-water-landscapes-en', 'trivia-flight-aviation-history-en', 'trivia-flight-aviation-history-en', 'trivia-railway-engineering-world-railways-en', 'trivia-railway-engineering-world-railways-en', 'trivia-bicycles-motorcycles-en', 'trivia-bicycles-motorcycles-en', 'trivia-ancient-civilizations-en', 'trivia-ancient-civilizations-en', 'trivia-medieval-castles-tournaments-en', 'trivia-medieval-castles-tournaments-en', 'trivia-invertebrates-body-plans-en', 'trivia-invertebrates-body-plans-en', 'trivia-world-cities-transit-landmarks-en', 'trivia-world-cities-transit-landmarks-en', 'trivia-literature-authors-characters-forms-en', 'trivia-literature-authors-characters-forms-en']);
  expect(result.scale).toMatchObject({ size: 1000, matches: 500, labelCalls: 2000, grouped: 500 });
  console.log('Synthetic metadata scale (not published inventory):', JSON.stringify(result));
  await testInfo.attach('synthetic-metadata-scale-not-published-inventory', { body: JSON.stringify(result), contentType: 'application/json' });
});

test('one Escape from a nonempty mobile search dismisses the browser and preserves its query', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const opener = page.locator('#sample-games-button');
  await opener.click();
  const search = page.locator('#sample-search');
  await search.fill('Science');
  await expect(search).toBeFocused();
  await search.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Decks', exact: true })).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(search).toHaveValue('Science');
});

test('Escape from a nonempty mobile search cancels a pending replacement and preserves the active session', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await local(page);
  await page.getByRole('button', { name: 'Type', exact: true }).click();
  const answer = page.getByRole('textbox', { name: 'Your answer', exact: true });
  await answer.fill('keep this draft');
  const before = await storage(page);
  const beforeUrl = page.url();
  const held = heldResponse(page, science.id);
  await held.setup;
  try {
    await selectDeck(page, science.name);
    await confirmSwitch(page);
    await held.started;
    const search = page.locator('#sample-search');
    await search.fill('Science');
    await expect(search).toBeFocused();
    await search.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Decks', exact: true })).toHaveCount(0);
    await expect(page.locator('#sample-games-button')).toBeFocused();
    const response = page.waitForResponse(response => response.url().endsWith(`${science.id}.csv`));
    held.release();
    await (await response).finished();
    await page.evaluate(() => new Promise(requestAnimationFrame));
    await expect(answer).toHaveValue('keep this draft');
    expect(await storage(page)).toBe(before);
    expect(page.url()).toBe(beforeUrl);
    await expect(page.locator('.card-counter')).toHaveText('1 / 1');
    const timerBefore = await page.locator('.game-timer').innerText();
    await page.clock.runFor(1000);
    const seconds = (time: string) => time.split(':').reduce((total, value) => total * 60 + Number(value), 0);
    expect(seconds(await page.locator('.game-timer').innerText())).toBeLessThan(seconds(timerBefore));
    await page.locator('#sample-games-button').click();
    await expect(search).toHaveValue('Science');
    await expect(page.locator('.catalog__pending')).toHaveCount(0);
  } finally {
    held.release();
  }
});

for (const width of [320, 768]) {
  test(`mobile ${width}: heading focus, single browser, keyboard load, success focus and dismissal`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 740 });
    await page.goto('/');
    const opener = page.getByRole('button', { name: 'Browse sample decks' });
    await opener.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#sample-dialog-title')).toBeFocused();
    await expect(page.locator('.deck-sidebar')).toHaveCount(0);
    await expect(page.locator('#sample-search')).toHaveCount(1);
    await page.keyboard.press('Tab'); // Close browser
    await page.keyboard.press('Tab'); // Search
    await expect(page.locator('#sample-search')).toBeFocused();
    await page.keyboard.type('World Geography');
    await page.getByRole('button', { name: geography.name }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('#loaded-deck-heading')).toBeFocused();
    await page.locator('#sample-games-button').click();
    await expect(page.locator('#sample-dialog-title')).toBeFocused();
    expect(await page.locator('.sample-dialog').evaluate(element => element.matches(':modal'))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`mobile-${width}.png`), fullPage: true, animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(page.locator('#sample-games-button')).toBeFocused();
  });
}

test('current untouched built-in selection is a complete no-op during an active session', async ({ page }) => {
  await page.clock.install();
  let requests = 0;
  page.on('request', request => { if (request.url().endsWith('.csv')) requests++; });
  await page.goto(`/?sample_game=${science.id}`);
  await page.getByRole('button', { name: 'Type', exact: true }).click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('draft');
  await selectDeck(page, science.name);
  await expect(confirmation(page)).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('draft');
  expect(requests).toBe(1);
  await page.clock.runFor(1000);
  await expect(page.locator('.game-timer')).toHaveText('14:59');
});

for (const provenance of ['restored', 'modified', 'file', 'linked']) {
  test(`${provenance} nonempty cards are protected; export cancellation never commits`, async ({ page }) => {
    if (provenance === 'restored') await local(page);
    else if (provenance === 'linked') {
      await page.route('https://cards.example.test/cards.csv', route => route.fulfill({ body: 'question,answer\nMy question,My answer' }));
      await page.goto('/?cards=https://cards.example.test/cards.csv');
      await expect(page.locator('#loaded-deck-heading')).toHaveText('Cards loaded from link');
    } else {
      await page.goto(`/?sample_game=${science.id}`);
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      if (provenance === 'file') {
        await page.getByText('Upload CSV', { exact: true }).click();
        await page.getByLabel('Upload CSV', { exact: true }).setInputFiles({ name: 'cards.csv', mimeType: 'text/csv', buffer: Buffer.from('question,answer\nMy question,My answer') });
        await expect(page.locator('.dict-manager .dict-status')).toContainText('Added 1');
      } else {
        await page.getByText('Add card', { exact: true }).click();
        await page.getByRole('textbox', { name: 'Question', exact: true }).fill('My question');
        await page.getByRole('textbox', { name: 'Answer', exact: true }).fill('My answer');
        await page.getByRole('button', { name: 'Add', exact: true }).click();
      }
      await page.getByRole('button', { name: 'Close settings' }).click();
    }
    const before = await storage(page);
    const url = page.url();
    await selectDeck(page, geography.name);
    await expect(confirmation(page).getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
    await expect(confirmation(page)).toContainText('switch without downloading');
    await expect(confirmation(page)).not.toContainText('timer keeps running');
    await confirmation(page).getByRole('button', { name: 'Export a copy (optional)' }).click();
    await expect(page.getByRole('dialog', { name: 'Export Dictionary' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(confirmation(page)).toBeVisible();
    expect(await storage(page)).toBe(before);
    expect(page.url()).toBe(url);
    await page.keyboard.press('Escape');
    expect(await storage(page)).toBe(before);
    await selectDeck(page, geography.name);
    await confirmSwitch(page); // Download is optional.
    await expect(page.locator('#loaded-deck-heading')).toContainText(geography.name);
    expect(page.url()).not.toContain('cards=');
  });
}

test('untouched built-in active-session warning is separate, with no export/card-loss warning', async ({ page }) => {
  await page.goto(`/?sample_game=${science.id}`);
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  await selectDeck(page, geography.name);
  await expect(confirmation(page)).toContainText('timer keeps running');
  await expect(confirmation(page)).not.toContainText('replace your current cards');
  await expect(confirmation(page).getByRole('button', { name: /Export/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.flashcard')).toBeVisible();
});

for (const failure of ['http', 'parse', 'storage']) {
  test(`manual ${failure} failure keeps dictionary/query/session and timer; retry retains Lucky candidate and rechecks consent`, async ({ page }) => {
    await page.clock.install();
    await local(page);
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    await page.getByRole('textbox', { name: 'Your answer' }).fill('keep me');
    await page.evaluate(() => { Math.random = () => 0; });
    const requested: string[] = [];
    page.on('request', request => { if (request.url().endsWith('.csv')) requested.push(request.url()); });
    if (failure === 'storage') {
      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
          if (key === 'flashcards_dictionary') throw new DOMException('full', 'QuotaExceededError');
          original.call(this, key, value);
        };
      });
    } else await page.route(`**/sample_games/${science.id}.csv`, route => route.fulfill(failure === 'http' ? { status: 503 } : { body: 'question|answer\ninvalid row' }));
    const before = await storage(page);
    await page.getByRole('button', { name: 'I’m feeling lucky' }).click();
    await expect(confirmation(page)).toContainText(science.name);
    await expect(confirmation(page)).toContainText('timer keeps running');
    await confirmSwitch(page);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeEnabled();
    expect(await storage(page)).toBe(before);
    expect(page.url()).not.toContain('sample_game');
    await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('keep me');
    await page.clock.runFor(1000);
    await expect(page.locator('.game-timer')).toHaveText('0:59');
    await page.evaluate(() => { Math.random = () => 2.5 / 24; });
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(confirmation(page)).toContainText(science.name);
    await confirmSwitch(page);
    await expect(page.getByRole('alert')).toBeVisible();
    expect(requested).toHaveLength(2);
    expect(requested.every(url => url.endsWith(`${science.id}.csv`))).toBe(true);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'I’m feeling lucky' }).click();
    await expect(confirmation(page)).toContainText(geography.name);
  });
}

for (const dismissal of ['cancel', 'escape', 'close', 'backdrop']) {
  test(`mobile ${dismissal} invalidates an in-flight fetch; late response cannot replace cards`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await local(page);
    const before = await storage(page);
    const held = heldResponse(page, science.id);
    await held.setup;
    await selectDeck(page, science.name);
    await confirmSwitch(page);
    await held.started;
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled();
    if (dismissal === 'cancel') await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    if (dismissal === 'escape') await page.keyboard.press('Escape');
    if (dismissal === 'close') await page.getByRole('button', { name: 'Close browser' }).click();
    if (dismissal === 'backdrop') await page.mouse.click(2, 2);
    const response = page.waitForResponse(url => url.url().endsWith(`${science.id}.csv`));
    held.release();
    await (await response).finished();
    // Wait for fetch continuation without relying on an arbitrary timer.
    await expect(page.locator('#loaded-deck-heading')).toHaveText('Current cards');
    await page.evaluate(() => new Promise(requestAnimationFrame));
    expect(await storage(page)).toBe(before);
    expect(page.url()).not.toContain('sample_game');
    if (dismissal !== 'cancel') await expect(page.locator('#sample-games-button')).toBeFocused();
  });
}

test('superseding request commits only the newest choice and saves before resetting', async ({ page }) => {
  await page.goto('/');
  const held = heldResponse(page, science.id);
  await held.setup;
  await selectDeck(page, science.name);
  await held.started;
  await expect(page.getByRole('button', { name: 'I’m feeling lucky' })).toBeEnabled();
  await selectDeck(page, geography.name);
  await expect(page.locator('#loaded-deck-heading')).toContainText(geography.name);
  const before = await storage(page);
  const response = page.waitForResponse(response => response.url().endsWith(`${science.id}.csv`));
  held.release();
  await (await response).finished();
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(page.locator('#loaded-deck-heading')).toContainText(geography.name);
  expect(await storage(page)).toBe(before);
});

test('changed dictionary rejects a previously consented fetch; retry re-evaluates protection', async ({ page }) => {
  await local(page);
  const held = heldResponse(page, science.id);
  await held.setup;
  await selectDeck(page, science.name);
  await confirmSwitch(page);
  await held.started;
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByText('Add card', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Question', exact: true }).fill('Newly added');
  await page.getByRole('textbox', { name: 'Answer', exact: true }).fill('Newly answered');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Close settings' }).click();
  const before = await storage(page);
  held.release();
  await expect(page.getByRole('alert')).toHaveText(changed);
  expect(await storage(page)).toBe(before);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(confirmation(page)).toContainText('switch without downloading');
  await confirmSwitch(page);
  await expect(page.locator('#loaded-deck-heading')).toContainText(science.name);
});

test('pending switch blocks new starts and detached handlers but ongoing Flip interactions and countdown continue', async ({ page }) => {
  await page.clock.install();
  await local(page);
  const oldStart = await page.getByRole('button', { name: 'Type', exact: true }).elementHandle();
  const held = heldResponse(page, science.id);
  await held.setup;
  await selectDeck(page, science.name);
  await confirmSwitch(page);
  await held.started;
  await expect(page.getByRole('button', { name: 'Type', exact: true })).toBeDisabled();
  await oldStart!.evaluate(button => { button.disabled = false; button.click(); });
  await expect(page.locator('.game-timer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  await page.getByRole('button', { name: 'End Flip' }).click();
  const oldRetry = await page.getByRole('button', { name: 'Try Again' }).elementHandle();
  await page.getByRole('button', { name: 'Try Again' }).click();
  await selectDeck(page, science.name);
  await confirmSwitch(page);
  await oldStart!.evaluate(button => button.click());
  await oldRetry!.evaluate(button => button.click());
  await page.locator('.flashcard').click();
  await expect(page.getByRole('button', { name: 'Correct', exact: true })).toBeVisible();
  await page.clock.runFor(1000);
  await expect(page.locator('.game-timer')).toHaveText('0:59');
  await page.getByRole('button', { name: 'Correct', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Try Again' })).toBeDisabled();
  await oldRetry!.evaluate(button => button.click());
  await expect(page.getByRole('heading', { name: 'Your self-rated results' })).toBeVisible();
  held.release();
  await expect(page.locator('#loaded-deck-heading')).toContainText(science.name);
  await expect(page.locator('.game-timer')).toHaveCount(0);
});

for (const source of ['link', 'file', 'reset-link', 'reset-sample']) {
  test(`late Settings ${source} cannot overwrite or merge into a newer browser commit`, async ({ page }) => {
    const remote = 'https://cards.example.test/delayed.csv';
    let release = () => {};
    const wait = new Promise<void>(resolve => { release = resolve; });
    let calls = 0;
    if (source === 'reset-link') await page.route(remote, async route => {
      if (calls++) await wait;
      await route.fulfill({ body: 'question,answer\nOriginal,Answer' });
    });
    await page.goto(source === 'reset-link' ? `/?cards=${encodeURIComponent(remote)}` : source === 'reset-sample' ? `/?sample_game=${spanish.id}` : '/');
    if (source.startsWith('reset-')) await expect(page.locator('#loaded-deck-heading')).toBeVisible();
    if (source === 'reset-sample') await page.route(`**/sample_games/${spanish.id}.csv`, async route => {
      await wait;
      await route.fulfill({ body: 'question,answer\nLate,Answer' });
    });
    if (source === 'link') await page.route(remote, async route => {
      await wait;
      await route.fulfill({ body: 'question,answer\nLate,Answer' });
    });
    if (source === 'file') await page.evaluate(() => {
      // A real FileReader load event is delayed in this test only; production has no test hooks.
      const original = FileReader.prototype.readAsText;
      FileReader.prototype.readAsText = function(file, encoding) {
        const callback = this.onload;
        this.onload = event => { window.addEventListener('release-test-file', () => callback?.call(this, event), { once: true }); };
        original.call(this, file, encoding);
      };
    });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    if (source === 'link') {
      await page.getByText('Add by link', { exact: true }).click();
      await page.getByRole('textbox', { name: 'Add by link' }).fill(remote);
      await page.getByRole('button', { name: 'Fetch', exact: true }).click();
    } else if (source === 'file') {
      await page.getByText('Upload CSV', { exact: true }).click();
      await page.getByLabel('Upload CSV', { exact: true }).setInputFiles({ name: 'late.csv', mimeType: 'text/csv', buffer: Buffer.from('question,answer\nLate,Answer') });
    } else {
      page.once('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: source === 'reset-link' ? 'Restore cards from original link' : 'Restore original sample', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Close settings' }).click();
    await selectDeck(page, geography.name);
    if (source === 'reset-link') await confirmSwitch(page);
    await expect(page.locator('#loaded-deck-heading')).toContainText(geography.name);
    const before = await storage(page);
    release();
    if (source === 'file') await page.evaluate(() => window.dispatchEvent(new Event('release-test-file')));
    await expect(page.locator('.error-message')).toHaveText(changed);
    expect(await storage(page)).toBe(before);
    await expect(page.locator('#loaded-deck-heading')).toContainText(geography.name);
    expect(page.url()).toContain(`sample_game=${geography.id}`);
  });
}

for (const locale of ['en', 'de', 'es', 'pt', 'ar', 'fa', 'tr', 'ms', 'th', 'vi', 'zh-Hans', 'ja']) {
  test(`browser locale ${locale}: translated controls, English content and 320px wrapping`, async ({ page }, testInfo) => {
    const copy = JSON.parse(readFileSync(`src/i18n/locales/${locale}.json`, 'utf8'));
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await page.goto(`/?lang=${locale}`);
    if (locale === 'ar' || locale === 'fa') {
      await page.getByRole('button', { name: copy.app.language, exact: true }).click();
      await page.getByText(locale === 'ar' ? 'العربية' : 'فارسی', { exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    }
    await openBrowser(page);
    await expect(page.locator('#sample-dialog-title')).toHaveText(copy.catalog.title);
    await expect(page.getByRole('button', { name: copy.catalog.lucky, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: copy.categories.trivia, exact: true })).toBeVisible();
    await page.locator('#sample-search').fill('World Geography');
    await expect(page.getByText(copy.catalog.english, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: geography.name })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.sample-dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`browser-${locale}-320.png`), fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: geography.name }).click();
    await expect(page.locator('#loaded-deck-heading')).toBeFocused();
    await expect(page.locator('#loaded-deck-heading')).toContainText(geography.name);
  });
}

test('collapsed descendants leave the keyboard order, and hiding/reopening the desktop browser restores focus', async ({ page }) => {
  await page.goto('/');
  const disclosure = page.getByRole('button', { name: 'Show decks: Trivia', exact: true });
  await disclosure.focus();
  await page.keyboard.press('Space');
  const child = page.getByRole('button', { name: 'Show decks: Trivia / Science & nature', exact: true });
  await expect(child).toBeVisible();
  await page.getByRole('button', { name: 'Hide decks: Trivia', exact: true }).press('Enter');
  await expect(child).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Trivia', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Show decks: Study decks', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Hide browser' }).press('Enter');
  await expect(page.locator('#sample-games-button')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#sample-dialog-title')).toBeFocused();
});

test('200% text, long deck names and reduced motion remain usable in the single mobile modal', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 640, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await local(page);
  await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
  await openBrowser(page);
  await page.locator('#sample-search').fill('Sekolah Menengah');
  const deck = page.getByRole('button', { name: 'Malay to Malay+English — Sekolah Menengah 1 Sec1-SG' });
  await deck.scrollIntoViewIfNeeded();
  await expect(page.locator('.sample-dialog')).toHaveCSS('animation-name', 'none');
  expect(await page.locator('.sample-dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await deck.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('browser-200-percent-text.png'), animations: 'disabled' });
  await deck.click();
  await expect(confirmation(page).getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  expect(await confirmation(page).evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(deck).toBeFocused();
});

test('dictionary changes before confirmation and detached retry callbacks cannot revive cancelled work', async ({ page }) => {
  await local(page);
  let requests = 0;
  await page.route(`**/sample_games/${science.id}.csv`, route => {
    requests++;
    return route.fulfill({ status: 500 });
  });
  await selectDeck(page, science.name);
  await page.evaluate(async () => {
    const statePath = '/flashcards_game/src/state.ts';
    const { dictionary } = await import(statePath);
    dictionary.value = [...dictionary.value, { key: 'Changed meanwhile', value: 'Answer' }];
  });
  await confirmSwitch(page);
  await expect(page.getByRole('alert')).toHaveText(changed);
  expect(requests).toBe(0);
  const staleRetry = await page.getByRole('button', { name: 'Retry', exact: true }).elementHandle();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await staleRetry!.evaluate(button => button.click());
  await expect(confirmation(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Type', exact: true })).toBeEnabled();
  expect(requests).toBe(0);
});

for (const palette of ['slate', 'paper', 'iris']) {
  for (const theme of ['light', 'dark'] as const) {
    test(`browser selected category/current deck and focus: ${palette} ${theme}`, async ({ page }, testInfo) => {
      await page.addInitScript(palette => localStorage.setItem('flashcards_palette', palette), palette);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(`/?sample_game=${geography.id}`);
      await page.getByRole('button', { name: 'Trivia', exact: true }).click();
      await page.keyboard.press('Tab');
      const scope = page.getByRole('button', { name: 'Trivia', exact: true });
      await scope.focus();
      await expect(scope).toHaveCSS('outline-style', 'solid');
      await page.locator('#sample-search').fill('World Geography');
      await expect(page.getByRole('button', { name: geography.name })).toHaveAttribute('aria-current', 'true');
      await page.screenshot({ path: testInfo.outputPath(`browser-${palette}-${theme}.png`), fullPage: true, animations: 'disabled' });
    });
  }
}
