import { signal } from '@preact/signals';
import { t } from '../i18n';

export const helpOpen = signal(false);

export function toggleHelp() {
  helpOpen.value = !helpOpen.value;
}

export function HelpDialog() {
  if (!helpOpen.value) return null;

  const handleOverlayClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('help-overlay')) {
      helpOpen.value = false;
    }
  };

  const items = [
    'gamepad', 'settings', 'language', 'darkMode',
    'newGame', 'newQuiz', 'timer', 'deeplink',
  ];

  return (
    <div class="help-overlay" onClick={handleOverlayClick}>
      <div class="help-dialog">
        <div class="help-dialog__header">
          <h2 class="help-dialog__title">{t('help', 'title')}</h2>
        </div>
        <ul class="help-dialog__list">
          {items.map((key) => (
            <li key={key} class="help-dialog__item">
              {t('help', key)}
              {key === 'newQuiz' && <p>{t('quiz', 'exactAnswer')}</p>}
            </li>
          ))}
        </ul>
        <div class="help-dialog__footer">
          <button
            class="btn btn--primary"
            onClick={() => { helpOpen.value = false; }}
          >
            {t('help', 'ok')}
          </button>
        </div>
      </div>
    </div>
  );
}
