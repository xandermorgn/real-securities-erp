export function apiUrl(path: string): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const base = raw.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  if (base.endsWith('/api')) {
    return `${base}${p.startsWith('/api') ? p.replace(/^\/api/, '') : p}`;
  }
  const apiPath = p.startsWith('/api') ? p : `/api${p}`;
  return `${base}${apiPath}`;
}

/**
 * Fetch JSON from the API and safely handle non-JSON responses (e.g. Next.js
 * HTML error pages when the API server is down). Throws a clear Error on
 * failure rather than a cryptic SyntaxError.
 */
export async function apiJson<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), init);
  } catch {
    throw new Error(
      'Cannot reach API server. Please ensure the server is running on port 3000.'
    );
  }
  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${text.slice(0, 120)}`);
    }
    throw new Error('API returned non-JSON response.');
  }
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('API returned malformed JSON.');
  }
  if (!res.ok) {
    const msg =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `API error ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}
