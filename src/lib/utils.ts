// ─── Shared utilities used across lib modules ──────────────────────────────────

export async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal:  ctrl.signal,
      headers: { 'User-Agent': 'BurgundyFeed/1.0' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function safeNum(v: unknown, fallback = 0): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? fallback : n;
}

export function safeStr(v: unknown, fallback = ''): string {
  return v ? String(v) : fallback;
}
