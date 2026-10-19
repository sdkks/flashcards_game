import {
  themePreference, themeStorageUnavailable, setThemePreference,
  palette, paletteStorageUnavailable, setPalette,
} from '../hooks/useTheme';
import { t } from '../i18n';

export function AppearanceSetting() {
  return (
    <section class="settings-panel__section">
      <div class="setting setting--appearance">
        <label class="setting__label" for="appearance-select">{t('appearance', 'label')}</label>
        <select
          id="appearance-select"
          class="setting__select"
          value={themePreference.value}
          onChange={event => setThemePreference(event.currentTarget.value)}
          aria-describedby={themeStorageUnavailable.value ? 'appearance-storage-note' : undefined}
        >
          <option value="system">{t('appearance', 'system')}</option>
          <option value="light">{t('app', 'lightMode')}</option>
          <option value="dark">{t('app', 'darkMode')}</option>
        </select>
      </div>
      {themeStorageUnavailable.value && (
        <p id="appearance-storage-note" class="dict-status" role="status">
          {t('appearance', 'storageUnavailable')}
        </p>
      )}
      <div class="setting setting--palette">
        <label class="setting__label" for="palette-select">{t('palette', 'label')}</label>
        <select
          id="palette-select"
          class="setting__select"
          value={palette.value}
          onChange={event => setPalette(event.currentTarget.value)}
          aria-describedby={paletteStorageUnavailable.value ? 'palette-help palette-storage-note' : 'palette-help'}
        >
          <option value="slate">{t('palette', 'slate')}</option>
          <option value="paper">{t('palette', 'paper')}</option>
          <option value="iris">{t('palette', 'iris')}</option>
        </select>
      </div>
      <p id="palette-help" class="dict-status">{t('palette', 'help')}</p>
      {paletteStorageUnavailable.value && (
        <p id="palette-storage-note" class="dict-status" role="status">
          {t('palette', 'storageUnavailable')}
        </p>
      )}
    </section>
  );
}
