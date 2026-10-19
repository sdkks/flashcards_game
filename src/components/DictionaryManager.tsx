import { useState } from 'preact/hooks';
import { parseCsv } from '../utils/csv';
import { getDictionary, saveDictionary, mergeDictionary, clearDictionary } from '../utils/storage';
import { fetchCards, getCardsUrl } from '../utils/fetch-cards';
import { getSampleGameParam } from '../utils/sample-games';
import { STORAGE_KEYS } from '../utils/constants';
import type { Separator } from '../utils/constants';
import type { FlashCard } from '../utils/storage';
import { t } from '../i18n';
import { dictionary, deckSource, error, browserCommitRevision } from '../state';
import { resetToIdle } from './Game';
import { ExportDialog } from './ExportDialog';
import { loadFromQuerystring } from '../app';

export function DictionaryManager() {
  const [linkUrl, setLinkUrl] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState('');
  const [resetting, setResetting] = useState(false);
  const resetKind = getCardsUrl() ? 'restoreLink' : getSampleGameParam() ? 'restoreSample' : 'clear';

  const getSep = (): Separator =>
    (localStorage.getItem(STORAGE_KEYS.separator) as Separator) || ',';

  const handleUpload = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const revision = browserCommitRevision.value;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const cards = parseCsv(text, getSep());
      if (cards.length === 0) {
        setStatus('No valid cards found in file.');
        return;
      }
      if (revision !== browserCommitRevision.value) {
        error.value = t('catalog', 'changed');
        setStatus(t('catalog', 'changed'));
        return;
      }
      const merged = mergeDictionary(getDictionary(), cards);
      saveDictionary(merged);
      dictionary.value = merged;
      deckSource.value = null;
      setStatus(`Added ${cards.length} cards from file.`);
    };
    reader.readAsText(file);
    input.value = '';
  };

  const handleLinkFetch = async () => {
    if (!linkUrl.trim()) return;
    const revision = browserCommitRevision.value;
    setStatus('Fetching...');
    const result = await fetchCards(linkUrl.trim());
    if (!result.ok) {
      setStatus(result.error || 'Fetch failed.');
      return;
    }
    const cards = parseCsv(result.data!, getSep());
    if (cards.length === 0) {
      setStatus('No valid cards found at URL.');
      return;
    }
    if (revision !== browserCommitRevision.value) {
      error.value = t('catalog', 'changed');
      setStatus(t('catalog', 'changed'));
      return;
    }
    const merged = mergeDictionary(getDictionary(), cards);
    saveDictionary(merged);
    dictionary.value = merged;
    deckSource.value = null;
    setLinkUrl('');
    setStatus(`Added ${cards.length} cards from link.`);
  };

  const handleManualAdd = () => {
    if (!question.trim() || !answer.trim()) return;
    const newCard: FlashCard = { key: question.trim(), value: answer.trim() };
    const merged = mergeDictionary(getDictionary(), [newCard]);
    saveDictionary(merged);
    dictionary.value = merged;
    deckSource.value = null;
    setQuestion('');
    setAnswer('');
    setStatus(`Added "${newCard.key}".`);
  };

  const handleReset = async () => {
    if (!window.confirm(`${t('deck', resetKind)}?\n\n${t('deck', 'warning')}`)) return;
    const revision = browserCommitRevision.value;
    setResetting(true);
    setStatus('');
    try {
      if (resetKind === 'clear') {
        clearDictionary();
        resetToIdle();
        dictionary.value = [];
        deckSource.value = null;
        error.value = null;
        setStatus(t('deck', 'cleared'));
      } else {
        const restored = await loadFromQuerystring(false, () => revision === browserCommitRevision.value);
        setStatus(revision !== browserCommitRevision.value
          ? t('catalog', 'changed') : t('deck', restored ? 'restored' : 'failed'));
      }
    } catch {
      setStatus(t('deck', 'failed'));
    } finally {
      setResetting(false);
    }
  };

  return (
    <div class="dict-manager">
      <details class="dict-section">
        <summary class="dict-section__title">{t('data', 'uploadCsv')}</summary>
        <div class="dict-section__body">
          <input type="file" accept=".csv,.txt" onChange={handleUpload} class="file-input" aria-label={t('data', 'uploadCsv')} />
        </div>
      </details>

      <details class="dict-section">
        <summary class="dict-section__title">{t('data', 'addByLink')}</summary>
        <div class="dict-section__body">
          <input
            type="url"
            class="text-input"
            value={linkUrl}
            maxLength={2048}
            onInput={(e) => setLinkUrl((e.target as HTMLInputElement).value)}
            placeholder="https://..."
            aria-label={t('data', 'addByLink')}
          />
          <button class="btn btn--primary btn--sm" onClick={handleLinkFetch}>
            {t('data', 'fetch')}
          </button>
          <a
            class="btn btn--secondary btn--sm btn--help-link"
            href={`${import.meta.env.BASE_URL}help-csv.html`}
            target="_blank"
            rel="noopener noreferrer"
            title={t('help', 'helpBtn')}
          >
            ?
          </a>
        </div>
      </details>

      <details class="dict-section">
        <summary class="dict-section__title">{t('data', 'addManual')}</summary>
        <div class="dict-section__body">
          <input
            type="text"
            class="text-input"
            value={question}
            maxLength={1000}
            onInput={(e) => setQuestion((e.target as HTMLInputElement).value)}
            placeholder={t('data', 'question')}
            aria-label={t('data', 'question')}
          />
          <input
            type="text"
            class="text-input"
            value={answer}
            maxLength={1000}
            onInput={(e) => setAnswer((e.target as HTMLInputElement).value)}
            placeholder={t('data', 'answer')}
            aria-label={t('data', 'answer')}
          />
          <button class="btn btn--primary btn--sm" onClick={handleManualAdd}>
            {t('data', 'add')}
          </button>
        </div>
      </details>

      <p>{t('deck', 'exportFirst')}</p>
      <ExportDialog />
      <button class="btn btn--danger" onClick={handleReset} disabled={resetting}>
        {resetting ? t('data', 'loading') : t('deck', resetKind)}
      </button>

      {status && <p class="dict-status" role="status">{status}</p>}
    </div>
  );
}
