import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { selectDeck, confirmSwitch } from './deck-browser.helpers';

async function load(page: Page, count = 3, timer = '15', locale = 'en') {
  await page.addInitScript(({ count, timer }) => {
    localStorage.setItem('flashcards_dictionary', JSON.stringify(Array.from({ length: count }, (_, i) => ({ key: `Question ${i}`, value: `Answer ${i}` }))));
    localStorage.setItem('flashcards_timer_minutes', timer);
  }, { count, timer });
  await page.goto(`/?lang=${locale}`);
}

async function start(page: Page, count = 3, timer = '15') {
  await load(page, count, timer);
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  await expect(page.locator('.card-counter')).toBeFocused();
}

async function totals(page: Page, correct: number, wrong: number, unrated: number) {
  const total = correct + wrong + unrated;
  for (const text of [`Correct: ${correct}`, `Wrong: ${wrong}`, `Unrated: ${unrated}`, `Rated ${correct + wrong} of ${total}`]) {
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  }
}

const correct = (page: Page) => page.getByRole('button', { name: 'Correct', exact: true });
const wrong = (page: Page) => page.getByRole('button', { name: 'Wrong', exact: true });
const reveal = (page: Page) => page.locator('.flashcard').click();

test('rating requires the visible answer, records once and advances exactly one position', async ({ page }) => {
  await start(page);
  await expect(correct(page)).toHaveCount(0);
  await totals(page, 0, 0, 3);
  await reveal(page);
  const staleRating = await correct(page).elementHandle();
  await expect(page.locator('.flashcard button')).toHaveCount(0);
  await reveal(page);
  await expect(correct(page)).toHaveCount(0);
  await staleRating!.evaluate(button => button.click());
  await totals(page, 0, 0, 3);
  await reveal(page);
  await page.locator('.flip-rating__actions').evaluate(element => {
    const [yes, no] = element.querySelectorAll('button');
    yes.click();
    yes.click();
    no.click();
  });
  await expect(page.locator('.card-counter')).toHaveText('2 / 3');
  await expect(page.locator('.card-counter')).toBeFocused();
  await expect(page.locator('.flashcard__front')).toHaveAttribute('aria-hidden', 'false');
  await expect(correct(page)).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Your rating: Correct');
  await totals(page, 1, 0, 2);
  await reveal(page);
  await wrong(page).click();
  await expect(page.locator('.card-counter')).toHaveText('3 / 3');
  await totals(page, 1, 1, 1);
  await reveal(page);
  await correct(page).click();
  await expect(page.getByRole('heading', { name: 'Your self-rated results' })).toBeFocused();
  await totals(page, 2, 1, 0);
  await expect(page.locator('.quiz-results__score, .quiz-results__bar')).toHaveCount(0);
});

test('unrated holes remain ratable; rated revisits are read-only and advances do not skip rated cards', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await reveal(page);
  await wrong(page).click();
  await page.getByRole('button', { name: 'Previous' }).click();
  await expect(page.locator('.card-counter')).toBeFocused();
  await expect(page.locator('.flashcard__front')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.flip-rating')).toContainText('Your rating: Wrong');
  await reveal(page);
  await expect(correct(page)).toHaveCount(0);
  await expect(wrong(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Previous' }).click();
  await reveal(page);
  await correct(page).click();
  await expect(page.locator('.card-counter')).toHaveText('2 / 3');
  await expect(page.locator('.flip-rating')).toContainText('Your rating: Wrong');
  await expect(page.locator('.flashcard__front')).toHaveAttribute('aria-hidden', 'false');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Finish Flip' }).click();
  await totals(page, 1, 1, 1);
});

test('last-card rating finishes with earlier holes still unrated', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await reveal(page);
  await expect(page.getByText('Choosing a result saves it and shows results.')).toBeVisible();
  await wrong(page).click();
  await expect(page.getByRole('heading', { name: 'Your self-rated results' })).toBeFocused();
  await totals(page, 0, 1, 2);
});

for (const action of ['Correct', 'Wrong', 'Finish Flip']) {
  test(`one-card ${action} finishes truthfully and retry starts a fresh question`, async ({ page }) => {
    await start(page, 1);
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
    if (action !== 'Finish Flip') await reveal(page);
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your self-rated results' })).toBeFocused();
    await totals(page, +(action === 'Correct'), +(action === 'Wrong'), +(action === 'Finish Flip'));
    await page.getByRole('button', { name: 'Try Again' }).click();
    await totals(page, 0, 0, 1);
    await expect(page.locator('.card-counter')).toBeFocused();
    await expect(correct(page)).toHaveCount(0);
  });
}

test('successive identical ratings update the polite notice without announcing timer ticks', async ({ page }) => {
  await page.clock.install();
  await start(page);
  for (let i = 1; i <= 2; i++) {
    await reveal(page);
    await correct(page).click();
    await expect(page.getByRole('status')).toHaveText(`${i} / 3 — Your rating: Correct`);
    await page.clock.runFor(1000);
    await expect(page.getByRole('status')).toHaveText(`${i} / 3 — Your rating: Correct`);
  }
  expect(await page.locator('.game-timer').getAttribute('aria-live')).toBeNull();
});

test('successful deck replacement clears ratings and rejects the previous deck callback', async ({ page }) => {
  await start(page);
  await reveal(page);
  await correct(page).click();
  await reveal(page);
  const stale = await wrong(page).elementHandle();
  await selectDeck(page, 'Spanish to English — 300 Common Terms');
  await confirmSwitch(page);
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  await reveal(page);
  await stale!.evaluate(button => button.click());
  await totals(page, 0, 0, 50);
  await expect(page.locator('.card-counter')).toHaveText('1 / 50');
});

for (const key of ['Enter', 'Space']) {
  test(`last rating with held ${key} leaves results focused, never starts a retry`, async ({ page }) => {
    await start(page, 1);
    await reveal(page);
    await correct(page).focus();
    await page.keyboard.down(key);
    await page.keyboard.down(key);
    await page.keyboard.up(key);
    await expect(page.getByRole('heading', { name: 'Your self-rated results' })).toBeFocused();
    await page.keyboard.down(key);
    await page.keyboard.down(key);
    await page.keyboard.up(key);
    await totals(page, 1, 0, 0);
    await expect(page.locator('.game-timer')).toHaveCount(0);
  });

  test(`held ${key} cannot reveal twice or score the following card`, async ({ page }) => {
    await start(page);
    await page.locator('.flashcard').focus();
    await page.keyboard.down(key);
    await page.keyboard.down(key);
    await page.keyboard.up(key);
    await expect(correct(page)).toBeVisible();
    await correct(page).focus();
    await page.keyboard.down(key);
    await page.keyboard.down(key);
    await page.keyboard.up(key);
    await expect(page.locator('.card-counter')).toHaveText('2 / 3');
    await expect(page.locator('.card-counter')).toBeFocused();
    await page.keyboard.down(key);
    await page.keyboard.down(key);
    await page.keyboard.up(key);
    await expect(correct(page)).toHaveCount(0);
    await totals(page, 1, 0, 2);
    await page.locator('.flashcard').press(key);
    await wrong(page).press(key);
    await expect(page.locator('.card-counter')).toHaveText('3 / 3');
    await totals(page, 1, 1, 1);
  });
}

test('detached navigation and rating events cannot affect another visit or a retry', async ({ page }) => {
  await start(page);
  await reveal(page);
  const oldRating = await correct(page).elementHandle();
  const oldNext = await page.getByRole('button', { name: 'Next', exact: true }).elementHandle();
  await oldNext!.evaluate(button => { button.click(); button.click(); });
  await expect(page.locator('.card-counter')).toHaveText('2 / 3');
  await oldRating!.evaluate(button => button.click());
  await totals(page, 0, 0, 3);
  await page.getByRole('button', { name: 'Previous' }).click();
  await reveal(page);
  await oldRating!.evaluate(button => button.click());
  await oldNext!.evaluate(button => button.click());
  await expect(page.locator('.card-counter')).toHaveText('1 / 3');
  await totals(page, 0, 0, 3);
  const oldEnd = await page.getByRole('button', { name: 'End Flip' }).elementHandle();
  await page.getByRole('button', { name: 'End Flip' }).click();
  await page.getByRole('button', { name: 'Try Again' }).click();
  await reveal(page);
  await oldEnd!.evaluate(button => button.click());
  await oldRating!.evaluate(button => button.click());
  await totals(page, 0, 0, 3);
  await correct(page).click();
  await totals(page, 1, 0, 2);
});

for (const ending of ['stop', 'timeout']) {
  for (const revealed of [false, true]) {
    test(`${ending} freezes ratings with next answer ${revealed ? 'revealed' : 'hidden'} and resets timer on retry`, async ({ page }) => {
      await page.clock.install();
      await start(page, 3, '0.1');
      await reveal(page);
      await correct(page).click();
      await reveal(page);
      const lateRating = await wrong(page).elementHandle();
      if (!revealed) await reveal(page);
      if (ending === 'stop') await page.getByRole('button', { name: 'End Flip' }).click();
      else await page.clock.runFor(6100);
      await expect(page.getByRole('heading', { name: ending === 'stop' ? 'Session stopped' : 'Time’s up' })).toBeFocused();
      await lateRating!.evaluate(button => button.click());
      await totals(page, 1, 0, 2);
      await page.clock.runFor(10000);
      await totals(page, 1, 0, 2);
      await page.getByRole('button', { name: 'Try Again' }).click();
      await expect(page.locator('.game-timer')).toHaveText('0:06');
      await expect(page.locator('.card-counter')).toBeFocused();
      await reveal(page);
      await lateRating!.evaluate(button => button.click());
      await totals(page, 0, 0, 3);
      await page.getByRole('button', { name: 'End Flip' }).click();
      await page.getByRole('button', { name: 'Back to Menu' }).click();
      await page.clock.runFor(10000);
      await expect(page.locator('.game-start')).toBeVisible();
    });
  }
}

test('retry uses current count and timer settings without retaining ratings', async ({ page }) => {
  await start(page);
  await reveal(page);
  await correct(page).click();
  await page.getByRole('button', { name: 'End Flip' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Cards per game' }).fill('1');
  await page.getByRole('spinbutton', { name: 'Timer (minutes)' }).fill('2');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: 'Try Again' }).click();
  await expect(page.locator('.card-counter')).toHaveText('1 / 1');
  await expect(page.locator('.game-timer')).toHaveText('2:00');
  await totals(page, 0, 0, 1);
});

for (const locale of ['en', 'de', 'es', 'pt', 'ar', 'fa', 'tr', 'ms', 'th', 'vi', 'zh-Hans', 'ja']) {
  test(`translated controls and 320px reflow: ${locale}`, async ({ page }, testInfo) => {
    const copy = JSON.parse(readFileSync(`src/i18n/locales/${locale}.json`, 'utf8'));
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await load(page, 1, '15', locale);
    // The existing language picker applies document direction; URL initialization only selects copy.
    if (locale === 'ar' || locale === 'fa') {
      await page.getByRole('button', { name: copy.app.language, exact: true }).click();
      await page.getByText(locale === 'ar' ? 'العربية' : 'فارسی', { exact: true }).click();
    }
    const flip = page.getByRole('button', { name: copy.app.newGame, exact: true });
    await expect(flip).toHaveAccessibleDescription(copy.flip.description);
    await expect(page.getByText(copy.quiz.description, { exact: true })).toBeVisible();
    if (locale === 'en') await page.screenshot({ path: testInfo.outputPath('mode-choices-320.png'), fullPage: true });
    await flip.click();
    await reveal(page);
    const rating = page.getByRole('button', { name: copy.flip.correct, exact: true });
    await expect(rating).toBeVisible();
    expect((await rating.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    if (locale === 'ar' || locale === 'fa') await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.screenshot({ path: testInfo.outputPath(`flip-${locale}-320.png`), fullPage: true });
    await rating.click();
    await expect(page.getByRole('heading', { name: copy.session.studyFinished })).toBeFocused();
    await expect(page.getByText(copy.flip.selfAssessment, { exact: true })).toBeVisible();
    if (locale === 'en') await page.screenshot({ path: testInfo.outputPath('self-results-320.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
}

for (const palette of ['slate', 'paper', 'iris']) {
  for (const theme of ['light', 'dark'] as const) {
    test(`self-rating contrast and focus: ${palette} ${theme}`, async ({ page }, testInfo) => {
      await page.addInitScript(palette => localStorage.setItem('flashcards_palette', palette), palette);
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await start(page, 2);
      await reveal(page);
      await page.keyboard.press('Tab');
      for (const button of [correct(page), wrong(page)]) {
        await button.focus();
        const evidence = await button.evaluate(element => {
          const style = getComputedStyle(element);
          const luminance = (color: string) => (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(v => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
          const a = luminance(style.color), b = luminance(style.backgroundColor);
          return { contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), outline: style.outlineStyle };
        });
        expect(evidence.contrast).toBeGreaterThanOrEqual(4.5);
        expect(evidence.outline).toBe('solid');
      }
      await page.screenshot({ path: testInfo.outputPath(`flip-${palette}-${theme}.png`), fullPage: true });
    });
  }
}
