import { signal, computed } from '@preact/signals';
import en from './locales/en.json';
import de from './locales/de.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';
import fa from './locales/fa.json';
import tr from './locales/tr.json';
import ms from './locales/ms.json';
import th from './locales/th.json';
import vi from './locales/vi.json';
import zhHans from './locales/zh-Hans.json';
import ja from './locales/ja.json';

export type Locale = 'en' | 'de' | 'es' | 'pt' | 'ar' | 'fa' | 'tr' | 'ms' | 'th' | 'vi' | 'zh-Hans' | 'ja';

export const SUPPORTED_LOCALES: { code: Locale; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'ar', name: 'العربية' },
  { code: 'fa', name: 'فارسی' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'ms', name: 'Bahasa Melayu' },
  { code: 'th', name: 'ไทย' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'zh-Hans', name: '简体中文' },
  { code: 'ja', name: '日本語' },
];

type TranslationDict = Record<string, Record<string, string>>;

const translations: Record<Locale, TranslationDict> = {
  en: en as unknown as TranslationDict,
  de: de as unknown as TranslationDict,
  es: es as unknown as TranslationDict,
  pt: pt as unknown as TranslationDict,
  ar: ar as unknown as TranslationDict,
  fa: fa as unknown as TranslationDict,
  tr: tr as unknown as TranslationDict,
  ms: ms as unknown as TranslationDict,
  th: th as unknown as TranslationDict,
  vi: vi as unknown as TranslationDict,
  'zh-Hans': zhHans as unknown as TranslationDict,
  ja: ja as unknown as TranslationDict,
};

function isLocale(value: string | null): value is Locale {
  return value !== null && Object.prototype.hasOwnProperty.call(translations, value);
}

function getInitialLocale(): Locale {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('lang');
  const stored = localStorage.getItem('flashcards_locale');
  const locale = isLocale(fromUrl) ? fromUrl : stored;
  const initial = isLocale(locale) ? locale : 'en';

  document.documentElement.lang = initial;
  document.documentElement.dir = initial === 'ar' || initial === 'fa' ? 'rtl' : 'ltr';

  // A stored non-English preference should travel with copied links. An explicit
  // valid URL locale always wins and is left untouched.
  if (!isLocale(fromUrl) && initial !== 'en') {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', initial);
    window.history.replaceState(null, '', url.toString());
  }

  return initial;
}

export const currentLocale = signal<Locale>(getInitialLocale());

export const isRTL = computed(() => currentLocale.value === 'ar' || currentLocale.value === 'fa');

export function setLocale(locale: Locale) {
  currentLocale.value = locale;
  localStorage.setItem('flashcards_locale', locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = isRTL.value ? 'rtl' : 'ltr';
  const url = new URL(window.location.href);
  url.searchParams.set('lang', locale);
  window.history.replaceState(null, '', url.toString());
}

export function t(section: string, key: string, params?: Record<string, string | number>): string {
  const dict = translations[currentLocale.value] || translations.en;
  const sectionDict = dict[section] || (translations.en as TranslationDict)[section];
  let value = sectionDict?.[key];

  if (!value) {
    const enSection = (translations.en as TranslationDict)[section];
    value = enSection?.[key] || key;
    if (currentLocale.value !== 'en' && enSection?.[key]) {
      console.warn(`[i18n] Missing translation: ${currentLocale.value}.${section}.${key}`);
    }
  }

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{${k}}`, String(v));
    }
  }

  return value;
}
