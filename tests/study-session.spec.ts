import { test, expect, type Page } from '@playwright/test';

const cards = [
  { key: 'First question', value: '  Mixed Words!  ' },
  { key: 'Second question', value: '  Mixed Words!  ' },
  { key: 'Third question', value: '  Mixed Words!  ' },
];

async function load(page: Page, count = 3, timer = '15') {
  await page.addInitScript(({ deck, timer }) => {
    localStorage.setItem('flashcards_dictionary', JSON.stringify(deck));
    localStorage.setItem('flashcards_timer_minutes', timer);
  }, { deck: cards.slice(0, count), timer });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Type' })).toBeVisible();
}

async function counts(page: Page, correct: number, incorrect: number, skipped: number, untouched: number) {
  for (const text of [`Correct: ${correct}`, `Incorrect: ${incorrect}`, `Skipped: ${skipped}`, `Not attempted: ${untouched}`]) {
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  }
  await expect(page.locator('.quiz-results__score')).toHaveText(`Score: ${correct} / ${correct + incorrect + skipped + untouched}`);
}

test('correct, incorrect and skip stay readable; keyboard continues and discovers final results', async ({ page }) => {
  await load(page);
  await expect(page.getByText(/Exact answers only/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Flip', exact: true })).toHaveAccessibleDescription('Reveal the answer, then keep your own score.');
  await expect(page.getByRole('button', { name: 'Type', exact: true })).toHaveAccessibleDescription('Type your answer and let the game check it.');
  await page.getByRole('button', { name: 'Type' }).click();
  const input = page.getByRole('textbox', { name: 'Your answer' });
  const next = page.getByRole('button', { name: 'Next card', exact: true });
  const status = page.getByRole('status');
  for (const [index, attempt, result] of [[0, '  mIXED wORDS!  ', 'Correct!'], [1, 'My wrong answer', 'Incorrect.'], [2, 'A draft to skip', 'Skipped.']] as const) {
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('');
    await expect(input).toHaveAccessibleDescription(/internal spacing and punctuation must match/);
    const question = await page.locator('.quiz-card__question').innerText();
    await input.fill(attempt);
    if (index === 2) await page.getByRole('button', { name: 'Skip', exact: true }).click();
    else await input.press('Enter');
    await expect(status).toHaveText(result);
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('.quiz-card')).toContainText(`Your answer: ${attempt.trim()}`);
    await expect(page.locator('.quiz-card')).toContainText('Expected answer: Mixed Words!');
    // This intentionally crosses the old fixed auto-advance deadline.
    await page.waitForTimeout(1500);
    await expect(page.locator('.card-counter')).toHaveText(`${index + 1} / 3`);
    await expect(page.locator('.quiz-card__question')).toHaveText(question, { useInnerText: true });
    await expect(status).toHaveText(result);
    const continuation = index === 2 ? page.getByRole('button', { name: 'See results' }) : next;
    await expect(continuation).toBeFocused();
    await page.keyboard.press('Enter');
  }
  await expect(page.getByRole('heading', { name: 'Type finished', exact: true })).toBeFocused();
  await counts(page, 1, 1, 1, 0);
  await expect(page.locator('.game-timer')).toHaveCount(0);
});

for (const attempt of ['Mixed  Words!', 'Mixed Words', 'A paraphrase']) {
  test(`exact matching still rejects ${JSON.stringify(attempt)}`, async ({ page }) => {
    await load(page, 1);
    await page.getByRole('button', { name: 'Type' }).click();
    await page.getByRole('textbox', { name: 'Your answer' }).fill(attempt);
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Incorrect.');
    await page.getByRole('button', { name: 'See results' }).click();
    await counts(page, 0, 1, 0, 0);
  });
}

test('blank submissions are disabled; skip with no draft is visibly distinct', async ({ page }) => {
  await load(page, 1);
  await page.getByRole('button', { name: 'Type' }).click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('   ');
  await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Your answer' }).press('Enter');
  await expect(page.getByRole('status')).toBeEmpty();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(page.getByText('Your answer: No answer entered')).toBeVisible();
  await page.getByRole('button', { name: 'See results' }).click();
  await counts(page, 0, 0, 1, 0);
});

test('repeated submit and skip in one event turn record only the first outcome', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'Type' }).click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('Mixed Words!');
  await page.locator('.quiz-card__actions').evaluate(element => {
    const [submit, skip] = element.querySelectorAll('button');
    submit.click();
    submit.click();
    skip.click();
  });
  await expect(page.getByRole('status')).toHaveText('Correct!');
  await page.getByRole('button', { name: 'End Type' }).click();
  await counts(page, 1, 0, 0, 2);
});

for (const stage of ['input', 'correct', 'incorrect', 'skipped'] as const) {
  test(`early stop during ${stage} preserves exactly the submitted outcomes`, async ({ page }) => {
    await page.clock.install();
    await load(page, 3, '0.1');
    await page.getByRole('button', { name: 'Type' }).click();
    await page.getByRole('textbox', { name: 'Your answer' }).fill(stage === 'correct' ? 'Mixed Words!' : 'unsubmitted or wrong');
    if (stage === 'skipped') await page.getByRole('button', { name: 'Skip', exact: true }).click();
    else if (stage !== 'input') await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await page.getByRole('button', { name: 'End Type' }).click();
    await expect(page.getByRole('heading', { name: 'Session stopped' })).toBeFocused();
    await counts(page, +(stage === 'correct'), +(stage === 'incorrect'), +(stage === 'skipped'), stage === 'input' ? 3 : 2);
    await page.clock.runFor(16000);
    await expect(page.getByRole('heading', { name: 'Session stopped' })).toBeVisible();
    await page.getByRole('button', { name: 'Try Again' }).click();
    await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeFocused();
    await expect(page.getByRole('textbox', { name: 'Your answer' })).toHaveValue('');
    await page.getByRole('button', { name: 'End Type' }).click();
    await counts(page, 0, 0, 0, 3);
    await page.getByRole('button', { name: 'Back to Menu' }).click();
    await expect(page.locator('.session-summary')).toContainText('Cards: 3');
    await page.clock.runFor(16000);
    await expect(page.locator('.game-start')).toBeVisible();
  });
}

test('long feedback preserves whitespace and wraps at a narrow width', async ({ page }, testInfo) => {
  const answer = `  ${'LongAnswer'.repeat(50)}  `;
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(answer => {
    localStorage.setItem('flashcards_dictionary', JSON.stringify([{ key: 'A long answer', value: answer }]));
  }, answer);
  await page.goto('/');
  await page.getByRole('button', { name: 'Type' }).click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill(answer);
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Correct!');
  const comparison = page.locator('.quiz-card__comparison');
  expect(await comparison.first().textContent()).toBe(`Your answer: ${answer}`);
  expect(await comparison.last().textContent()).toBe(`Expected answer: ${answer}`);
  await expect(comparison.first()).toHaveCSS('white-space', 'pre-wrap');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await testInfo.attach('long-quiz-feedback', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

for (const count of [1, 2]) {
  test(`held Enter does not activate ${count === 1 ? 'See results' : 'Next card'} without a fresh press`, async ({ page }) => {
    await load(page, count);
    await page.getByRole('button', { name: 'Type' }).click();
    await page.getByRole('textbox', { name: 'Your answer' }).fill('Mixed Words!');
    await page.keyboard.down('Enter');
    const continuation = page.getByRole('button', { name: count === 1 ? 'See results' : 'Next card', exact: true });
    await expect(continuation).toBeFocused();
    // A second keydown without keyup is a repeat of the submission gesture.
    await page.keyboard.down('Enter');
    await expect(continuation).toBeFocused();
    await expect(page.locator('.card-counter')).toHaveText(`1 / ${count}`);
    await expect(page.getByRole('status')).toHaveText('Correct!');
    await expect(page.locator('.quiz-card__comparison')).toHaveCount(2);
    await page.keyboard.up('Enter');
    await page.keyboard.press('Enter');
    if (count === 1) {
      await expect(page.getByRole('heading', { name: 'Type finished', exact: true })).toBeFocused();
      await counts(page, 1, 0, 0, 0);
    } else {
      await expect(page.locator('.card-counter')).toHaveText('2 / 2');
      await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeFocused();
    }
  });
}

test('repeated continuation cannot skip the next unanswered card', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'Type' }).click();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('button', { name: 'Next card', exact: true }).evaluate(button => {
    button.click();
    button.click();
  });
  await expect(page.locator('.card-counter')).toHaveText('2 / 3');
  await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeFocused();
  await page.getByRole('button', { name: 'End Type' }).click();
  await counts(page, 0, 0, 1, 2);
});

test('ending after the last submission but before See results is still stopped', async ({ page }) => {
  await load(page, 1);
  await page.getByRole('button', { name: 'Type' }).click();
  await page.getByRole('textbox', { name: 'Your answer' }).fill('Mixed Words!');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByRole('button', { name: 'See results' })).toBeFocused();
  await page.getByRole('button', { name: 'End Type' }).click();
  await expect(page.getByRole('heading', { name: 'Session stopped' })).toBeFocused();
  await counts(page, 1, 0, 0, 0);
});

for (const stage of ['input', 'correct', 'incorrect', 'skipped'] as const) {
  test(`timeout during ${stage} counts attempts and does not leak transitions into retry`, async ({ page }) => {
    await page.clock.install();
    await load(page, 3, '0.1');
    await page.getByRole('button', { name: 'Type' }).click();
    await page.getByRole('textbox', { name: 'Your answer' }).fill(stage === 'correct' ? 'Mixed Words!' : 'a draft');
    if (stage === 'skipped') await page.getByRole('button', { name: 'Skip', exact: true }).click();
    else if (stage !== 'input') await page.getByRole('button', { name: 'Submit', exact: true }).click();
    expect(await page.locator('.game-timer').getAttribute('aria-live')).toBeNull();
    await expect(page.getByRole('status')).not.toContainText('0:');
    await page.clock.runFor(6100);
    await expect(page.getByRole('heading', { name: 'Time’s up' })).toBeFocused();
    await counts(page, +(stage === 'correct'), +(stage === 'incorrect'), +(stage === 'skipped'), stage === 'input' ? 3 : 2);
    await page.getByRole('button', { name: 'Try Again' }).click();
    await expect(page.getByRole('textbox', { name: 'Your answer' })).toBeFocused();
    await expect(page.locator('.card-counter')).toHaveText('1 / 3');
    await expect(page.locator('.game-timer')).toHaveText('0:06');
    await page.clock.runFor(2000);
    await expect(page.locator('.card-counter')).toHaveText('1 / 3');
    await page.getByRole('button', { name: 'End Type' }).click();
    await counts(page, 0, 0, 0, 3);
  });
}

test('Flip has explicit final completion, non-mastery feedback and a fresh retry', async ({ page }) => {
  await page.clock.install();
  await load(page, 2, '0.1');
  await page.getByRole('button', { name: 'Flip' }).click();
  await expect(page.getByRole('button', { name: 'Finish Flip' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Finish Flip' }).click();
  await expect(page.getByRole('heading', { name: 'Your self-rated results' })).toBeFocused();
  await expect(page.getByText('Unrated: 2', { exact: true })).toBeVisible();
  await expect(page.getByText('These are your ratings, not an automatic assessment.')).toBeVisible();
  await expect(page.locator('.quiz-results__score')).toHaveCount(0);
  await page.clock.runFor(10000);
  await expect(page.getByRole('heading', { name: 'Your self-rated results' })).toBeVisible();
  await page.getByRole('button', { name: 'Try Again' }).click();
  await expect(page.locator('.card-counter')).toHaveText('1 / 2');
  await expect(page.locator('.flashcard')).not.toHaveClass(/flashcard--flipped/);
  await expect(page.locator('.game-timer')).toHaveText('0:06');
});

for (const ending of ['stop', 'timeout'] as const) {
  test(`Flip ${ending} has an explicit truthful summary`, async ({ page }) => {
    await page.clock.install();
    await load(page, 2, '0.1');
    await page.getByRole('button', { name: 'Flip' }).click();
    if (ending === 'stop') await page.getByRole('button', { name: 'End Flip' }).click();
    else await page.clock.runFor(6100);
    await expect(page.getByRole('heading', { name: ending === 'stop' ? 'Session stopped' : 'Time’s up' })).toBeFocused();
    await expect(page.getByText('Unrated: 2', { exact: true })).toBeVisible();
    await expect(page.getByText('These are your ratings, not an automatic assessment.')).toBeVisible();
    await page.getByRole('button', { name: 'Back to Menu' }).click();
    await expect(page.locator('.game-start')).toBeVisible();
  });
}
