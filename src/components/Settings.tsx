import { signal } from '@preact/signals';
import { PERMISSIBLE_SEPARATORS, SEPARATOR_LABELS, STORAGE_KEYS } from '../utils/constants';
import type { Separator } from '../utils/constants';
import { t } from '../i18n';

const currentSeparator = signal<Separator>(
  (localStorage.getItem(STORAGE_KEYS.separator) as Separator) || ','
);

export function SeparatorSelect() {
  const handleChange = (e: Event) => {
    const value = (e.target as HTMLSelectElement).value as Separator;
    currentSeparator.value = value;
    localStorage.setItem(STORAGE_KEYS.separator, value);
  };

  return (
    <div class="setting">
      <label class="setting__label" for="separator-select">{t('data', 'separator')}</label>
      <select
        id="separator-select"
        class="setting__select"
        value={currentSeparator.value}
        onChange={handleChange}
      >
        {PERMISSIBLE_SEPARATORS.map((sep) => (
          <option key={sep} value={sep}>{SEPARATOR_LABELS[sep]}</option>
        ))}
      </select>
    </div>
  );
}

export function getSeparator(): Separator {
  return currentSeparator.value;
}
