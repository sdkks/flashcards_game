import { useState, useLayoutEffect, useRef } from 'preact/hooks';
import type { FlashCard as FlashCardType } from '../utils/storage';
import { t } from '../i18n';

export type FlipOutcome = 'correct' | 'incorrect';

interface FlashCardProps {
  outcome: FlipOutcome | null;
  onRate: (outcome: FlipOutcome) => void;
  card: FlashCardType;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
}

export function FlashCard({ card, index, total, outcome, onRate, onNext, onPrev, onFinish }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);
  const revealed = useRef(false);
  const submitted = useRef(false);
  const counterRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    counterRef.current?.focus();
  }, []);

  const handleFlip = () => {
    revealed.current = !revealed.current;
    setFlipped(revealed.current);
  };
  const rate = (rating: FlipOutcome) => {
    if (!revealed.current || submitted.current || outcome !== null) return;
    submitted.current = true;
    onRate(rating);
  };

  return (
    <div class="flashcard-container" onKeyDown={(event) => {
      if (event.repeat && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
    }}>
      <div ref={counterRef} tabIndex={-1} class="card-counter">{index + 1} / {total}</div>
      <button
        type="button"
        class={`flashcard ${flipped ? 'flashcard--flipped' : ''}`}
        onClick={handleFlip}
      >
        <span class="flashcard__face flashcard__front" aria-hidden={flipped}>
          <span class="flashcard__label">{t('card', 'front')}</span>
          <span class={`flashcard__content ${card.key.length > 60 ? 'flashcard__content--long' : ''}`}>{card.key}</span>
          <span class="flashcard__hint">{t('card', 'showAnswer')}</span>
        </span>
        <span class="flashcard__face flashcard__back" aria-hidden={!flipped}>
          <span class="flashcard__label">{t('card', 'back')}</span>
          <span class={`flashcard__content ${card.value.length > 60 ? 'flashcard__content--long' : ''}`}>{card.value}</span>
          <span class="flashcard__hint">{t('card', 'showQuestion')}</span>
        </span>
      </button>
      <div class="flip-rating">
        {outcome !== null ? (
          <>
            <p>{t('flip', 'recordedRating', { rating: t('flip', outcome) })}</p>
            <p>{t('flip', 'readOnly')}</p>
          </>
        ) : flipped ? (
          <>
            <p>{t('flip', index === total - 1 ? 'rateLastHelp' : 'rateHelp')}</p>
            <div class="flip-rating__actions">
              <button type="button" class="btn flip-rating__correct" onClick={() => rate('correct')}>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m4 12 5 5L20 6" /></svg>
                {t('flip', 'correct')}
              </button>
              <button type="button" class="btn flip-rating__incorrect" onClick={() => rate('incorrect')}>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18" /></svg>
                {t('flip', 'incorrect')}
              </button>
            </div>
          </>
        ) : <p>{t('flip', 'revealHelp')}</p>}
      </div>
      <p class="flip-navigation-help">{t('flip', 'navigationHelp')}</p>
      <div class="card-nav">
        <button class="btn btn--secondary" onClick={onPrev} disabled={index === 0}>
          {t('card', 'previous')}
        </button>
        <button class="btn btn--secondary" onClick={index === total - 1 ? onFinish : onNext}>
          {index === total - 1 ? t('session', 'finishStudying') : t('card', 'next')}
        </button>
      </div>
    </div>
  );
}
