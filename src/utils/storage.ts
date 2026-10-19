import { STORAGE_KEYS } from './constants';

export interface FlashCard {
  key: string;
  value: string;
}

export interface MixedDeckComponent {
  id: string;
  name: string;
  cardCount: number;
}

export interface MixedDeckSource {
  kind: 'mix';
  name: string;
  scope: string[] | null;
  decks: MixedDeckComponent[];
  origins: Record<string, string[]>;
}

type PersistedMixedSource = MixedDeckSource & { cards: FlashCard[] };

function isFlashCard(value: unknown): value is FlashCard {
  if (!value || typeof value !== 'object') return false;
  const card = value as Record<string, unknown>;
  return typeof card.key === 'string' && typeof card.value === 'string';
}

function isPersistedMixedSource(value: unknown): value is PersistedMixedSource {
  if (!value || typeof value !== 'object') return false;
  const source = value as Record<string, unknown>;
  const decks = source.decks;
  const origins = source.origins;
  const scope = source.scope;
  return source.kind === 'mix' && typeof source.name === 'string' &&
    (scope === null || (Array.isArray(scope) && scope.every(segment => typeof segment === 'string'))) &&
    Array.isArray(source.cards) && source.cards.every(isFlashCard) &&
    Array.isArray(decks) && decks.every(deck => {
      if (!deck || typeof deck !== 'object') return false;
      const candidate = deck as Record<string, unknown>;
      return typeof candidate.id === 'string' && typeof candidate.name === 'string' &&
        typeof candidate.cardCount === 'number' && Number.isFinite(candidate.cardCount);
    }) &&
    !!origins && typeof origins === 'object' && !Array.isArray(origins) &&
    Object.values(origins).every(ids => Array.isArray(ids) && ids.every(id => typeof id === 'string'));
}

function canonicalCards(cards: FlashCard[]): FlashCard[] {
  return deduplicateAndSort(cards);
}

function sourceStorageJson(source: PersistedMixedSource): string {
  return JSON.stringify({
    ...source,
    cards: canonicalCards(source.cards),
  });
}

export function getDictionary(): FlashCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.dictionary);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getStoredMixedSource(cards: FlashCard[]): MixedDeckSource | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.mixedSource);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedMixedSource(parsed) ||
      JSON.stringify(canonicalCards(parsed.cards)) !== JSON.stringify(canonicalCards(cards))) return null;
    const source = parsed;
    const { cards: _cards, ...metadata } = source;
    return metadata;
  } catch {
    return null;
  }
}

export function saveDictionary(cards: FlashCard[]): void {
  const json = JSON.stringify(canonicalCards(cards));
  try {
    localStorage.setItem(STORAGE_KEYS.dictionary, json);
    localStorage.removeItem(STORAGE_KEYS.mixedSource);
  } catch {
    throw new Error('Storage quota exceeded. Try removing some cards.');
  }
}

export function saveDictionaryWithMixedSource(cards: FlashCard[], source: MixedDeckSource): void {
  const canonical = canonicalCards(cards);
  const previousDictionary = localStorage.getItem(STORAGE_KEYS.dictionary);
  const previousSource = localStorage.getItem(STORAGE_KEYS.mixedSource);
  const persisted: PersistedMixedSource = { ...source, cards: canonical };
  try {
    localStorage.setItem(STORAGE_KEYS.dictionary, JSON.stringify(canonical));
    localStorage.setItem(STORAGE_KEYS.mixedSource, sourceStorageJson(persisted));
  } catch {
    try {
      if (previousDictionary === null) localStorage.removeItem(STORAGE_KEYS.dictionary);
      else localStorage.setItem(STORAGE_KEYS.dictionary, previousDictionary);
      if (previousSource === null) localStorage.removeItem(STORAGE_KEYS.mixedSource);
      else localStorage.setItem(STORAGE_KEYS.mixedSource, previousSource);
    } catch {
      // The original error is the useful failure; a later reload still validates metadata.
    }
    throw new Error('Storage quota exceeded. Try removing some cards.');
  }
}

export function clearDictionary(): void {
  localStorage.removeItem(STORAGE_KEYS.dictionary);
  localStorage.removeItem(STORAGE_KEYS.mixedSource);
}

export function mergeDictionary(existing: FlashCard[], incoming: FlashCard[]): FlashCard[] {
  const map = new Map<string, string>();
  for (const card of existing) {
    map.set(card.key, card.value);
  }
  for (const card of incoming) {
    map.set(card.key, card.value);
  }
  return deduplicateAndSort(
    Array.from(map.entries()).map(([key, value]) => ({ key, value }))
  );
}

function deduplicateAndSort(cards: FlashCard[]): FlashCard[] {
  const map = new Map<string, string>();
  for (const card of cards) {
    map.set(card.key, card.value);
  }
  return Array.from(map.entries())
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));
}
