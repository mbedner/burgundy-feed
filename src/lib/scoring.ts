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
  'noah brown', 'dyami brown', 'zach ertz', 'leo chenal',
  'jeremy mcnichols', 'bobby wagner', 'brandon aubrey',
  'jamin davis', 'jeremy chinn', 'austin ekeler',
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

  // No direct Commanders reference → zero relevance.
  // This prevents Raiders/Bears articles from scoring via NFL context alone.
  if (properMatches === 0 && kwMatches === 0) return 0;

  const nflContext = countMatches(combined, NFL_CONTEXT_KEYWORDS);

  let score = 0;
  score += Math.min(properMatches * 25, 60);
  score += Math.min(kwMatches * 8,  30);
  if (nflContext > 0) score += Math.min(nflContext * 6, 20); // bonus only when direct mention exists
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
    // Injury — require specific medical/status language
    [['placed on ir', 'out for season', 'torn acl', 'torn mcl', 'fracture',
      'concussion protocol', 'non-contact injury', 'hamstring injury', 'knee injury',
      'ankle injury', 'shoulder injury', 'did not practice', 'questionable with',
      'doubtful with', 'ruled out', 'injured reserve'],                       'injury'],

    // Supplement with looser injury words only if combined with specific context
    // (handled below as secondary check)

    // Trade — action words only, not just "trade"
    [['was traded', 'have traded', 'has been traded', 'trade deadline',
      'trade package', 'trade talks', 'trading for', 'in a trade',
      'traded to ', 'traded away'],                                            'trade'],

    // Draft — specific draft contexts, not just "pick" or "draft"
    [['nfl draft', 'mock draft', 'draft prospect', 'nfl combine', 'pro day',
      'draft class', 'scouting combine', 'undrafted free agent', 'first-round pick',
      'second-round pick', 'draft board', 'draft capital', 'top prospect'],   'draft'],

    // Cap — financial specifics only
    [['salary cap', 'cap space', 'cap hit', 'dead money', 'dead cap', 'void year',
      'million guaranteed', 'per year deal', 'restructured his', 'restructures',
      'cap casualty', 'cap relief', 'cap implications', 'over the cap',
      'cap number', 'flat cap', 'contract extension'],                         'cap'],

    // Signing — new arrivals, specific phrases
    [['signs with', 'signed with', 'agreed to terms', 'agrees to terms',
      'free agent signing', 'officially signed', 'inked a deal',
      'one-year deal', 'two-year deal', 'three-year deal', 'multi-year deal',
      'signed to a', 'signing bonus'],                                         'signing'],

    // Release
    [['was released', 'has been released', 'officially released', 'waived by',
      'cut by', 'parting ways', 'street free agent',
      'claimed off waivers', 'released from'],                                 'release'],

    // Suspension
    [['suspended', 'suspension', 'indefinitely suspended',
      'drug suspension', 'serving a suspension'],                               'suspension'],

    // Analysis — film/data specific, not just "analysis" or "grades"
    [['film room', 'film study', 'film breakdown', 'tape study', 'snap count',
      'pff grade', 'route tree', 'advanced metrics', 'efficiency rating',
      'game film', 'target share', 'air yards', 'analytics breakdown',
      'film session'],                                                           'analysis'],

    // Coach — staff changes/roles specifically
    [['head coach', 'offensive coordinator', 'defensive coordinator',
      'special teams coordinator', 'coaching staff', 'coaching change',
      'fired the coach', 'hired as head', 'named as head coach',
      'interim head coach', 'coaching hire', 'coaching search'],               'coach'],

    // QB — very specific signals only
    [['jayden daniels', 'starting quarterback', 'qb competition',
      'quarterback controversy', 'backup quarterback',
      'franchise quarterback', 'qb1'],                                          'QB'],

    // Rumor — requires journalist sourcing language
    [['per sources', 'per league sources', 'sources tell', 'source familiar',
      'told espn', 'told nfl network', 'told the athletic',
      'expected to sign', 'expected to be traded', 'expected to be released',
      'targeting in free agency', 'strong interest in',
      'mutual interest in'],                                                    'rumor'],

    // Stadium
    [['rfk stadium', 'new stadium', 'stadium deal', 'stadium vote',
      'stadium funding', 'rfk site', 'stadium project'],                       'stadium'],

    // Ownership
    [['ownership group', 'minority stake', 'ownership stake',
      'sale of the team', 'team ownership', 'managing partner'],               'ownership'],
  ];

  for (const [keywords, tag] of checks) {
    if (containsAny(combined, keywords)) tags.push(tag);
  }

  // Broad injury keyword only if not already tagged and passes a secondary signal
  if (!tags.includes('injury') && containsAny(combined, ['injury', 'injured'])) {
    tags.push('injury');
  }

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
