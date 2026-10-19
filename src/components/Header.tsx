import { theme, themePreference, toggleTheme, useTheme } from '../hooks/useTheme';
import { toggleSettings } from './SettingsPanel';
import { toggleSampleGames } from './SampleGamesDialog';
import { toggleLanguagePicker } from './LanguagePicker';
import { toggleHelp } from './HelpDialog';
import { t } from '../i18n';

export function Header() {
  useTheme();
  const themeAction = t('appearance', theme.value === 'dark' ? 'useLight' : 'useDark');
  const themeLabel = themePreference.value === 'system'
    ? t('appearance', 'systemOverride', { action: themeAction })
    : themeAction;
  return (
    <header class="header">
      <h1 class="header__title">{t('app', 'title')}</h1>
      <div class="header__actions">
        <a
          class="header__btn header__btn--github"
          href="https://github.com/sdkks/flashcards_game"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('app', 'github')}
          title={t('app', 'github')}
        >
          <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
          </svg>
        </a>
        <button
          class="header__btn header__btn--help"
          onClick={toggleHelp}
          aria-label={t('help', 'helpBtn')}
          title={t('help', 'helpBtn')}
        >
          ?
        </button>
        <button
          id="sample-games-button"
          class="header__btn"
          onClick={toggleSampleGames}
          aria-label={t('app', 'sampleGames')}
          title={t('app', 'sampleGames')}
        >
          <svg class="gamepad-icon" width="22" height="17" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
            <path d="M50,40 L150,40 Q180,40 185,70 L190,110 Q195,130 170,130 L150,115 L50,115 L30,130 Q5,130 10,110 L15,70 Q20,40 50,40 Z" fill="#FF8C00" stroke="currentColor" stroke-width="6"/>
            <rect x="40" y="70" width="10" height="30" rx="2" fill="currentColor" />
            <rect x="30" y="80" width="30" height="10" rx="2" fill="currentColor" />
            <circle cx="145" cy="75" r="7" fill="#0000FF" />
            <circle cx="165" cy="75" r="7" fill="#008000" />
            <circle cx="155" cy="60" r="7" fill="#0000FF" />
            <circle cx="155" cy="90" r="7" fill="#008000" />
            <circle cx="80" cy="95" r="12" fill="#222" stroke="currentColor" stroke-width="3" />
            <circle cx="120" cy="95" r="12" fill="#222" stroke="currentColor" stroke-width="3" />
            <rect x="90" y="60" width="8" height="4" rx="1" fill="currentColor" />
            <rect x="102" y="60" width="8" height="4" rx="1" fill="currentColor" />
          </svg>
        </button>
        <button
          id="settings-button"
          class="header__btn"
          onClick={toggleSettings}
          aria-label={t('app', 'settings')}
          title={t('app', 'settings')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button
          class="header__btn"
          onClick={toggleLanguagePicker}
          aria-label={t('app', 'language')}
          title={t('app', 'language')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </button>
        <button
          class="header__btn"
          onClick={toggleTheme}
          aria-label={themeLabel}
          title={themeLabel}
        >
          {theme.value === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
