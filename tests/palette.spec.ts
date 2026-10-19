import { readFileSync } from 'node:fs';
import { test, expect, type Page, type Locator } from '@playwright/test';

const palettes = ['slate', 'paper', 'iris'] as const;
const appearances = ['light', 'dark'] as const;
const settings = (page: Page) => page.getByRole('button', { name: 'Settings', exact: true });
const paletteSelect = (page: Page) => page.locator('#palette-select');
const appearanceSelect = (page: Page) => page.locator('#appearance-select');
const root = (page: Page) => page.locator('html');
const definition = readFileSync('public/sample_games/AI-ML-Top-100-Terminologies.csv', 'utf8')
  .trim().split('\n').slice(1).map(line => {
    const [key, value] = line.split('|');
    return { key, value };
  }).reduce((a, b) => a.value.length > b.value.length ? a : b);

for (const os of appearances) {
  for (const saved of [null, '', 'unknown', ...palettes]) {
    test(`palette bootstrap/controller parity: ${JSON.stringify(saved)} with legacy ${os}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: os === 'light' ? 'dark' : 'light' });
      await page.addInitScript(({ saved, os }) => {
        localStorage.setItem('flashcards_theme', os);
        if (saved !== null) localStorage.setItem('flashcards_palette', saved);
      }, { saved, os });
      let release!: () => void;
      const held = new Promise<void>(resolve => { release = resolve; });
      await page.route('**/src/main.tsx', async route => { await held; await route.continue(); });
      const expected = saved === 'paper' || saved === 'iris' ? saved : 'slate';
      try {
        await page.goto('./', { waitUntil: 'commit' });
        await expect(root(page)).toHaveAttribute('data-palette', expected);
        await expect(root(page)).toHaveAttribute('data-theme', os);
        await expect(page.locator('#app')).toBeEmpty();
      } finally { release(); }
      await settings(page).click();
      await expect(paletteSelect(page)).toHaveValue(expected);
      await expect(appearanceSelect(page)).toHaveValue(os);
      expect(await page.evaluate(() => localStorage.getItem('flashcards_palette'))).toBe(saved);
    });
  }
}

test('palette is independent, remembered on reload, and retained across System and header overrides', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./');
  for (const palette of ['paper', 'iris', 'slate']) {
    await settings(page).click();
    await paletteSelect(page).focus();
    await paletteSelect(page).selectOption(palette);
    await expect(paletteSelect(page)).toBeFocused();
    await expect(appearanceSelect(page)).toHaveValue('system');
    expect(await page.evaluate(() => localStorage.getItem('flashcards_theme'))).toBeNull();
    await page.reload();
    await expect(root(page)).toHaveAttribute('data-palette', palette);
    expect(await page.evaluate(() => localStorage.getItem('flashcards_palette'))).toBe(palette);
  }
  await settings(page).click();
  await paletteSelect(page).selectOption('iris');
  await appearanceSelect(page).selectOption('dark');
  await expect(paletteSelect(page)).toHaveValue('iris');
  await page.reload();
  await expect(root(page)).toHaveAttribute('data-theme', 'dark');
  await expect(root(page)).toHaveAttribute('data-palette', 'iris');
  await settings(page).click();
  await appearanceSelect(page).selectOption('system');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(root(page)).toHaveAttribute('data-theme', 'dark');
  await expect(paletteSelect(page)).toHaveValue('iris');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Use Light Mode — currently following system' }).click();
  await expect(root(page)).toHaveAttribute('data-theme', 'light');
  await expect(root(page)).toHaveAttribute('data-palette', 'iris');
  expect(await page.evaluate(() => localStorage.getItem('flashcards_palette'))).toBe('iris');
});

for (const failed of ['theme', 'palette'] as const) {
  for (const method of ['getItem', 'setItem'] as const) {
    test(`${failed}-only ${method} failure is independent and warning survives other successful saves`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.emulateMedia({ colorScheme: 'light' });
      await page.addInitScript(({ failed, method }) => {
        localStorage.setItem('flashcards_theme', 'dark');
        localStorage.setItem('flashcards_palette', 'iris');
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(key: string, value?: string) {
          if (key === `flashcards_${failed}`) throw new DOMException('Preference denied', 'SecurityError');
          return original.call(this, key, value);
        };
      }, { failed, method });
      let release!: () => void;
      const held = new Promise<void>(resolve => { release = resolve; });
      await page.route('**/src/main.tsx', async route => { await held; await route.continue(); });
      try {
        await page.goto('./', { waitUntil: 'commit' });
        await expect(root(page)).toHaveAttribute('data-theme', failed === 'theme' && method === 'getItem' ? 'light' : 'dark');
        await expect(root(page)).toHaveAttribute('data-palette', failed === 'palette' && method === 'getItem' ? 'slate' : 'iris');
        await expect(page.locator('#app')).toBeEmpty();
      } finally { release(); }
      await settings(page).click();
      const failedControl = failed === 'theme' ? appearanceSelect(page) : paletteSelect(page);
      const otherControl = failed === 'theme' ? paletteSelect(page) : appearanceSelect(page);
      const failedNote = page.locator(failed === 'theme' ? '#appearance-storage-note' : '#palette-storage-note');
      const otherNote = page.locator(failed === 'theme' ? '#palette-storage-note' : '#appearance-storage-note');
      if (method === 'setItem') await failedControl.selectOption(failed === 'theme' ? 'light' : 'paper');
      await expect(failedNote).toBeVisible();
      await otherControl.selectOption(failed === 'theme' ? 'paper' : 'light');
      await expect(otherNote).toHaveCount(0);
      await expect(failedNote).toBeVisible();
      await failedControl.focus();
      await failedControl.selectOption(failed === 'theme' ? 'system' : 'slate');
      await expect(failedControl).toBeFocused();
      await expect(root(page)).toHaveAttribute('data-theme', 'light');
      await expect(root(page)).toHaveAttribute('data-palette', failed === 'theme' ? 'paper' : 'slate');
      if (method === 'getItem') await expect(failedNote).toHaveCount(0); // This preference can now be saved.
      else {
        await expect(failedNote).toBeVisible();
        const persisted = await page.evaluate(() => ({
          theme: localStorage.getItem('flashcards_theme'), palette: localStorage.getItem('flashcards_palette'),
        }));
        expect(persisted).toEqual(failed === 'theme' ? { theme: 'dark', palette: 'paper' } : { theme: 'light', palette: 'iris' });
      }
      await page.keyboard.press('Escape');
      await expect(settings(page)).toBeFocused();
      expect(errors).toEqual([]);
    });
  }
}

// Use computed styles at actual consumers, walking transparent ancestors to the
// painted background. Gradients are sampled end-to-end without text-shadow credit.
async function contrast(locator: Locator, property: 'color' | 'borderTopColor' | 'outlineColor' | 'backgroundColor' = 'color', outside = false) {
  // Sample settled colors, not the first frame of an existing row transition.
  await locator.evaluate(async element => {
    await Promise.all(element.getAnimations().map(animation => animation.finished));
  });
  return locator.evaluate((element, { property, outside }) => {
    const rgb = (value: string) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = (color: number[]) => color.map(c => c / 255).map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a: number[], b: number[]) => {
      const x = luminance(a), y = luminance(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const foreground = getComputedStyle(element)[property];
    let ancestor: Element | null = outside ? element.parentElement : element;
    while (ancestor) {
      const style = getComputedStyle(ancestor);
      if (style.backgroundImage !== 'none') {
        const stops = (style.backgroundImage.match(/rgb\([^)]+\)/g) || []).map(rgb);
        if (stops.length !== 2) throw new Error('Expected two gradient stops');
        const minimum = Math.min(...Array.from({ length: 101 }, (_, i) => ratio(rgb(foreground), stops[0].map((v, c) => v + (stops[1][c] - v) * i / 100))));
        return { foreground, background: style.backgroundImage, minimum };
      }
      if (style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        return { foreground, background: style.backgroundColor, minimum: ratio(rgb(foreground), rgb(style.backgroundColor)) };
      }
      ancestor = ancestor.parentElement;
    }
    throw new Error('No opaque background found');
  }, { property, outside });
}

for (const palette of palettes) for (const appearance of appearances) {
  test(`actual consumers, feedback and narrow rendering: ${palette} ${appearance}`, async ({ page }, testInfo) => {
    const width = appearance === 'light' ? 320 : 390;
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ colorScheme: appearance, reducedMotion: 'reduce' });
    await page.addInitScript(({ palette, definition }) => {
      localStorage.setItem('flashcards_palette', palette);
      localStorage.setItem('flashcards_dictionary', JSON.stringify([definition, { key: 'One', value: 'Uno' }]));
      localStorage.setItem('flashcards_timer_minutes', '15');
    }, { palette, definition });
    await page.goto('./');
    const evidence: Record<string, Awaited<ReturnType<typeof contrast>>> = {};
    const check = async (name: string, locator: Locator, min = 4.5, property: Parameters<typeof contrast>[1] = 'color', outside = false) => {
      const result = await contrast(locator, property, outside);
      evidence[name] = result;
      expect(result.minimum, `${name}: ${JSON.stringify(result)}`).toBeGreaterThanOrEqual(min);
    };
    const capture = async (name: string) => {
      const path = testInfo.outputPath(`${palette}-${appearance}-${width}-${name}.png`);
      await page.screenshot({ path, fullPage: true });
      await testInfo.attach(name, { path, contentType: 'image/png' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    };
    await check('body', page.locator('body'));
    await check('secondary', page.locator('.disclaimer'));
    await check('link', page.locator('.feedback-link'));
    const primary = page.getByRole('button', { name: 'Flip' });
    await check('primary', primary);
    await primary.hover();
    await check('primary-hover', primary);
    await primary.click();
    const card = page.locator('.flashcard');
    // Find the long definition in this shuffled study session.
    if (await page.locator('.flashcard__front .flashcard__content').textContent() !== definition.key) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    await page.keyboard.press('Tab');
    await card.focus();
    await expect(card).toHaveCSS('outline-style', 'solid');
    await check('card-focus', card, 3, 'outlineColor', true);
    for (const face of ['front', 'back']) {
      if (face === 'back') await card.press('Space');
      for (const child of ['label', 'content', 'hint']) {
        await check(`${face}-${child}`, page.locator(`.flashcard__${face} .flashcard__${child}`));
      }
    }
    await expect(card).toHaveAccessibleName(`Answer ${definition.value} Show question`);
    const face = page.locator('.flashcard__back');
    expect(await face.evaluate(el => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth)).toBe(true);
    await capture('long-answer');
    await settings(page).click();
    await check('settings-text', page.locator('.settings-panel__title'));
    await check('palette-help', page.locator('#palette-help'));
    for (const selector of ['#appearance-select', '#palette-select', '.setting__input']) {
      const control = page.locator(selector).first();
      await check(`${selector}-text`, control);
      await check(`${selector}-inner-border`, control, 3, 'borderTopColor');
      await check(`${selector}-outer-border`, control, 3, 'borderTopColor', true);
      await expect(control).toHaveCSS('color-scheme', appearance);
    }
    await check('danger', page.locator('.btn--danger'));
    await page.locator('.btn--danger').hover();
    await check('danger-hover', page.locator('.btn--danger'));
    await capture('settings');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'End Flip', exact: true }).click();
    await page.getByRole('button', { name: 'Sample Games', exact: true }).click();
    await page.getByRole('button', { name: 'Trivia', exact: true }).click();
    const selected = page.locator('.catalog__scope[aria-pressed="true"]');
    await check('sample-selected', selected);
    await selected.hover();
    await expect(selected).toHaveCSS('background-color', evidence['primary-hover'].background);
    await check('sample-hover', selected);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Language', exact: true }).click();
    const language = page.locator('.lang-dialog__item--active');
    await check('language-selected', language);
    await language.hover();
    await expect(language).toHaveCSS('background-color', evidence['primary-hover'].background);
    await check('language-hover', language);
    await language.click();
    await page.getByRole('button', { name: 'Back to Menu', exact: true }).click();
    await page.getByRole('button', { name: 'Type' }).click();
    const input = page.getByPlaceholder('Type your answer...');
    await check('quiz-input', input);
    await check('quiz-input-border', input, 3, 'borderTopColor');
    for (const correct of [true, false]) {
      const question = await page.locator('.quiz-card__question .flashcard__content').textContent();
      await input.fill(correct ? (question === definition.key ? definition.value : 'Uno') : 'wrong');
      await page.getByRole('button', { name: 'Submit', exact: true }).click();
      await check(correct ? 'success' : 'error', page.locator('.quiz-card__feedback'));
      await capture(correct ? 'correct-feedback' : 'incorrect-feedback');
      await page.getByRole('button', { name: correct ? 'Next card' : 'See results', exact: true }).click();
    }
    await check('results-fill', page.locator('.quiz-results__fill'), 3, 'backgroundColor', true);
    console.log('Palette contrast:', JSON.stringify({ palette, appearance, evidence }));
    await testInfo.attach('contrast.json', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  });
}
