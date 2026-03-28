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
import { SITE, MIN_RELEVANCE_SCORE } from '../config/site';

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

function fuzzyTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(' ')
    .filter(w => w.length > 3)
    .slice(0, 6)
    .join(' ');
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

      if (relevance < MIN_RELEVANCE_SCORE) continue;

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
  const seenUrls   = new Set<string>();
  const seenTitles = new Set<string>();
  const result: Article[] = [];

  // Sort by score descending so higher-quality versions win dedup races
  const sorted = [...articles].sort((a, b) => b.score - a.score);

  for (const article of sorted) {
    if (seenUrls.has(article.canonicalUrl)) continue;

    const titleKey = fuzzyTitleKey(article.originalHeadline);
    if (seenTitles.has(titleKey)) continue;

    seenUrls.add(article.canonicalUrl);
    seenTitles.add(titleKey);
    result.push(article);
  }

  return result;
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
  const SOURCE_CAP_FOCUS    = 4; // Commanders-specific blogs (Hogs Haven, etc.)
  const SOURCE_CAP_NATIONAL = 6; // National sources
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
