import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../src/utils/csv';
import { selectDeck } from './deck-browser.helpers';

const decks = [
  {
    id: 'trivia-science-nature-starter-en',
    name: 'Science & Nature Essentials — English (25)',
    count: 25,
    section: 'science',
    records: ['T01', 'T03', 'T04', 'T06', 'T08', 'T09', 'T14', 'T15', 'T16', 'T20', 'T21', 'T22', 'T23', 'T25', 'L01', 'L02', 'L03', 'L04', 'L05', 'L06', 'L07', 'L08', 'L09', 'L11', 'L12'],
  },
  {
    id: 'trivia-world-geography-starter-en',
    name: 'World Geography: A Short Round — English (5)',
    count: 5,
    section: 'geography',
    records: ['L14', 'L16', 'L17', 'L19', 'L20'],
  },
  {
    id: 'trivia-world-history-short-round-en',
    name: 'World History: A Short Round — English (10)',
    count: 10,
    section: 'history',
    records: ['L26', 'L27', 'L28', 'L29', 'L30', 'L33', 'L34', 'L35', 'L36', 'L37'],
  },
  {
    id: 'trivia-human-origins-starter-en',
    name: 'Human Origins: A Starter Round — English (18)',
    count: 18,
    section: 'human-origins',
    records: ['B02-0001', 'B02-0002', 'B02-0003', 'B02-0004', 'B02-0005', 'B02-0006', 'B02-0007', 'B02-0008', 'B02-0009', 'B02-0010', 'B02-0011', 'B02-0012', 'B02-0013', 'B02-0014', 'B02-0015', 'B02-0016', 'B02-0017', 'B02-0018'],
  },
  {
    id: 'trivia-sports-rules-milestones-en',
    name: 'Sports: Rules and Milestones — English (9)',
    count: 9,
    section: 'sports',
    records: ['L51', 'L52', 'L53', 'L54', 'L56', 'L57', 'L60', 'L61', 'L62'],
  },
  {
    id: 'trivia-food-ingredients-en',
    name: 'Food: Ingredients and Kitchen Basics — English (8)',
    count: 8,
    section: 'food',
    records: ['L63', 'L64', 'L66', 'L67', 'L69', 'L70', 'L72', 'L74'],
  },
  {
    id: 'trivia-mythology-names-symbols-en',
    name: 'Mythology: Names and Symbols — English (10)',
    count: 10,
    section: 'mythology',
    records: ['L75', 'L76', 'L77', 'L79', 'L80', 'L81', 'L83', 'L84', 'L85', 'L86'],
  },
  {
    id: 'trivia-friends-cast-production-en',
    name: 'Friends: Original Series Cast and Production — English (10)',
    count: 10,
    section: 'friends-cast-production',
    records: ['FRC01', 'FRC02', 'FRC03', 'FRC04', 'FRC05', 'FRC06', 'FRC07', 'FRC08', 'FRC09', 'FRC10'],
  },
  {
    id: 'trivia-himym-cast-production-en',
    name: 'How I Met Your Mother: Original Series Cast and Production — English (10)',
    count: 10,
    section: 'himym-cast-production',
    records: ['HMC01', 'HMC02', 'HMC03', 'HMC04', 'HMC05', 'HMC06', 'HMC07', 'HMC08', 'HMC09', 'HMC10'],
  },
  {
    id: 'trivia-twd-cast-production-en',
    name: 'The Walking Dead: Original Series Cast and Production — English (8)',
    count: 8,
    section: 'twd-cast-production',
    records: ['TWC01', 'TWC02', 'TWC03', 'TWC04', 'TWC05', 'TWC06', 'TWC07', 'TWC08'],
  },
  {
    id: 'trivia-star-trek-tos-cast-production-en',
    name: 'Star Trek: The Original Series — Cast and Original Run — English (5)',
    count: 5,
    section: 'star-trek-tos-cast-production',
    records: ['STC01', 'STC02', 'STC03', 'STC04', 'STC05'],
  },
  {
    id: 'trivia-star-wars-original-production-en',
    name: 'Star Wars: A New Hope — Original Production — English',
    count: 6,
    section: 'star-wars-original-production',
    records: ['SWP01', 'SWP02', 'SWP03', 'SWP04', 'SWP05', 'SWP06'],
  },
  {
    id: 'trivia-waitangi-signing-documents-en',
    name: 'Te Tiriti o Waitangi: Signing and Documents — English',
    count: 5,
    section: 'waitangi-signing-documents',
    records: ['WTD01', 'WTD02', 'WTD03', 'WTD04', 'WTD05'],
  },
  {
    id: 'trivia-reef-building-corals-en',
    name: 'Reef-Building Corals: A Short Ecology Round — English',
    count: 6,
    section: 'reef-building-corals',
    records: ['RCE01', 'RCE02', 'RCE03', 'RCE04', 'RCE05', 'RCE06'],
  },
  {
    id: 'trivia-japanese-woodblock-prints-en',
    name: 'Japanese Woodblock Prints: Materials and Techniques — English',
    count: 4,
    section: 'japanese-woodblock-prints',
    records: ['JWP01', 'JWP02', 'JWP03', 'JWP04'],
  },
  {
    id: 'trivia-human-body-clocks-en',
    name: 'Human Body Clocks: Timing and Signals — English',
    count: 5,
    section: 'human-body-clocks',
    records: ['HBC01', 'HBC02', 'HBC03', 'HBC04', 'HBC05'],
  },
];
const csvFor = (id: string) => readFileSync(`public/sample_games/${id}.csv`, 'utf8');

for (const deck of decks) {
  test(`${deck.id}: all rows satisfy the real parser contract and frozen count`, () => {
    const csv = csvFor(deck.id);
    const lines = csv.trimEnd().split('\n');
    expect(lines.shift()).toBe('question|answer');
    expect(lines).toHaveLength(deck.count);
    const expected = lines.map(line => {
      const fields = line.split('|');
      expect(fields).toHaveLength(2);
      for (const field of fields) {
        expect(field).toBe(field.trim());
        expect(field.length).toBeGreaterThan(0);
        expect(field.length).toBeLessThanOrEqual(1000);
        expect(field).not.toMatch(/[\r\n]|&#?\w+;|<[^>]+>/);
      }
      expect(fields[1]).not.toContain('/');
      return { key: fields[0], value: fields[1] };
    });
    expect(parseCsv(csv, '|')).toEqual(expected);
    expect(expected.length).toBeLessThanOrEqual(10000);
    expect(new Set(expected.map(card => card.key.toLowerCase())).size).toBe(deck.count);
  });

  test(`${deck.id}: chooser, real Flip question and deep-linked Type question`, async ({ page }, testInfo) => {
    const cards = parseCsv(csvFor(deck.id), '|');
    await page.goto('/');
    await page.getByRole('button', { name: 'Browse sample decks' }).click();
    await selectDeck(page, deck.name);
    await expect(page).toHaveURL(new RegExp(`sample_game=${deck.id}`));
    await expect(page.getByRole('heading', { name: `Sample: ${deck.name}`, exact: true })).toBeVisible();
    await expect(page.getByText(`Cards available: ${deck.count}`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Flip', exact: true }).click();
    const question = await page.locator('.flashcard__front .flashcard__content').innerText();
    const card = cards.find(candidate => candidate.key === question);
    expect(card).toBeDefined();
    await page.locator('.flashcard').click();
    await expect(page.locator('.flashcard__back .flashcard__content')).toHaveText(card!.value);
    await page.getByRole('button', { name: 'Correct', exact: true }).click();
    await expect(page.locator('.card-counter')).toHaveText(`2 / ${deck.count}`);
    await expect(page.getByText('Correct: 1', { exact: true })).toBeVisible();

    await page.goto(`/?sample_game=${deck.id}`);
    await expect(page.getByText(`Cards available: ${deck.count}`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Type', exact: true }).click();
    const typedQuestion = await page.locator('.quiz-card__question .flashcard__content').innerText();
    const typedCard = cards.find(candidate => candidate.key === typedQuestion);
    expect(typedCard).toBeDefined();
    await page.getByRole('textbox', { name: 'Your answer', exact: true }).fill(typedCard!.value);
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.locator('.quiz-card__feedback--correct')).toBeVisible();
    await testInfo.attach(`${deck.section}-type`, { body: await page.screenshot({ path: testInfo.outputPath(`${deck.section}-type.png`), fullPage: true }), contentType: 'image/png' });
    await page.getByRole('button', { name: 'Next card', exact: true }).click();
    await expect(page.locator('.card-counter')).toHaveText(`2 / ${deck.count}`);
  });
}

test('notice access, high-level public rights and redaction boundaries', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Browse sample decks' }).click();
  const link = page.getByRole('link', { name: 'Trivia sources & licenses (English, new tab)', exact: true });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await link.focus();
  await expect(link).toBeFocused();
  await testInfo.attach('starter-chooser-mobile', { body: await page.screenshot({ path: testInfo.outputPath('starter-chooser-mobile.png'), fullPage: true, animations: 'disabled' }), contentType: 'image/png' });
  const popupPromise = page.waitForEvent('popup');
  await link.press('Enter');
  const notice = await popupPromise;
  await notice.setViewportSize({ width: 320, height: 700 });
  await expect(notice.getByRole('heading', { name: 'Starter trivia: sources and licenses', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(notice.locator('main')).toContainText('155 English trivia decks, 4,264 questions');
  await expect(notice.locator('main')).toContainText('53 LearnClash adaptations');
  await expect(notice.locator('main')).toContainText('14 OpenTDB adaptations');
  await expect(notice.locator('main')).toContainText('33 TVmaze-derived records');
  await expect(notice.locator('main')).toContainText('4,164 original contributor questions');
  expect(53 + 14 + 33 + 4164).toBe(4264);
  await expect(notice.locator('main')).toContainText('The original contributor wording, selection and arrangement');
  await expect(notice.locator('main')).toContainText('not published or cleared');
  await expect(notice.locator('time')).toHaveCount(2);
  await expect(notice.locator('time').nth(0)).toHaveAttribute('datetime', '2026-10-16');
  await expect(notice.locator('time').nth(0)).toHaveText('16 October 2026');
  await expect(notice.locator('time').nth(1)).toHaveAttribute('datetime', '2026-10-17');
  await expect(notice.locator('time').nth(1)).toHaveText('17 October 2026');
  const renderedNotice = await notice.locator('main').innerText();
  await expect(notice.locator('article')).toHaveCount(0);
  await expect(notice.locator('main')).toContainText('Open Trivia Database / PixelTail Games');
  await expect(notice.locator('main')).toContainText('LearnClash / Pluxia GmbH');
  await expect(notice.locator('main')).toContainText('TVmaze');
  await expect(notice.locator('main')).toContainText('CC BY-SA 4.0');
  await expect(notice.locator('main')).toContainText('CC BY 4.0');
  await expect(notice.locator('main')).toContainText('indicate changes');
  expect(renderedNotice).not.toMatch(/(?:\/Users\/|\.opi\b|\bsdlc\/|repository provenance|(?:staging|ledger|candidate|answer_target|tracker)\b)/i);
  expect(renderedNotice).not.toMatch(/\b(?:TASK|BUG|STORY|EPIC|SPEC|RELEASE)[-_ ]?\d+\b/i);
  expect(renderedNotice).not.toMatch(/\bB\d{2}-\d{4}\b/);
  expect(renderedNotice).not.toMatch(/\b(?:T|L|FRC|HMC|TWC|STC|SWP|WTD|RCE|JWP|HBC|CB)\d{2}\b/);
  for (const deck of decks) {
    const response = await notice.request.get(`sample_games/${deck.id}.csv`);
    expect(response.ok()).toBe(true);
    expect(await response.text()).toBe(csvFor(deck.id));
  }
  const questions = decks.flatMap(deck => parseCsv(csvFor(deck.id), '|').map(card => card.key.toLowerCase()));
  expect(new Set(questions).size).toBe(144);
  const html = readFileSync('public/sample_games/starter-trivia-notices.html', 'utf8');
  expect(html).toContain('Science &amp; Nature');
  expect(html).not.toMatch(/<script|<iframe|<img|\son\w+=|javascript:|\b(?:STORY|TASK|EPIC)-\d+/i);
  const readme = readFileSync('README.md', 'utf8');
  expect(readme).not.toMatch(/\bRelease\s+\d+\b/i);
  expect(readme).not.toMatch(/\bcandidate\b/i);
  expect(await notice.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await testInfo.attach('starter-notices-mobile', { body: await notice.screenshot({ path: testInfo.outputPath('starter-notices-mobile.png') }), contentType: 'image/png' });
});

for (const locale of ['en', 'de', 'es', 'pt', 'ar', 'fa', 'tr', 'ms', 'th', 'vi', 'zh-Hans', 'ja']) {
  test(`notice link is localized in ${locale}`, async ({ page }) => {
    const copy = JSON.parse(readFileSync(`src/i18n/locales/${locale}.json`, 'utf8'));
    await page.goto(`/?lang=${locale}`);
    await page.locator('#sample-games-button').click();
    await expect(page.getByRole('link', { name: copy.samples.triviaNotices, exact: true })).toBeVisible();
  });
}

test('legacy Spanish sample still loads and plays', async ({ page }) => {
  await page.goto('/?sample_game=Spanish-to-English-Common-Terms');
  await expect(page.getByText('Cards available: 301', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Flip', exact: true }).click();
  await page.locator('.flashcard').click();
  await expect(page.locator('.flashcard__back')).toHaveAttribute('aria-hidden', 'false');
});
