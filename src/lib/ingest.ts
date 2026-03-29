// ─── Main Ingestion Orchestrator ──────────────────────────────────────────────
import type { Article, IngestRun, SourceConfig } from './types';
import type { RawItem } from './sources/rss';
import { fetchRssFeed } from './sources/rss';
import {
  scoreRelevance,
  scoreFreshness,
  detectSentiment,
  detectTags,
  isBreakingCandidate,
  computeCompositeScore,
} from './scoring';
import { rewriteHeadline } from './rewrite';
import { SOURCES, BLOCKED_DOMAINS } from '../config/sources';
import { SITE, MIN_RELEVANCE_SCORE, MIN_RELEVANCE_SCORE_NATIONAL } from '../config/site';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sha256Hex(s: string): string {
  // Simple deterministic hash for ID generation.
  // In Workers runtime you can use crypto.subtle; this is a fast FNV-style fallback.
  let hash = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search  = '';
    u.hash    = '';
    // Strip common tracking params
    const trackingParams = ['utm_source','utm_medium','utm_campaign','utm_content',
                            'utm_term','ref','source','fbclid','gclid'];
    trackingParams.forEach(p => u.searchParams.delete(p));
    return u.href.replace(/\/$/, '');
  } catch {
    return url;
  }
}

function isBlocked(url: string): boolean {
  const lower = url.toLowerCase();
  return BLOCKED_DOMAINS.some(d => lower.includes(d));
}

// Words that appear in nearly every NFL/Commanders article and don't discriminate between stories
const DEDUP_STOP = new Set([
  'that', 'this', 'with', 'from', 'have', 'will', 'been', 'they', 'their',
  'would', 'could', 'should', 'about', 'after', 'before', 'into', 'over',
  'then', 'than', 'when', 'what', 'which', 'were', 'also', 'more', 'just',
  'said', 'says', 'make', 'made', 'take', 'back', 'down', 'each', 'much',
  'some', 'does', 'come', 'team', 'game', 'year', 'next', 'last', 'first',
  'season', 'week', 'time', 'play', 'player', 'league', 'deal', 'news',
  'nfl', 'report', 'commanders', 'washington',
]);

function sigWords(title: string): Set<string> {
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/)
      .filter(w => w.length > 3 && !DEDUP_STOP.has(w))
  );
}

function titleSimilarity(a: string, b: string): number {
  const wa = sigWords(a);
  const wb = sigWords(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let shared = 0;
  for (const w of wa) { if (wb.has(w)) shared++; }
  return shared / Math.min(wa.size, wb.size);
}

// ─── Ingest a single source ───────────────────────────────────────────────────

async function ingestSource(
  source:      SourceConfig,
  rewriteMode: typeof SITE.rewriteMode,
): Promise<{ items: Article[]; error: string | null }> {
  try {
    const rawItems = await fetchRssFeed(source.rssUrl);
    const articles: Article[] = [];

    for (const raw of rawItems) {
      if (!raw.link || isBlocked(raw.link)) continue;

      const canonical    = normalizeUrl(raw.link);
      const id           = sha256Hex(canonical + raw.title);
      const summary      = raw.description ?? '';
      const relevance    = scoreRelevance(raw.title, summary);

      // National (non-focus) sources need a stronger direct Commanders signal
      const minScore = source.commandersFocus ? MIN_RELEVANCE_SCORE : MIN_RELEVANCE_SCORE_NATIONAL;
      if (relevance < minScore) continue;

      // Reject articles older than 14 days
      const pubMs = new Date(raw.pubDate).getTime();
      if (Date.now() - pubMs > 14 * 24 * 60 * 60 * 1000) continue;

      const freshness    = scoreFreshness(raw.pubDate);
      const sentiment    = detectSentiment(raw.title, summary);
      const tags         = detectTags(raw.title, summary);
      const displayHead  = rewriteHeadline(raw.title, sentiment, tags, rewriteMode);

      const partialScore = computeCompositeScore({
        relevanceScore:    relevance,
        freshnessScore:    freshness,
        sourceQuality:     source.quality,
        isCommandersFocus: source.commandersFocus,
        tagCount:          tags.length,
        isBreaking:        false, // set later
      });

      const article: Article = {
        id,
        sourceId:         source.id,
        sourceName:       source.name,
        sourceUrl:        raw.link,
        canonicalUrl:     canonical,
        author:           raw.author,
        publishedAt:      raw.pubDate,
        ingestedAt:       new Date().toISOString(),
        originalHeadline: raw.title,
        displayHeadline:  displayHead,
        summary:          summary.slice(0, 300) || null,
        imageUrl:         raw.imageUrl,
        tags,
        score:            partialScore,
        relevanceScore:   relevance,
        isBreaking:       false,
        sentiment,
      };

      // Promote to breaking if candidate
      if (isBreakingCandidate({ score: partialScore, tags, title: raw.title, summary })) {
        article.isBreaking = true;
        article.score = Math.min(article.score + 8, 100);
      }

      articles.push(article);
    }

    return { items: articles, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { items: [], error: msg };
  }
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicate(articles: Article[]): Article[] {
  const seenUrls = new Set<string>();
  const accepted: Article[] = [];

  // Highest-scored version wins all dedup races
  const sorted = [...articles].sort((a, b) => b.score - a.score);

  for (const article of sorted) {
    if (seenUrls.has(article.canonicalUrl)) continue;

    // Reject if this story is semantically close to an already-accepted one.
    // 60% overlap of significant words = same story covered by multiple outlets.
    const isDupe = accepted.some(
      ex => titleSimilarity(article.originalHeadline, ex.originalHeadline) >= 0.60
    );
    if (isDupe) continue;

    seenUrls.add(article.canonicalUrl);
    accepted.push(article);
  }

  return accepted;
}

// ─── Full ingest run ──────────────────────────────────────────────────────────

export async function runIngest(rewriteMode: typeof SITE.rewriteMode): Promise<{
  articles: Article[];
  run:      IngestRun;
}> {
  const startedAt = new Date().toISOString();
  const runId     = startedAt;

  const enabledSources = SOURCES.filter(s => s.enabled);
  const allArticles: Article[] = [];
  const errors: string[] = [];
  const sourceResults: IngestRun['sources'] = [];

  // Fetch all sources concurrently (with a concurrency cap of 6)
  const CHUNK_SIZE = 6;
  for (let i = 0; i < enabledSources.length; i += CHUNK_SIZE) {
    const chunk = enabledSources.slice(i, i + CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map(source => ingestSource(source, rewriteMode)),
    );

    results.forEach((result, idx) => {
      const source = chunk[idx];
      sourceResults.push({
        id:      source.id,
        success: result.error === null,
        count:   result.items.length,
      });

      if (result.error) {
        errors.push(`[${source.id}] ${result.error}`);
      } else {
        allArticles.push(...result.items);
      }
    });
  }

  const deduped = deduplicate(allArticles);

  // Sort by composite score
  deduped.sort((a, b) => b.score - a.score);

  // Enforce per-source diversity cap: no single source can dominate the feed.
  // Commanders-focused sources get a slightly higher cap.
  const SOURCE_CAP_FOCUS    = 5; // Commanders-specific sources
  const SOURCE_CAP_NATIONAL = 5; // National sources
  const sourceCounts = new Map<string, number>();
  const capped: Article[] = [];
  const sourceCapMap = new Map(
    SOURCES.map(s => [s.id, s.commandersFocus ? SOURCE_CAP_FOCUS : SOURCE_CAP_NATIONAL])
  );

  for (const article of deduped) {
    const cap = sourceCapMap.get(article.sourceId) ?? SOURCE_CAP_NATIONAL;
    const count = sourceCounts.get(article.sourceId) ?? 0;
    if (count < cap) {
      capped.push(article);
      sourceCounts.set(article.sourceId, count + 1);
    }
  }

  // Re-sort after capping (order may have shifted)
  capped.sort((a, b) => b.score - a.score);

  // Keep top N stories
  const topArticles = capped.slice(0, SITE.storyCount + 10); // extra buffer

  const run: IngestRun = {
    id:            runId,
    startedAt,
    completedAt:   new Date().toISOString(),
    articlesFound: allArticles.length,
    articlesNew:   deduped.length,
    errors,
    sources:       sourceResults,
  };

  return { articles: topArticles, run };
}

// ─── NFC East rival ingest ────────────────────────────────────────────────────

import type { RivalItem } from './types';

const NFC_EAST_RIVALS: Array<{ team: RivalItem['team']; teamName: string; rssUrl: string }> = [
  { team: 'cowboys', teamName: 'Cowboys', rssUrl: 'https://cowboyswire.usatoday.com/feed/' },
  { team: 'giants',  teamName: 'Giants',  rssUrl: 'https://giantswire.usatoday.com/feed/' },
  { team: 'eagles',  teamName: 'Eagles',  rssUrl: 'https://eagleswire.usatoday.com/feed/' },
];

export async function runNfcEastIngest(): Promise<RivalItem[]> {
  const results: RivalItem[] = [];

  await Promise.all(
    NFC_EAST_RIVALS.map(async rival => {
      try {
        const items = await fetchRssFeed(rival.rssUrl);
        items.slice(0, 2).forEach(item => {
          if (!item.link || !item.title) return;
          results.push({
            team:        rival.team,
            teamName:    rival.teamName,
            headline:    item.title,
            url:         item.link,
            sourceName:  `${rival.teamName} Wire`,
            publishedAt: item.pubDate,
          });
        });
      } catch {
        // Non-critical — NFC East section degrades gracefully
      }
    })
  );

  return results;
}
