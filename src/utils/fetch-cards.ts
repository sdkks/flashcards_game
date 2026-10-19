export interface FetchResult {
  ok: boolean;
  data?: string;
  error?: string;
}

export function getCardsUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('cards');
}

export function resolveUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return null;
  }

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocalhost && parsed.protocol === 'http:') {
    parsed.protocol = 'https:';
  }

  return parsed.toString();
}

export async function fetchCards(url: string): Promise<FetchResult> {
  const resolved = resolveUrl(url);
  if (!resolved) {
    return { ok: false, error: 'Invalid URL provided.' };
  }

  try {
    const response = await fetch(resolved);

    if (!response.ok) {
      const status = response.status;
      if (status === 403) return { ok: false, error: '403 — access is forbidden.' };
      if (status === 404) return { ok: false, error: '404 — the resource was not found.' };
      if (status >= 500) return { ok: false, error: `Server error (${status}) — try again later.` };
      return { ok: false, error: `HTTP error ${status}.` };
    }

    const text = await response.text();
    if (!text.trim()) {
      return { ok: false, error: 'The fetched data is empty.' };
    }

    return { ok: true, data: text };
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      return { ok: false, error: 'CORS error — the server does not allow cross-origin requests.' };
    }
    return { ok: false, error: 'Network error — check your connection.' };
  }
}
