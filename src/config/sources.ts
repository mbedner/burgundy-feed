// ─── News Source Configuration ────────────────────────────────────────────────
// Add/remove/adjust sources here. Each source has:
//   id          – unique slug used in logs and deduplication
//   name        – display name shown on the site
//   rssUrl      – public RSS feed URL
//   quality     – 1–10 source quality weight used in scoring
//   type        – 'beat' | 'national' | 'blog' | 'local'
//   commandersFocus – true if the source is Commanders-specific (higher relevance bonus)
//   enabled     – set false to disable without deleting

import type { SourceConfig } from '../lib/types';

export const SOURCES: SourceConfig[] = [
  // ── Commanders-focused ──────────────────────────────────────────────────────
  {
    id:               'commanders-official',
    name:             'Commanders.com',
    rssUrl:           'https://www.commanders.com/rss/news',
    quality:          8,
    type:             'beat',
    commandersFocus:  true,
    enabled:          false,  // RSS feed stale (newest item ~142d old); team doesn't maintain it
  },
  {
    id:               'espn-commanders',
    name:             'ESPN',
    rssUrl:           'https://www.espn.com/espn/rss/nfl/news?teamId=28',
    quality:          9,
    type:             'beat',
    commandersFocus:  true,
    enabled:          true,  // team-curated ESPN feed, consistently fresh
  },
  {
    id:               'commanders-nation',
    name:             'Commanders Nation',
    rssUrl:           'https://www.commandersnation.com/feed/',
    quality:          7,
    type:             'blog',
    commandersFocus:  true,
    enabled:          false, // last published Nov 2025, inactive blog
  },
  {
    id:               'hogs-haven',
    name:             'Hogs Haven',
    rssUrl:           'https://www.hogshaven.com/rss/index.xml',
    quality:          7,
    type:             'blog',
    commandersFocus:  true,
    enabled:          true,
  },
  {
    id:               'riggos-rag',
    name:             "Riggo's Rag",
    rssUrl:           'https://riggosrag.com/feed',
    quality:          7,
    type:             'blog',
    commandersFocus:  true,
    enabled:          true,
  },
  {
    // Aggregates Commanders Wire (USA Today), NY Times, WaPo, and anything
    // else Google News indexes for Washington Commanders. Titles arrive as
    // "Headline - Publisher Name" so stripTitleSuffix cleans them up.
    // Quality set low (5) so direct-source dupes win in deduplication.
    id:               'google-news-commanders',
    name:             'Google News',
    rssUrl:           'https://news.google.com/rss/search?q=Washington+Commanders+NFL&hl=en-US&gl=US&ceid=US:en',
    quality:          5,
    type:             'national',
    commandersFocus:  true,
    stripTitleSuffix: true,
    enabled:          true,
  },
  {
    id:               'clutchpoints-commanders',
    name:             'ClutchPoints',
    rssUrl:           'https://www.clutchpoints.com/nfl/washington-commanders/feed',
    quality:          6,
    type:             'blog',
    commandersFocus:  true,
    enabled:          true,
  },
  {
    id:               'dcsportsking',
    name:             'DC Sports King',
    rssUrl:           'https://dcsportsking.com/feed/',
    quality:          6,
    type:             'blog',
    commandersFocus:  true,
    enabled:          false, // covers all DC sports, rarely Commanders-specific
  },
  {
    id:               'bleacher-report',
    name:             'Bleacher Report',
    rssUrl:           'https://feeds.bleacherreport.com/articles?tag=washington-commanders',
    quality:          6,
    type:             'national',
    commandersFocus:  true,
    enabled:          true,
  },

  // ── Local Beat ──────────────────────────────────────────────────────────────
  {
    id:               'nbc4-commanders',
    name:             'NBC4 Washington',
    rssUrl:           'https://www.nbcwashington.com/tag/washington-commanders/feed/',
    quality:          9,
    type:             'beat',
    commandersFocus:  true,
    enabled:          true,
  },
  {
    id:               'washington-post',
    name:             'Washington Post',
    rssUrl:           'https://feeds.washingtonpost.com/rss/sports/nfl',
    quality:          9,
    type:             'local',
    commandersFocus:  false,
    enabled:          false, // blocks all bot requests, always times out
  },
  {
    id:               'nbcs-washington',
    name:             'NBC Sports Washington',
    rssUrl:           'https://www.monumentalsportsnetwork.com/washington/rss',
    quality:          8,
    type:             'local',
    commandersFocus:  true,
    enabled:          true,
  },
  {
    id:               'wtop',
    name:             'WTOP Sports',
    rssUrl:           'https://wtop.com/sports/feed/',
    quality:          6,
    type:             'local',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'washington-times',
    name:             'Washington Times',
    rssUrl:           'https://www.washingtontimes.com/rss/headlines/sports/',
    quality:          6,
    type:             'local',
    commandersFocus:  false,
    enabled:          true,
  },

  // ── National NFL ────────────────────────────────────────────────────────────
  {
    id:               'espn-nfl',
    name:             'ESPN',
    rssUrl:           'https://www.espn.com/espn/rss/nfl/news',
    quality:          9,
    type:             'national',
    commandersFocus:  false,
    enabled:          false,  // replaced by espn-commanders (team-specific, commandersFocus: true)
  },
  {
    id:               'cbs-sports-nfl',
    name:             'CBS Sports',
    rssUrl:           'https://www.cbssports.com/rss/headlines/nfl/',
    quality:          8,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'yahoo-sports-nfl',
    name:             'Yahoo Sports',
    rssUrl:           'https://sports.yahoo.com/nfl/rss/',
    quality:          7,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'fox-sports-nfl',
    name:             'Fox Sports',
    rssUrl:           'https://api.foxsports.com/v1/rss?legacy=true&searchTerm=nfl',
    quality:          7,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'pff-nfl',
    name:             'PFF',
    rssUrl:           'https://www.pff.com/feed',
    quality:          8,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'overthecap',
    name:             'Over The Cap',
    rssUrl:           'https://overthecap.com/feed',
    quality:          7,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'athletic-nfl',
    name:             'The Athletic',
    rssUrl:           'https://theathletic.com/rss-feed/',
    quality:          9,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'pft',
    name:             'Pro Football Talk',
    rssUrl:           'https://www.nbcsports.com/profootballtalk.rss',
    quality:          8,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'nfl-mocks',
    name:             'NFL Mocks',
    rssUrl:           'https://nflmocks.com/feed',
    quality:          6,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'pro-football-network',
    name:             'Pro Football Network',
    rssUrl:           'https://www.profootballnetwork.com/feed/',
    quality:          7,
    type:             'national',
    commandersFocus:  false,
    enabled:          true,
  },
  {
    id:               'nfl-dot-com',
    name:             'NFL.com',
    rssUrl:           'https://www.nfl.com/rss/rsslanding?searchString=commanders',
    quality:          8,
    type:             'national',
    commandersFocus:  true,
    enabled:          false, // entity expansion errors
  },
];

// ─── Blocklist ─────────────────────────────────────────────────────────────────
// Any URL containing these strings will be rejected at ingestion time.
// ProFootballTalk is permanently blocked per product rules.
export const BLOCKED_DOMAINS: string[] = [
  'nfltraderumors.co',
  'fansided.com',          // often low quality
  // 'clutchpoints.com' unblocked — Commanders-specific feed has solid team content
];

// ─── Required Commanders relevance keywords ────────────────────────────────────
// A story must contain at least one of these to be considered Commanders-relevant.
// (The scoring function also checks title/summary; this is a soft pre-filter.)
export const COMMANDERS_KEYWORDS: string[] = [
  'commanders',
  'washington commanders',
  'washington football',
  'jayden daniels',
  'dan quinn',
  'adam peters',
  'josh harris',
  'bobby mclaughlin',
  'kliff kingsbury',
  'terry mclaurin',
  'brian robinson',
  'austin ekeler',
  'sam howell',
  'casey toohill',
  'daron payne',
  'jamin davis',
  'jeremy chinn',
  'nick bellore',
  'commanders wire',
  'hogs haven',
  'fedexfield',
  'rfk stadium',
  'noah brown',
  'dyami brown',
  'zach ertz',
  'leo chenal',
  'jeremy mcnichols',
  'bobby wagner',
  'brandon aubrey',
  'dante fowler',
  'dorance armstrong',
  'tyler biadasz',
  'carnell tate',
  'luke mcafee',
  'washington nfl',
  'washington qb',
  'washington defense',
  'washington offense',
  'washington draft',
  'washington free agent',
];

// ─── Broader NFL keywords that add partial relevance ─────────────────────────
// Stories containing these get a lower relevance boost unless they also contain
// a Commanders keyword.
export const NFL_CONTEXT_KEYWORDS: string[] = [
  'nfl draft',
  'nfc east',
  'nfl trade',
  'salary cap',
  'free agency',
  'nfl combine',
  'nfl scouting',
  'all 32',
  'every team',
  'each team',
  'mock draft',
  'draft board',
  'free agency rankings',
  'free agency grades',
  'offseason grades',
  'roster ranking',
  'power rankings',
  'nfl offseason',
];
