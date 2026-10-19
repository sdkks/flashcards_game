import { test, expect } from '@playwright/test';

test.describe('Lucky Mix composition', () => {
  test('loads distinct whole decks sequentially, deduplicates exact cards, and keeps origins', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const { buildLuckyMix } = await import('/flashcards_game/src/utils/sample-games.ts');
      const decks = [
        { id: 'one', name: 'One', separator: '|', categoryPath: ['trivia'], language: 'en', lucky: 'default' as const },
        { id: 'two', name: 'Two', separator: '|', categoryPath: ['trivia'], language: 'en', lucky: 'default' as const },
        { id: 'three', name: 'Three', separator: '|', categoryPath: ['trivia'], language: 'en', lucky: 'default' as const },
      ];
      const fetched: string[] = [];
      const cards = new Map([
        ['one', Array.from({ length: 60 }, (_, index) => ({ key: `q-${index}`, value: `a-${index}` }))],
        ['two', [{ key: 'q-0', value: 'a-0' }, ...Array.from({ length: 39 }, (_, index) => ({ key: `q-two-${index}`, value: `a-two-${index}` }))]],
        ['three', Array.from({ length: 20 }, (_, index) => ({ key: `q-three-${index}`, value: `a-three-${index}` }))],
      ]);
      const mixed = await buildLuckyMix(decks, ['trivia'], undefined, async game => {
        fetched.push(game.id);
        return { ok: true as const, cards: cards.get(game.id)! };
      });
      return { mixed, fetched };
    });
    expect(result.fetched).toEqual(['one', 'two', 'three']);
    expect(result.mixed.ok).toBe(true);
    if (result.mixed.ok) {
      expect(result.mixed.cards).toHaveLength(119);
      expect(result.mixed.source.decks).toHaveLength(3);
      expect(result.mixed.source.decks.map(deck => deck.cardCount)).toEqual([60, 40, 20]);
      expect(result.mixed.source.origins['q-0']).toEqual(['one', 'two']);
    }
  });

  test('rejects conflicting answers atomically and does not widen the supplied scope', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(async () => {
      const { buildLuckyMix } = await import('/flashcards_game/src/utils/sample-games.ts');
      const decks = [
        { id: 'small-a', name: 'Small A', separator: '|', categoryPath: ['trivia', 'television'], language: 'en', lucky: 'category' as const },
        { id: 'small-b', name: 'Small B', separator: '|', categoryPath: ['trivia', 'television'], language: 'en', lucky: 'category' as const },
      ];
      const conflict = await buildLuckyMix(decks, ['trivia', 'television'], undefined, async game => ({
        ok: true as const,
        cards: game.id === 'small-a'
          ? Array.from({ length: 60 }, (_, index) => ({ key: `q-${index}`, value: 'same' }))
          : [{ key: 'q-0', value: 'different' }, ...Array.from({ length: 60 }, (_, index) => ({ key: `other-${index}`, value: 'other' }))],
      }));
      const insufficient = await buildLuckyMix(decks, ['trivia', 'television'], undefined, async () => ({
        ok: true as const,
        cards: Array.from({ length: 10 }, (_, index) => ({ key: `only-${index}`, value: 'answer' })),
      }));
      return { conflict, insufficient };
    });
    expect(result.conflict.ok).toBe(false);
    expect(result.conflict.error).toContain('conflicting answers');
    expect(result.insufficient.ok).toBe(false);
    expect(result.insufficient.error).toContain('only 10 usable cards');
  });

  test('localizes conflicting answer details without dropping placeholders', async ({ page }) => {
    await page.goto('/?lang=de');
    const message = await page.evaluate(async () => {
      const { t } = await import('/flashcards_game/src/i18n/index.ts');
      return t('catalog', 'mixConflict', { question: 'Wie?', first: 'Erste', second: 'Zweite' });
    });
    expect(message).toContain('Wie?');
    expect(message).toContain('Erste');
    expect(message).toContain('Zweite');
  });

  test('shows an unchecked mix option without changing ordinary Lucky', async ({ page }) => {
    await page.goto('/');
    const checkbox = page.getByRole('checkbox', { name: 'Mix decks · 100+ cards' });
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'I’m feeling lucky', exact: true })).toBeVisible();
    await checkbox.press('Space');
    await expect(checkbox).toBeChecked();
    await expect(page.getByRole('button', { name: 'I’m feeling lucky · Mix 100+', exact: true })).toBeVisible();
    await checkbox.press('Space');
    await expect(page.getByRole('button', { name: 'I’m feeling lucky', exact: true })).toBeVisible();
  });

  test('commits a 100+ mix, cleans only source parameters, and reloads provenance for export', async ({ page }) => {
    await page.route('**/sample_games/*.csv', async route => {
      const id = new URL(route.request().url()).pathname.split('/').pop()?.replace('.csv', '') ?? 'deck';
      const rows = Array.from({ length: 50 }, (_, index) => `question-${id}-${index}|answer-${id}-${index}`);
      await route.fulfill({ contentType: 'text/csv', body: ['question|answer', ...rows].join('\n') });
    });
    await page.goto('/');
    await page.evaluate(() => history.replaceState(null, '', `${location.pathname}?sample_game=old&cards=https%3A%2F%2Fold.example%2Fcards.csv&lang=en&keep=1`));
    await page.getByRole('button', { name: 'Sample Games', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Mix decks · 100+ cards' }).check();
    await page.getByRole('button', { name: 'I’m feeling lucky · Mix 100+', exact: true }).click();
    await expect(page.locator('#loaded-deck-heading')).toContainText('Lucky Mix');
    expect(new URL(page.url()).searchParams.get('sample_game')).toBeNull();
    expect(new URL(page.url()).searchParams.get('cards')).toBeNull();
    expect(new URL(page.url()).searchParams.get('lang')).toBe('en');
    expect(new URL(page.url()).searchParams.get('keep')).toBe('1');
    await page.reload();
    await expect(page.locator('#loaded-deck-heading')).toContainText('Lucky Mix: General trivia');
    const attribution = page.locator('.mixed-source-details');
    await expect(attribution).toContainText('unique contributed cards');
    await attribution.locator('summary').click();
    await expect(attribution.locator('a', { hasText: 'Trivia sources & licenses' })).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const exportDialog = page.getByRole('dialog', { name: 'Export Dictionary' });
    await expect(exportDialog.getByRole('button', { name: 'Download source notes', exact: true })).toBeVisible();
    const download = page.waitForEvent('download');
    await exportDialog.getByRole('button', { name: 'Download source notes', exact: true }).click();
    expect((await download).suggestedFilename()).toBe('flashcards_lucky_mix_source_notes.txt');
  });
});
