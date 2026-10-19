# AGENTS.md

Guidance for coding agents (and humans with agent pilots) working in this repository.

## What this is

Flashcards Game — a dependency-light flashcard SPA built with **Preact + Vite + TypeScript**, statically hosted under the base path `/flashcards_game/`. Sample decks are plain `question|answer` CSVs in `public/sample_games/`, registered in `src/utils/sample-games.ts`.

## Commands

| Task | Command |
|---|---|
| Install (also installs hooks) | `make setup` |
| Dev server (`http://localhost:5180/flashcards_game/`) | `make dev` |
| Build (typechecks + bundles) | `make build` |
| Run all Playwright tests | `make test` |
| Validate translation files | `make validate-i18n` |
| Lint via pre-commit framework | `make lint` |

CI (`.github/workflows/ci.yml`) runs `make validate-i18n`, `make build`, and `make test` on every push/PR to `main`. Run the same gates locally before handing work back.

## Testing rules

- Playwright, chromium project. `npx playwright test` boots its own Vite server (port 5180) — no manual server needed.
- **Do not add tests that string-compare trivia card content.** No frozen CSV manifests, no content hashes, no cross-deck question/answer scans, no hardcoded question→answer assertions. Card data evolves; tests that freeze it rot. App-behavior tests should read CSVs dynamically (`parseCsv(readFileSync(...))` → drive the UI from parsed cards) if they need fixture data.
- Keep tests focused on app behavior: registry lookups, direct-URL deck loading, Flip/Type flows, keyboard/screen-reader accessibility, request hygiene (a deck load fetches only its own CSV; no third-party providers).
- Localized-UI tests assert that UI labels localize and card text never does.

## Adding sample decks

Follow **CONTRIBUTING.md → "Adding a Sample Deck"**: add the CSV, register the stable ID in `src/utils/sample-games.ts` (real card count in the display name, deliberate `categoryPath`/`lucky` choice), add behavior-focused Playwright coverage, and update `public/sample_games/starter-trivia-notices.html` when attribution or license notices are required.

## Content and licensing

- Deck wording must be original; a fact reference is not a license to reproduce wording or question sets.
- Third-party content requires source, license, and notice details in `docs/content-licenses.md` and the public notice page. Attribution lives in committed docs only.
- There is no private content pipeline in this repository — do not reference external/private asset directories, build ledgers, or internal provenance files in code, tests, or docs.

## Privacy and identifier hygiene

Never commit personal identifiers or internal bookkeeping, in code, tests, commit messages, or PR text:

- Absolute home/machine paths (`/Users/<name>/…`, `/home/<name>/…`, network shares)
- Personal email addresses or hostnames
- Internal ticket or release identifiers (e.g. `TASK-1234`, `BUG-1234`, `STORY-1234`, `EPIC-1234`, `SPEC-1234`, private release codenames)

`.gitleaks.toml` extends gitleaks' default secret rules with generic PII rules. Hooks enforce this:

- `pre-commit` (via the pre-commit framework, installed by `make setup`) scans staged content.
- `commit-msg` scans the commit message (installed by `make setup` from `scripts/hooks/commit-msg`).
- False positives: add an inline `gitleaks:allow` comment on the offending line, or a precise entry in `.gitleaksignore`. Do not weaken the shared rules for a one-off.

## Translations

`src/i18n/locales/` holds 12 locale files. Validate with `make validate-i18n`. UI chrome localizes; flashcard content is never translated.

## Dependencies

Keep them minimal (currently Preact + `@preact/signals` at runtime). Justify any new dependency in the PR description.
