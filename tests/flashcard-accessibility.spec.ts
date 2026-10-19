import { readFileSync } from 'node:fs';
import { test, expect, type Page, type Locator } from '@playwright/test';

const definitions = readFileSync('public/sample_games/AI-ML-Top-100-Terminologies.csv', 'utf8')
  .trim().split('\n').slice(1).map(line => {
    const [key, value] = line.split('|');
    return { key, value };
  });
const pooling = definitions.find(card => card.key === 'Pooling')!;
const longest = definitions.reduce((a, b) => a.value.length > b.value.length ? a : b);
const [key, value] = readFileSync('public/sample_games/Spanish-to-English-Common-Terms.csv', 'utf8')
  .split('\n')[1].split(',');
const short = { key, value };
const shippedCards = [pooling, longest, short];

async function loadCards(page: Page, cards = shippedCards, timer = '15') {
  await page.addInitScript(({ cards, timer }) => {
    localStorage.setItem('flashcards_dictionary', JSON.stringify(cards));
    localStorage.setItem('flashcards_timer_minutes', timer);
  }, { cards, timer });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Flip' })).toBeVisible();
}

async function expectFits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
  const face = page.locator('.flashcard__face[aria-hidden="false"]');
  const metrics = await face.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return {
      width: element.clientWidth, scrollWidth: element.scrollWidth,
      height: element.clientHeight, scrollHeight: element.scrollHeight,
      children: Array.from(element.children).map(child => {
        const bounds = child.getBoundingClientRect();
        return { top: bounds.top - rect.top, bottom: bounds.bottom - rect.top,
          left: bounds.left - rect.left, right: bounds.right - rect.left };
      }),
    };
  });
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height);
  for (const child of metrics.children) {
    expect(child.top).toBeGreaterThanOrEqual(0);
    expect(child.bottom).toBeLessThanOrEqual(metrics.height + 1);
    expect(child.left).toBeGreaterThanOrEqual(0);
    expect(child.right).toBeLessThanOrEqual(metrics.width + 1);
  }
  expect(metrics.children[0].bottom).toBeLessThanOrEqual(metrics.children[1].top);
  expect(metrics.children[1].bottom).toBeLessThanOrEqual(metrics.children[2].top);
}

// Measure computed colors, including every gradient stop and text rectangle's
// projected position along our 135-degree, two-stop sRGB card backgrounds.
async function contrastEvidence(locator: Locator) {
  return locator.evaluate(element => {
    const rgb = (color: string) => (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = (color: number[]) => color.map(channel => {
      const v = channel / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (fg: number[], bg: number[]) => {
      const a = luminance(fg), b = luminance(bg);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    const style = getComputedStyle(element);
    if (style.backgroundImage === 'none') {
      return { background: style.backgroundColor, foreground: style.color,
        minimum: ratio(rgb(style.color), rgb(style.backgroundColor)), text: [] };
    }
    const stops = (style.backgroundImage.match(/rgb\([^)]+\)/g) || []).map(rgb);
    if (stops.length !== 2 || !style.backgroundImage.includes('135deg')) {
      throw new Error(`Update contrast measurement for new gradient: ${style.backgroundImage}`);
    }
    const colorAt = (t: number) => stops[0].map((channel, i) => channel + (stops[1][i] - channel) * t);
    const rect = element.getBoundingClientRect();
    const text = Array.from(element.children).map(child => {
      const bounds = child.getBoundingClientRect();
      const fg = rgb(getComputedStyle(child).color);
      const start = (bounds.left - rect.left + bounds.top - rect.top) / (rect.width + rect.height);
      const end = (bounds.right - rect.left + bounds.bottom - rect.top) / (rect.width + rect.height);
      const positions = [start, (start + end) / 2, end];
      return { text: child.textContent, foreground: getComputedStyle(child).color,
        positions, ratios: positions.map(position => ratio(fg, colorAt(position))) };
    });
    // Include endpoints and the whole gradient, not just the center under text.
    const minimum = Math.min(...text.flatMap(child => Array.from({ length: 101 }, (_, i) =>
      ratio(rgb(child.foreground), colorAt(i / 100)))));
    return { background: style.backgroundImage, foreground: style.color, minimum, text };
  });
}

for (const theme of ['light', 'dark'] as const) {
  for (const width of [320, 390]) {
    for (const scale of [1, 2]) {
      test(`shipped short and long content fits ${width}px ${theme}, text ${scale * 100}%`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 844 });
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await loadCards(page);
        if (scale === 2) await page.addStyleTag({ content: 'html { font-size: 200%; }' });
        await page.getByRole('button', { name: 'Flip' }).click();
        for (let index = 0; index < shippedCards.length; index++) {
          const card = page.locator('.flashcard');
          await expect(card).not.toHaveClass(/flashcard--flipped/);
          const question = await page.locator('.flashcard__front .flashcard__content').innerText();
          const expected = shippedCards.find(card => card.key === question)!;
          await expectFits(page);
          await card.click();
          await expect(card).toHaveAccessibleName(`Answer ${expected.value} Show question`);
          await expectFits(page);
          const content = page.locator('.flashcard__back .flashcard__content');
          expect(await content.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(18 * scale);
          if (expected.key === 'Pooling') {
            const screenshot = testInfo.outputPath('pooling.png');
            await page.screenshot({ path: screenshot, fullPage: true });
            await testInfo.attach('local-pooling-rendering', { path: screenshot, contentType: 'image/png' });
          }
          if (index < shippedCards.length - 1) await page.getByRole('button', { name: 'Next', exact: true }).click();
        }
      });
    }
  }

  test(`primary actions and card gradient text contrast: ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await loadCards(page, [pooling]);
    const primary = page.getByRole('button', { name: 'Flip' });
    const normal = await contrastEvidence(primary);
    await primary.hover();
    // The normal-motion transition is disabled by the emulated preference.
    const hover = await contrastEvidence(primary);
    expect(normal.minimum).toBeGreaterThanOrEqual(4.5);
    expect(hover.minimum).toBeGreaterThanOrEqual(4.5);
    await primary.click();
    const front = await contrastEvidence(page.locator('.flashcard__front'));
    await page.locator('.flashcard').click();
    const back = await contrastEvidence(page.locator('.flashcard__back'));
    for (const face of [front, back]) {
      expect(face.minimum).toBeGreaterThanOrEqual(4.5);
      for (const child of face.text) for (const ratio of child.ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
    await page.getByRole('button', { name: 'End Flip', exact: true }).click();
    await page.getByRole('button', { name: 'Sample Games', exact: true }).click();
    await page.getByRole('button', { name: 'Trivia', exact: true }).click();
    const selected = page.locator('.catalog__scope[aria-pressed="true"]');
    await selected.hover();
    await expect(selected).toHaveCSS('background-color', hover.background);
    const selectedHover = await contrastEvidence(selected);
    expect(selectedHover.minimum).toBeGreaterThanOrEqual(4.5);
    const evidence = { theme, normal, hover, front, back, selectedHover };
    console.log('Contrast evidence:', JSON.stringify(evidence));
    await testInfo.attach('contrast.json', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  });
}

test('only the current face is accessible; native Enter and Space flip once without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 600 });
  await loadCards(page, [pooling]);
  await page.getByRole('button', { name: 'Flip' }).click();
  const card = page.getByRole('button', { name: 'Question Pooling Show answer', exact: true });
  await page.keyboard.press('Tab');
  await card.focus();
  expect(await page.locator('main').ariaSnapshot()).not.toContain(pooling.value);
  await expect(card).toHaveCSS('outline-style', 'solid');
  await expect(card).toHaveCSS('outline-width', '3px');
  await page.keyboard.press('Enter');
  const answer = page.getByRole('button', { name: `Answer ${pooling.value} Show question`, exact: true });
  await expect(answer).toBeFocused();
  expect(await page.locator('main').ariaSnapshot()).not.toContain('Pooling');
  const scroll = await page.evaluate(() => window.scrollY);
  await page.keyboard.down('Space');
  await expect(answer).toBeFocused(); // Native activation is on keyup, not keydown.
  await page.keyboard.up('Space');
  await expect(card).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);
  expect(await page.locator('main').ariaSnapshot()).not.toContain(pooling.value);
  await card.click();
  await expect(answer).toBeFocused();
});

test('navigation still resets reveal and respects first/last boundaries', async ({ page }) => {
  await loadCards(page, [pooling, short]);
  await page.getByRole('button', { name: 'Flip' }).click();
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
  await page.locator('.flashcard').click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.flashcard')).not.toHaveClass(/flashcard--flipped/);
  await expect(page.locator('.flashcard__front')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('.flashcard__back')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('button', { name: 'Finish Flip', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Previous' }).click();
  await expect(page.locator('.card-counter')).toHaveText('1 / 2');
  await expect(page.locator('.flashcard__front')).toHaveAttribute('aria-hidden', 'false');
});

test('reduced motion disables flip transition and warning pulse without disabling reveal', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await loadCards(page, [pooling], '0.15');
  await page.getByRole('button', { name: 'Flip' }).click();
  await expect(page.locator('.flashcard__front')).toHaveCSS('transition-duration', '0.6s');
  await expect(page.locator('.game-timer--warning')).toHaveCSS('animation-name', 'timer-pulse');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.flashcard__front')).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('.flashcard__back')).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('.game-timer--warning')).toHaveCSS('animation-name', 'none');
  await page.locator('.flashcard').press('Space');
  await expect(page.locator('.flashcard')).toHaveAccessibleName(`Answer ${pooling.value} Show question`);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('.settings-panel')).toHaveCSS('animation-name', 'none');
});
