import { test, expect } from '@playwright/test';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const requiredFiles = [
  'index.html',
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'Makefile',
  '.pre-commit-config.yaml',
  'CONTRIBUTING.md',
  'README.md',
  'playwright.config.ts',
  'scripts/validate-i18n.mjs',
  'src/main.tsx',
  'src/app.tsx',
  'src/app.css',
  'src/index.css',
  'src/state.ts',
  'src/i18n/index.ts',
  'src/utils/constants.ts',
  'src/utils/csv.ts',
  'src/utils/fetch-cards.ts',
  'src/utils/storage.ts',
  'src/utils/sample-games.ts',
  'src/components/Header.tsx',
  'src/components/Game.tsx',
  'src/components/FlashCard.tsx',
  'src/components/QuizCard.tsx',
  'src/components/SettingsPanel.tsx',
  'src/components/DictionaryManager.tsx',
  'src/components/ExportDialog.tsx',
  'src/components/SampleGamesDialog.tsx',
  'src/components/LanguagePicker.tsx',
  'src/components/TimerSetting.tsx',
  'src/components/CardCountSetting.tsx',
  'public/sample_games/Malay-to-English-Darjah-6-Vocabulary-Quiz.csv',
  'public/sample_games/Spanish-to-English-Common-Terms.csv',
  'public/sample_games/Arabic-to-Turkish-Common-Terms.csv',
  'public/sample_games/Malay-to-Malay-English-Sekolah-Menengah-1-Sec1-SG.csv',
  'public/sample_games/Arabic-to-Turkish-HighSchool-9-12.csv',
  'public/sample_games/AI-ML-Top-100-Terminologies.csv',
  'public/sample_games/trivia-science-nature-starter-en.csv',
  'public/sample_games/trivia-world-geography-starter-en.csv',
  'public/sample_games/trivia-water-landscapes-en.csv',
  'public/sample_games/trivia-world-history-short-round-en.csv',
  'public/sample_games/trivia-ancient-civilizations-en.csv',
  'public/sample_games/trivia-sports-rules-milestones-en.csv',
  'public/sample_games/trivia-food-ingredients-en.csv',
  'public/sample_games/trivia-mythology-names-symbols-en.csv',
  'public/sample_games/trivia-greek-underworld-afterlife-en.csv',
  'public/sample_games/trivia-friends-cast-production-en.csv',
  'public/sample_games/trivia-himym-cast-production-en.csv',
  'public/sample_games/trivia-twd-cast-production-en.csv',
  'public/sample_games/trivia-star-trek-tos-cast-production-en.csv',
  'public/sample_games/trivia-waitangi-signing-documents-en.csv',
  'public/sample_games/trivia-reef-building-corals-en.csv',
  'public/sample_games/trivia-japanese-woodblock-prints-en.csv',
  'public/sample_games/trivia-human-body-clocks-en.csv',
  'public/sample_games/trivia-cell-biology-essentials-en.csv',
  'public/sample_games/trivia-human-origins-starter-en.csv',
  'public/sample_games/trivia-rocks-faults-volcanoes-en.csv',
  'public/sample_games/trivia-flight-aviation-history-en.csv',
  'public/sample_games/trivia-dinosaurs-fossils-mesozoic-en.csv',
  'public/sample_games/trivia-plant-adaptations-reproduction-en.csv',
  'public/sample_games/trivia-car-engines-vehicle-engineering-en.csv',
  'public/sample_games/trivia-railway-engineering-world-railways-en.csv',
  'public/sample_games/trivia-chemistry-foundations-en.csv',
  'public/sample_games/trivia-invertebrates-body-plans-en.csv',
  'public/sample_games/trivia-medieval-castles-tournaments-en.csv',
  'public/sample_games/trivia-body-science-medical-history-imaging-en.csv',
  'public/sample_games/starter-trivia-notices.html',
  'public/sample_games/AI-LLM-Agentic-300-Concepts.csv',
  'public/sample_games/b00-animals.csv',
  'public/sample_games/trivia-human-history-prehistory-antiquity-en.csv',
  'public/sample_games/b04-body-basics.csv',
  'public/sample_games/b12-greek-heroes-1.csv',
  'public/sample_games/b13-physics-waves-optics.csv',
  '.github/workflows/deploy.yml',
  '.github/ISSUE_TEMPLATE/bug_report.md',
  '.github/ISSUE_TEMPLATE/feature_request.md',
  '.github/pull_request_template.md',
];

const requiredLocales = [
  'en', 'de', 'es', 'pt', 'ar', 'fa', 'tr', 'ms', 'th', 'vi', 'zh-Hans', 'ja',
];

test.describe('Project structure', () => {
  for (const file of requiredFiles) {
    test(`${file} exists`, () => {
      expect(existsSync(resolve(root, file))).toBe(true);
    });
  }

  for (const locale of requiredLocales) {
    test(`locale file ${locale}.json exists`, () => {
      expect(existsSync(resolve(root, `src/i18n/locales/${locale}.json`))).toBe(true);
    });
  }
});
