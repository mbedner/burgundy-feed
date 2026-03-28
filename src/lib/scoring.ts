// ─── Story Scoring & Ranking ──────────────────────────────────────────────────
// All scoring is deterministic and runs at ingest time.
// Returns a 0–100 composite score.

import type { Article, ArticleTag } from './types';
import { COMMANDERS_KEYWORDS, NFL_CONTEXT_KEYWORDS } from '../config/sources';

// Keywords that indicate a story is probably Commanders-specific
const COMMANDERS_PROPER = [
  'commanders', 'washington commanders', 'jayden daniels', 'dan quinn',
  'adam peters', 'terry mclaurin', 'daron payne', 'brian robinson',
  'fedexfield', 'rfk stadium', 'hogs haven', 'commanders wire',
  'kliff kingsbury', 'josh harris', 'bobby mclaughlin',
];

// Breaking-news signal keywords
const BREAKING_SIGNALS = [
  'injury', 'injured', 'out for season', 'placed on ir',
  'trade', 'traded', 'released', 'cut', 'waived',
  'suspended', 'suspension', 'fired', 'fired as',
  'signed', 'agrees to deal', 'contract',
  'stadium', 'ownership', 'sale',
  'draft pick', 'first-round',
  'quarterback', 'starting qb',
  'head coach',
];

// Negative sentiment signals
const NEGATIVE_SIGNALS = [
  'injury', 'injured', 'loss', 'lost', 'fell', 'defeated', 'cut', 'released',
  'waived', 'out for', 'ir', 'suspension', 'fired', 'resigned', 'benched',
  'fumble', 'interception', 'penalty', 'fine', 'lawsuit', 'arrest',
  'poor', 'worst', 'last', 'struggles', 'struggle', 'concern',
];

// Positive sentiment signals
const POSITIVE_SIGNALS = [
  'win', 'won', 'victory', 'signed', 'signing', 'extension', 'contract',
  'return', 'healthy', 'cleared', 'drafted', 'selected', 'promoted',
  'first', 'record', 'impressive', 'strong', 'great', 'elite', 'pro bowl',
];

function lc(s: string): string {
  return s.toLowerCase();
}

function containsAny(text: string, keywords: string[]): boolean {
  const t = lc(text);
  return keywords.some(kw => t.includes(kw));
}

function countMatches(text: string, keywords: string[]): number {
  const t = lc(text);
  return keywords.filter(kw => t.includes(kw)).length;
}

export function scoreRelevance(title: string, summary: string): number {
  const combined = `${title} ${summary}`;
  const properMatches = countMatches(combined, COMMANDERS_PROPER);
  const kwMatches     = countMatches(combined, COMMANDERS_KEYWORDS);
  const nflContext    = countMatches(combined, NFL_CONTEXT_KEYWORDS);

  let score = 0;

  // Direct Commanders proper-name mentions are highest signal
  score += Math.min(properMatches * 25, 60);

  // General keyword matches supplement
  score += Math.min(kwMatches * 8, 30);

  // Broad NFL context gives a small bump if no direct mention yet
  if (score < 20 && nflContext > 0) {
    score += Math.min(nflContext * 5, 15);
  }

  return Math.min(score, 100);
}

export function scoreFreshness(publishedAt: string): number {
  const ageMs  = Date.now() - new Date(publishedAt).getTime();
  const ageHrs = ageMs / (1000 * 60 * 60);

  if (ageHrs < 1)   return 100;
  if (ageHrs < 2)   return 90;
  if (ageHrs < 4)   return 78;
  if (ageHrs < 8)   return 65;
  if (ageHrs < 12)  return 52;
  if (ageHrs < 24)  return 38;
  if (ageHrs < 48)  return 20;
  return 8;
}

export function detectSentiment(
  title: string,
  summary: string,
): 'positive' | 'negative' | 'neutral' {
  const combined = lc(`${title} ${summary}`);
  const neg = countMatches(combined, NEGATIVE_SIGNALS);
  const pos = countMatches(combined, POSITIVE_SIGNALS);

  if (neg > pos + 1) return 'negative';
  if (pos > neg + 1) return 'positive';
  return 'neutral';
}

export function detectTags(title: string, summary: string): ArticleTag[] {
  const combined = lc(`${title} ${summary}`);
  const tags: ArticleTag[] = [];

  const checks: [string[], ArticleTag][] = [
    [['injury', 'injured', 'ir', 'out for'],                      'injury'],
    [['trade', 'traded', 'trade deadline'],                        'trade'],
    [['draft', 'pick', 'combine', 'scouting'],                    'draft'],
    [['cap', 'salary', 'contract', 'extension', 'deal'],          'cap'],
    [['rumor', 'source', 'report', 'according to', 'expected to'],'rumor'],
    [['sign', 'signed', 'signing', 'free agent'],                 'signing'],
    [['release', 'released', 'cut', 'waived'],                    'release'],
    [['suspend', 'suspension'],                                    'suspension'],
    [['analysis', 'breakdown', 'film', 'tape', 'grades'],        'analysis'],
    [['coach', 'coaching', 'staff', 'coordinator'],               'coach'],
    [['quarterback', 'qb', 'daniels', 'howell'],                  'QB'],
    [['defense', 'defensive', 'cornerback', 'safety', 'lineback'],'defense'],
    [['offense', 'offensive', 'receiver', 'running back'],        'offense'],
    [['roster', 'depth chart', 'practice squad'],                 'roster'],
    [['stadium', 'rfk', 'fedexfield'],                            'stadium'],
    [['ownership', 'owner', 'harris'],                            'ownership'],
  ];

  for (const [keywords, tag] of checks) {
    if (containsAny(combined, keywords)) tags.push(tag);
  }

  // sentiment tags
  const sentiment = detectSentiment(title, summary);
  if (sentiment === 'positive') tags.push('good');
  if (sentiment === 'negative') tags.push('bad');

  return [...new Set(tags)];
}

export function isBreakingCandidate(
  article: { score: number; tags: ArticleTag[]; title: string; summary: string },
): boolean {
  const combined = lc(`${article.title} ${article.summary}`);
  const hasSignal = BREAKING_SIGNALS.some(s => combined.includes(s));
  return hasSignal && article.score >= 65;
}

export function computeCompositeScore(params: {
  relevanceScore: number;
  freshnessScore: number;
  sourceQuality:  number;  // 1–10
  isCommandersFocus: boolean;
  tagCount:       number;
  isBreaking:     boolean;
}): number {
  const {
    relevanceScore,
    freshnessScore,
    sourceQuality,
    isCommandersFocus,
    tagCount,
    isBreaking,
  } = params;

  let score = 0;
  score += relevanceScore * 0.40;           // 40 pts max
  score += freshnessScore * 0.30;           // 30 pts max
  score += (sourceQuality / 10) * 100 * 0.20; // 20 pts max
  score += Math.min(tagCount * 1.5, 5);    //  5 pts max
  if (isCommandersFocus) score += 3;        //  3 pts bonus
  if (isBreaking)        score += 8;        //  8 pts bonus (stacks)

  return Math.min(Math.round(score), 100);
}
