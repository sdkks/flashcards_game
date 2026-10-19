import type { Separator } from './constants';
import type { FlashCard } from './storage';

const MAX_CARDS = 10000;
const MAX_FIELD_LENGTH = 1000;

export function parseCsv(text: string, separator: Separator): FlashCard[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length <= 1) return [];

  const cards: FlashCard[] = [];
  for (let i = 1; i < lines.length && cards.length < MAX_CARDS; i++) {
    const parts = lines[i].split(separator);
    if (parts.length >= 2) {
      const key = parts[0].trim().slice(0, MAX_FIELD_LENGTH);
      const value = parts.slice(1).join(separator).trim().slice(0, MAX_FIELD_LENGTH);
      if (key && value) {
        cards.push({ key, value });
      }
    }
  }

  return cards;
}
