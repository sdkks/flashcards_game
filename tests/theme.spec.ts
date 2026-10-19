import { test, expect, type Page } from '@playwright/test';

const root = (page: Page) => page.locator('html');
const appearance = (page: Page) => page.getByRole('combobox', { name: 'Appearance', exact: true });
const settings = (page: Page) => page.getByRole('button', { name: 'Settings', exact: true });
const storedTheme = (page: Page) => page.evaluate(() => localStorage.getItem('flashcards_theme'));

for (const os of ['light', 'dark'] as const) {
  for (const stored of [null, '', 'invalid', 'system', 'light', 'dark']) {
    test(`bootstrap and controller agree: stored ${JSON.stringify(stored)}, OS ${os}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: os });
      await page.addInitScript(value => {
        if (value !== null) localStorage.setItem('flashcards_theme', value);
      }, stored);
      // Exercise source startup without relying on a pre-existing dist build.
      let release!: () => void;
      const held = new Promise<void>(resolve => { release = resolve; });
      await page.route('**/src/main.tsx', async route => { await held; await route.continue(); });
      const effective = stored === 'light' || stored === 'dark' ? stored : os;
      try {
        await page.goto('./', { waitUntil: 'commit' });
        await expect(root(page)).toHaveAttribute('data-theme', effective);
        await expect(page.locator('#app')).toBeEmpty();
      } finally {
        release();
      }
      await settings(page).click();
      await expect(appearance(page)).toHaveValue(stored === 'light' || stored === 'dark' ? stored : 'system');
      await expect(root(page)).toHaveAttribute('data-theme', effective);
      await expect(root(page)).toHaveCSS('color-scheme', effective);
      expect(await storedTheme(page)).toBe(stored); // Startup never pins the OS result.
    });
  }
}

test('System follows OS; explicit modes persist, ignore OS, and can return to System', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(root(page)).toHaveAttribute('data-theme', 'dark');
  const override = page.getByRole('button', { name: 'Use Light Mode — currently following system', exact: true });
  await expect(override).toHaveAttribute('title', 'Use Light Mode — currently following system');
  await override.click();
  await expect(override).toHaveCount(0);
  expect(await storedTheme(page)).toBe('light');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(root(page)).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(root(page)).toHaveAttribute('data-theme', 'light');
  await settings(page).click();
  await expect(appearance(page)).toHaveValue('light');
  await appearance(page).focus();
  await appearance(page).selectOption('dark');
  await expect(appearance(page)).toBeFocused();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(root(page)).toHaveAttribute('data-theme', 'dark');
  expect(await storedTheme(page)).toBe('dark');
  await page.reload();
  await expect(root(page)).toHaveAttribute('data-theme', 'dark');
  await settings(page).click();
  await appearance(page).selectOption('system');
  await expect(root(page)).toHaveAttribute('data-theme', 'light');
  expect(await storedTheme(page)).toBe('system');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(root(page)).toHaveAttribute('data-theme', 'dark');
  expect(await storedTheme(page)).toBe('system');
  await page.reload();
  await settings(page).click();
  await expect(appearance(page)).toHaveValue('system');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(root(page)).toHaveAttribute('data-theme', 'light');
  await page.keyboard.press('Escape');
  const darkOverride = page.getByRole('button', { name: 'Use Dark Mode — currently following system' });
  await darkOverride.click();
  expect(await storedTheme(page)).toBe('dark');
  await expect(page.getByRole('button', { name: 'Use Light Mode', exact: true })).toBeFocused();
});

for (const failure of ['getItem', 'setItem'] as const) {
  test(`theme-only ${failure} failure keeps the app and in-memory choice usable`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript(method => {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (key: string, value?: string) {
        if (key === 'flashcards_theme') throw new DOMException('Theme storage denied', 'SecurityError');
        return original.call(this, key, value);
      };
    }, failure);
    await page.goto('./');
    await settings(page).click();
    if (failure === 'getItem') {
      await expect(appearance(page)).toHaveValue('system');
      await expect(page.locator('#appearance-storage-note')).toBeVisible();
    }
    await appearance(page).focus();
    await appearance(page).selectOption('dark');
    await expect(root(page)).toHaveAttribute('data-theme', 'dark');
    await expect(appearance(page)).toBeFocused();
    if (failure === 'setItem') {
      await expect(page.getByRole('status')).toHaveText('Appearance applied for this visit. Browser storage is unavailable.');
      expect(await storedTheme(page)).toBeNull();
    } else {
      await expect(page.locator('#appearance-storage-note')).toHaveCount(0);
    }
    await page.keyboard.press('Escape');
    await settings(page).click();
    await expect(appearance(page)).toHaveValue('dark');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(root(page)).toHaveAttribute('data-theme', 'dark');
    expect(errors).toEqual([]);
  });
}

test('OS, Settings, and header changes retain quiz input, question, timer, and focus', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('flashcards_dictionary', JSON.stringify([
      { key: 'One', value: 'Uno' }, { key: 'Two', value: 'Dos' },
    ]));
    localStorage.setItem('flashcards_timer_minutes', '1');
  });
  await page.clock.install();
  await page.goto('./');
  await page.getByRole('button', { name: 'Type' }).click();
  const input = page.getByPlaceholder('Type your answer...');
  await input.fill('unfinished answer');
  const question = await page.locator('.quiz-card__question').textContent();
  const inputNode = await input.elementHandle();
  await page.clock.runFor(3000);
  await expect(page.locator('.game-timer')).toHaveText('0:57');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(root(page)).toHaveAttribute('data-theme', 'dark');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('unfinished answer');
  await settings(page).click();
  const dialogNode = await page.locator('.settings-panel').elementHandle();
  await appearance(page).focus();
  await appearance(page).selectOption('light');
  await expect(appearance(page)).toBeFocused();
  const paletteControl = page.getByRole('combobox', { name: 'Palette', exact: true });
  await paletteControl.focus();
  await paletteControl.selectOption('iris');
  await expect(paletteControl).toBeFocused();
  await expect(appearance(page)).toHaveValue('light');
  await expect(root(page)).toHaveAttribute('data-palette', 'iris');
  expect(await dialogNode?.evaluate(node => node === document.querySelector('.settings-panel'))).toBe(true);
  await page.clock.runFor(2000);
  await page.keyboard.press('Escape');
  await expect(settings(page)).toBeFocused();
  await page.getByRole('button', { name: 'Use Dark Mode', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use Light Mode', exact: true })).toBeFocused();
  await expect(input).toHaveValue('unfinished answer');
  expect(await inputNode?.evaluate(node => node === document.querySelector('.quiz-card__input'))).toBe(true);
  await expect(page.locator('.quiz-card__question')).toHaveText(question!);
  await expect(page.locator('.card-counter')).toHaveText('1 / 2');
  await expect(page.locator('.game-timer')).toHaveText('0:55');
});

for (const locale of ['en', 'de', 'es', 'pt', 'ar', 'fa', 'tr', 'ms', 'th', 'vi', 'zh-Hans', 'ja']) {
  test(`appearance control fits 320px and stays modal: ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(`./?lang=${locale}`);
    await page.locator('#settings-button').click();
    const control = page.locator('#appearance-select');
    await control.focus();
    await control.selectOption('dark');
    await expect(control).toBeFocused();
    await expect(control).toHaveCSS('color-scheme', 'dark');
    const paletteControl = page.locator('#palette-select');
    await paletteControl.focus();
    await paletteControl.selectOption('iris');
    await expect(paletteControl).toBeFocused();
    await expect(paletteControl).toHaveCSS('color-scheme', 'dark');
    // Measure the settled drawer, not its existing slide-in animation.
    await page.locator('.settings-panel').evaluate(async element => {
      await Promise.all(element.getAnimations().map(animation => animation.finished));
    });
    for (const selector of ['.setting--appearance', '.setting--appearance label', '#appearance-select', '.setting--palette', '.setting--palette label', '#palette-select', '#palette-help']) {
      const box = await page.locator(selector).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(320);
    }
    expect(await page.locator('.settings-panel').evaluate(el => el.matches(':modal'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#settings-button')).toBeFocused();
  });
}
