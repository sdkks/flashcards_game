import { signal } from '@preact/signals';
import { SUPPORTED_LOCALES, currentLocale, setLocale } from '../i18n';
import type { Locale } from '../i18n';

export const languagePickerOpen = signal(false);

export function toggleLanguagePicker() {
  languagePickerOpen.value = !languagePickerOpen.value;
}

export function LanguagePicker() {
  if (!languagePickerOpen.value) return null;

  const handleOverlayClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('lang-overlay')) {
      languagePickerOpen.value = false;
    }
  };

  const handleSelect = (code: Locale) => {
    setLocale(code);
    languagePickerOpen.value = false;
  };

  return (
    <div class="lang-overlay" onClick={handleOverlayClick}>
      <div class="lang-dialog">
        <ul class="lang-dialog__list">
          {SUPPORTED_LOCALES.map((loc) => (
            <li
              key={loc.code}
              class={`lang-dialog__item ${currentLocale.value === loc.code ? 'lang-dialog__item--active' : ''}`}
              onClick={() => handleSelect(loc.code)}
            >
              {loc.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
