import { useState, useLayoutEffect, useRef } from 'preact/hooks';
import type { FlashCard } from '../utils/storage';
import { t } from '../i18n';

export type QuizOutcome = 'correct' | 'incorrect' | 'skipped';
type CardState = 'answering' | QuizOutcome;

interface QuizCardProps {
  card: FlashCard;
  index: number;
  total: number;
  onResult: (outcome: QuizOutcome) => void;
  onNext: () => void;
}

export function QuizCard({ card, index, total, onResult, onNext }: QuizCardProps) {
  const [input, setInput] = useState('');
  const [state, setState] = useState<CardState>('answering');
  const submitted = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (state === 'answering') inputRef.current?.focus();
    else nextRef.current?.focus();
  }, [state]);

  const record = (outcome: QuizOutcome) => {
    if (submitted.current) return;
    submitted.current = true;
    setState(outcome);
    onResult(outcome);
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    record(input.trim().toLowerCase() === card.value.trim().toLowerCase() ? 'correct' : 'incorrect');
  };

  return (
    <div class="flashcard-container">
      <div class="card-counter">{index + 1} / {total}</div>
      <div class="quiz-card">
        <div class="quiz-card__question">
          <div class="flashcard__label">{t('card', 'front')}</div>
          <div class="flashcard__content">{card.key}</div>
        </div>
        <p id="quiz-instructions">{t('quiz', 'exactAnswer')}</p>
        {state === 'answering' && (
          <div class="quiz-card__input-area">
            <label for="quiz-answer">{t('quiz', 'yourAnswer')}</label>
            <input
              ref={inputRef}
              id="quiz-answer"
              aria-describedby="quiz-instructions"
              type="text"
              class="text-input quiz-card__input"
              placeholder={t('quiz', 'enterAnswer')}
              value={input}
              onInput={(e) => setInput((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!e.repeat) handleSubmit();
                }
              }}
              maxLength={1000}
            />
            <div class="quiz-card__actions">
              <button class="btn btn--primary" onClick={handleSubmit} disabled={!input.trim()}>
                {t('quiz', 'submit')}
              </button>
              <button class="btn btn--secondary" onClick={() => record('skipped')}>
                {t('quiz', 'skip')}
              </button>
            </div>
          </div>
        )}
        <div role="status" aria-live="polite" aria-atomic="true">
          {state !== 'answering' && (
            <p class={`quiz-card__feedback quiz-card__feedback--${state}`}>
              {t('quiz', state)}
            </p>
          )}
        </div>
        {state !== 'answering' && (
          <div>
            <p class="quiz-card__comparison"><strong>{t('quiz', 'yourAnswer')}: </strong>{input || t('quiz', 'noAnswer')}</p>
            <p class="quiz-card__comparison"><strong>{t('quiz', 'expectedAnswer')}: </strong>{card.value}</p>
            <button
              ref={nextRef}
              class="btn btn--primary"
              onClick={onNext}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && event.repeat) event.preventDefault();
              }}
            >
              {t('quiz', index === total - 1 ? 'seeResults' : 'nextCard')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
