import { test, expect } from '@playwright/test';

test.describe('App loads correctly', () => {
  test('renders header with title and action buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('button', { name: /sample games/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /language/i })).toBeVisible();
  });

  test('shows descriptive Study and Quiz buttons when dictionary has cards', async ({ page }) => {
    await page.goto('/?sample_game=Malay-to-English-Darjah-6-Vocabulary-Quiz');
    await expect(page.getByRole('button', { name: 'Flip' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Type' })).toBeVisible();
  });

  test('shows a neutral entry state when no cards are loaded', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('flashcards_dictionary');
    });
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Choose a deck to start' })).toBeVisible();
    await expect(page.locator('.error-message')).toHaveCount(0);
  });
});

test.describe('Flip mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?sample_game=Malay-to-English-Darjah-6-Vocabulary-Quiz');
    await page.getByRole('button', { name: 'Flip' }).click();
  });

  test('displays flashcard with question and counter', async ({ page }) => {
    await expect(page.locator('.card-counter')).toContainText('1 /');
    await expect(page.locator('.flashcard')).toBeVisible();
    await expect(page.locator('.flashcard__content').first()).toBeVisible();
  });

  test('flips card on click', async ({ page }) => {
    const card = page.locator('.flashcard');
    await expect(card).not.toHaveClass(/flashcard--flipped/);
    await card.click();
    await expect(card).toHaveClass(/flashcard--flipped/);
  });

  test('navigates with Next button', async ({ page }) => {
    await expect(page.locator('.card-counter')).toContainText('1 /');
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.locator('.card-counter')).toContainText('2 /');
  });

  test('shows timer', async ({ page }) => {
    await expect(page.locator('.game-timer')).toBeVisible();
  });

  test('End Flip shows a stopped summary and offers the menu', async ({ page }) => {
    await page.getByRole('button', { name: /end flip/i }).click();
    await expect(page.getByRole('heading', { name: 'Session stopped' })).toBeFocused();
    await page.getByRole('button', { name: 'Back to Menu' }).click();
    await expect(page.getByRole('button', { name: 'Flip' })).toBeVisible();
  });
});

test.describe('Quiz mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?sample_game=Malay-to-English-Darjah-6-Vocabulary-Quiz');
    await page.getByRole('button', { name: 'Type' }).click();
  });

  test('displays question and input field', async ({ page }) => {
    await expect(page.locator('.quiz-card__question')).toBeVisible();
    await expect(page.getByPlaceholder(/type your answer/i)).toBeVisible();
  });

  test('Submit is disabled when input is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: /submit/i })).toBeDisabled();
  });

  test('Skip waits for explicit continuation to next card', async ({ page }) => {
    await expect(page.locator('.card-counter')).toContainText('1 /');
    await page.getByRole('button', { name: /skip/i }).click();
    await expect(page.getByRole('status')).toHaveText('Skipped.');
    await expect(page.locator('.card-counter')).toContainText('1 /');
    await page.getByRole('button', { name: 'Next card' }).click();
    await expect(page.locator('.card-counter')).toContainText('2 /');
  });

  test('End Type shows results', async ({ page }) => {
    await page.getByRole('button', { name: /end type/i }).click();
    await expect(page.getByRole('heading', { name: 'Session stopped' })).toBeVisible();
    await expect(page.getByText(/score/i)).toBeVisible();
  });

  test('shows timer', async ({ page }) => {
    await expect(page.locator('.game-timer')).toBeVisible();
  });
});

test.describe('Settings panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?sample_game=Malay-to-English-Darjah-6-Vocabulary-Quiz');
    await page.getByRole('button', { name: /settings/i }).click();
  });

  test('opens settings panel', async ({ page }) => {
    await expect(page.locator('.settings-panel')).toBeVisible();
  });

  test('has separator, card count, and timer settings', async ({ page }) => {
    await expect(page.getByRole('combobox', { name: /separator/i })).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: /cards per game/i })).toBeVisible();
    await expect(page.getByRole('spinbutton', { name: /timer/i })).toBeVisible();
  });

  test('has dictionary management sections', async ({ page }) => {
    await expect(page.getByText(/upload csv/i)).toBeVisible();
    await expect(page.getByText(/add by link/i)).toBeVisible();
    await expect(page.getByText(/add card/i)).toBeVisible();
  });

  test('has export button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
  });

  test('names the reset consequence', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Restore original sample', exact: true })).toBeVisible();
  });

  test('closes with X button', async ({ page }) => {
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.locator('.settings-panel')).not.toBeVisible();
  });
});

test.describe('Sample games dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?sample_game=Malay-to-English-Darjah-6-Vocabulary-Quiz');
    await page.getByRole('button', { name: /sample games/i }).click();
  });

  test('opens dialog with labelled search and nested list', async ({ page }) => {
    await expect(page.locator('.sample-dialog')).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search sample decks' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Decks' })).toBeVisible();
  });

  test('shows sample games after expanding a category', async ({ page }) => {
    await page.getByRole('button', { name: 'Show decks: Trivia', exact: true }).click();
    await page.getByRole('button', { name: 'Show decks: Trivia / Science & nature', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Science & Nature Essentials — English (25)' })).toBeVisible();
  });

  test('category selection does not load; an explicit deck button does', async ({ page }) => {
    await page.getByRole('button', { name: 'Trivia', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Trivia', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(page.url()).toContain('Malay-to-English');
    await page.locator('#sample-search').fill('World Geography');
    await page.getByRole('button', { name: 'World Geography: A Short Round — English (5)' }).click();
    await expect(page.locator('#loaded-deck-heading')).toContainText('World Geography');
  });
});

test.describe('Language picker', () => {
  test('opens and shows all 12 languages', async ({ page }) => {
    await page.goto('/?sample_game=Malay-to-English-Darjah-6-Vocabulary-Quiz');
    await page.getByRole('button', { name: /language/i }).click();
    await expect(page.locator('.lang-dialog')).toBeVisible();
    const items = page.locator('.lang-dialog__item');
    await expect(items).toHaveCount(12);
  });

  test('switching language translates UI', async ({ page }) => {
    await page.goto('/?sample_game=Malay-to-English-Darjah-6-Vocabulary-Quiz');
    await page.getByRole('button', { name: /language/i }).click();
    await page.getByText('Deutsch').click();
    await expect(page.locator('h1')).toContainText('Lernkarten');
  });

  test('lang querystring sets language on load', async ({ page }) => {
    await page.goto('/?sample_game=Malay-to-English-Darjah-6-Vocabulary-Quiz&lang=es');
    await expect(page.locator('h1')).toContainText('Tarjetas');
  });

  test('switching language updates lang in URL without losing other params', async ({ page }) => {
    await page.goto('/?sample_game=Malay-to-English-Darjah-6-Vocabulary-Quiz');
    await page.getByRole('button', { name: /language/i }).click();
    await page.getByText('Türkçe').click();
    const url = page.url();
    expect(url).toContain('lang=tr');
    expect(url).toContain('sample_game=Malay-to-English-Darjah-6-Vocabulary-Quiz');
  });
});

test.describe('Timer auto-end', () => {
  test('quiz auto-ends when timer expires', async ({ page }) => {
    await page.goto('/?sample_game=Malay-to-English-Darjah-6-Vocabulary-Quiz');
    await page.evaluate(() => localStorage.setItem('flashcards_timer_minutes', '0.1'));
    await page.reload();
    await page.getByRole('button', { name: 'Type' }).click();
    await expect(page.getByRole('heading', { name: 'Time’s up' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Dark mode', () => {
  test('toggles dark mode', async ({ page }) => {
    await page.goto('/?sample_game=Malay-to-English-Darjah-6-Vocabulary-Quiz');
    await page.getByRole('button', { name: /dark mode/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('Google Analytics', () => {
  test('gtag script is present and dataLayer is initialized', async ({ page }) => {
    await page.goto('/');
    const gtagScript = page.locator('script[src*="googletagmanager.com/gtag/js?id=G-6DEFHG8TQL"]');
    await expect(gtagScript).toBeAttached();
    const hasDataLayer = await page.evaluate(() => Array.isArray((window as any).dataLayer));
    expect(hasDataLayer).toBe(true);
  });
});
