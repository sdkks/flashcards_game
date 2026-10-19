import { signal } from '@preact/signals';
import { useLayoutEffect, useRef } from 'preact/hooks';
import { FlashCard, type FlipOutcome } from './FlashCard';
import { QuizCard, type QuizOutcome } from './QuizCard';
import type { FlashCard as FlashCardType } from '../utils/storage';
import { t } from '../i18n';
import { downloadMixedSourceNotes } from './ExportDialog';
import { cardCount, deckSource, dictionary, timerMinutes, manualDeckPending } from '../state';

type GameMode = 'idle' | 'flip' | 'quiz' | 'results';
type EndReason = 'completed' | 'stopped' | 'timedOut';

const gameCards = signal<FlashCardType[]>([]);
const currentIndex = signal(0);
const gameMode = signal<GameMode>('idle');
const sessionMode = signal<'flip' | 'quiz'>('quiz');
const endReason = signal<EndReason>('completed');
const quizOutcomes = signal<QuizOutcome[]>([]);
const flipOutcomes = signal<(FlipOutcome | null)[]>([]);
const flipNotice = signal<{ outcome: FlipOutcome; index: number } | null>(null);
const cardView = signal(0);
let sessionId = 0;
const timeRemaining = signal(0);

let timerInterval: ReturnType<typeof setInterval> | null = null;

function clearTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function getTimerSeconds(): number {
  return Math.max(Math.round(timerMinutes.value * 60), 1);
}

function startTimer() {
  clearTimer();
  timeRemaining.value = getTimerSeconds();
  timerInterval = setInterval(() => {
    timeRemaining.value--;
    if (timeRemaining.value <= 0) endSession('timedOut');
  }, 1000);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getCardCount(): number {
  return Math.min(cardCount.value, dictionary.value.length);
}

const mixedScopeLabel = (scope: string[] | null): string =>
  scope?.map(segment => t('categories', segment)).join(' / ') ?? t('data', 'mixedGeneralScope');

export function hasActiveSession(): boolean {
  return gameMode.value === 'flip' || gameMode.value === 'quiz';
}

function startGame(mode: 'flip' | 'quiz') {
  if (manualDeckPending.value) return;
  const dict = dictionary.value;
  if (dict.length === 0) return;

  sessionId++;
  cardView.value++;
  const shuffled = shuffle(dict);
  gameCards.value = shuffled.slice(0, getCardCount());
  currentIndex.value = 0;
  quizOutcomes.value = [];
  flipOutcomes.value = gameCards.value.map(() => null);
  flipNotice.value = null;
  sessionMode.value = mode;
  gameMode.value = mode;
  startTimer();
}

function endSession(reason: EndReason) {
  if (gameMode.value !== 'quiz' && gameMode.value !== 'flip') return;
  clearTimer();
  sessionId++;
  endReason.value = reason;
  gameMode.value = 'results';
}

export function resetToIdle() {
  clearTimer();
  sessionId++;
  cardView.value++;
  flipOutcomes.value = [];
  flipNotice.value = null;
  gameMode.value = 'idle';
  gameCards.value = [];
  currentIndex.value = 0;
  quizOutcomes.value = [];
  timeRemaining.value = 0;
}

function recordQuizOutcome(outcome: QuizOutcome) {
  // A card can contribute only one outcome, even before the next render.
  if (gameMode.value !== 'quiz' || quizOutcomes.value.length !== currentIndex.value) return;
  quizOutcomes.value = [...quizOutcomes.value, outcome];
}

function advanceQuiz() {
  if (gameMode.value !== 'quiz' || quizOutcomes.value.length !== currentIndex.value + 1) return;
  if (currentIndex.value >= gameCards.value.length - 1) {
    endSession('completed');
  } else {
    currentIndex.value++;
  }
}

function FlipTotals() {
  const correct = flipOutcomes.value.filter(outcome => outcome === 'correct').length;
  const wrong = flipOutcomes.value.filter(outcome => outcome === 'incorrect').length;
  return (
    <div class="flip-totals">
      <p>{t('session', 'correctCount', { count: correct })}</p>
      <p>{t('flip', 'wrongCount', { count: wrong })}</p>
      <p>{t('flip', 'unratedCount', { count: gameCards.value.length - correct - wrong })}</p>
      <p>{t('flip', 'ratedCount', { rated: correct + wrong, total: gameCards.value.length })}</p>
    </div>
  );
}

export function Game() {
  const mode = gameMode.value;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    if (mode === 'results') headingRef.current?.focus();
  }, [mode]);
  useLayoutEffect(() => clearTimer, []);

  if (mode === 'idle') {
    const source = deckSource.value?.cards === dictionary.value ? deckSource.value : null;
    const deckLabel = source?.kind === 'sample'
      ? t('data', 'sampleDeck', { name: source.name })
      : t('data', source?.kind === 'link' ? 'linkedCards' : 'currentCards');
    return (
      <div class="game-start">
        <h2 id="loaded-deck-heading" tabIndex={-1}>{source?.kind === 'mix'
          ? t('data', 'mixedDeck', { name: source.name, count: source.decks.length, path: mixedScopeLabel(source.scope) })
          : deckLabel}</h2>
        <p>{t('data', 'cardsDictionary', { count: dictionary.value.length })}</p>
        {source?.kind === 'mix' && <details class="mixed-source-details">
          <summary>{t('data', 'mixedSources', { count: source.decks.length })}</summary>
          <ul>{source.decks.map(deck => <li key={deck.id}>{t('data', 'mixedSourceItem', { name: deck.name, count: deck.cardCount })}</li>)}</ul>
          <a href={`${import.meta.env.BASE_URL}sample_games/starter-trivia-notices.html`} target="_blank" rel="noopener noreferrer">
            {t('samples', 'triviaNotices')}
          </a>
          <button class="btn btn--secondary" onClick={() => downloadMixedSourceNotes(source)}>{t('export', 'downloadSourceNotes')}</button>
        </details>}
        <p class="session-summary">
          {t('data', 'sessionSummary', { count: getCardCount(), time: formatTime(getTimerSeconds()) })}
        </p>
        <div class="game-start__buttons">
          <div class="game-start__choice">
            <button class="btn btn--primary" aria-describedby="flip-description" onClick={() => startGame('flip')} disabled={dictionary.value.length === 0 || manualDeckPending.value}>
              {t('app', 'newGame')}
            </button>
            <p id="flip-description">{t('flip', 'description')}</p>
          </div>
          <div class="game-start__choice">
            <button class="btn btn--secondary" aria-describedby="type-description" onClick={() => startGame('quiz')} disabled={dictionary.value.length === 0 || manualDeckPending.value}>
              {t('app', 'newQuiz')}
            </button>
            <p id="type-description">{t('quiz', 'description')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'results') {
    const isQuiz = sessionMode.value === 'quiz';
    const correct = quizOutcomes.value.filter(outcome => outcome === 'correct').length;
    const incorrect = quizOutcomes.value.filter(outcome => outcome === 'incorrect').length;
    const skipped = quizOutcomes.value.filter(outcome => outcome === 'skipped').length;
    return (
      <div class="quiz-results">
        <h2 ref={headingRef} tabIndex={-1} class="quiz-results__title">
          {t('session', endReason.value === 'completed' ? (isQuiz ? 'quizFinished' : 'studyFinished') : endReason.value)}
        </h2>
        {isQuiz ? (
          <>
            <p>{t('quiz', 'checkedResults')}</p>
            <p class="quiz-results__score">
              {t('quiz', 'score', { correct, total: gameCards.value.length })}
            </p>
            <div class="quiz-results__bar">
              <div class="quiz-results__fill" style={{ width: `${(correct / gameCards.value.length) * 100}%` }} />
            </div>
            <p>{t('session', 'correctCount', { count: correct })}</p>
            <p>{t('session', 'incorrectCount', { count: incorrect })}</p>
            <p>{t('session', 'skippedCount', { count: skipped })}</p>
            <p>{t('session', 'notAttemptedCount', { count: gameCards.value.length - quizOutcomes.value.length })}</p>
          </>
        ) : (
          <>
            {endReason.value !== 'completed' && <h3>{t('session', 'studyFinished')}</h3>}
            <FlipTotals />
            <p>{t('flip', 'selfAssessment')}</p>
          </>
        )}
        <div class="quiz-results__actions">
          <button class="btn btn--primary" onClick={() => startGame(sessionMode.value)} disabled={manualDeckPending.value}>
            {t('quiz', 'tryAgain')}
          </button>
          <button class="btn btn--ghost" onClick={resetToIdle}>
            {t('quiz', 'backToMenu')}
          </button>
        </div>
      </div>
    );
  }

  const card = gameCards.value[currentIndex.value];
  if (!card) return null;

  const timerClass = timeRemaining.value <= 10 ? 'game-timer game-timer--warning' : 'game-timer';

  if (mode === 'quiz') {
    return (
      <div class="game">
        <div class={timerClass}>{formatTime(timeRemaining.value)}</div>
        <QuizCard
          key={currentIndex.value}
          card={card}
          index={currentIndex.value}
          total={gameCards.value.length}
          onResult={recordQuizOutcome}
          onNext={advanceQuiz}
        />
        <button class="btn btn--ghost game__end" onClick={() => endSession('stopped')}>
          {t('app', 'endQuiz')}
        </button>
      </div>
    );
  }

  // Capture identities for this render: detached callbacks cannot act on a later visit/session.
  const session = sessionId;
  const view = cardView.value;
  const index = currentIndex.value;
  const isCurrentView = () => gameMode.value === 'flip' && sessionId === session &&
    cardView.value === view && currentIndex.value === index;
  const navigate = (next: number) => {
    if (!isCurrentView()) return;
    cardView.value++;
    currentIndex.value = next;
  };
  const rate = (outcome: FlipOutcome) => {
    if (!isCurrentView() || flipOutcomes.value[index] !== null) return;
    flipOutcomes.value = flipOutcomes.value.map((previous, i) => i === index ? outcome : previous);
    flipNotice.value = { outcome, index };
    if (index === gameCards.value.length - 1) endSession('completed');
    else navigate(index + 1);
  };

  return (
    <div class="game">
      <div class={timerClass}>{formatTime(timeRemaining.value)}</div>
      <div class="flip-summary">
        <p>{t('flip', 'yourRatings')}</p>
        <FlipTotals />
      </div>
      <div role="status" aria-live="polite" aria-atomic="true">
        {flipNotice.value && <>
          {t('card', 'counter', { current: flipNotice.value.index + 1, total: gameCards.value.length })}
          {' — '}{t('flip', 'recordedRating', { rating: t('flip', flipNotice.value.outcome) })}
        </>}
      </div>
      <FlashCard
        key={`${session}:${view}`}
        card={card}
        index={index}
        total={gameCards.value.length}
        outcome={flipOutcomes.value[index]}
        onRate={rate}
        onFinish={() => { if (isCurrentView()) endSession('completed'); }}
        onNext={() => navigate(Math.min(index + 1, gameCards.value.length - 1))}
        onPrev={() => navigate(Math.max(index - 1, 0))}
      />
      <button class="btn btn--ghost game__end" onClick={() => { if (isCurrentView()) endSession('stopped'); }}>
        {t('app', 'endGame')}
      </button>
    </div>
  );
}
