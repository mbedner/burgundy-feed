// ─── Content type detection ────────────────────────────────────────────────────
// Classifies an article's content type from title, tags, and source metadata.
// All deterministic — no external service required.

import type { ContentType, ArticleTag } from './types';

const OFFICIAL_SOURCES = new Set(['commanders-official']);

const RECAP_RE    = /\b(recap|final score|game summary|postgame|post[- ]game|box score)\b/i;
const PREVIEW_RE  = /\b(preview|keys to|matchup|game plan|week \d+ preview|ahead of|prepare)\b/i;
const RUMOR_RE    = /\b(report|rumor|source|sources|per|according to|expected to|could|might|linked)\b/i;
const OPINION_RE  = /\b(opinion|column|take|why|case for|case against|argument|mailbag|grades?)\b/i;
const LISTICLE_RE = /\b(\d+ (things|reasons|players|picks|ways|questions|stats|facts)|top \d+|best \d+|rank(ed|ing)|all 32|every team)\b/i;
const ANALYSIS_RE = /\b(analysis|breakdown|deep dive|film study|explain|context|examining|look at|scouting|grade)\b/i;

export function detectContentType(
  title:      string,
  tags:       ArticleTag[],
  sourceId:   string,
): ContentType {
  if (OFFICIAL_SOURCES.has(sourceId)) return 'official';
  if (tags.includes('rumor'))     return 'rumor';
  if (LISTICLE_RE.test(title))    return 'listicle';
  if (RECAP_RE.test(title))       return 'recap';
  if (PREVIEW_RE.test(title))     return 'preview';
  if (ANALYSIS_RE.test(title) || tags.includes('analysis')) return 'analysis';
  if (OPINION_RE.test(title))     return 'opinion';
  if (RUMOR_RE.test(title))       return 'rumor';
  return 'news';
}
