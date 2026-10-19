import { signal, computed, effect } from '@preact/signals';
import { useLayoutEffect } from 'preact/hooks';
import { STORAGE_KEYS } from '../utils/constants';

export type Theme = 'light' | 'dark';
export type ThemePreference = 'system' | Theme;
export type Palette = 'slate' | 'paper' | 'iris';

export const themeStorageUnavailable = signal(false);
export const paletteStorageUnavailable = signal(false);

// Keep this allowlist/default aligned with the pre-paint public/theme-init.js.
function parsePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

function getInitialPreference(): ThemePreference {
  try {
    return parsePreference(localStorage.getItem(STORAGE_KEYS.theme));
  } catch {
    themeStorageUnavailable.value = true;
    return 'system';
  }
}

function parsePalette(value: string | null): Palette {
  return value === 'paper' || value === 'iris' ? value : 'slate';
}

function getInitialPalette(): Palette {
  try {
    return parsePalette(localStorage.getItem(STORAGE_KEYS.palette));
  } catch {
    paletteStorageUnavailable.value = true;
    return 'slate';
  }
}

const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const systemDark = signal(systemTheme.matches);
export const themePreference = signal<ThemePreference>(getInitialPreference());
export const palette = signal<Palette>(getInitialPalette());
export const theme = computed<Theme>(() => themePreference.value === 'system'
  ? (systemDark.value ? 'dark' : 'light')
  : themePreference.value);

// The single Header mount owns both the OS listener and root-attribute effect.
export function useTheme() {
  useLayoutEffect(() => {
    const updateSystem = () => { systemDark.value = systemTheme.matches; };
    systemTheme.addEventListener('change', updateSystem);
    updateSystem();
    const dispose = effect(() => {
      document.documentElement.setAttribute('data-theme', theme.value);
      document.documentElement.setAttribute('data-palette', palette.value);
    });
    return () => {
      systemTheme.removeEventListener('change', updateSystem);
      dispose();
    };
  }, []);
}

export function setThemePreference(value: string) {
  const preference = parsePreference(value);
  themePreference.value = preference;
  try {
    localStorage.setItem(STORAGE_KEYS.theme, preference);
    themeStorageUnavailable.value = false;
  } catch {
    themeStorageUnavailable.value = true;
  }
}

export function setPalette(value: string) {
  const preference = parsePalette(value);
  palette.value = preference;
  try {
    localStorage.setItem(STORAGE_KEYS.palette, preference);
    paletteStorageUnavailable.value = false;
  } catch {
    paletteStorageUnavailable.value = true;
  }
}

export function toggleTheme() {
  setThemePreference(theme.value === 'dark' ? 'light' : 'dark');
}
