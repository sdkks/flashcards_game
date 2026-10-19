import { signal } from '@preact/signals';
import type { FlashCard } from './utils/storage';
import { getDictionary, getStoredMixedSource, type MixedDeckSource } from './utils/storage';
import { DEFAULT_CARD_COUNT, DEFAULT_TIMER_MINUTES, STORAGE_KEYS } from './utils/constants';

const storedDictionary = getDictionary();
const storedMixedSource = getStoredMixedSource(storedDictionary);
export const dictionary = signal<FlashCard[]>(storedDictionary);
export const error = signal<string | null>(null);
export const loading = signal(false);
// Manual browser work blocks new sessions, not actions in an existing session.
export const manualDeckPending = signal(false);
export const browserCommitRevision = signal(0);

// Provenance belongs only to the exact cards loaded in this visit, never inferred from the URL.
export type DeckSource =
  { cards: FlashCard[]; kind: 'sample'; name: string; id: string } |
  { cards: FlashCard[]; kind: 'link' } |
  (MixedDeckSource & { cards: FlashCard[] });

export const deckSource = signal<DeckSource | null>(
  storedMixedSource ? { ...storedMixedSource, cards: storedDictionary } : null
);

const storedCount = localStorage.getItem(STORAGE_KEYS.cardCount);
const storedMinutes = localStorage.getItem(STORAGE_KEYS.timerMinutes);
export const cardCount = signal(storedCount ? parseInt(storedCount, 10) : DEFAULT_CARD_COUNT);
export const timerMinutes = signal(storedMinutes ? parseFloat(storedMinutes) : DEFAULT_TIMER_MINUTES);
