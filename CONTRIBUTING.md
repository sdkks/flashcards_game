# Contributing

Thank you for your interest in contributing to Flashcards Game!

This is a personal project maintained with limited available time. Contributions via issues and pull requests are appreciated.

## Guiding Principles

- Keep the app simple and easy to run
- Minimize external dependencies
- Aim for a maintenance-free, statically hosted SPA
- Prioritize mobile-first, accessible UI

## How to Contribute

### Reporting Bugs

Open a GitHub Issue using the **Bug Report** template. Please include:

- A screenshot or screen recording of the issue
- Steps to reproduce
- What you expected to happen
- What actually happened
- Browser and device info

### Suggesting Features

Open a GitHub Issue using the **Feature Request** template. Keep suggestions aligned with the project's goal of simplicity.

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. If you changed code, scripts, configuration, or tests, install and run the hooks:
   ```bash
   make setup                     # installs pre-commit framework hooks + the commit-msg hook
   pre-commit run --all-files
   ```
5. Run `make build` to verify the build passes
6. Run `make test` when the change affects gameplay, decks, parsing, or UI behavior
7. Run `make validate-i18n` if you touched translation files
8. Submit a PR using the pull request template

### Adding a Sample Deck

Sample decks are static content loaded by the browser. To add one:

1. Add a CSV at `public/sample_games/<stable-id>.csv`.
2. Use exactly `question|answer` as the header, with one card per line. Keep questions and answers non-empty, pipe-safe, and free of embedded newlines.
3. Register the same stable ID in `src/utils/sample-games.ts`. Set the actual card count in the display name, choose the appropriate `categoryPath`, use `language: 'en'` for English trivia, and choose `lucky` deliberately. Narrow or specialized decks should generally not enter the unfiltered Lucky pool.
4. Add or update focused Playwright coverage for loading the deck, its declared count, and representative Flip/Type behavior.
5. Keep the deck's question wording original. Do not copy publisher questions, answer keys, distinctive source prose, images, or sequencing.
6. When the deck is derived from research material, record source IDs and factual provenance in the PR description together with the licensing details required under **Licensing and Attribution**.
7. Update `public/sample_games/starter-trivia-notices.html` when attribution, license, or change notices are required.

A fact reference is not automatically a license to reproduce its wording or question set. Keep source attribution and content licensing separate from the application's code license.

### Licensing and Attribution

If a PR includes third-party, licensed, book-derived, data-derived, image, audio, font, or other external content, the PR description must identify:

- The source and a public URL or repository reference
- The applicable license or permission and any compatibility limits
- Required attribution, notices, or change notices
- What was authored, transformed, or newly written in this repository
- Any unresolved rights question; do not merge content with unknown redistribution rights

### Development Setup

```bash
git clone https://github.com/sdkks/flashcards_game.git
cd flashcards_game
make setup
make dev
```

The dev server runs at `http://localhost:5180/flashcards_game/`.

## Response Times

As this is a personal project, response times on issues and PRs may vary. Please be patient. Stale PRs or those labeled `won't do` may be closed automatically in the future.
