export const PERMISSIBLE_SEPARATORS = [',', '|', '\t', ';', ':'] as const;
export type Separator = typeof PERMISSIBLE_SEPARATORS[number];

export const SEPARATOR_LABELS: Record<Separator, string> = {
  ',': 'Comma (,)',
  '|': 'Pipe (|)',
  '\t': 'Tab',
  ';': 'Semicolon (;)',
  ':': 'Colon (:)',
};

export const DEFAULT_CARD_COUNT = 50;
export const DEFAULT_TIMER_MINUTES = 15;
export const STORAGE_KEYS = {
  dictionary: 'flashcards_dictionary',
  locale: 'flashcards_locale',
  theme: 'flashcards_theme',
  palette: 'flashcards_palette',
  cardCount: 'flashcards_card_count',
  separator: 'flashcards_separator',
  timerMinutes: 'flashcards_timer_minutes',
  mixedSource: 'flashcards_mixed_source',
} as const;
