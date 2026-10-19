import { useState } from 'preact/hooks';
import { getDictionary } from '../utils/storage';
import type { MixedDeckSource } from '../utils/storage';
import { PERMISSIBLE_SEPARATORS, SEPARATOR_LABELS } from '../utils/constants';
import type { Separator } from '../utils/constants';
import { t } from '../i18n';
import { ModalDialog } from './ModalDialog';
import { deckSource, dictionary } from '../state';

type ExportFormat = 'csv' | 'json';

const categoryLabel = (segment: string) => t('categories', segment);

export function downloadMixedSourceNotes(source: MixedDeckSource): void {
  const scope = source.scope?.map(categoryLabel).join(' / ') ?? t('data', 'mixedGeneralScope');
  const content = [
    `${source.name}`,
    t('export', 'sourceNotesScope', { path: scope }),
    t('export', 'sourceNotesIntro'),
    '',
    ...source.decks.map(deck => t('export', 'sourceNotesComponent', {
      name: deck.name,
      count: deck.cardCount,
      url: `${window.location.origin}${import.meta.env.BASE_URL}sample_games/${deck.id}.csv`,
    })),
    '',
    t('export', 'sourceNotesOrigins'),
    ...Object.entries(source.origins).map(([question, ids]) => `- ${question}: ${ids.join(', ')}`),
  ].join('\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flashcards_lucky_mix_source_notes.txt';
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportDialog({ label }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [separator, setSeparator] = useState<Separator>(',');

  const handleSourceNotes = () => {
    const source = deckSource.value;
    if (source?.kind !== 'mix' || source.cards !== dictionary.value) return;
    downloadMixedSourceNotes(source);
  };

  const handleDownload = () => {
    const dict = getDictionary();
    if (dict.length === 0) return;

    let content: string;
    let mimeType: string;
    let ext: string;

    if (format === 'json') {
      content = JSON.stringify(dict, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    } else {
      const sanitize = (field: string): string =>
        /^[=+\-@|]/.test(field) ? `'${field}` : field;
      const header = `key${separator}value`;
      const rows = dict.map(c => `${sanitize(c.key)}${separator}${sanitize(c.value)}`);
      content = [header, ...rows].join('\n');
      mimeType = 'text/csv';
      ext = 'csv';
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `flashcards_export_${timestamp}.${ext}`;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const source = deckSource.value;
  const mixedSource = source?.kind === 'mix' && source.cards === dictionary.value ? source : null;

  return (
    <>
      <button class="btn btn--secondary" onClick={() => setOpen(true)}>
        {label ?? t('app', 'export')}
      </button>
      {open && (
        <ModalDialog class="export-dialog" labelledBy="export-title" onDismiss={() => setOpen(false)}>
          <h3 id="export-title" class="export-dialog__title">{t('export', 'title')}</h3>
          <div class="export-dialog__row">
            <label class="setting__label" for="export-format">{t('export', 'format')}</label>
            <select
              id="export-format"
              autoFocus
              class="setting__select"
              value={format}
              onChange={(e) => setFormat((e.target as HTMLSelectElement).value as ExportFormat)}
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
          {mixedSource && <>
            <p>{t('export', 'sourceNotesHelp')}</p>
            <p>{t('export', 'sourceNotesScope', { path: mixedSource.scope?.map(categoryLabel).join(' / ') ?? t('data', 'mixedGeneralScope') })}</p>
            <ul class="export-dialog__sources">
              {mixedSource.decks.map(deck => <li key={deck.id}>{t('data', 'mixedSourceItem', { name: deck.name, count: deck.cardCount })}</li>)}
            </ul>
            <button class="btn btn--secondary" onClick={handleSourceNotes}>{t('export', 'downloadSourceNotes')}</button>
            <a href={`${import.meta.env.BASE_URL}sample_games/starter-trivia-notices.html`} target="_blank" rel="noopener noreferrer">
              {t('samples', 'triviaNotices')}
            </a>
          </>}
          {format === 'csv' && (
            <div class="export-dialog__row">
              <label class="setting__label" for="export-separator">{t('export', 'separator')}</label>
              <select
                id="export-separator"
                class="setting__select"
                value={separator}
                onChange={(e) => setSeparator((e.target as HTMLSelectElement).value as Separator)}
              >
                {PERMISSIBLE_SEPARATORS.map((sep) => (
                  <option key={sep} value={sep}>{SEPARATOR_LABELS[sep]}</option>
                ))}
              </select>
            </div>
          )}
          <div class="export-dialog__actions">
            <button class="btn btn--primary" onClick={handleDownload}>
              {t('export', 'download')}
            </button>
            <button class="btn btn--ghost" onClick={() => setOpen(false)}>
              {t('export', 'cancel')}
            </button>
          </div>
        </ModalDialog>
      )}
    </>
  );
}
