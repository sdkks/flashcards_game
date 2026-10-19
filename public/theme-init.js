// Parser-blocking, same-origin initialization before application content paints.
// Keep the preference allowlist/default aligned with src/hooks/useTheme.ts.
(() => {
  let preference = 'system';
  try {
    const stored = localStorage.getItem('flashcards_theme');
    if (stored === 'light' || stored === 'dark') preference = stored;
  } catch {
    // The controller reports persistence failures in Settings, not during paint.
  }
  let palette = 'slate';
  try {
    const stored = localStorage.getItem('flashcards_palette');
    if (stored === 'paper' || stored === 'iris') palette = stored;
  } catch {
    // Read independently: one unavailable preference must not hide the other.
  }
  document.documentElement.setAttribute('data-palette', palette);
  const dark = preference === 'dark' || (preference === 'system' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
})();
