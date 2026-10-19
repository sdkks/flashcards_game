import { signal } from '@preact/signals';
import { SeparatorSelect } from './Settings';
import { CardCountSetting } from './CardCountSetting';
import { TimerSetting } from './TimerSetting';
import { AppearanceSetting } from './AppearanceSetting';
import { DictionaryManager } from './DictionaryManager';
import { t } from '../i18n';
import { ModalDialog } from './ModalDialog';

export const settingsOpen = signal(false);

export function toggleSettings() {
  settingsOpen.value = !settingsOpen.value;
}

export function SettingsPanel() {
  if (!settingsOpen.value) return null;

  return (
    <ModalDialog
      class="settings-panel"
      labelledBy="settings-title"
      onDismiss={() => { settingsOpen.value = false; }}
      fallbackFocusId="settings-button"
    >
      <div class="settings-panel__header">
        <h2 id="settings-title" class="settings-panel__title">{t('app', 'settings')}</h2>
        <button
          class="settings-panel__close"
          onClick={() => { settingsOpen.value = false; }}
          aria-label={t('app', 'closeSettings')}
          autoFocus
        >
          ✕
        </button>
      </div>
      <div class="settings-panel__body">
        <section class="settings-panel__section">
          <SeparatorSelect />
          <CardCountSetting />
          <TimerSetting />
        </section>
        <AppearanceSetting />
        <section class="settings-panel__section">
          <DictionaryManager />
        </section>
      </div>
    </ModalDialog>
  );
}
