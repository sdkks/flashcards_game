import { Header } from './components/Header';
import { ErrorMessage } from './components/ErrorMessage';
import { Game, resetToIdle } from './components/Game';
import { SettingsPanel, settingsOpen } from './components/SettingsPanel';
import { SampleGamesDialog, sampleGamesOpen } from './components/SampleGamesDialog';
import { LanguagePicker } from './components/LanguagePicker';
import { HelpDialog } from './components/HelpDialog';
import { getCardsUrl, fetchCards } from './utils/fetch-cards';
import { parseCsv } from './utils/csv';
import { saveDictionary, mergeDictionary } from './utils/storage';
import { getSampleGameParam, findSampleGameById, loadSampleGame } from './utils/sample-games';
import { STORAGE_KEYS } from './utils/constants';
import type { Separator } from './utils/constants';
import { t } from './i18n';
import { dictionary, deckSource, error, loading } from './state';
import './app.css';

// A reset keeps the current game mounted until a replacement has succeeded.
export async function loadFromQuerystring(showLoading = true, canCommit: () => boolean = () => true): Promise<boolean> {
  if (showLoading) loading.value = true;
  error.value = null;
  try {
    const cardsUrl = getCardsUrl();
    if (!cardsUrl) {
      const sampleGameId = getSampleGameParam();
      if (!sampleGameId) return false;
      const game = findSampleGameById(sampleGameId);
      if (!game) {
        error.value = `Unknown sample game: "${sampleGameId}"`;
        return false;
      }
      const err = await loadSampleGame(game, canCommit);
      if (err) error.value = err;
      return err === null;
    }

    const result = await fetchCards(cardsUrl);
    if (!result.ok) {
      error.value = result.error || 'Unknown error';
      return false;
    }

    const separator = (localStorage.getItem(STORAGE_KEYS.separator) || ',') as Separator;
    const cards = parseCsv(result.data!, separator);
    if (cards.length === 0) {
      error.value = t('errors', 'emptyData');
      return false;
    }

    if (!canCommit()) {
      error.value = t('catalog', 'changed');
      return false;
    }
    const merged = mergeDictionary([], cards);
    saveDictionary(merged);
    resetToIdle();
    dictionary.value = merged;
    deckSource.value = { cards: merged, kind: 'link' };
    return true;
  } catch {
    error.value = t('deck', 'failed');
    return false;
  } finally {
    if (showLoading) loading.value = false;
  }
}

loadFromQuerystring();

export function App() {
  return (
    <div class="app">
      <Header />
      <div class="study-layout">
        <SampleGamesDialog />
        <main class="main">
          {loading.value && <p class="loading">{t('data', 'loading')}</p>}
          {error.value && !loading.value && <ErrorMessage message={error.value} />}
          {!loading.value && dictionary.value.length > 0 && <Game />}
          {!loading.value && dictionary.value.length === 0 && (
            <section class="game-start" aria-labelledby="deck-entry-title">
              <h2 id="deck-entry-title">{t('data', 'noCards')}</h2>
              <div class="game-start__buttons">
                <button class="btn btn--primary" onClick={() => { sampleGamesOpen.value = true; }}>
                  {t('data', 'browseSamples')}
                </button>
                <button class="btn btn--secondary" onClick={() => { settingsOpen.value = true; }}>
                  {t('data', 'addOwnCards')}
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
      <SettingsPanel />
      <LanguagePicker />
      <HelpDialog />
      <footer class="app-footer">
        <a
          class="feedback-link"
          href="https://forms.gle/KdhAgazLmXxnD6nw7"
          target="_blank"
          rel="noopener noreferrer"
        >
          Feedback / Report Site Issues
        </a>
        <p class="disclaimer">
          Disclaimer: This is a frontend-only application. No user data is collected, transmitted, or stored on any server. All data remains in your browser's local storage. Only the bundled sample dictionaries are hosted. Users are solely responsible for the content they input, upload, or share via deep links. The developers assume no liability for any user-generated content, including but not limited to content that may be unlawful, infringing, or otherwise objectionable.
        </p>
      </footer>
    </div>
  );
}
