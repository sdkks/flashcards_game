#!/usr/bin/env node
import { readFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const localesDir = join(import.meta.dirname, '../src/i18n/locales');
const files = readdirSync(localesDir).filter(f => f.endsWith('.json'));

const enPath = join(localesDir, 'en.json');
const en = JSON.parse(readFileSync(enPath, 'utf-8'));

const enKeys = new Set();
for (const [section, keys] of Object.entries(en)) {
  for (const key of Object.keys(keys)) {
    enKeys.add(`${section}.${key}`);
  }
}

let warnings = 0;

const placeholders = (value) => [...value.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort();

for (const file of files) {
  if (file === 'en.json') continue;

  const locale = basename(file, '.json');
  const data = JSON.parse(readFileSync(join(localesDir, file), 'utf-8'));

  const localeKeys = new Set();
  for (const [section, keys] of Object.entries(data)) {
    for (const key of Object.keys(keys)) {
      localeKeys.add(`${section}.${key}`);
    }
  }

  for (const enKey of enKeys) {
    if (!localeKeys.has(enKey)) {
      console.warn(`WARN: [${locale}] missing key "${enKey}"`);
      warnings++;
    }
  }

  for (const localeKey of localeKeys) {
    if (!enKeys.has(localeKey)) {
      console.warn(`WARN: [${locale}] extra key "${localeKey}" not in en.json`);
      warnings++;
    }
  }

  for (const enKey of enKeys) {
    if (!localeKeys.has(enKey)) continue;
    const [section, key] = enKey.split('.');
    const expected = placeholders(en[section][key]);
    const actual = placeholders(data[section][key]);
    if (expected.join('|') !== actual.join('|')) {
      console.warn(`WARN: [${locale}] placeholder mismatch for "${enKey}" (expected {${expected.join('}, {')}}, found {${actual.join('}, {')}})`);
      warnings++;
    }
  }
}

if (warnings > 0) {
  console.warn(`\n⚠ ${warnings} translation warning(s) found.`);
} else {
  console.log('✓ All locale files have matching keys with en.json.');
}

process.exit(0);
