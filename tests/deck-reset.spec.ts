import { test, expect, type Page, type Locator } from '@playwright/test';
import { openBrowser } from './deck-browser.helpers';

const sampleId = 'Spanish-to-English-Common-Terms';
const sampleName = 'Spanish to English — 300 Common Terms';
const toy = { key: 'Toy question', value: 'Toy answer' };
const remoteUrl = 'https://cards.example.test/original.csv';
const remoteCsv = 'question,answer\nOriginal question,Original answer';

async function stored(page: Page) {
  return page.evaluate(() => localStorage.getItem('flashcards_dictionary'));
}

async function settings(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
}

async function addToy(page: Page) {
  await settings(page);
  await page.getByText('Add card', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Question', exact: true }).fill(toy.key);
  await page.getByRole('textbox', { name: 'Answer', exact: true }).fill(toy.value);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Close settings' }).click();
}

async function confirmAction(page: Page, button: Locator, accept: boolean, title: string) {
  if (title.startsWith('Replace current cards')) {
    await button.click();
    const confirmation = page.getByRole('dialog', { name: 'Replace current cards?', exact: true });
    await expect(confirmation).toContainText(sampleName);
    await expect(confirmation).toContainText('switch without downloading');
    await expect(confirmation.getByRole('button', { name: 'Export a copy (optional)' })).toBeVisible();
    await confirmation.getByRole('button', { name: accept ? 'Switch deck' : 'Cancel', exact: true }).click();
    return;
  }
  const dialogPromise = page.waitForEvent('dialog');
  const clickPromise = button.click();
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe('confirm');
  expect(dialog.message()).toContain(title);
  expect(dialog.message()).toContain('including additions');
  expect(dialog.message()).toContain('Export first');
  if (accept) await dialog.accept();
  else await dialog.dismiss();
  await clickPromise;
}

async function localDeck(page: Page) {
  await page.addInitScript(card => {
    localStorage.setItem('flashcards_dictionary', JSON.stringify([card]));
    localStorage.setItem('flashcards_timer_minutes', '0.1');
  }, toy);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Current cards', exact: true })).toBeVisible();
}

async function picker(page: Page) {
  await openBrowser(page);
  await page.locator('#sample-search').fill(sampleName);
  return page.getByRole('button', { name: sampleName });
}

test('sample plus toy: cancel keeps additions; restore reloads original and reports the truth', async ({ page }) => {
  await page.goto(`/?sample_game=${sampleId}`);
  await expect(page.getByRole('heading', { name: `Sample: ${sampleName}` })).toBeVisible();
  const original = await stored(page);
  await addToy(page);
  const edited = await stored(page);
  expect(edited).toContain(toy.key);
  await settings(page);
  await expect(page.getByText('Before restoring or clearing cards, use Export to keep a copy.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeVisible();
  const restore = page.getByRole('button', { name: 'Restore original sample', exact: true });
  await confirmAction(page, restore, false, 'Restore original sample?');
  expect(await stored(page)).toBe(edited);
  await expect(restore).toBeFocused();
  await confirmAction(page, restore, true, 'Restore original sample?');
  await expect(page.getByRole('status')).toHaveText('Original cards restored. Custom additions removed.');
  expect(await stored(page)).toBe(original);
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.getByRole('heading', { name: `Sample: ${sampleName}` })).toBeVisible();
});

test('local clear can be cancelled during a quiz; confirmed clear ends it and stops its timer', async ({ page }) => {
  await page.clock.install();
  await localDeck(page);
  await page.getByRole('button', { name: 'Type' }).click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('draft');
  await settings(page);
  const before = await stored(page);
  const clear = page.getByRole('button', { name: 'Clear current cards', exact: true });
  await confirmAction(page, clear, false, 'Clear current cards?');
  expect(await stored(page)).toBe(before);
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('draft');
  await page.clock.runFor(1000);
  await expect(page.locator('.game-timer')).toHaveText('0:05');
  await settings(page);
  await confirmAction(page, clear, true, 'Clear current cards?');
  await expect(page.getByRole('status')).toHaveText('Current cards cleared.');
  expect(await stored(page)).toBeNull();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.getByRole('heading', { name: 'Choose a deck to start' })).toBeVisible();
  // Remounting Game must not revive its old module-level mode or timer.
  await addToy(page);
  await page.clock.runFor(10000);
  await expect(page.getByRole('heading', { name: 'Current cards', exact: true })).toBeVisible();
  await expect(page.locator('.game-timer')).toHaveCount(0);
});

for (const mode of ['Flip', 'Type']) {
  test(`sample replacement from ${mode}: cancel preserves session, success returns to new ready deck`, async ({ page }) => {
    await page.clock.install();
    await localDeck(page);
    await page.getByRole('button', { name: mode }).click();
    // Let the initial card effect settle before interacting with the fake clock.
    await page.clock.runFor(200);
    if (mode === 'Type') {
      await page.getByRole('textbox', { name: 'Your answer' }).fill('old draft');
    } else {
      await page.getByRole('button', { name: /Show answer/ }).click();
      await expect(page.locator('.flashcard')).toHaveClass(/flashcard--flipped/);
    }
    const before = await stored(page);
    const load = await picker(page);
    await confirmAction(page, load, false, `Replace current cards with “${sampleName}”?`);
    expect(await stored(page)).toBe(before);
    await expect(load).toBeFocused();
    await page.keyboard.press('Escape');
    if (mode === 'Type') await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('old draft');
    else await expect(page.locator('.flashcard')).toHaveClass(/flashcard--flipped/);
    await page.clock.runFor(1000);
    await expect(page.locator('.game-timer')).toHaveText('0:05');
    await picker(page);
    await confirmAction(page, load, true, `Replace current cards with “${sampleName}”?`);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: `Sample: ${sampleName}` })).toBeVisible();
    expect(await stored(page)).not.toContain(toy.key);
    await page.clock.runFor(10000);
    await expect(page.locator('.game-start')).toBeVisible();
    await expect(page.locator('.game-timer')).toHaveCount(0);
    await page.getByRole('button', { name: 'Type' }).click();
    await expect(page.locator('.quiz-card__question')).not.toHaveText(toy.key);
    await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('');
    await expect(page.locator('.game-timer')).toHaveText('0:06');
    await page.getByRole('button', { name: 'End Type' }).click();
    await expect(page.getByText('Not attempted: 50', { exact: true })).toBeVisible();
  });
}

test('remote source reset cancels without fetching, restores original link, and stops the old session', async ({ page }) => {
  await page.clock.install();
  let requests = 0;
  await page.route(remoteUrl, route => {
    requests++;
    return route.fulfill({ contentType: 'text/csv', body: remoteCsv });
  });
  // cards takes precedence over sample_game, including the reset label and action.
  await page.goto(`/?cards=${encodeURIComponent(remoteUrl)}&sample_game=${sampleId}`);
  await expect(page.getByRole('heading', { name: 'Cards loaded from link' })).toBeVisible();
  const original = await stored(page);
  await addToy(page);
  await page.getByRole('button', { name: 'Type' }).click();
  await settings(page);
  const restore = page.getByRole('button', { name: 'Restore cards from original link', exact: true });
  await confirmAction(page, restore, false, 'Restore cards from original link?');
  expect(requests).toBe(1);
  expect(await stored(page)).toContain(toy.key);
  await confirmAction(page, restore, true, 'Restore cards from original link?');
  await expect(page.getByRole('status')).toHaveText('Original cards restored. Custom additions removed.');
  expect(requests).toBe(2);
  expect(await stored(page)).toBe(original);
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.getByRole('heading', { name: 'Cards loaded from link' })).toBeVisible();
  await page.clock.runFor(1000000);
  await expect(page.locator('.game-start')).toBeVisible();
  await expect(page.locator('.game-timer')).toHaveCount(0);
});

for (const source of ['sample', 'link'] as const) {
  for (const failure of ['http', 'empty', 'storage'] as const) {
    test(`${source} reload ${failure} failure preserves additions, session state and timer`, async ({ page }) => {
      await page.clock.install();
      await page.addInitScript(() => localStorage.setItem('flashcards_timer_minutes', '0.1'));
      const url = source === 'sample' ? `**/sample_games/${sampleId}.csv` : remoteUrl;
      await page.route(url, route => route.fulfill({ contentType: 'text/csv', body: remoteCsv }));
      await page.goto(source === 'sample' ? `/?sample_game=${sampleId}` : `/?cards=${encodeURIComponent(remoteUrl)}`);
      await expect(page.locator('.session-summary')).toBeVisible();
      await addToy(page);
      const before = await stored(page);
      await page.getByRole('button', { name: 'Type' }).click();
      await page.getByRole('textbox', { name: 'Your answer' }).fill('kept draft');
      if (failure === 'storage') {
        await page.evaluate(() => {
          const original = Storage.prototype.setItem;
          Storage.prototype.setItem = function(key, value) {
            if (key === 'flashcards_dictionary') throw new DOMException('Full', 'QuotaExceededError');
            return original.call(this, key, value);
          };
        });
      } else {
        await page.route(url, route => route.fulfill(failure === 'http'
          ? { status: 500 } : { contentType: 'text/csv', body: 'question,answer' }));
      }
      await settings(page);
      const title = source === 'sample' ? 'Restore original sample' : 'Restore cards from original link';
      await confirmAction(page, page.getByRole('button', { name: title, exact: true }), true, `${title}?`);
      await expect(page.getByRole('dialog', { name: 'Settings', exact: true }).getByRole('status')).toHaveText('Could not change cards. Your current cards have been kept.');
      expect(await stored(page)).toBe(before);
      await expect(page.locator('.dict-manager').getByRole('status')).not.toContainText('restored');
      await page.getByRole('button', { name: 'Close settings' }).click();
      await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('kept draft');
      await expect(page.locator('.card-counter')).toHaveText('1 / 2');
      await page.clock.runFor(1000);
      await expect(page.locator('.game-timer')).toHaveText('0:05');
    });
  }
}

test('failed sample replacement retains deck and session and allows retry', async ({ page }) => {
  await localDeck(page);
  await page.getByRole('button', { name: 'Type' }).click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('keep');
  const before = await stored(page);
  await page.route(`**/sample_games/${sampleId}.csv`, route => route.fulfill({ status: 500 }));
  const load = await picker(page);
  await confirmAction(page, load, true, 'Replace current cards');
  await expect(page.getByRole('alert')).toContainText('HTTP 500');
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeEnabled();
  expect(await stored(page)).toBe(before);
  expect(page.url()).not.toContain('sample_game=');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('keep');
});

test('confirmed sample load is cancellable while pending and discarded when the browser is dismissed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await localDeck(page);
  const before = await stored(page);
  let release = () => {};
  const ready = new Promise<void>(resolve => { release = resolve; });
  await page.route(`**/sample_games/${sampleId}.csv`, async route => {
    await ready;
    await route.fulfill({ contentType: 'text/csv', body: remoteCsv });
  });
  const load = await picker(page);
  await confirmAction(page, load, true, 'Replace current cards');
  await expect(page.getByText('Loading flashcards...', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeEnabled();
  await expect(page.getByRole('searchbox', { name: 'Search sample decks' })).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const response = page.waitForResponse(response => response.url().endsWith(`${sampleId}.csv`));
  release();
  await (await response).finished();
  await page.evaluate(() => new Promise(requestAnimationFrame));
  expect(await stored(page)).toBe(before);
  await expect(page.locator('#loaded-deck-heading')).toHaveText('Current cards');
  await expect(page.locator('#sample-games-button')).toBeFocused();
});

test('sample picker export is a nested keyboard modal and exports current cards before replacement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await localDeck(page);
  const before = await stored(page);
  await (await picker(page)).click();
  const exportButton = page.getByRole('button', { name: 'Export a copy (optional)', exact: true });
  await exportButton.focus();
  await page.keyboard.press('Enter');
  const exported = page.getByRole('dialog', { name: 'Export Dictionary' });
  await expect(exported.getByRole('combobox', { name: 'Format' })).toBeFocused();
  await page.locator('#sample-search').evaluate(element => element.focus());
  expect(await exported.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(exportButton).toBeFocused();
  await expect(page.getByRole('dialog', { name: 'Replace current cards?', exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await exported.getByRole('combobox', { name: 'Format' }).selectOption('json');
  const downloaded = page.waitForEvent('download');
  await exported.getByRole('button', { name: 'Download' }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual([toy]);
  await expect(exportButton).toBeFocused();
  expect(await stored(page)).toBe(before);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Decks', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Sample Games', exact: true })).toBeFocused();
});
