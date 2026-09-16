// ─── Cloudflare Worker: Hourly Ingest Cron ───────────────────────────────────
import { runIngest, runNfcEastIngest } from '../src/lib/ingest';
import { detectBreakingItems } from '../src/lib/breaking';
import { writeArticles, writeBreaking, writeLastRun, writeNfcEast } from '../src/lib/kv';
import { fetchLiveStats, fetchTransactions } from '../src/lib/espn';
import { SITE } from '../src/config/site';

export interface Env {
  ARTICLES_KV:    KVNamespace;
  REFRESH_SECRET: string;
  REWRITE_MODE:   string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const result = await doIngest(env);
    if (!result) console.warn('[ingest] scheduled run skipped — another run in progress');
  },

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/refresh') {
      const secret = request.headers.get('x-refresh-secret') ?? url.searchParams.get('secret');
      if (!secret || secret !== env.REFRESH_SECRET) {
        return new Response('Unauthorized', { status: 401 });
      }
      const result = await doIngest(env);
      if (!result) {
        return new Response(JSON.stringify({ success: false, reason: 'locked' }), {
          status: 409, headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({ success: true, status: result.status, articlesFound: result.articlesFound, articlesNew: result.articlesNew, duplicatesRejected: result.duplicatesRejected, sources: result.sources, errors: result.errors, completedAt: result.completedAt }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response('Not found', { status: 404 });
  },
};

const LOCK_KEY = 'ingest:lock';
const LOCK_TTL_SECS = 300; // 5-minute lock prevents overlap

async function doIngest(env: Env) {
  const mode = (env.REWRITE_MODE ?? SITE.rewriteMode) as typeof SITE.rewriteMode;
  const now = new Date().toISOString();

  // Overlap prevention: bail if another run is already in progress
  const existingLock = await env.ARTICLES_KV.get(LOCK_KEY);
  if (existingLock) {
    console.warn(`[ingest] skipping — lock held since ${existingLock}`);
    return null;
  }
  await env.ARTICLES_KV.put(LOCK_KEY, now, { expirationTtl: LOCK_TTL_SECS });

  console.log(`[ingest] starting run at ${now}`);

  // Run articles ingest + live stats + transactions concurrently
  const [{ articles, run }, liveStats, transactions, nfcEastItems] = await Promise.all([
    runIngest(mode),
    fetchLiveStats(),
    fetchTransactions(),
    runNfcEastIngest(),
  ]);

  const breaking = detectBreakingItems(articles);

  const writes: Promise<void>[] = [
    writeArticles(env.ARTICLES_KV, articles),
    writeBreaking(env.ARTICLES_KV, breaking),
    writeLastRun(env.ARTICLES_KV, run),
  ];

  writes.push(writeNfcEast(env.ARTICLES_KV, nfcEastItems));
  console.log(`[ingest] ${nfcEastItems.length} NFC East rival items fetched`);

  // Cache live stats in KV — expires after 3 hours
  if (liveStats) {
    writes.push(
      env.ARTICLES_KV.put('stats:snapshot', JSON.stringify(liveStats), {
        expirationTtl: 60 * 60 * 3,
      }),
    );
    console.log(`[ingest] stats fetched from ESPN — season ${liveStats.season}, record ${liveStats.record}`);
  } else {
    console.warn('[ingest] ESPN stats fetch failed — page will use fallback config');
  }

  // Cache transactions in KV — expires after 6 hours
  if (transactions.length > 0) {
    writes.push(
      env.ARTICLES_KV.put('transactions:latest', JSON.stringify(transactions), {
        expirationTtl: 60 * 60 * 6,
      }),
    );
    console.log(`[ingest] ${transactions.length} transactions fetched from ESPN`);
  }

  await Promise.all(writes);

  // Release lock
  await env.ARTICLES_KV.delete(LOCK_KEY);

  console.log(`[ingest] done — status=${run.status} ${run.articlesNew} new, ${run.duplicatesRejected} dupes, ${run.errors.length} errors`);
  if (run.errors.length) console.warn('[ingest] source errors:', run.errors.join(' | '));

  return run;
}
