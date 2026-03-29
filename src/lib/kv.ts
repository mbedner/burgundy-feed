// ─── Cloudflare KV helpers ────────────────────────────────────────────────────
import type { Article, BreakingItem, IngestRun, StoredData, RivalItem } from './types';
import { SITE } from '../config/site';

export async function readArticles(kv: KVNamespace): Promise<Article[]> {
  try {
    const raw = await kv.get(SITE.kvKeys.articles);
    if (!raw) return [];
    return JSON.parse(raw) as Article[];
  } catch {
    return [];
  }
}

export async function writeArticles(kv: KVNamespace, articles: Article[]): Promise<void> {
  await kv.put(SITE.kvKeys.articles, JSON.stringify(articles), {
    expirationTtl: 60 * 60 * 4, // auto-expire after 4 hours as safety net
  });
}

export async function readBreaking(kv: KVNamespace): Promise<BreakingItem[]> {
  try {
    const raw = await kv.get(SITE.kvKeys.breaking);
    if (!raw) return [];
    return JSON.parse(raw) as BreakingItem[];
  } catch {
    return [];
  }
}

export async function writeBreaking(kv: KVNamespace, items: BreakingItem[]): Promise<void> {
  await kv.put(SITE.kvKeys.breaking, JSON.stringify(items), {
    expirationTtl: 60 * 60 * 2,
  });
}

export async function readLastRun(kv: KVNamespace): Promise<IngestRun | null> {
  try {
    const raw = await kv.get(SITE.kvKeys.lastRun);
    if (!raw) return null;
    return JSON.parse(raw) as IngestRun;
  } catch {
    return null;
  }
}

export async function writeLastRun(kv: KVNamespace, run: IngestRun): Promise<void> {
  await kv.put(SITE.kvKeys.lastRun, JSON.stringify(run), {
    expirationTtl: 60 * 60 * 48,
  });
}

export async function readAll(kv: KVNamespace): Promise<StoredData> {
  const [articles, breaking, lastRun] = await Promise.all([
    readArticles(kv),
    readBreaking(kv),
    readLastRun(kv),
  ]);
  return { articles, breaking, lastRun };
}

export async function readNfcEast(kv: KVNamespace): Promise<RivalItem[]> {
  try {
    const raw = await kv.get(SITE.kvKeys.nfcEast);
    if (!raw) return [];
    return JSON.parse(raw) as RivalItem[];
  } catch {
    return [];
  }
}

export async function writeNfcEast(kv: KVNamespace, items: RivalItem[]): Promise<void> {
  await kv.put(SITE.kvKeys.nfcEast, JSON.stringify(items), {
    expirationTtl: 60 * 60 * 4,
  });
}
