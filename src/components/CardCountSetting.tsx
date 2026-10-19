import { STORAGE_KEYS } from '../utils/constants';
import { cardCount, dictionary } from '../state';
import { t } from '../i18n';

export function CardCountSetting() {
  const dictSize = dictionary.value.length;
  const max = Math.max(dictSize, 1);

  const handleChange = (e: Event) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (isNaN(val) || val < 1) return;
    const clamped = Math.min(val, max);
    cardCount.value = clamped;
    localStorage.setItem(STORAGE_KEYS.cardCount, String(clamped));
  };

  return (
    <div class="setting">
      <label class="setting__label" for="card-count">{t('data', 'cardCount')}</label>
      <input
        id="card-count"
        type="number"
        class="setting__input"
        min={1}
        max={max}
        value={cardCount.value}
        onChange={handleChange}
      />
    </div>
  );
}
