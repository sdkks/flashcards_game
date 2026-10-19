# Flashcards Game

A static, client-side flashcard game that runs entirely in the browser. No server required. Built with Preact and TypeScript, bundled with Vite, and hosted on GitHub Pages.

**Live demo:** [https://sdkks.github.io/flashcards_game](https://sdkks.github.io/flashcards_game/?sample_game=Spanish-to-English-Common-Terms)

**Live demo with remote fetch:** [Github Gist CSV](https://sdkks.github.io/flashcards_game/?cards=https://gist.githubusercontent.com/sdkks/5adacbd36e01e2e66e6b441a13d5c186/raw/0572d2b74747e7ae33dfc6c00bc8a32c94808027/flashcards-example-dictionary-Spanish-to-English-animals.csv)

## Features

- Two play modes: Flip (reveal and self-score) and Type (check a typed answer)
- Browse nested deck categories, search by name or category, or choose a single English trivia deck with **I'm feeling lucky**
- Configurable countdown timer with visual alerts
- Load flashcard data from CSV via URL, file upload, manual entry, or bundled sample games
- Mobile-first, responsive design with dark mode support
- 12 languages: English, German, Spanish, Portuguese, Arabic, Farsi, Turkish, Malay, Thai, Vietnamese, Simplified Chinese, Japanese
- Export dictionaries as CSV or JSON
- Deeplink support via query parameters
- No backend dependencies — deploy anywhere that serves static files

## Game Modes

### Flip Mode

Start with **Flip**. Reveal the answer by tapping or clicking the card, then choose **Correct** or **Wrong** to record your own rating and advance. Rating the last card shows results. These are self-assessments, not automatic answer checks.

Previous/Next lets you browse without rating; those cards remain unrated. Recorded ratings are read-only when revisiting a card. **Finish Flip** ends at the last card without requiring a rating; **End Flip** stops early. Results distinguish completion, stopping, and timeout, with correct/wrong/unrated counts and the number rated. **Try Again** starts a fresh shuffled session with empty ratings and the current card-count/time settings.

### Type Mode

Start with **Type**. Enter the exact answer: matching ignores case and trims leading/trailing whitespace on both answers, but internal spacing, punctuation, and wording must match. Paraphrases are not graded semantically; use Flip for open-ended or spoken answers.

**Submit** checks your answer; **Skip** records a skipped card, even if you have typed a draft. The question, your answer, expected answer, and result remain visible until you choose **Next card** (or **See results** on the last card), unless the countdown expires. Keyboard focus moves to that continuation button, then to the next answer field.

Results distinguish finishing, stopping with **End Type**, and running out of time. Correct, incorrect, skipped, and not-attempted counts cover the session's selected cards. Unsubmitted drafts are not attempted; submitted and skipped cards count immediately, even if you stop or time expires while reading feedback. The score remains correct answers divided by all selected cards. Only **See results** completes the typed session; ending before that is a stopped session. Retry starts a fresh shuffled session; Back to Menu returns to setup.

### Timer

Both modes include a configurable countdown timer (default: 15 minutes). It continues while revealing, rating and navigating in Flip, and while reading Type feedback. When time expires, a **Time’s up** summary appears. The timer pulses red when fewer than 10 seconds remain (unless reduced motion is enabled).

## Loading Flashcard Data

There are several ways to load a dictionary (set of flashcards) into the app:

1. **URL querystring** — Append `?cards=URL` to the app URL, where `URL` points to a publicly accessible CSV file (e.g., a GitHub Gist raw URL).

2. **Deck browser** — Use the desktop sidebar or the gamepad header button on narrow screens. Expand a category to see its decks, then select a deck to load it. You can also deeplink with `?sample_game=ID`.

3. **Upload CSV** — Open Settings (cog icon) and upload a local CSV file.

4. **Add by Link** — In Settings, paste a URL to a remote CSV and click Fetch.

5. **Manual Add** — In Settings, add cards one at a time by entering a question and answer.

## Trivia catalog

The repository includes 155 English trivia decks with 4,264 questions, plus seven legacy study decks.

See [the complete trivia catalog](docs/trivia-catalog.md) for deck links, category paths, Lucky scopes, coverage notes, provenance boundaries, and the current inventory.

### Restoring, clearing, and replacing cards

Settings names the reset action according to the current page's source: **Restore original sample** reloads the `sample_game` deck; **Restore cards from original link** reloads the `cards` URL (which takes precedence if both parameters exist). Without either source, **Clear current cards** empties the local deck. Restoring removes custom additions rather than merging them. Adding cards by link in Settings does not change the page's original source.

Reset actions still ask for confirmation. When selecting a deck directly or with Lucky, empty cards or a known untouched built-in deck need no export warning. Modified, imported, linked or unknown saved cards get a replacement confirmation with **Cancel**, **Export a copy (optional)** and **Switch deck**. Exporting returns to the confirmation; it never switches decks automatically, and switching without a download is allowed. An active session is a separate interruption warning, not a reason to require export.

Manual deck loading keeps the existing game and timer running until success. Cancel or dismiss the browser to discard a pending switch; failed or stale loads preserve the current cards/session and offer retry. Retry keeps the selected deck rather than drawing another Lucky deck. New session starts are disabled while a replacement is pending. Success returns to the loaded deck's ready screen. Automatic startup links retain their existing behavior and may replace saved cards; these manual safeguards do not change startup URL loading.

### CSV Format

The CSV file must have a header row. Each subsequent row is a `key,value` pair representing question and answer:

```csv
question,answer
apple,epal
door,pintu
twelve,dua belas
```

The delimiter is configurable in Settings (comma, pipe, tab, semicolon, or colon).

## Settings

Open with the cog icon in the header:

| Setting | Description | Default |
|---------|-------------|---------|
| Separator | CSV delimiter character | comma |
| Cards per game | Number of cards per session | 50 |
| Timer | Time limit in minutes | 15 |
| Appearance | Follow System, or choose Light Mode / Dark Mode | System |
| Palette | Slate (neutral), Paper (warm), or Iris (colorful) | Slate |
| Dictionary management | Upload, link, manual add, reset | — |
| Export | Download dictionary as CSV or JSON | — |

Appearance applies immediately without restarting an active session. System follows your device’s light/dark preference, including changes while the game is open. Existing saved Light/Dark choices are preserved. Palette changes colors independently of appearance; missing or unrecognized palette preferences use Slate. Both choices are remembered in this browser and origin while site storage is retained; they do not sync between devices or tabs. If either preference cannot be saved, it still applies for this visit and Settings shows a warning for that preference.

## Adding Sample Games

To add a new bundled sample game:

1. Place your CSV file in `public/sample_games/` with a descriptive filename using hyphens (e.g., `Spanish-Animals-Quiz.csv`).

2. Add an entry to the `SAMPLE_GAMES` array in `src/utils/sample-games.ts`:

```typescript
{
  id: 'Spanish-Animals-Quiz',          // must match the CSV filename (without .csv)
  name: 'Spanish Animals Quiz',        // display name shown in the dialog
  categoryPath: ['study', 'languages', 'spanish'], // stable category segments
  language: 'es-en',                  // content language, not interface locale
  lucky: 'never',                     // never / default / category
  separator: ',',                    // delimiter used in your CSV file
},
```

The `separator` field tells the parser which delimiter your CSV uses. Supported values: `,` (comma), `|` (pipe), `\t` (tab), `;` (semicolon), `:` (colon). Use a non-comma separator when your card content contains commas.

The browser derives its hierarchy from `categoryPath`; add corresponding `categories` labels to every interface locale when introducing a new segment. Only `language: 'en'` decks can qualify for Lucky. Use `lucky: 'default'` for broadly accessible general trivia, `'category'` for explicitly selected thematic packs, and `'never'` for decks excluded from every Lucky scope. Preserve stable IDs and truthful content counts; category metadata does not add questions to a deck or fetch every deck at startup.

3. Add the file to the `requiredFiles` list in `tests/structure.spec.ts` to ensure it stays present.

## Header Controls

From left to right:

- **Gamepad** — Open or focus the searchable nested deck browser
- **Cog** — Open settings panel
- **Globe** — Language picker (12 locales)
- **Sun/Moon** — Use the opposite light/dark appearance as an explicit choice; restore System in Settings

## Development

### Prerequisites

- Node.js (with npm)
- Make

### Setup and Commands

```bash
git clone https://github.com/sdkks/flashcards_game.git
cd flashcards_game
make setup          # installs dependencies + pre-commit hooks
make dev            # starts dev server at localhost:5180/flashcards_game/
make build          # production build
make test           # runs Playwright browser tests headlessly
make test-ui        # runs tests with interactive Playwright UI
make lint           # runs gitleaks secret scanning
make validate-i18n  # checks translation coverage
```

### Testing

The project includes a Playwright test suite covering:

- Project structure validation (required files and directories exist)
- UI element presence (header, buttons, settings, dialogs)
- Flip mode (reveal, self-rating, navigation, read-only revisits and truthful results)
- Type mode (input, exact checking, submit, skip, corrections and results)
- Settings panel (all controls present and functional)
- Nested deck browsing, independent search/category scope, single-deck Lucky and safe manual replacement
- Language picker (12 locales)
- Timer auto-end behavior
- System/Light/Dark appearance, independent Slate/Paper/Iris palettes, persistence, OS changes, and header override

Run `make test` to execute all tests headlessly, or `make test-ui` for the interactive Playwright UI.

### Tech Stack

- [Preact](https://preactjs.com/) with [@preact/signals](https://preactjs.com/guide/v10/signals/)
- TypeScript
- Vite (bundler and dev server)
- [Playwright](https://playwright.dev/) (browser testing)
- GitHub Actions (CI/CD to GitHub Pages)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.


## License and content details

The application code is licensed under the [MIT license](LICENSE). Trivia content has separate source and contribution terms.

See [content licenses and attribution](docs/content-licenses.md) for the full application-license boundary, third-party sources, contributor licenses, attribution requirements, and rights limitations.

## Disclaimer

See [content licenses and attribution](docs/content-licenses.md#disclaimer) for the full user-content disclaimer.
