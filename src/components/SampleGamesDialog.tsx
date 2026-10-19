import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import {
  SAMPLE_GAMES, buildLuckyMix, clearSampleGameParams, commitLuckyMix, commitSampleGame,
  fetchSampleGameCards, filterDecks, getEligibleDecks, groupDecks, orderLuckyDecks,
  pickLuckyDeck, setSampleGameParam,
} from '../utils/sample-games';
import type { DeckGroup, SampleGame } from '../utils/sample-games';
import type { FlashCard } from '../utils/storage';
import { isRTL, t } from '../i18n';
import { ModalDialog } from './ModalDialog';
import { ExportDialog } from './ExportDialog';
import { hasActiveSession } from './Game';
import { browserCommitRevision, deckSource, dictionary, manualDeckPending } from '../state';

export const sampleGamesOpen = signal(false);
export function toggleSampleGames() { sampleGamesOpen.value = !sampleGamesOpen.value; }

const categoryLabel = (segment: string) => t('categories', segment);
const pathLabel = (path: string[]) => path.map(categoryLabel).join(' / ');
const pathId = (path: string[]) => path.join('/');

type Intent = {
  mode: 'single' | 'mix';
  game?: SampleGame;
  scope: string[] | null;
  mixDecks?: SampleGame[];
  cards: FlashCard[];
  lucky: boolean;
  protect: boolean;
  interrupt: boolean;
  phase: 'confirm' | 'loading' | 'error';
  attempt: number;
  error?: string;
  retryable?: boolean;
  progress?: { cards: number; decks: number; deck: SampleGame };
};

// One owner retains browsing state when the responsive surface is hidden or reparented.
export function SampleGamesDialog() {
  const [wide, setWide] = useState(() => matchMedia('(min-width: 56rem)').matches);
  const [hidden, setHidden] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<string[] | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const pending = useRef<Intent | null>(null);
  const pendingHeading = useRef<HTMLHeadingElement>(null);
  const pendingFocusOrigin = useRef<HTMLElement | null>(null);
  const focusedPendingAttempt = useRef<number | null>(null);
  const attempt = useRef(0);
  const [notice, setNotice] = useState<{ name: string; lucky: boolean } | null>(null);
  const [mix, setMix] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const open = sampleGamesOpen.value;

  const updateIntent = (next: Intent | null) => {
    pending.current = next;
    manualDeckPending.value = next !== null;
    setIntent(next);
  };
  const dismiss = () => {
    updateIntent(null);
    sampleGamesOpen.value = false;
    if (wide) {
      setHidden(true);
      requestAnimationFrame(() => document.getElementById('sample-games-button')?.focus());
    }
  };

  useEffect(() => {
    const media = matchMedia('(min-width: 56rem)');
    const resize = () => {
      // A closed mobile surface must not leave an invisible pending request alive.
      updateIntent(null);
      sampleGamesOpen.value = false;
      setWide(media.matches);
    };
    media.addEventListener('change', resize);
    return () => { media.removeEventListener('change', resize); manualDeckPending.value = false; pending.current = null; };
  }, []);

  useLayoutEffect(() => {
    if (wide && open) {
      setHidden(false);
      sampleGamesOpen.value = false;
      requestAnimationFrame(() => document.getElementById('sample-dialog-title')?.focus());
    }
  }, [wide, open]);
  useLayoutEffect(() => {
    if (!intent || intent.phase === 'confirm' || focusedPendingAttempt.current === intent.attempt) return;
    // Let confirmation-modal cleanup restore its opener before revealing pending recovery.
    const frame = requestAnimationFrame(() => {
      const active = document.activeElement;
      const origin = pendingFocusOrigin.current;
      const focusMoved = active instanceof HTMLElement && active !== document.body && active !== origin;
      if (!focusMoved && pendingHeading.current && pending.current?.attempt === intent.attempt) {
        focusedPendingAttempt.current = intent.attempt;
        pendingHeading.current.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [intent?.attempt, intent?.phase]);
  useLayoutEffect(() => {
    if (!loaded) return;
    // Modal cleanup first restores its opener; only then focus the newly loaded deck.
    const frame = requestAnimationFrame(() => document.getElementById('loaded-deck-heading')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [loaded]);

  const fail = (request: Intent, message: string, retryable = true) => {
    if (pending.current === request || pending.current?.attempt === request.attempt) {
      updateIntent({ ...request, phase: 'error', error: message, retryable });
    }
  };
  const load = async (request: Intent) => {
    if (request.mode !== 'single' || !request.game || pending.current !== request) return;
    if (dictionary.value !== request.cards) { fail(request, t('catalog', 'changed')); return; }
    const fetching: Intent = { ...request, phase: 'loading' };
    updateIntent(fetching);
    const result = await fetchSampleGameCards(fetching.game!);
    if (pending.current !== fetching) return;
    if (dictionary.value !== fetching.cards) { fail(fetching, t('catalog', 'changed')); return; }
    if (!result.ok) { fail(fetching, result.error); return; }
    try {
      commitSampleGame(fetching.game!, result.cards);
    } catch {
      fail(fetching, t('deck', 'failed'));
      return;
    }
    browserCommitRevision.value++;
    setSampleGameParam(fetching.game!);
    updateIntent(null);
    setNotice({ name: fetching.game!.name, lucky: fetching.lucky });
    sampleGamesOpen.value = false;
    setLoaded(value => value + 1);
  };
  const loadMix = async (request: Intent) => {
    if (request.mode !== 'mix' || !request.mixDecks || pending.current !== request) return;
    if (dictionary.value !== request.cards) { fail(request, t('catalog', 'changed')); return; }
    const fetching: Intent = { ...request, phase: 'loading', progress: undefined };
    updateIntent(fetching);
    const result = await buildLuckyMix(fetching.mixDecks!, fetching.scope, progress => {
      if (pending.current?.attempt === fetching.attempt) updateIntent({ ...fetching, progress });
    });
    if (pending.current?.attempt !== fetching.attempt) return;
    if (dictionary.value !== fetching.cards) { fail(fetching, t('catalog', 'changed')); return; }
    if (!result.ok) { fail(fetching, result.error, result.retryable); return; }
    try {
      commitLuckyMix(result.cards, result.source);
    } catch {
      fail(fetching, t('deck', 'failed'));
      return;
    }
    browserCommitRevision.value++;
    clearSampleGameParams();
    updateIntent(null);
    setNotice({ name: t('catalog', 'mixName'), lucky: true });
    sampleGamesOpen.value = false;
    setLoaded(value => value + 1);
  };
  const retry = (request: Intent) => {
    if (request.mode === 'single' && request.game) {
      // Re-run the normal selection path so replacement/session consent is re-evaluated.
      select(request.game, request.lucky);
      return;
    }
    const source = deckSource.value;
    const protect = dictionary.value.length > 0 && !(source?.kind === 'sample' && source.cards === dictionary.value);
    const interrupt = hasActiveSession();
    const next: Intent = {
      ...request,
      cards: dictionary.value,
      protect,
      interrupt,
      phase: protect || interrupt ? 'confirm' : 'loading',
      attempt: ++attempt.current,
      error: undefined,
      progress: undefined,
    };
    updateIntent(next);
    if (next.phase === 'loading') void loadMix(next);
  };
  const select = (game: SampleGame, lucky = false) => {
    pendingFocusOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    updateIntent(null); // Superseding selection invalidates the previous fetch, even for a no-op.
    const source = deckSource.value;
    if (source?.kind === 'sample' && source.cards === dictionary.value && source.id === game.id) return;
    setNotice(null);
    const protect = dictionary.value.length > 0 && !(source?.kind === 'sample' && source.cards === dictionary.value);
    const interrupt = hasActiveSession();
    const next: Intent = {
      mode: 'single', game, scope, lucky, protect, interrupt, cards: dictionary.value,
      phase: protect || interrupt ? 'confirm' : 'loading', attempt: ++attempt.current,
    };
    updateIntent(next);
    if (next.phase === 'loading') void load(next);
  };
  const selectMix = () => {
    if (eligible.length < 2) return;
    pendingFocusOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    updateIntent(null);
    setNotice(null);
    const source = deckSource.value;
    const protect = dictionary.value.length > 0 && !(source?.kind === 'sample' && source.cards === dictionary.value);
    const interrupt = hasActiveSession();
    const next: Intent = {
      mode: 'mix', scope, mixDecks: orderLuckyDecks(scope), lucky: true,
      protect, interrupt, cards: dictionary.value,
      phase: protect || interrupt ? 'confirm' : 'loading', attempt: ++attempt.current,
    };
    updateIntent(next);
    if (next.phase === 'loading') void loadMix(next);
  };
  const chooseScope = (nextScope: string[] | null) => {
    updateIntent(null);
    setScope(nextScope);
  };
  const current = deckSource.value?.cards === dictionary.value &&
    (deckSource.value.kind === 'sample' || deckSource.value.kind === 'mix') ? deckSource.value : null;
  const currentSample = current?.kind === 'sample' ? current : null;
  const filtered = filterDecks(search, categoryLabel);
  const eligible = getEligibleDecks(scope);
  const groups = groupDecks(filtered);

  const deckButton = (game: SampleGame) => (
    <li key={game.id}>
      <button class="catalog__deck" aria-current={currentSample?.id === game.id ? 'true' : undefined} onClick={() => select(game)}>
        <span>{game.name}</span>
        {game.language === 'en' && <small>{t('catalog', 'english')}</small>}
        {currentSample?.id === game.id && <strong>{t('catalog', 'current')}</strong>}
      </button>
    </li>
  );
  const descendantDecks = (group: DeckGroup): SampleGame[] => [
    ...group.decks,
    ...[...group.children.values()].flatMap(descendantDecks),
  ];
  const directDeckButton = (game: SampleGame) => (
    <button class="catalog__deck catalog__deck--direct" aria-current={currentSample?.id === game.id ? 'true' : undefined}
      onClick={() => select(game)}>
      <span>{game.name}</span>
      {game.language === 'en' && <small>{t('catalog', 'english')}</small>}
      {currentSample?.id === game.id && <strong>{t('catalog', 'current')}</strong>}
    </button>
  );
  const renderGroup = (group: DeckGroup) => (
    <ul class="catalog__list">
      {[...group.children.entries()].map(([segment, child]) => {
        const id = pathId(child.path);
        const expandedNow = expanded.has(id);
        const descendants = descendantDecks(child);
        return (
          <li key={id}>
            <div class="catalog__category">
              <button class="catalog__disclosure" aria-expanded={expandedNow} aria-controls={`category-${id}`}
                aria-label={t('catalog', expandedNow ? 'collapse' : 'expand', { name: pathLabel(child.path) })}
                onClick={() => setExpanded(previous => {
                  const next = new Set(previous);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  return next;
                })}>
                <span aria-hidden="true">{expandedNow ? '▾' : isRTL.value ? '◂' : '▸'}</span>
              </button>
              <button class="catalog__scope" aria-pressed={scope !== null && pathId(scope) === id}
                onClick={() => chooseScope(child.path)}>{categoryLabel(segment)}</button>
            </div>
            {!expandedNow && descendants.length === 1 && <div class="catalog__direct-row">{directDeckButton(descendants[0])}</div>}
            <div id={`category-${id}`} hidden={!expandedNow}>{expandedNow && renderGroup(child)}</div>
          </li>
        );
      })}
      {group.decks.map(deckButton)}
    </ul>
  );

  const body = (
    <>
      <div class="sample-dialog__header">
        <h2 id="sample-dialog-title" tabIndex={-1} autoFocus={!wide}>{t('catalog', 'title')}</h2>
        <button class="btn btn--ghost" onClick={dismiss}>{t('catalog', wide ? 'hide' : 'close')}</button>
      </div>
      <div class="sample-dialog__body catalog">
        <label for="sample-search">{t('samples', 'search')}</label>
        <input id="sample-search" type="search" class="text-input sample-dialog__search" value={search}
          onInput={event => setSearch(event.currentTarget.value)} aria-describedby="search-help"
          onKeyDown={event => {
            if (!wide && event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              dismiss();
            }
          }} />
        <p id="search-help">{t('catalog', 'searchHelp')}</p>
        {search && <button class="btn btn--ghost" onClick={() => setSearch('')}>{t('catalog', 'clearSearch')}</button>}
        <section aria-label={t('catalog', 'current')} class="catalog__current">
          <h3>{t('catalog', 'current')}</h3>
          <p>{current?.name ?? t('data', 'currentCards')}</p>
        </section>
        <section class="catalog__lucky" aria-labelledby="lucky-scope">
          <h3 id="lucky-scope">{scope ? t('catalog', 'scope', { path: pathLabel(scope) }) : t('catalog', 'general')}</h3>
          <p>{t('catalog', 'eligible', { count: eligible.length })}</p>
          <label class="catalog__mix-option">
            <input type="checkbox" checked={mix} onChange={event => { updateIntent(null); setMix(event.currentTarget.checked); }}
              aria-describedby="lucky-mix-help" />
            <span>{t('catalog', 'mixOption')}</span>
          </label>
          <p id="lucky-mix-help">{t('catalog', 'mixHelp')}</p>
          {mix && eligible.length < 2 && <p role="status">{t('catalog', 'mixNeedsDecks')}</p>}
          <button class="btn btn--primary" disabled={!eligible.length || (mix && eligible.length < 2)} onClick={() => {
            if (mix) selectMix();
            else {
              const game = pickLuckyDeck(scope);
              if (game) select(game, true);
            }
          }}>{t('catalog', mix ? 'mixAction' : 'lucky')}</button>
          {scope && <button class="btn btn--ghost" onClick={() => chooseScope(null)}>{t('catalog', 'resetScope')}</button>}
          {!eligible.length && <p role="status">{t('catalog', 'empty')}</p>}
        </section>
        {intent && intent.phase !== 'confirm' && <section class="catalog__pending" aria-labelledby="catalog-pending-heading">
          <h3 id="catalog-pending-heading" ref={pendingHeading} tabIndex={-1}>{t('catalog', intent.mode === 'mix' ? 'mixPending' : 'pending', { name: intent.mode === 'mix' ? t('catalog', 'mixName') : intent.game?.name ?? '' })}</h3>
          <p role="status">{intent.mode === 'mix' && intent.progress
            ? t('catalog', 'mixProgress', { cards: intent.progress.cards, decks: intent.progress.decks })
            : t('catalog', intent.mode === 'mix' ? 'mixPending' : 'pending', { name: intent.mode === 'mix' ? t('catalog', 'mixName') : intent.game?.name ?? '' })}</p>
          {intent.phase === 'loading' ? <p role="status">{t('data', 'loading')}</p> : <>
            <p role="alert">{intent.error}</p>
            {intent.retryable !== false && <button class="btn btn--primary" onClick={() => { if (pending.current?.attempt === intent.attempt) retry(intent); }}>{t('catalog', 'retry')}</button>}
          </>}
          <button class="btn btn--ghost" onClick={() => updateIntent(null)}>{t('export', 'cancel')}</button>
        </section>}
        <section class="catalog__browse" aria-label={t('catalog', 'title')}>
          <p>{t('catalog', 'categoryHelp')}</p>
          {!filtered.length && <p role="status">{t('samples', 'noMatches')}</p>}
          <nav aria-label={t('catalog', 'title')}>{search.trim() ?
            <ul class="catalog__list">{filtered.map(game => <li key={game.id}>
              <p class="catalog__path">{pathLabel(game.categoryPath)}</p>
              <ul class="catalog__list">{deckButton(game)}</ul>
            </li>)}</ul> : renderGroup(groups)}</nav>
          <p>{t('catalog', 'inventory', { count: SAMPLE_GAMES.length })}</p>
          <a href={`${import.meta.env.BASE_URL}sample_games/starter-trivia-notices.html`} target="_blank" rel="noopener noreferrer">
            {t('samples', 'triviaNotices')}
          </a>
        </section>
      </div>
    </>
  );

  return <>
    {notice && <p class="catalog-notice" role="status">
      {t('catalog', notice.lucky ? 'picked' : 'loaded', { name: notice.name })}
    </p>}
    {wide ? !hidden && <aside class="deck-sidebar" aria-labelledby="sample-dialog-title">{body}</aside> : open &&
      <ModalDialog class="sample-dialog" labelledBy="sample-dialog-title" onDismiss={dismiss} fallbackFocusId="sample-games-button">{body}</ModalDialog>}
    {intent?.phase === 'confirm' && <ModalDialog class="export-dialog" labelledBy="replace-title" onDismiss={() => updateIntent(null)}>
      <h2 id="replace-title">{t('catalog', 'replace')}</h2>
      <p>{t('catalog', intent.mode === 'mix' ? 'mixPending' : 'pending', { name: intent.mode === 'mix' ? t('catalog', 'mixName') : intent.game?.name ?? '' })}</p>
      {intent.protect && <p>{t('catalog', 'protect')}</p>}
      {intent.interrupt && <p>{t('catalog', 'interrupt')}</p>}
      <button class="btn btn--ghost" autoFocus onClick={() => updateIntent(null)}>{t('export', 'cancel')}</button>
      {intent.protect && <ExportDialog label={t('catalog', 'export')} />}
      <button class="btn btn--primary" onClick={() => { if (intent.mode === 'mix') void loadMix(intent); else void load(intent); }}>{t('catalog', 'switch')}</button>
    </ModalDialog>}
  </>;
}
