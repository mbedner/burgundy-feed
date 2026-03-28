// ─── Breaking News Detection ───────────────────────────────────────────────────
import type { Article, BreakingItem } from './types';
import { BREAKING_THRESHOLD } from '../config/site';

// Keywords that, if present, can promote a story to the breaking ticker
const HARD_BREAKING_KEYWORDS = [
  'injury', 'injured', 'out for season', 'placed on ir',
  'trade', 'traded',
  'released', 'cut', 'waived',
  'suspended', 'suspension',
  'fired', 'fired as',
  'signed', 'agrees to deal',
  'stadium deal', 'rfk',
  'draft trade',
  'starting qb',
];

function lc(s: string): string { return s.toLowerCase(); }

function summarizeForTicker(article: Article): string {
  // Produce a very short punchy one-liner for the ticker
  const h = article.displayHeadline;
  // Truncate to ~90 chars if needed
  return h.length > 90 ? h.slice(0, 87) + '…' : h;
}

export function detectBreakingItems(articles: Article[]): BreakingItem[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 4 * 60 * 60 * 1000); // last 4 hours only

  return articles
    .filter(a => {
      if (a.score < BREAKING_THRESHOLD) return false;
      if (new Date(a.publishedAt) < cutoff) return false;
      const combined = lc(`${a.originalHeadline} ${a.summary ?? ''}`);
      return HARD_BREAKING_KEYWORDS.some(kw => combined.includes(kw));
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(a => ({
      id:         a.id,
      headline:   summarizeForTicker(a),
      sourceUrl:  a.sourceUrl,
      sourceName: a.sourceName,
      detectedAt: now.toISOString(),
    }));
}
