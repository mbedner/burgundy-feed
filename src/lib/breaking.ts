// ─── Breaking News Detection ───────────────────────────────────────────────────
import type { Article, BreakingItem } from './types';
import { BREAKING_THRESHOLD } from '../config/site';

// Phrases that confirm an actual transaction or roster move happened.
// Bare nouns ("trade", "injury", "signed") are intentionally excluded — they
// appear in opinion/analysis pieces ("should trade for", "injury history").
// Every entry here requires confirmed-action verb language.
const HARD_BREAKING_KEYWORDS = [
  // Trades — confirmed exchanges only
  'was traded', 'has been traded', 'traded to', 'in a trade for', 'trade deadline',
  // Signings — confirmed new agreements
  'signs with', 'signed with', 'agreed to terms', 'agrees to deal', 'agrees to terms',
  'officially signed', 'one-year deal', 'two-year deal', 'multi-year deal', 'inked a deal',
  // Cuts / releases — confirmed roster moves
  'has been released', 'officially released', 'waived by', 'waived from',
  'released by', 'cut by', 'claimed off waivers',
  // Injury — confirmed medical status only, not speculation
  'placed on ir', 'placed on the ir', 'out for season', 'out for the season',
  'torn acl', 'torn mcl', 'fracture', 'concussion protocol',
  'ruled out for the', 'ruled out with',
  // Suspensions — confirmed league action
  'suspended for', 'suspended by', 'serving a suspension',
  // Coaching / front-office changes — confirmed hires / fires
  'fired as', 'named head coach', 'hired as head coach',
  'hired as offensive coordinator', 'hired as defensive coordinator',
  // Stadium / ownership — confirmed events
  'stadium deal', 'rfk stadium', 'rfk',
  // Other confirmed roster news
  'draft trade',
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
  const cutoff = new Date(now.getTime() - 90 * 60 * 1000); // last 90 minutes only

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
